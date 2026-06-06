const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const contentDir = path.join(root, "content", "articles");
const articlesDir = path.join(root, "articles");
const siteUrl = "https://avathalheim.dev";
const author = {
  name: "Ava Thalheim",
  title: "Independent Software Developer",
  bio: "I build independent software products, write about product decisions, and document the engineering work behind Flowtime, Drift, and future projects.",
  github: "https://github.com/AvocadoWithArms",
  x: "https://x.com/AvocadoWithArms",
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value = "") {
  return escapeHtml(value).replace(/\n/g, " ");
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseValue(value) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  return trimmed.replace(/^["']|["']$/g, "");
}

function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, body: source };

  const data = {};
  const lines = match[1].split(/\r?\n/);
  let activeKey = null;

  for (const line of lines) {
    const listMatch = line.match(/^\s*-\s+(.*)$/);
    if (listMatch && activeKey) {
      data[activeKey] = data[activeKey] || [];
      data[activeKey].push(parseValue(listMatch[1]));
      continue;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyMatch) continue;

    activeKey = keyMatch[1];
    data[activeKey] = keyMatch[2] === "" ? [] : parseValue(keyMatch[2]);
  }

  return { data, body: match[2].trim() };
}

function inlineMarkdown(text) {
  let output = escapeHtml(text);
  output = output.replace(/`([^`]+)`/g, "<code>$1</code>");
  output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return output;
}

function renderMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  const toc = [];
  let paragraph = [];
  let list = null;
  let inCode = false;
  let code = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  }

  function closeList() {
    if (!list) return;
    html.push(`</${list}>`);
    list = null;
  }

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
        code = [];
        inCode = false;
      } else {
        flushParagraph();
        closeList();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      code.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = line.match(/^(#{2,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      const text = heading[2].trim();
      const id = slugify(text);
      if (level === 2) toc.push({ id, text });
      html.push(`<h${level} id="${id}">${inlineMarkdown(text)}</h${level}>`);
      continue;
    }

    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) {
      flushParagraph();
      closeList();
      html.push(`<figure><img src="${escapeAttr(image[2])}" alt="${escapeAttr(image[1])}" loading="lazy" /></figure>`);
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      if (list !== "ul") {
        closeList();
        list = "ul";
        html.push("<ul>");
      }
      html.push(`<li>${inlineMarkdown(bullet[1])}</li>`);
      continue;
    }

    const numbered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (numbered) {
      flushParagraph();
      if (list !== "ol") {
        closeList();
        list = "ol";
        html.push("<ol>");
      }
      html.push(`<li>${inlineMarkdown(numbered[1])}</li>`);
      continue;
    }

    if (line.startsWith("> ")) {
      flushParagraph();
      closeList();
      html.push(`<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`);
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  closeList();

  return { html: html.join("\n"), toc };
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T12:00:00Z`));
}

