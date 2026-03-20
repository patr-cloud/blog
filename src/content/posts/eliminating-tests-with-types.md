---
title: "Eliminating Tests with Types"
description: "How I used Rust's type system to make an entire class of API tests unnecessary - if it compiles, it's correct."
pubDate: 2026-03-19
author: "rakshith-ravi"
tags: ["rust", "type-system", "api-design", "testing"]
---

My favorite kind of test is one I never have to write. Not because I'm lazy - I certainly am - but because the compiler already proves the property for you.

At [Patr](https://github.com/patr-cloud/patr), I'm building a cloud platform. It has about 150 API endpoints and counting. Creating deployments, managing workspaces, RBAC, container registries, domains, secrets and what not. Every one of those endpoints needs to parse a request, validate input, check authentication, enforce permissions, and return a well-formed response with the correct headers.

That's a lot of surface area for bugs. In most frameworks, you'd write integration tests to make sure you don't forget to check auth on a route, or that your path parameters actually match the URL, or that a list endpoint returns the right pagination headers. I don't write any of those tests. The compiler catches all of it.

Here's how.

# The problem with typical API frameworks

In Express, Flask, or even standard Axum, an endpoint is a function. You register it with a path, you parse the request body yourself (or with middleware that may or may not be wired up), and you return...anything that's valid HTTP. The framework trusts that you've done everything correctly.

This means you can:

- Forget to check authentication on a route
- Register a handler with the wrong HTTP method
- Declare path parameters in the URL that don't match your handler
- Forget to validate user input
- Omit a required response header
- Wire up the wrong handler to the wrong route

All of these are valid programs. They compile. They start. They just do the wrong thing, and you don't find out until a test catches it, a user reports it - or worse, a vulnerability is exploited.

What if the type system made these mistakes _unrepresentable_?

# Building blocks: the header type system

I've always been inspired by the way Rust handles enums and how you can represent data along with variants. I wanted to bring that same level of type safety to API endpoints. Before I show you the main trick, I need to explain the foundation it's built on. This is the part that makes everything else work.

## Typed headers

The [`headers`](https://docs.rs/headers) crate gives us a `Header` trait. Any type that implements it knows its HTTP header name and how to encode/decode itself. Here's one of mine - a custom `X-Total-Count` header for paginated responses:

```rust
pub struct TotalCountHeader(pub usize);

static HEADER_NAME: HeaderName = HeaderName::from_static("x-total-count");

impl Header for TotalCountHeader {
    fn name() -> &'static HeaderName {
        &HEADER_NAME
    }

    fn decode<'i, I>(values: &mut I) -> Result<Self, Error>
    where
        I: Iterator<Item = &'i HeaderValue>,
    {
        let value = values.next().ok_or_else(Error::invalid)?;
        let count = value.to_str()
            .map_err(|_| Error::invalid())?
            .parse::<usize>()
            .map_err(|_| Error::invalid())?;
        Ok(Self(count))
    }

    fn encode<E>(&self, values: &mut E)
    where
        E: Extend<HeaderValue>,
    {
        values.extend(std::iter::once(
            HeaderValue::from_str(&self.0.to_string())
                .expect("HeaderValue should be valid UTF-8"),
        ));
    }
}
```

Nothing fancy. A typed wrapper around a header value. The important thing is: this type _is_ the header.

## `HasHeader<H>` - "this struct contains header H"

Now I need a way to say "this struct has a `BearerToken` header in it." That's what `HasHeader` does:

```rust
pub trait HasHeader<H: Header> {
    fn get_header(&self) -> &H;
}
```

There's a blanket impl so a header type trivially "has" itself:

```rust
impl<H: Header> HasHeader<H> for H {
    fn get_header(&self) -> &H {
        self
    }
}
```

But the real value comes when you have a struct with multiple headers. There's a derive macro for that:

```rust
#[derive(HasHeaders)]
pub struct MyRequestHeaders {
    pub authorization: BearerToken,
    pub user_agent: UserAgent,
}
```

The `#[derive(HasHeaders)]` proc macro generates:

```rust
impl HasHeader<BearerToken> for MyRequestHeaders {
    fn get_header(&self) -> &BearerToken {
        &self.authorization
    }
}

impl HasHeader<UserAgent> for MyRequestHeaders {
    fn get_header(&self) -> &UserAgent {
        &self.user_agent
    }
}

impl Headers for MyRequestHeaders {
    fn to_header_map(&self) -> HeaderMap { /* ... */ }
    fn from_header_map(map: HeaderMap) -> Result<Self, Error> { /* ... */ }
}
```

Now any code that has a `where T: HasHeader<BearerToken>` bound can accept this struct and pull out the token. This is what makes generic middleware possible - more on that in a moment.

## `HasHeaders<(H1, H2, ...)>` - the tuple trick

Here's where it gets interesting. I need a way to say "this struct has _all_ of these headers." Not just one - a set of them. I do this with a marker trait implemented over tuples:

```rust
pub trait HasHeaders<T> {}

macro_rules! impl_has_headers {
    () => {
        impl<S> HasHeaders<()> for S {}
    };
    ($($headers:ident),+) => {
        impl<$($headers,)* S> HasHeaders<($($headers,)*)> for S
        where
            $($headers: Header,)*
            S: $(HasHeader<$headers> +)*
        {}
    };
}

impl_has_headers!();
impl_has_headers!(H1);
impl_has_headers!(H1, H2);
impl_has_headers!(H1, H2, H3);
// ... up to 16
```

What does this buy us? If a struct implements `HasHeader<BearerToken>` and `HasHeader<UserAgent>`, it automatically implements `HasHeaders<(BearerToken, UserAgent)>`. The compiler checks that every header in the tuple is present.

You can write bounds like:

```rust
where T: HasHeaders<(BearerToken, UserAgent)>
```

And the compiler will reject any struct that's missing either header. At compile time. No runtime checks needed.

## Declaring header requirements

Different parts of an endpoint need different headers. The authenticator needs `BearerToken`. A paginated query needs `TotalCountHeader` in the response. How do they declare this?

With two simple traits:

```rust
pub trait RequiresRequestHeaders {
    type RequiredRequestHeaders;
}

pub trait RequiresResponseHeaders {
    type RequiredResponseHeaders;
}
```

Any type can say "I need these headers." For example, the authentication types:

```rust
impl RequiresRequestHeaders for NoAuthentication {
    type RequiredRequestHeaders = ();  // needs nothing
}

impl<E: ApiEndpoint> RequiresRequestHeaders for AppAuthentication<E> {
    type RequiredRequestHeaders = (BearerToken,);  // needs a token
}
```

This is the bridge. Types declare what they need. Trait bounds enforce those headers exist. The compiler connects the two.

## The `AddTuple` problem

Here's a problem I hit: a paginated list endpoint needs `TotalCountHeader` in its response headers. But the query type doesn't know what other response headers the endpoint already has. It needs to _add_ `TotalCountHeader` to whatever tuple of headers already exists.

Rust doesn't have a built-in way to append to a tuple type. So I built one:

```rust
pub trait AddTuple<T> {
    type ResultantTuple;
}

impl<T> AddTuple<T> for () {
    type ResultantTuple = (T,);
}

macro_rules! impl_add_tuples {
    ($($header:ident),+) => {
        impl<H, $($header,)*> AddTuple<H> for ($($header,)*) {
            type ResultantTuple = ($($header,)* H,);
        }
    };
}

impl_add_tuples!(H1);
impl_add_tuples!(H1, H2);
// ... up to 16
```

Now `ListResourceQuery` can use it:

```rust
impl<T, Q> RequiresResponseHeaders for ListResourceQuery<T, Q>
where
    T: ListableResource,
    Q: AddTuple<TotalCountHeader>,
{
    type RequiredResponseHeaders =
        <Q as AddTuple<TotalCountHeader>>::ResultantTuple;
}
```

Any paginated endpoint _automatically_ requires `TotalCountHeader` in its response headers. Forget to include it? Compile error. You don't need a test for this. The type system handles it.

It's worth noting that `AddTuple` has no methods. It can't take a value of `(T2,)` and return a value of `(T2, T)`. There are no values involved at all - it's pure type-level computation. `<(T2,) as AddTuple<T>>::ResultantTuple` resolves to the _type_ `(T2, T)`, which then gets used in trait bounds. No code is generated for any of this. Once the compiler verifies the bounds are satisfied, it all disappears - zero-cost abstraction in the most literal sense.

## The `ApiEndpoint` trait - wiring it all together

Now you have the context to understand the main event. This is the trait that every endpoint in Patr implements:

```rust
pub trait ApiEndpoint
where
    Self: Sized + Clone + Send + 'static,

    Self::RequestPath:
        TypedPath + Serialize + DeserializeOwned + Clone + Send + Sync + 'static,
    Self::RequestQuery:
        Serialize + DeserializeOwned + Default + Clone + Send + Sync + 'static,

    Self::RequestHeaders: Headers
        + HasHeaders<<Self::ResponseBody as RequiresRequestHeaders>::RequiredRequestHeaders>
        + HasHeaders<<Self::Authenticator as RequiresRequestHeaders>::RequiredRequestHeaders>
        + Clone + Send + Sync + 'static,

    Self::RequestBody: FromAxumRequest + Preprocessable + Send + Sync + 'static,

    Self::Authenticator: RequiresRequestHeaders + Clone + Send,

    Self::ResponseHeaders: Headers
        + HasHeaders<<Self::RequestPath as RequiresResponseHeaders>::RequiredResponseHeaders>
        + HasHeaders<<Self::RequestQuery as RequiresResponseHeaders>::RequiredResponseHeaders>
        + HasHeaders<<Self::RequestBody as RequiresResponseHeaders>::RequiredResponseHeaders>
        + HasHeaders<<Self::RequestHeaders as RequiresResponseHeaders>::RequiredResponseHeaders>
        + Debug + Send + Sync + 'static,

    Self::ResponseBody: IntoAxumResponse + Debug + Send + 'static,
{
    const METHOD: http::Method;
    const API_ALLOWED: bool;

    type RequestPath;
    type RequestQuery;
    type RequestHeaders;
    type RequestBody;
    type Authenticator;
    type ResponseHeaders;
    type ResponseBody;

    fn get_authenticator() -> Self::Authenticator;
    fn get_audit_logger() -> AuditLogger<Self>;
}
```

Look at the `where` clause. Now that you know the building blocks, you can read it:

- **`RequestHeaders: HasHeaders<<Authenticator as RequiresRequestHeaders>::RequiredRequestHeaders>`** - If the authenticator says "I need a `BearerToken`", the request headers struct must contain one.
- **`RequestHeaders: HasHeaders<<ResponseBody as RequiresRequestHeaders>::RequiredRequestHeaders>`** - If the response body type needs certain request headers, they must be present.
- **`ResponseHeaders: HasHeaders<<RequestQuery as RequiresResponseHeaders>::RequiredResponseHeaders>`** - If the query type is `ListResourceQuery`, the response headers must include `TotalCountHeader`.

Every piece of the endpoint declares what it needs. The trait bounds enforce that everything is connected. If anything is missing, the program doesn't compile.

# The `declare_api_endpoint!` macro

Nobody wants to write all these structs and trait impls by hand. Here's what declaring an endpoint actually looks like:

```rust
macros::declare_api_endpoint!(
    /// Route to create a new deployment
    CreateDeployment,
    POST "/workspace/{workspace_id}/deployment" {
        pub workspace_id: Uuid,
    },
    request_headers = {
        pub authorization: BearerToken,
        pub user_agent: UserAgent,
    },
    authentication = {
        AppAuthentication::<Self>::ResourcePermissionAuthenticator {
            extract_resource_id: |req| req.path.workspace_id,
            extract_workspace_id: |req| req.path.workspace_id,
            permission: Permission::Deployment(DeploymentPermission::Create),
        }
    },
    request = {
        #[preprocess(trim, regex = RESOURCE_NAME_REGEX)]
        pub name: String,
        #[preprocess(none)]
        #[serde(flatten)]
        pub registry: DeploymentRegistry,
        #[preprocess(trim, lowercase)]
        pub image_tag: String,
        #[preprocess(none)]
        pub runner: Uuid,
        #[preprocess(none)]
        pub machine_type: Uuid,
        #[preprocess(none)]
        #[serde(flatten)]
        pub running_details: DeploymentRunningDetails,
        #[preprocess(none)]
        pub deploy_on_create: bool,
    },
    response = {
        #[serde(flatten)]
        pub id: OnlyId,
    },
    audit_log = AppAuditLogger {
        audit_log_type: AuditLogType::ResourceCreated,
        resource_type: ResourceType::Deployment,
        extract_resource_id: ResourceIdExtractor::FromResponse(|res| res.body.id.id),
    },
);
```

One macro call. But what does it actually produce? Here's what the compiler sees after macro expansion (simplified, but structurally accurate):

```rust
// 1. Path struct - derives TypedPath so axum matches URL params
#[derive(Serialize, Deserialize, TypedPath)]
#[typed_path("/workspace/{workspace_id}/deployment")]
pub struct CreateDeploymentPath {
    pub workspace_id: Uuid,
}

// 2. Request headers - derives HasHeaders so each field
//    gets a HasHeader<T> impl automatically
#[derive(HasHeaders)]
pub struct CreateDeploymentRequestHeaders {
    pub authorization: BearerToken,
    pub user_agent: UserAgent,
}

// 3. Request body - derives Preprocessable for validation
#[derive(Serialize, Deserialize)]
#[preprocess]
#[serde(rename_all = "camelCase")]
pub struct CreateDeploymentRequest {
    #[preprocess(trim, regex = RESOURCE_NAME_REGEX)]
    pub name: String,
    #[preprocess(none)]
    #[serde(flatten)]
    pub registry: DeploymentRegistry,
    #[preprocess(trim, lowercase)]
    pub image_tag: String,
    // ... remaining fields
}

// 4. Response body
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateDeploymentResponse {
    #[serde(flatten)]
    pub id: OnlyId,
}

// 5. The ApiEndpoint impl that ties everything together
impl ApiEndpoint for CreateDeploymentRequest {
    const METHOD: Method = Method::POST;
    const API_ALLOWED: bool = true;

    type RequestPath = CreateDeploymentPath;
    type RequestQuery = ();
    type RequestHeaders = CreateDeploymentRequestHeaders;
    type RequestBody = Self;
    type Authenticator = AppAuthentication<Self>;
    type ResponseHeaders = ();
    type ResponseBody = CreateDeploymentResponse;

    fn get_authenticator() -> Self::Authenticator {
        AppAuthentication::ResourcePermissionAuthenticator {
            extract_resource_id: |req| req.path.workspace_id,
            extract_workspace_id: |req| req.path.workspace_id,
            permission: Permission::Deployment(DeploymentPermission::Create),
        }
    }

    fn get_audit_logger() -> AuditLogger<Self> { /* ... */ }
}
```

This is the key. The `ApiEndpoint` impl on the request body struct is where all the trait bounds from the trait definition kick in. The compiler checks every single one of them: does `CreateDeploymentRequestHeaders` have a `HasHeader<BearerToken>` impl (required by `AppAuthentication`)? Yes - the `#[derive(HasHeaders)]` generated it. Does the response headers type satisfy the required response headers from the query? The query is `()`, which requires `()` - trivially satisfied.

If any of these checks fail, you get a compile error pointing at the macro invocation. Not a test failure at runtime. A compiler error before your code ever runs.

Notice the `#[preprocess(...)]` attributes - `trim`, `regex`, `lowercase`. Input validation is declared at the type level. The handler doesn't validate - it receives a `CreateDeploymentRequestProcessed` type that's already been validated by the middleware. You can't forget to validate because the handler literally can't access unvalidated data.

For contrast, here's a simpler endpoint - login, which has no authentication:

```rust
macros::declare_api_endpoint!(
    Login,
    POST "/auth/sign-in",
    api = false,
    request_headers = {
        pub user_agent: UserAgent,
    },
    request = {
        #[preprocess(trim, length(min = 4), regex = r"^[a-z0-9_][a-z0-9_\.\-]*[a-z0-9_]$")]
        pub user_id: String,
        #[preprocess(trim, length(min = 8), custom = "validate_password")]
        pub password: String,
        #[preprocess(optional(trim, length(min = 6, max = 7), regex = OTP_VERIFICATION_TOKEN_REGEX))]
        pub mfa_otp: Option<String>,
        #[preprocess(trim, length(min = 1))]
        pub cf_turnstile_token: String,
    },
    response = {
        pub access_token: String,
        pub refresh_token: String,
    },
    audit_log = NoAuditLogger,
);
```

No `authentication` block. This endpoint gets `Authenticator = NoAuthentication` and doesn't require a `BearerToken` header. Same framework, same guarantees, different shape.

# Compile-time auth enforcement

This is my favorite part. The authentication system uses a sealed enum:

```rust
pub enum AppAuthentication<E: ApiEndpoint> {
    PlainTokenAuthenticator,
    WorkspaceSuperAdminAuthenticator {
        extract_workspace_id: fn(&ProcessedApiRequest<E>) -> Uuid,
    },
    WorkspaceMembershipAuthenticator {
        extract_workspace_id: fn(&ProcessedApiRequest<E>) -> Uuid,
    },
    ResourcePermissionAuthenticator {
        extract_resource_id: fn(&ProcessedApiRequest<E>) -> Uuid,
        extract_workspace_id: fn(&ProcessedApiRequest<E>) -> Uuid,
        permission: Permission,
    },
}
```

The extraction functions take `&ProcessedApiRequest<E>` - they can only reference fields that actually exist on the typed request. Try to extract `workspace_id` from a request that doesn't have one and the compiler stops you.

Now look at how endpoints are mounted on the router:

```rust
// For authenticated endpoints:
fn mount_auth_endpoint<E, H>(self, handler: H, ...) -> Self
where
    E: ApiEndpoint<Authenticator = AppAuthentication<E>> + Sync,
    E::RequestHeaders: HasHeader<BearerToken> + HasHeader<UserAgent>,
{ /* ... */ }

// For unauthenticated endpoints:
fn mount_endpoint<E, H>(self, handler: H, ...) -> Self
where
    E: ApiEndpoint<Authenticator = NoAuthentication> + Sync,
{ /* ... */ }
```

Read those bounds carefully. `mount_auth_endpoint` requires `ApiEndpoint<Authenticator = AppAuthentication<E>>`. You cannot mount an unauthenticated endpoint on the authenticated router. Period. It won't compile. Even if you manage to mount an unauthenticated endpoint, you have no way of getting the bearer token, since the headers doesn't have the token. Since you have no token, the layers can't generate a `UserRequestData` object, which provides you with no user data - basically unauthenticated. And the `HasHeader<BearerToken>` bound means: if you declare authentication but forget to include `authorization: BearerToken` in your request headers, it won't compile either.

# Types flow through middleware

Every request goes through a stack of Tower layers, and every layer is generic over the same `E: ApiEndpoint`:

```rust
ServiceBuilder::new()
    .layer(RequestParserLayer::<E>::new())
    .layer(DataStoreConnectionLayer::with_state(state.clone()))
    .layer(PreprocessLayer::<E>::new())
    .layer(UserAgentValidationLayer::new())
    .layer(AuthenticationLayer::<E>::new(allowed_client_type))
    .layer(AuthorizationLayer::<E>::new())
    .layer(AuditLoggerLayer::<E>::new())
    .layer(AuthEndpointLayer::new(handler))
```

Same type parameter `E` threads through the entire stack. The request parser extracts exactly the types the handler expects. The preprocessor validates exactly the fields declared. The auth layer checks exactly the permissions specified. They literally cannot get out of sync - they share the type. Each layer adds additional information and sends it across further.

Without a `BearerToken`, the auth layer can't generate a `UserRequestData`. Without that, the `AuthenticatedAppRequest` struct that the handler destructures can't be constructed ("error: missing field `user_data`"). Compile error ftw.

# The handler signature as documentation

Here's what the handler for `create_deployment` looks like:

```rust
pub async fn create_deployment(
    AuthenticatedAppRequest {
        request: ProcessedApiRequest {
            path: CreateDeploymentPath { workspace_id },
            query: (),
            headers: CreateDeploymentRequestHeaders {
                authorization: _,
                user_agent: _,
            },
            body: CreateDeploymentRequestProcessed {
                name,
                registry,
                image_tag,
                runner,
                machine_type,
                running_details: DeploymentRunningDetails {
                    deploy_on_push,
                    min_horizontal_scale,
                    max_horizontal_scale,
                    ports,
                    environment_variables,
                    startup_probe,
                    liveness_probe,
                    config_mounts,
                    volumes,
                },
                deploy_on_create,
            },
        },
        database,
        redis,
        client_ip: _,
        user_data: _,
        state,
    }: AuthenticatedAppRequest<'_, CreateDeploymentRequest>,
) -> Result<AppResponse<CreateDeploymentRequest>, ErrorType> {
```

The destructuring pattern _is_ the documentation. Every field, every header, every path parameter - right there in the function signature. There's no `req.body.get("name")`. It's just `name`. Wrong field name? Compile error. Missing field? Compile error. Wrong type? Compile error. Hotel? Trivago.

# What tests I don't write

Let me be concrete about what this eliminates:

- **"Does this endpoint check authentication?"** - `Authenticator = AppAuthentication<E>` or `NoAuthentication`. It's a sealed trait. There's no third option.
- **"Does this endpoint validate input?"** - `Preprocessable` runs before the handler. Fields with `#[preprocess(trim, length(min = 8))]` are validated. The handler receives `Processed` types.
- **"Do the path parameters match the URL?"** - `TypedPath` derive. If the struct fields don't match `{workspace_id}` in the path template, it won't compile.
- **"Does the response include required headers?"** - `HasHeaders<RequiredResponseHeaders>` bounds check this at compile time.
- **"Is the `BearerToken` header present for authenticated endpoints?"** - `mount_auth_endpoint` requires `HasHeader<BearerToken>`. Forget it and the code doesn't compile.
- **"Can someone wire up the wrong handler to the wrong route?"** - The handler destructures the exact generated types. Wrong types = compile error.
- **"Does a list endpoint return `TotalCountHeader`?"** - `ListResourceQuery` + `AddTuple` injects the requirement automatically.

None of these need a test. They're all compile errors.

# The compromises

Let's talk about what this costs. Because it costs a lot.

Compile times are terrible. All these generics, proc macros, deeply nested trait bounds - the compiler is doing an absurd amount of work. My M4 MacBook Pro sounds like it's about to take flight every time I hit `cargo build` if rust-analyzer is also running. When I compile, `rustc` sometimes just gets OOMed by the devcontainer. Granted, containers are run inside a VM on mac, but this is on an M4 MacBook Pro with 16GB of RAM, and I've allocated 12GB to the container. With RAM prices the way they are, I can't just throw more hardware at the problem. Also, thanks Apple, for not giving me the option to upgrade my RAM, so even if I could throw more hardware at the problem, I wouldn't be able to. Think different.

So I can't compile inside a devcontainer - the RAM just isn't there. My stupid workaround is: compile locally, use the devcontainer only for dependencies (database, Redis, etc.), and port-forward everything to localhost with VSCode. It works. It's dumb. If someone has a better solution, please write to me.

Hopefully compute gets cheaper over time, hopefully I get better machines, and god oh god please, hopefully somebody in the Rust team has the energy and time to improve compile times. Heck, give me an interpreter that just runs my code. I don't care. I'll take it. But, that's a rant for another day.

So why did I choose this approach? Because context matters. I'm an open source maintainer. Mostly a solo dev. I don't have a QA team. Every time I add a new feature, I need to be sure the previous ones didn't break. Sure, I could ask an LLM to write tests for me - but I still have to review what it writes. No, I'm not _that_ kind of person. LLMs may write code, but I still review and maintain every line. (Most of this was built before LLMs were good enough to handle this kind of thing anyway, but that's beside the point.)

Having things break in my terminal instead of through a user complaining about it - that's what I want. I'm willing to trade compile time for that. More time coding upfront, less time debugging later.

Is it objectively better? Honestly, I don't know. I'm writing about this because I think it's cool.

# Closing thoughts

You still need tests for business logic. Does creating a deployment actually insert the right rows in the database? Does the auth flow issue valid JWTs? Those are questions about _behavior_, and the type system can't answer them.

But the _plumbing_ - is the right handler on the right route with the right method checking the right auth requiring the right headers returning the right response format - all of that is proven by the compiler. For about 150 endpoints and counting.

The type system is the most reliable test suite I've ever used. It runs on every compilation. It's exhaustive. And most importantly - cache invalidation is somebody else's problem.
