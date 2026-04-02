import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = "https://institutionsguiden.dk";

// Static routes
const staticRoutes = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/vuggestue", priority: "0.9", changefreq: "weekly" },
  { path: "/boernehave", priority: "0.9", changefreq: "weekly" },
  { path: "/dagpleje", priority: "0.9", changefreq: "weekly" },
  { path: "/skole", priority: "0.9", changefreq: "weekly" },
  { path: "/sfo", priority: "0.9", changefreq: "weekly" },
  { path: "/fritidsklub", priority: "0.9", changefreq: "weekly" },
  { path: "/efterskole", priority: "0.9", changefreq: "weekly" },
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
const ALL_CATS = ["vuggestue", "boernehave", "dagpleje", "skole", "sfo", "fritidsklub", "efterskole"];
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
  fritidsklub: "fritidsklub",
  efterskole: "efterskole",
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
  const allInstitutionIds = new Set();

  function addInst(munName, cat, monthlyRate) {
    if (!munCatMap.has(munName)) munCatMap.set(munName, {});
    const mc = munCatMap.get(munName);
    if (!mc[cat]) mc[cat] = { count: 0, prices: [] };
    mc[cat].count++;
    if (monthlyRate && monthlyRate > 0) mc[cat].prices.push(monthlyRate);
  }

  for (const s of skoleData.s) {
    if (s.t === "u") continue; // skip ungdomsskoler
    if (s.id) allInstitutionIds.add(s.id.startsWith("edk-") ? `school-${s.id}` : `school-${s.id}`);
    const m = s.m ? s.m.replace(" Kommune", "") : null;
    const cat = s.t === "e" ? "efterskole" : "skole";
    if (m) addInst(m, cat, s.t === "e" ? (s.wp || null) : (s.sfo || null));
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
      if (d.id) allInstitutionIds.add(d.id);
      const cat = forceCat || (d.tp === "dagpleje" ? "dagpleje" : d.tp === "klub" ? "fritidsklub" : d.tp === "sfo" ? "sfo" : d.tp === "boernehave" ? "boernehave" : "vuggestue");
      if (d.m) addInst(d.m, cat, d.mr || null);
    }
  }

  processDagtilbud(vugData, "vuggestue");
  processDagtilbud(bhData, "boernehave");
  processDagtilbud(dagData, null);
  processDagtilbud(sfoData, "sfo");

  return { munCatMap, schoolQualityMuns, allInstitutionIds };
}

// Generate all routes
let kommuneRoutes = [];
let programmaticRoutes = [];
let institutionRoutes = [];
let blogRoutes = [];

try {
  const { munCatMap, schoolQualityMuns, allInstitutionIds } = loadData();
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

  // "Bedste" dagtilbud pages (vuggestue, boernehave, dagpleje, sfo)
  const BEDSTE_CATS = ["vuggestue", "boernehave", "dagpleje", "sfo"];
  for (const mun of municipalities) {
    const mc = munCatMap.get(mun);
    for (const cat of BEDSTE_CATS) {
      const data = mc[cat];
      if (!data || data.count === 0) continue;
      programmaticRoutes.push({
        path: `/bedste-${cat}/${toSlug(mun)}`,
        priority: "0.5",
        changefreq: "monthly",
      });
    }
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

  // Institution detail pages (deduplicated across all data files)
  institutionRoutes = [...allInstitutionIds].map((id) => ({
    path: `/institution/${encodeURIComponent(id)}`,
    priority: "0.7",
    changefreq: "monthly",
  }));
  console.log(`Found ${institutionRoutes.length} unique institution detail pages`);

  console.log(`Generated ${programmaticRoutes.length} programmatic SEO routes`);
} catch (err) {
  console.warn("Could not generate programmatic routes:", err.message);
}

// Fetch blog post slugs from Supabase (if credentials available)
try {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseKey) {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/blog_posts?select=slug&locale=eq.da&order=published_at.desc`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    if (res.ok) {
      const posts = await res.json();
      blogRoutes = posts.map((p) => ({
        path: `/blog/${encodeURIComponent(p.slug)}`,
        priority: "0.6",
        changefreq: "monthly",
      }));
      // Add the blog index page too
      blogRoutes.unshift({ path: "/blog", priority: "0.7", changefreq: "weekly" });
      console.log(`Found ${blogRoutes.length - 1} blog posts`);
    } else {
      console.warn("Blog fetch failed:", res.status, await res.text().catch(() => ""));
    }
  } else {
    console.log("Supabase credentials not found, skipping blog posts in sitemap");
  }
} catch (err) {
  console.warn("Could not fetch blog posts:", err.message);
}

// Use actual data freshness dates instead of today's date
const DATA_LASTMOD = "2026-03-01"; // Matches dataVersions.overall.lastUpdated
const STATIC_LASTMOD = new Date().toISOString().split("T")[0]; // Static pages can use deploy date
const BLOG_LASTMOD = new Date().toISOString().split("T")[0];

const allRoutes = [...staticRoutes, ...kommuneRoutes, ...programmaticRoutes, ...institutionRoutes, ...blogRoutes];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes
  .map(
    (r) => {
      // Static routes use deploy date, data-driven routes use actual data date
      const isStatic = staticRoutes.includes(r);
      const isBlog = blogRoutes.includes(r);
      const lastmod = isStatic ? STATIC_LASTMOD : isBlog ? BLOG_LASTMOD : DATA_LASTMOD;
      return `  <url>
    <loc>${BASE_URL}${r.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`;
    }
  )
  .join("\n")}
</urlset>`;

writeFileSync(resolve(__dirname, "../public/sitemap.xml"), xml);
console.log(`Sitemap generated with ${allRoutes.length} URLs`);