function readingTime(markdown) {
  const words = markdown.replace(/```[\s\S]*?```/g, "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function loadArticles() {
  return fs
    .readdirSync(contentDir)
    .filter((file) => file.endsWith(".md") && file.toLowerCase() !== "readme.md")
    .map((file) => {
      const slug = file.replace(/\.md$/, "");
      const source = fs.readFileSync(path.join(contentDir, file), "utf8");
      const { data, body } = parseFrontmatter(source);
      const rendered = renderMarkdown(body);
      return {
        slug,
        title: data.title || slug,
        description: data.description || "",
        date: data.date,
        updated: data.updated || data.date,
        tags: Array.isArray(data.tags) ? data.tags : [],
        project: data.project || "Personal",
        featured: Boolean(data.featured),
        draft: Boolean(data.draft),
        body,
        html: rendered.html,
        toc: rendered.toc,
        readingTime: readingTime(body),
      };
    })
    .filter((article) => !article.draft)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function head({ title, description, canonical, assetPrefix, image = "/assets/favicon.png", type = "website", jsonLd = "" }) {
  const fullTitle = title === "Ava Thalheim" ? title : `${title} | Ava Thalheim`;
  return `  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeAttr(description)}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:title" content="${escapeAttr(fullTitle)}" />
  <meta property="og:description" content="${escapeAttr(description)}" />
  <meta property="og:type" content="${type}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${siteUrl}${image}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeAttr(fullTitle)}" />
  <meta name="twitter:description" content="${escapeAttr(description)}" />
  <meta name="twitter:image" content="${siteUrl}${image}" />
  <link rel="icon" href="${assetPrefix}assets/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="512x512" href="${assetPrefix}assets/favicon.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="${assetPrefix}assets/favicon-32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="${assetPrefix}assets/favicon-16.png" />
  <link rel="apple-touch-icon" href="${assetPrefix}assets/apple-touch-icon.png" />
  <link rel="stylesheet" href="${assetPrefix}styles.css" />
${jsonLd ? `  <script type="application/ld+json">${jsonLd}</script>\n` : ""}`;
}

function siteHeader(current = "", rootPrefix = "../", articlesHref = "index.html") {
  return `<header class="site-header">
      <a class="brand" href="${rootPrefix}index.html">Ava Thalheim</a>
      <nav class="nav site-nav" aria-label="Main navigation">
        <a href="${rootPrefix}index.html#projects">Projects</a>
        <a href="${articlesHref}"${current === "articles" ? ' aria-current="page"' : ""}>Articles</a>
        <a href="${rootPrefix}index.html#now">Now</a>
        <a href="${rootPrefix}index.html#about">About</a>
        <a href="mailto:avocadowitharms@gmail.com">Contact</a>
      </nav>
    </header>`;
}

function authorCard() {
  return `<aside class="author-card" aria-label="Author">
        <p class="eyebrow">Author</p>
        <h2>${author.name}</h2>
        <p><strong>${author.title}</strong></p>
        <p>${author.bio}</p>
        <div class="article-links">
          <a href="https://flowtime-app.com/" target="_blank" rel="noreferrer">Flowtime &nearr;</a>
          <a href="https://driftworkspace.app" target="_blank" rel="noreferrer">Drift &nearr;</a>
          <a href="${author.github}" target="_blank" rel="noreferrer">GitHub &nearr;</a>
          <a href="${author.x}" target="_blank" rel="noreferrer">X &nearr;</a>
        </div>
      </aside>`;
}

function articleCard(article, hrefPrefix = "") {
  return `<article class="article-card" data-title="${escapeAttr(article.title.toLowerCase())}" data-description="${escapeAttr(article.description.toLowerCase())}" data-project="${escapeAttr(article.project)}" data-tags="${escapeAttr(article.tags.join(","))}">
          <div class="article-card-meta">
            <time datetime="${article.date}">${formatDate(article.date)}</time>
            <span>${article.readingTime} min read</span>
            <span>${escapeHtml(article.project)}</span>
          </div>
          <h2><a href="${hrefPrefix}${article.slug}/index.html">${escapeHtml(article.title)}</a></h2>
          <p>${escapeHtml(article.description)}</p>
          <div class="tag-row">${article.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
        </article>`;
}

function buildIndex(articles) {
  const tags = [...new Set(articles.flatMap((article) => article.tags))].sort();
  const projects = [...new Set(articles.map((article) => article.project))].sort();
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Articles",
    description: "Development journal and engineering notes by Ava Thalheim.",
    url: `${siteUrl}/articles/`,
  });

  return `<!doctype html>
<html lang="en">
<head>
${head({
    title: "Articles",
    description: "A personal developer journal about building independent software, Flowtime, Drift, Flutter, product decisions, and technical experiments.",
    canonical: `${siteUrl}/articles/`,
    assetPrefix: "../",
    jsonLd,
  })}</head>
<body>
  <main class="page article-page">
    ${siteHeader("articles", "../", "index.html")}
    <section class="articles-hero">
      <p class="eyebrow">Development Journal</p>
      <h1>&lt;Articles&gt;</h1>
      <p>Notes from building independent software: project updates, technical decisions, launch stories, experiments, and lessons learned.</p>
    </section>

    <section class="article-controls" aria-label="Article filters">
      <label>
        <span>Search</span>
        <input id="article-search" type="search" placeholder="Search articles" />
      </label>
      <label>
        <span>Tag</span>
        <select id="tag-filter">
          <option value="">All tags</option>
          ${tags.map((tag) => `<option value="${escapeAttr(tag)}">${escapeHtml(tag)}</option>`).join("")}
        </select>
      </label>
      <label>
        <span>Project</span>
        <select id="project-filter">
          <option value="">All projects</option>
          ${projects.map((project) => `<option value="${escapeAttr(project)}">${escapeHtml(project)}</option>`).join("")}
        </select>
      </label>
    </section>

    <section class="article-list" id="article-list" aria-live="polite">
      ${articles.map((article) => articleCard(article)).join("\n")}
    </section>
    <p class="empty-state" id="article-empty" hidden>No articles match those filters.</p>

    ${authorCard()}
    ${siteFooter()}
  </main>
  <script src="articles.js"></script>
</body>
</html>
`;
}

