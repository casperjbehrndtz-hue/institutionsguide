import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = "https://institutionsguide.dk";

// Static routes
const staticRoutes = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/vuggestue", priority: "0.9", changefreq: "weekly" },
  { path: "/boernehave", priority: "0.9", changefreq: "weekly" },
  { path: "/dagpleje", priority: "0.9", changefreq: "weekly" },
  { path: "/skole", priority: "0.9", changefreq: "weekly" },
  { path: "/sfo", priority: "0.9", changefreq: "weekly" },
  { path: "/sammenlign", priority: "0.7", changefreq: "monthly" },
  { path: "/privatliv", priority: "0.3", changefreq: "yearly" },
  { path: "/vilkaar", priority: "0.3", changefreq: "yearly" },
];

// Extract municipality names from data files
let kommuneRoutes = [];
try {
  const skoleData = JSON.parse(
    readFileSync(resolve(__dirname, "../public/data/skole-data.json"), "utf-8")
  );
  const municipalities = new Set();
  for (const s of skoleData.s) {
    if (s.m) municipalities.add(s.m.replace(" Kommune", ""));
  }
  kommuneRoutes = [...municipalities].sort().map((name) => ({
    path: `/kommune/${encodeURIComponent(name)}`,
    priority: "0.6",
    changefreq: "monthly",
  }));
  console.log(`Found ${kommuneRoutes.length} municipalities`);
} catch {
  console.warn("Could not read school data for municipality routes");
}

const today = new Date().toISOString().split("T")[0];
const allRoutes = [...staticRoutes, ...kommuneRoutes];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes
  .map(
    (r) => `  <url>
    <loc>${BASE_URL}${r.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

writeFileSync(resolve(__dirname, "../public/sitemap.xml"), xml);
console.log(`Sitemap generated with ${allRoutes.length} URLs`);
