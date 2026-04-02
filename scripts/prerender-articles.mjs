#!/usr/bin/env node
/**
 * Pre-renders blog article pages as static HTML for SEO.
 * Run after build: node scripts/prerender-articles.mjs
 *
 * Creates dist/blog/<slug>/index.html with meta tags and article content
 * so crawlers can index blog posts without JavaScript.
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { resolve } from "path";

const SITE = "https://institutionsguiden.dk";
const DIST = resolve(import.meta.dirname, "../dist");

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(post, shellHtml) {
  const title = escapeHtml(post.meta_title || post.title);
  const description = escapeHtml(post.meta_description || "");
  const url = `${SITE}/blog/${post.slug}`;
  const publishedAt = post.published_at || new Date().toISOString();

  const metaTags = `
    <title>${title} — Institutionsguide</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${url}" />
    <link rel="alternate" hreflang="da" href="${url}" />
    <link rel="alternate" hreflang="x-default" href="${url}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:type" content="article" />
    <meta property="article:published_time" content="${publishedAt}" />
    <meta property="og:image" content="${SITE}/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:locale" content="da_DK" />
    <meta property="og:site_name" content="Institutionsguide" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${SITE}/og-image.png" />
    <script type="application/ld+json">
    ${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.meta_title || post.title,
      description: post.meta_description || "",
      datePublished: publishedAt,
      ...(post.updated_at ? { dateModified: post.updated_at } : {}),
      author: { "@type": "Organization", name: "Institutionsguide" },
      publisher: { "@type": "Organization", name: "Institutionsguide" },
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      inLanguage: "da",
      isAccessibleForFree: true,
      speakable: {
        "@type": "SpeakableSpecification",
        cssSelector: [".answer-box", "h2", ".faq-answer"],
      },
    })}
    </script>
  `;

  const articleContent = `
    <noscript>
      <article style="max-width:680px;margin:2rem auto;padding:0 1rem;font-family:system-ui,sans-serif">
        <nav aria-label="Breadcrumb"><a href="/">Institutionsguide</a> › <a href="/blog">Blog</a> › ${title}</nav>
        <h1>${title}</h1>
        ${post.content_html || ""}
      </article>
    </noscript>
  `;

  let html = shellHtml;
  html = html.replace(/<title>[^<]*<\/title>/, metaTags);
  html = html.replace("</body>", `${articleContent}</body>`);

  return html;
}

async function main() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn("⚠ Supabase credentials not found — skipping article pre-rendering.");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: posts, error } = await supabase
    .from("blog_posts")
    .select("slug, title, meta_title, meta_description, content_html, published_at, updated_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch blog posts:", error.message);
    process.exit(1);
  }

  if (!posts || posts.length === 0) {
    console.log("No published blog posts to pre-render.");
    return;
  }

  const shellPath = resolve(DIST, "index.html");
  const shellHtml = readFileSync(shellPath, "utf-8");

  let count = 0;
  for (const post of posts) {
    const dir = resolve(DIST, "blog", post.slug);
    mkdirSync(dir, { recursive: true });

    const html = buildHtml(post, shellHtml);
    writeFileSync(resolve(dir, "index.html"), html, "utf-8");
    count++;
  }

  console.log(`✓ Pre-rendered ${count} blog articles.`);
}

main().catch((err) => {
  console.error("Article pre-rendering failed:", err);
  process.exit(1);
});
