import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(__dirname, "../public");
const BASE_URL = "https://www.institutionsguiden.dk";

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildItem(post) {
  const pubDate = new Date(post.published_at).toUTCString();
  const link = `${BASE_URL}/blog/${encodeURIComponent(post.slug)}`;
  return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.excerpt || post.title)}</description>
    </item>`;
}

async function main() {
  let items = [];

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/blog_posts?select=slug,title,excerpt,published_at&locale=eq.da&order=published_at.desc&limit=50`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      );
      if (res.ok) {
        const posts = await res.json();
        items = posts.map(buildItem);
        console.log(`RSS: Found ${posts.length} blog posts`);
      } else {
        console.warn("RSS: Blog fetch failed:", res.status);
      }
    } else {
      console.log("RSS: Supabase credentials not found, generating channel-only feed");
    }
  } catch (err) {
    console.warn("RSS: Could not fetch blog posts:", err.message);
  }

  const lastBuildDate = new Date().toUTCString();

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Institutionsguide Blog</title>
    <link>${BASE_URL}/blog</link>
    <description>Guides og artikler om b\u00f8rnepasning, skoler og daginstitutioner i Danmark</description>
    <language>da</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items.join("\n")}
  </channel>
</rss>`;

  writeFileSync(resolve(PUBLIC_DIR, "feed.xml"), feed, "utf-8");
  console.log("RSS: feed.xml generated");
}

main();
