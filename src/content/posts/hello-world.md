---
title: "Hello World"
description: "The first post on this blog — a quick intro and how it all works."
pubDate: 2026-03-19
tags: ["meta"]
---

Welcome. This is the first post.

## Writing new posts

Add a `.md` file to `src/content/posts/`. The filename becomes the URL:
`my-new-post.md` → `/posts/my-new-post`.

Every post needs this frontmatter block at the top:

```md
---
title: "Your Post Title"
description: "A short description for SEO and the post list."
pubDate: 2026-03-19
tags: ["optional", "tags"]
---
```

Set `draft: true` to commit a post without publishing it.

## Markdown features

**Bold**, _italic_, ~~strikethrough~~, `inline code`.

> Blockquotes work too.

Code blocks get syntax highlighting automatically:

```typescript
function greet(name: string): string {
  return `Hello, ${name}!`;
}
```

Images, links, lists, tables — standard Markdown, all supported.

## Comments

Comments are powered by [Giscus](https://giscus.app), backed by GitHub Discussions.
Sign in with your GitHub account to leave a comment below.
