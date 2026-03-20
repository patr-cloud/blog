# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Patr Cloud engineering blog built with Astro 5. Static site with markdown blog posts and Giscus (GitHub Discussions) comments. Deployed to GitHub Pages via GitHub Actions (triggers on push to `main`).

## Commands

- `pnpm dev` — start dev server
- `pnpm build` — production build (output: `dist/`)
- `pnpm preview` — preview production build locally

Package manager: pnpm (lockfile is `pnpm-lock.yaml`). No test or lint commands configured.

## Architecture

- **Content collection**: Posts live in `src/content/posts/` as `.md` files. Schema defined in `src/content/config.ts` — requires `title`, `description`, `pubDate`; optional `tags` and `draft` (draft posts are filtered out of listings and routes).
- **Routing**: `src/pages/index.astro` lists all non-draft posts sorted by date. `src/pages/posts/[...slug].astro` generates static pages for each post via `getStaticPaths`.
- **Layouts**: `BaseLayout.astro` provides the HTML shell, global styles (dark theme, Poppins font), SEO meta tags, and site chrome. `PostLayout.astro` wraps post content with article markup, date/tag display, and the Giscus comment widget.
- **Comments**: `Giscus.astro` component loads the Giscus script. Config (repo, repoId, category, categoryId) is set in `PostLayout.astro`.
- **Styling**: All CSS is scoped or in `BaseLayout.astro` global styles. Dark theme with CSS variables (`--color-bg`, `--color-accent`, etc.). Prose styling uses `.prose` class applied by `PostLayout`.

## Blog Post Frontmatter

```yaml
title: "Post Title"           # required
description: "Summary text"   # required
pubDate: 2026-03-19           # required, coerced to Date
tags: ["tag1", "tag2"]        # optional
draft: false                  # optional, default false
```

## Deployment

GitHub Actions workflow (`.github/workflows/deploy.yml`) builds with `npm ci && npm run build` on push to `main`. The `site` URL in `astro.config.mjs` needs to be updated before deploying to a custom domain.
