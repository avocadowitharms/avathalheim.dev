# Articles

Articles are written in Markdown and published as static HTML.

## Add a New Article

1. Create a file in this folder with a URL-friendly filename:

```text
content/articles/my-new-development-log.md
```

2. Add frontmatter:

```yaml
---
title: My New Development Log
description: A short summary used on cards, meta tags, and previews.
date: 2026-06-06
updated: 2026-06-06
tags: [Development, Lessons Learned]
project: Personal
featured: false
draft: false
---
```

3. Write the article below the frontmatter.

4. Run:

```bash
npm run build:articles
```

The script updates `/articles`, each `/articles/[slug]` page, the homepage Latest Articles section, and `sitemap.xml`.

## Preview in VS Code

Use the VS Code Live Preview extension or any local static server from the repository root, then open:

```text
http://localhost:3000/
```

Static generated pages are committed, so GitHub Pages can serve the site without a build step.