function articlePage(article, articles) {
  const index = articles.findIndex((item) => item.slug === article.slug);
  const previous = articles[index + 1];
  const next = articles[index - 1];
  const related = articles
    .filter((item) => item.slug !== article.slug)
    .map((item) => ({
      ...item,
      score: item.tags.filter((tag) => article.tags.includes(tag)).length + (item.project === article.project ? 2 : 0),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.date) - new Date(a.date))
    .slice(0, 3);
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    dateModified: article.updated,
    author: {
      "@type": "Person",
      name: author.name,
      jobTitle: author.title,
      url: siteUrl,
    },
    mainEntityOfPage: `${siteUrl}/articles/${article.slug}/`,
  });

  return `<!doctype html>
<html lang="en">
<head>
${head({
    title: article.title,
    description: article.description,
    canonical: `${siteUrl}/articles/${article.slug}/`,
    assetPrefix: "../../",
    type: "article",
    jsonLd,
  })}</head>
<body>
  <main class="page article-page">
    ${siteHeader("articles", "../../", "../index.html")}
    <article class="article-shell">
      <header class="article-header">
        <a class="back-link" href="../index.html">&larr; Articles</a>
        <p class="eyebrow">${escapeHtml(article.project)}</p>
        <h1>${escapeHtml(article.title)}</h1>
        <p class="article-description">${escapeHtml(article.description)}</p>
        <div class="article-meta">
          <span>${author.name}</span>
          <time datetime="${article.date}">${formatDate(article.date)}</time>
          <span>${article.readingTime} min read</span>
        </div>
        <div class="tag-row">${article.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
      </header>

      <div class="article-layout${article.toc.length ? " has-toc" : " no-toc"}">
        ${article.toc.length ? `<aside class="toc" aria-label="Table of contents">
          <p class="eyebrow">Contents</p>
          ${article.toc.map((item) => `<a href="#${item.id}">${escapeHtml(item.text)}</a>`).join("")}
        </aside>` : ""}
        <div class="article-content">
          ${article.html}
        </div>
      </div>
    </article>

    <nav class="article-neighbors" aria-label="Article navigation">
      ${previous ? `<a href="../${previous.slug}/index.html"><span>Previous</span>${escapeHtml(previous.title)}</a>` : "<span></span>"}
      ${next ? `<a href="../${next.slug}/index.html"><span>Next</span>${escapeHtml(next.title)}</a>` : "<span></span>"}
    </nav>

    ${related.length ? `<section class="section related-articles">
      <h2>&lt;Related Articles&gt;</h2>
      <div class="article-list compact">${related.map((item) => articleCard(item, "../")).join("")}</div>
    </section>` : ""}

    ${authorCard()}
    ${siteFooter()}
  </main>
</body>
</html>
`;
}

function siteFooter() {
  return `<footer class="footer">
      <strong>&lt;/Software Engineer&gt;</strong>
      <div class="footer-meta">
        <a class="footer-pill coffee-link" href="https://buymeacoffee.com/avocadowita" target="_blank" rel="noopener noreferrer">
          <span>Buy me a coffee</span>
        </a>
        <span>&copy; 2026 Ava Thalheim</span>
      </div>
    </footer>`;
}

