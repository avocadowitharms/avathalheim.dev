# Publishing Articles

This site uses Markdown as the source of truth for Articles.

## Create an Article

Add a Markdown file to:

```text
content/articles/
```

Use a URL-friendly filename. The filename becomes the route:

```text
content/articles/my-release-update.md
/articles/my-release-update/
```

## Frontmatter

```yaml
---
title: My Release Update
description: A short summary for cards, SEO, and previews.
date: 2026-06-06
updated: 2026-06-06
tags: [Development, Launch]
project: Personal
featured: false
draft: false
---
```

Supported fields:

- `title`
- `description`
- `date`
- `updated`
- `tags`
- `project`
- `featured`
- `draft`

Draft articles are skipped when `draft: true`.

## Publish

Run:

```bash
npm run build:articles
```

The generator updates:

- `/articles/`
- `/articles/[slug]/`
- Homepage Latest Articles
- `sitemap.xml`

## Preview in VS Code

Use VS Code Live Preview from the repository root. The workspace setting opens `/index.html` by default, and root-relative article links work through the preview server.
