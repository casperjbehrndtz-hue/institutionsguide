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

const DANISH_MAP = { "æ": "ae", "ø": "oe", "å": "aa", "Æ": "Ae", "Ø": "Oe", "Å": "Aa" };

function toSlug(name) {
  return name
    .replace(/[æøåÆØÅ]/g, (ch) => DANISH_MAP[ch] || ch)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const DAYCARE_CATS = ["vuggestue", "boernehave", "dagpleje"];
const ALL_CATS = ["vuggestue", "boernehave", "dagpleje", "skole", "sfo"];
const VS_PAIRS = [
  ["vuggestue", "dagpleje"],
  ["vuggestue", "boernehave"],
  ["boernehave", "sfo"],
];

const CATEGORY_SINGULAR = {
  vuggestue: "vuggestue",
  boernehave: "boernehave",
  dagpleje: "dagpleje",
  skole: "skole",
  sfo: "sfo",
};

function loadData() {
  const DATA_DIR = resolve(__dirname, "../public/data");
  const skoleData = JSON.parse(readFileSync(resolve(DATA_DIR, "skole-data.json"), "utf-8"));
  const vugData = JSON.parse(readFileSync(resolve(DATA_DIR, "vuggestue-data.json"), "utf-8"));
  const bhData = JSON.parse(readFileSync(resolve(DATA_DIR, "boernehave-data.json"), "utf-8"));
  const dagData = JSON.parse(readFileSync(resolve(DATA_DIR, "dagpleje-data.json"), "utf-8"));
  let sfoData = { i: [] };
  try {
    sfoData = JSON.parse(readFileSync(resolve(DATA_DIR, "sfo-data.json"), "utf-8"));
  } catch { /* optional */ }

  const munCatMap = new Map();

  function addInst(munName, cat, monthlyRate) {
    if (!munCatMap.has(munName)) munCatMap.set(munName, {});
    const mc = munCatMap.get(munName);
    if (!mc[cat]) mc[cat] = { count: 0, prices: [] };
    mc[cat].count++;
    if (monthlyRate && monthlyRate > 0) mc[cat].prices.push(monthlyRate);
  }

  for (const s of skoleData.s) {
    const m = s.m ? s.m.replace(" Kommune", "") : null;
    if (m) addInst(m, "skole", s.sfo || null);
  }

  const schoolQualityMuns = new Set();
  for (const s of skoleData.s) {
    if (s.q && s.q.r !== undefined) {
      const m = s.m ? s.m.replace(" Kommune", "") : null;
      if (m) schoolQualityMuns.add(m);
    }
  }

  function processDagtilbud(data, forceCat) {
    for (const d of data.i) {
      const cat = forceCat || (d.tp === "dagpleje" ? "dagpleje" : d.tp === "sfo" || d.tp === "klub" ? "sfo" : d.tp === "boernehave" ? "boernehave" : "vuggestue");
      if (d.m) addInst(d.m, cat, d.mr || null);
    }
  }

  processDagtilbud(vugData, "vuggestue");
  processDagtilbud(bhData, "boernehave");
  processDagtilbud(dagData, null);
  processDagtilbud(sfoData, "sfo");

  return { munCatMap, schoolQualityMuns };
}

// Generate all routes
let kommuneRoutes = [];
let programmaticRoutes = [];

try {
  const { munCatMap, schoolQualityMuns } = loadData();
  const municipalities = [...munCatMap.keys()].sort();

  // Municipality routes
  kommuneRoutes = municipalities.map((name) => ({
    path: `/kommune/${encodeURIComponent(name)}`,
    priority: "0.6",
    changefreq: "monthly",
  }));
  console.log(`Found ${kommuneRoutes.length} municipalities`);

  // Category + municipality pages
  for (const mun of municipalities) {
    const mc = munCatMap.get(mun);
    for (const cat of ALL_CATS) {
      const data = mc[cat];
      if (!data || data.count === 0) continue;
      programmaticRoutes.push({
        path: `/${cat}/${toSlug(mun)}`,
        priority: "0.5",
        changefreq: "monthly",
      });
    }
  }

  // "Billigste" pages
  for (const mun of municipalities) {
    const mc = munCatMap.get(mun);
    for (const cat of DAYCARE_CATS) {
      const data = mc[cat];
      if (!data || data.prices.length === 0) continue;
      programmaticRoutes.push({
        path: `/billigste-${cat}/${toSlug(mun)}`,
        priority: "0.5",
        changefreq: "monthly",
      });
    }
  }

  // "Bedste skole" pages
  for (const mun of schoolQualityMuns) {
    programmaticRoutes.push({
      path: `/bedste-skole/${toSlug(mun)}`,
      priority: "0.5",
      changefreq: "monthly",
    });
  }

  // VS comparison pages
  for (const mun of municipalities) {
    const mc = munCatMap.get(mun);
    for (const [catA, catB] of VS_PAIRS) {
      const dataA = mc[catA];
      const dataB = mc[catB];
      if (!dataA || dataA.count === 0 || !dataB || dataB.count === 0) continue;
      programmaticRoutes.push({
        path: `/sammenlign/${catA}-vs-${catB}/${toSlug(mun)}`,
        priority: "0.4",
        changefreq: "monthly",
      });
    }
  }

  console.log(`Generated ${programmaticRoutes.length} programmatic SEO routes`);
} catch (err) {
  console.warn("Could not generate programmatic routes:", err.message);
}

const today = new Date().toISOString().split("T")[0];
const allRoutes = [...staticRoutes, ...kommuneRoutes, ...programmaticRoutes];

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