function buildArticlesJs() {
  return `const searchInput = document.querySelector("#article-search");
const tagFilter = document.querySelector("#tag-filter");
const projectFilter = document.querySelector("#project-filter");
const cards = [...document.querySelectorAll(".article-card")];
const empty = document.querySelector("#article-empty");

function applyFilters() {
  const query = searchInput.value.trim().toLowerCase();
  const tag = tagFilter.value;
  const project = projectFilter.value;
  let visible = 0;

  for (const card of cards) {
    const matchesSearch = !query || card.dataset.title.includes(query) || card.dataset.description.includes(query);
    const matchesTag = !tag || card.dataset.tags.split(",").includes(tag);
    const matchesProject = !project || card.dataset.project === project;
    const show = matchesSearch && matchesTag && matchesProject;
    card.hidden = !show;
    if (show) visible += 1;
  }

  empty.hidden = visible !== 0;
}

[searchInput, tagFilter, projectFilter].forEach((control) => {
  control.addEventListener("input", applyFilters);
  control.addEventListener("change", applyFilters);
});
`;
}

function updateHomepage(articles) {
  const homePath = path.join(root, "index.html");
  const home = fs.readFileSync(homePath, "utf8");
  const latest = articles.slice(0, 4).map((article) => `<article class="article-card">
        <div class="article-card-meta">
          <time datetime="${article.date}">${formatDate(article.date)}</time>
          <span>${article.readingTime} min read</span>
        </div>
        <h3><a href="articles/${article.slug}/index.html">${escapeHtml(article.title)}</a></h3>
        <p>${escapeHtml(article.description)}</p>
      </article>`).join("\n");
  const section = `<section id="articles" class="section latest-articles">
      <div class="section-heading">
        <h2>&lt;Latest Articles&gt;</h2>
        <a class="project-link" href="articles/index.html">View all articles &rarr;</a>
      </div>
      <div class="article-list compact">
        ${latest}
      </div>
    </section>`;
  const next = home.replace(/<!-- ARTICLES_START -->[\s\S]*?<!-- ARTICLES_END -->/, `<!-- ARTICLES_START -->\n    ${section}\n    <!-- ARTICLES_END -->`);
  fs.writeFileSync(homePath, next);
}

function writeSitemap(articles) {
  const urls = [
    { loc: `${siteUrl}/`, priority: "1.0" },
    { loc: `${siteUrl}/articles/`, priority: "0.9" },
    ...articles.map((article) => ({
      loc: `${siteUrl}/articles/${article.slug}/`,
      lastmod: article.updated,
      priority: article.featured ? "0.8" : "0.7",
    })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>
    <loc>${url.loc}</loc>
${url.lastmod ? `    <lastmod>${url.lastmod}</lastmod>\n` : ""}    <priority>${url.priority}</priority>
  </url>`).join("\n")}
</urlset>
`;
  fs.writeFileSync(path.join(root, "sitemap.xml"), xml);
}

function main() {
  ensureDir(articlesDir);
  const articles = loadArticles();
  const publishedSlugs = new Set(articles.map((article) => article.slug));

  for (const entry of fs.readdirSync(articlesDir, { withFileTypes: true })) {
    if (entry.isDirectory() && !publishedSlugs.has(entry.name)) {
      fs.rmSync(path.join(articlesDir, entry.name), { recursive: true, force: true });
    }
  }

  fs.writeFileSync(path.join(articlesDir, "index.html"), buildIndex(articles));
  fs.writeFileSync(path.join(articlesDir, "articles.js"), buildArticlesJs());

  for (const article of articles) {
    const outDir = path.join(articlesDir, article.slug);
    ensureDir(outDir);
    fs.writeFileSync(path.join(outDir, "index.html"), articlePage(article, articles));
  }

  updateHomepage(articles);
  writeSitemap(articles);
  console.log(`Built ${articles.length} articles.`);
}

main();
