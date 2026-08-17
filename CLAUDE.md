# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The patr.cloud main website plus engineering blog, built with Astro. Static site: a landing page at `/` for Patr (open-source, self-hosted PaaS, currently in closed beta) and markdown blog posts under `/blog/` with Giscus (GitHub Discussions) comments. Deployed to GitHub Pages via GitHub Actions (triggers on push to `master`).

Copy tone on the landing page is deliberate: informal, first-person, "idgaf" — modeled on warpgate.null.page. No corporate speak, no testimonials, no logo walls. Keep edits in that voice.

## Commands

- `pnpm dev` — start dev server
- `pnpm build` — production build (output: `dist/`)
- `pnpm preview` — preview production build locally

Package manager: pnpm (lockfile is `pnpm-lock.yaml`). No test or lint commands configured.

## Architecture

- **Blog module**: everything blog-specific is self-contained under `src/blog/` — posts (`src/blog/posts/*.md`), `layouts/PostLayout.astro`, `components/` (Giscus, AuthorCard, TableOfContents), and `data/authors.ts`. Only the route files under `src/pages/blog/` and the shared `BaseLayout` live outside it.
- **Content collection**: Schema defined in `src/content.config.ts` (fixed Astro location), with the glob loader pointed at `src/blog/posts` — requires `title`, `description`, `pubDate`, `author` (must exist in `src/blog/data/authors.ts`); optional `tags` and `draft` (draft posts are filtered out of listings and routes).
- **Routing**: `src/pages/index.astro` is the landing page. `src/pages/blog/index.astro` lists all non-draft posts sorted by date. `src/pages/blog/[...slug].astro` generates static pages for each post via `getStaticPaths`. Legacy `/posts/*` URLs redirect to `/blog/*` via `redirects` in `astro.config.mjs`.
- **Layouts**: `src/layouts/BaseLayout.astro` (shared) provides the HTML shell, global styles (dark theme, Poppins font), SEO meta tags (Open Graph, Twitter card, optional JSON-LD via the `jsonLd` prop), and site chrome. Landing page passes `wide` for a 960px container; blog pages keep the 680px reading measure. `src/blog/layouts/PostLayout.astro` wraps post content with article markup, date/tag display, article OG meta + `BlogPosting` JSON-LD, and the Giscus comment widget.
- **Comments**: `src/blog/components/Giscus.astro` loads the Giscus script (pathname mapping). Config (repo, repoId, category, categoryId) is set in `PostLayout.astro`.
- **Styling**: All CSS is scoped or in `BaseLayout.astro` global styles. Dark theme with CSS variables (`--color-bg`, `--color-accent`, etc.). Prose styling uses `.prose` class applied by `PostLayout`.
- **SEO assets**: `public/robots.txt` (points at the sitemap), `public/og-default.png` (1200×630 default social image), sitemap via `@astrojs/sitemap`.

## Blog Post Frontmatter

```yaml
title: "Post Title"           # required
description: "Summary text"   # required
pubDate: 2026-03-19           # required, coerced to Date
author: "rakshith-ravi"       # required, key into src/data/authors.ts
tags: ["tag1", "tag2"]        # optional
draft: false                  # optional, default false
```

## Deployment

GitHub Actions workflow (`.github/workflows/deploy.yml`) builds with pnpm on push to `master`. `site` in `astro.config.mjs` is `https://patr.cloud`.

Domains (Cloudflare DNS):
- `patr.cloud` (apex) is the GitHub Pages custom domain — set via `public/CNAME`. Apex A records point at GitHub Pages (`185.199.108–111.153`), DNS-only.
- `www.patr.cloud` (CNAME → `patr-cloud.github.io`, DNS-only) is auto-redirected to the apex by GitHub Pages — it's the apex/www pair, no extra config.
- `blog.patr.cloud` is the *old* domain. It's **proxied** through Cloudflare (orange cloud) with a Redirect Rule doing `blog.patr.cloud/posts/{slug}` → 302 → `patr.cloud/blog/{slug}` (dynamic: `concat("https://patr.cloud/blog/", substring(http.request.uri.path, 7))`). Arbitrary subdomains like this can't be served by GitHub Pages alongside the apex, hence the edge redirect.
