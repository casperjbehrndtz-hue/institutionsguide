#!/usr/bin/env node
/**
 * Post-build: pre-renders core pages with correct SEO meta tags.
 *
 * For each page:
 *  1. Reads dist/index.html as template
 *  2. Injects page-specific <title>, <meta description>, <link canonical>
 *  3. Writes dist/[path]/index.html
 *
 * Result: Googlebot gets correct meta immediately — no JS rendering needed.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "../dist");
const SITE_URL = "https://institutionsguide.dk";

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Static pages
const PAGES = [
  {
    path: "/vuggestue",
    title: "Vuggestuer i Danmark — Sammenlign priser og kvalitet | Institutionsguide",
    description: "Find og sammenlign vuggestuer (0-2 år) i alle 98 kommuner. Se priser, ejerskab og beregn fripladstilskud.",
  },
  {
    path: "/boernehave",
    title: "Børnehaver i Danmark — Sammenlign børnehaver | Institutionsguide",
    description: "Sammenlign børnehaver (3-5 år) i hele landet. Se kommunale, selvejende og private børnehaver med priser.",
  },
  {
    path: "/dagpleje",
    title: "Dagplejere i Danmark — Find dagpleje | Institutionsguide",
    description: "Find dagpleje (0-2 år) i din kommune. Ofte et billigere alternativ til vuggestue med højere voksen-barn ratio.",
  },
  {
    path: "/skole",
    title: "Skoler i Danmark — Folkeskoler og friskoler med kvalitetsdata | Institutionsguide",
    description: "Sammenlign folkeskoler og friskoler med kvalitetsdata: trivsel, karaktersnit, fravær og kompetencedækning.",
  },
  {
    path: "/sfo",
    title: "SFO og fritidsordninger i Danmark | Institutionsguide",
    description: "Find SFO-tilbud (6-9 år) i din kommune. Se priser og sammenlign med andre fritidsordninger.",
  },
  {
    path: "/sammenlign",
    title: "Sammenlign institutioner side om side | Institutionsguide",
    description: "Sammenlign op til 4 vuggestuer, børnehaver, dagplejere eller skoler side om side. Se priser, kvalitet og beliggenhed.",
  },
  {
    path: "/privatliv",
    title: "Privatlivspolitik | Institutionsguide",
    description: "Læs om hvordan Institutionsguide behandler dine persondata i overensstemmelse med GDPR.",
  },
  {
    path: "/vilkaar",
    title: "Vilkår og betingelser | Institutionsguide",
    description: "Vilkår for brug af Institutionsguide. Alle data er vejledende og udgør ikke rådgivning.",
  },
];

// Generate municipality pages from school data
function getMunicipalityPages() {
  try {
    const dataPath = path.join(__dirname, "../public/data/skole-data.json");
    const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    const municipalities = new Set();
    for (const s of data.s) {
      if (s.m) municipalities.add(s.m.replace(" Kommune", ""));
    }
    return [...municipalities].sort().map((name) => ({
      path: `/kommune/${encodeURIComponent(name)}`,
      title: `${name} Kommune — Institutioner, priser og kvalitet | Institutionsguide`,
      description: `Oversigt over vuggestuer, børnehaver, dagplejere og skoler i ${name} Kommune. Se kommunale takster, kvalitetsdata og beregn fripladstilskud.`,
    }));
  } catch {
    console.warn("[prerender] Could not read school data for municipality pages");
    return [];
  }
}

function jsonLdTag(data) {
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Institutionsguide",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

function breadcrumbJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

function buildPage(shellHtml, page) {
  const canonical = `${SITE_URL}${page.path}`;

  let html = shellHtml
    .replace(/<title>.*?<\/title>/, `<title>${esc(page.title)}</title>`)
    .replace(
      /<meta name="description" content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${esc(page.description)}" />`
    );

  // Replace canonical
  html = html.replace(
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${esc(canonical)}" />`
  );

  // Replace OG title/description
  html = html.replace(
    /<meta property="og:title" content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${esc(page.title)}" />`
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${esc(page.description)}" />`
  );

  // Inject JSON-LD structured data before </head>
  let jsonLd = "";
  if (page.path === "/") {
    // Homepage: WebSite schema
    jsonLd = jsonLdTag(websiteJsonLd());
  } else if (page.path.startsWith("/kommune/")) {
    // Municipality page: BreadcrumbList
    const kommuneName = decodeURIComponent(page.path.replace("/kommune/", ""));
    jsonLd = jsonLdTag(breadcrumbJsonLd([
      { name: "Forside", url: `${SITE_URL}/` },
      { name: `${kommuneName} Kommune`, url: `${SITE_URL}${page.path}` },
    ]));
  } else if (["/vuggestue", "/boernehave", "/dagpleje", "/skole", "/sfo"].includes(page.path)) {
    // Category page: BreadcrumbList
    jsonLd = jsonLdTag(breadcrumbJsonLd([
      { name: "Forside", url: `${SITE_URL}/` },
      { name: page.title.split(" — ")[0], url: `${SITE_URL}${page.path}` },
    ]));
  }

  if (jsonLd) {
    html = html.replace("</head>", `${jsonLd}\n</head>`);
  }

  return html;
}

// ---------------------------------------------------------------------------
// Programmatic SEO page generation
// ---------------------------------------------------------------------------

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

const CATEGORY_LABELS = {
  vuggestue: "Vuggestuer",
  boernehave: "Børnehaver",
  dagpleje: "Dagplejere",
  skole: "Skoler",
  sfo: "SFO",
};

const CATEGORY_SINGULAR = {
  vuggestue: "vuggestue",
  boernehave: "børnehave",
  dagpleje: "dagpleje",
  skole: "skole",
  sfo: "SFO",
};

const DAYCARE_CATS = ["vuggestue", "boernehave", "dagpleje"];
const ALL_CATS = ["vuggestue", "boernehave", "dagpleje", "skole", "sfo"];
const VS_PAIRS = [
  ["vuggestue", "dagpleje"],
  ["vuggestue", "boernehave"],
  ["boernehave", "sfo"],
];

function loadAllData() {
  const DATA_DIR = path.join(__dirname, "../public/data");

  const skoleData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "skole-data.json"), "utf-8"));
  const vugData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "vuggestue-data.json"), "utf-8"));
  const bhData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "boernehave-data.json"), "utf-8"));
  const dagData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "dagpleje-data.json"), "utf-8"));
  let sfoData = { i: [] };
  try {
    sfoData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "sfo-data.json"), "utf-8"));
  } catch { /* sfo optional */ }

  // Build municipality -> category -> institution count + price stats
  const munCatMap = new Map(); // munName -> { catName -> { count, prices[] } }

  function addInst(munName, cat, monthlyRate) {
    if (!munCatMap.has(munName)) munCatMap.set(munName, {});
    const mc = munCatMap.get(munName);
    if (!mc[cat]) mc[cat] = { count: 0, prices: [] };
    mc[cat].count++;
    if (monthlyRate && monthlyRate > 0) mc[cat].prices.push(monthlyRate);
  }

  // Schools
  for (const s of skoleData.s) {
    const m = s.m ? s.m.replace(" Kommune", "") : null;
    if (m) addInst(m, "skole", s.sfo || null);
  }

  // Schools with quality data
  const schoolQualityMuns = new Set();
  for (const s of skoleData.s) {
    if (s.q && s.q.r !== undefined) {
      const m = s.m ? s.m.replace(" Kommune", "") : null;
      if (m) schoolQualityMuns.add(m);
    }
  }

  // Dagtilbud helper
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

function generateProgrammaticPages() {
  const { munCatMap, schoolQualityMuns } = loadAllData();
  const pages = [];
  const municipalities = [...munCatMap.keys()].sort();

  // 1. Category + Municipality pages
  for (const mun of municipalities) {
    const mc = munCatMap.get(mun);
    for (const cat of ALL_CATS) {
      const data = mc[cat];
      if (!data || data.count === 0) continue;
      const label = CATEGORY_LABELS[cat];
      const slug = toSlug(mun);
      const avg = data.prices.length > 0 ? Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length) : null;

      pages.push({
        path: `/${cat}/${slug}`,
        title: `${label} i ${mun} 2026 — Priser og sammenligning | Institutionsguide`,
        description: `Der er ${data.count} ${label.toLowerCase()} i ${mun} Kommune.${avg ? ` Gennemsnitlig månedlig takst: ${avg} kr.` : ""} Se priser, kontakt og sammenlign.`,
      });
    }
  }

  // 2. "Billigste" pages (daycare types only)
  for (const mun of municipalities) {
    const mc = munCatMap.get(mun);
    for (const cat of DAYCARE_CATS) {
      const data = mc[cat];
      if (!data || data.prices.length === 0) continue;
      const singular = CATEGORY_SINGULAR[cat];
      const slug = toSlug(mun);
      const minPrice = Math.min(...data.prices);

      pages.push({
        path: `/billigste-${cat}/${slug}`,
        title: `Billigste ${singular} i ${mun} 2026 — Fra ${minPrice.toLocaleString("da-DK")} kr/md | Institutionsguide`,
        description: `Se de billigste ${CATEGORY_LABELS[cat].toLowerCase()} i ${mun} Kommune rangeret efter pris. Billigste fra ${minPrice.toLocaleString("da-DK")} kr/md.`,
      });
    }
  }

  // 3. "Bedste skole" pages
  for (const mun of schoolQualityMuns) {
    const slug = toSlug(mun);
    pages.push({
      path: `/bedste-skole/${slug}`,
      title: `Bedste skoler i ${mun} 2026 — Kvalitetsranking | Institutionsguide`,
      description: `Se de bedste skoler i ${mun} rangeret efter kvalitetsdata: trivsel, karaktersnit, fravær og kompetencedækning.`,
    });
  }

  // 4. VS comparison pages
  for (const mun of municipalities) {
    const mc = munCatMap.get(mun);
    for (const [catA, catB] of VS_PAIRS) {
      const dataA = mc[catA];
      const dataB = mc[catB];
      if (!dataA || dataA.count === 0 || !dataB || dataB.count === 0) continue;
      const singA = CATEGORY_SINGULAR[catA];
      const singB = CATEGORY_SINGULAR[catB];
      const slug = toSlug(mun);

      pages.push({
        path: `/sammenlign/${catA}-vs-${catB}/${slug}`,
        title: `${singA.charAt(0).toUpperCase() + singA.slice(1)} vs ${singB} i ${mun} 2026 — Pris og forskelle | Institutionsguide`,
        description: `Sammenlign ${singA} og ${singB} i ${mun}. ${dataA.count} ${CATEGORY_LABELS[catA].toLowerCase()} vs. ${dataB.count} ${CATEGORY_LABELS[catB].toLowerCase()}. Se priser og forskelle.`,
      });
    }
  }

  return pages;
}

function main() {
  const shellPath = path.join(DIST, "index.html");
  if (!fs.existsSync(shellPath)) {
    console.error("[prerender] dist/index.html not found — run vite build first");
    process.exit(1);
  }

  const shellHtml = fs.readFileSync(shellPath, "utf-8");

  let programmaticPages = [];
  try {
    programmaticPages = generateProgrammaticPages();
    console.log(`[prerender] Generated ${programmaticPages.length} programmatic SEO pages`);
  } catch (err) {
    console.warn("[prerender] Could not generate programmatic pages:", err.message);
  }

  const allPages = [...PAGES, ...getMunicipalityPages(), ...programmaticPages];
  console.log(`[prerender] Total pages to render: ${allPages.length}`);

  let count = 0;
  for (const page of allPages) {
    try {
      const html = buildPage(shellHtml, page);
      const dir = path.join(DIST, decodeURIComponent(page.path.slice(1)));
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "index.html"), html, "utf-8");
      count++;
    } catch (err) {
      console.warn(`[prerender] Failed for ${page.path}:`, err.message);
    }
  }

  console.log(`[prerender] Done — ${count}/${allPages.length} pages pre-rendered`);
}

main();
