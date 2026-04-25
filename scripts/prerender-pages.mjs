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
const SITE_URL = "https://www.institutionsguiden.dk";

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
    title: "Vuggestuer i Danmark — Sammenlign priser og kvalitet | Institutionsguiden",
    description: "Find og sammenlign vuggestuer (0-2 år) i alle 98 kommuner. Se priser, ejerskab og beregn fripladstilskud.",
  },
  {
    path: "/boernehave",
    title: "Børnehaver i Danmark — Sammenlign børnehaver | Institutionsguiden",
    description: "Sammenlign børnehaver (3-5 år) i hele landet. Se kommunale, selvejende og private børnehaver med priser.",
  },
  {
    path: "/dagpleje",
    title: "Dagplejere i Danmark — Find dagpleje | Institutionsguiden",
    description: "Find dagpleje (0-2 år) i din kommune. Ofte et billigere alternativ til vuggestue med højere voksen-barn ratio.",
  },
  {
    path: "/skole",
    title: "Skoler i Danmark — Folkeskoler og friskoler med kvalitetsdata | Institutionsguiden",
    description: "Sammenlign folkeskoler og friskoler med kvalitetsdata: trivsel, karaktersnit, fravær og kompetencedækning.",
  },
  {
    path: "/sfo",
    title: "SFO og fritidsordninger i Danmark | Institutionsguiden",
    description: "Find SFO-tilbud (6-9 år) i din kommune. Se priser og sammenlign med andre fritidsordninger.",
  },
  {
    path: "/sammenlign",
    title: "Sammenlign institutioner side om side | Institutionsguiden",
    description: "Sammenlign op til 4 vuggestuer, børnehaver, dagplejere eller skoler side om side. Se priser, kvalitet og beliggenhed.",
  },
  {
    path: "/privatliv",
    title: "Privatlivspolitik | Institutionsguiden",
    description: "Læs om hvordan Institutionsguiden behandler dine persondata i overensstemmelse med GDPR.",
  },
  {
    path: "/vilkaar",
    title: "Vilkår og betingelser | Institutionsguiden",
    description: "Vilkår for brug af Institutionsguiden. Alle data er vejledende og udgør ikke rådgivning.",
  },
  {
    path: "/normering",
    title: "Normering i daginstitutioner 2026 — Børn per voksen i alle kommuner | Institutionsguiden",
    description: "Se normeringen (børn per voksen) i vuggestuer, børnehaver og dagplejere i alle 98 kommuner. Officielle normeringstal 2026.",
  },
  {
    path: "/friplads",
    title: "Fripladstilskud 2026 — Beregn dit tilskud | Institutionsguiden",
    description: "Beregn dit fripladstilskud til vuggestue, børnehave og dagpleje. Se indkomstgrænser og tilskudsprocenter for 2026.",
  },
  {
    path: "/prissammenligning",
    title: "Prissammenligning — Dagtilbud i alle kommuner 2026 | Institutionsguiden",
    description: "Sammenlign priser på vuggestue, børnehave og dagpleje i alle 98 kommuner. Se dyreste og billigste kommuner.",
  },
  {
    path: "/guide",
    title: "Guide til valg af daginstitution 2026 | Institutionsguiden",
    description: "Alt du skal vide om valg af vuggestue, børnehave, dagpleje og skole. Priser, ventelister, normering og kvalitet.",
  },
  {
    path: "/find",
    title: "Find institution nær dig | Institutionsguiden",
    description: "Find vuggestuer, børnehaver, dagplejere og skoler tæt på din adresse. Søg på postnummer eller adresse.",
  },
  {
    path: "/om",
    title: "Om Institutionsguiden | Institutionsguiden",
    description: "Institutionsguiden hjælper danske forældre med at finde og sammenligne daginstitutioner og skoler. Uafhængig og gratis.",
  },
  {
    path: "/samlet-pris",
    title: "Samlet pris for et børneliv — Fra vuggestue til skole 2026 | Institutionsguiden",
    description: "Se den samlede pris fra vuggestue til SFO i alle kommuner. Beregn hvad det koster over et helt børneliv.",
  },
  {
    path: "/kommune-intelligens",
    title: "Kommune-intelligens — Sammenlign Danmarks 98 kommuner på børnepasning og skole | Institutionsguiden",
    description: "Volumen-vægtet kvalitetsindeks for alle 98 kommuner. Vælg selv hvor meget normering, trivsel, karakter og pris skal tælle — leaderboardet genberegnes med det samme.",
  },
  {
    path: "/kommune-intelligens/sammenlign",
    title: "Sammenlign kommuner side om side — Kommune-intelligens | Institutionsguiden",
    description: "Pin op til 3 kommuner og se deres score, drivers og råtal i kolonner. Del linket med din partner.",
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
      title: `${name} Kommune — Institutioner, priser og kvalitet | Institutionsguiden`,
      description: `Oversigt over vuggestuer, børnehaver, dagplejere og skoler i ${name} Kommune. Se kommunale takster, kvalitetsdata og beregn fripladstilskud.`,
    }));
  } catch {
    console.warn("[prerender] Could not read school data for municipality pages");
    return [];
  }
}

// Generate /kommune-intelligens/:slug MIL landing pages for all municipalities
function getKommuneIntelligensPages() {
  try {
    const dataPath = path.join(__dirname, "../public/data/skole-data.json");
    const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
    const municipalities = new Set();
    for (const s of data.s) {
      if (s.m) municipalities.add(s.m.replace(" Kommune", ""));
    }
    return [...municipalities].sort().map((name) => ({
      path: `/kommune-intelligens/${toSlug(name)}`,
      title: `Kommune-intelligens: ${name} — Score, normering, trivsel 2026 | Institutionsguiden`,
      description: `Se hvordan ${name} Kommune ligger på kvalitetsindekset — normering, trivsel, karakter og pris målt mod landsmedianen. Justér dine prioriteter og se hvordan rangeringen ændrer sig.`,
    }));
  } catch {
    console.warn("[prerender] Could not read school data for kommune-intelligens pages");
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
    name: "Institutionsguiden",
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
  } else if (page.path.startsWith("/kommune-intelligens/") && page.path !== "/kommune-intelligens/sammenlign") {
    // MIL landing per kommune: BreadcrumbList
    const slug = page.path.replace("/kommune-intelligens/", "");
    const name = page.title.replace(/Kommune-intelligens: /, "").split(" —")[0];
    jsonLd = jsonLdTag(breadcrumbJsonLd([
      { name: "Forside", url: `${SITE_URL}/` },
      { name: "Kommune-intelligens", url: `${SITE_URL}/kommune-intelligens` },
      { name, url: `${SITE_URL}/kommune-intelligens/${slug}` },
    ]));
  } else if (page.path === "/kommune-intelligens") {
    // MIL hub: BreadcrumbList
    jsonLd = jsonLdTag(breadcrumbJsonLd([
      { name: "Forside", url: `${SITE_URL}/` },
      { name: "Kommune-intelligens", url: `${SITE_URL}/kommune-intelligens` },
    ]));
  } else if (["/vuggestue", "/boernehave", "/dagpleje", "/skole", "/sfo"].includes(page.path)) {
    // Category page: BreadcrumbList
    jsonLd = jsonLdTag(breadcrumbJsonLd([
      { name: "Forside", url: `${SITE_URL}/` },
      { name: page.title.split(" — ")[0], url: `${SITE_URL}${page.path}` },
    ]));
  } else if (page.jsonLdType === "categoryMunicipality") {
    // Category + Municipality page: BreadcrumbList + ItemList
    const catSegment = page.path.split("/")[1]; // e.g. "vuggestue"
    jsonLd = jsonLdTag(breadcrumbJsonLd([
      { name: "Forside", url: `${SITE_URL}/` },
      { name: page.catLabel, url: `${SITE_URL}/${catSegment}` },
      { name: page.municipality, url: `${SITE_URL}/kommune/${encodeURIComponent(page.municipality)}` },
      { name: `${page.catLabel} i ${page.municipality}`, url: `${SITE_URL}${page.path}` },
    ]));
    if (page.institutions && page.institutions.length > 0) {
      jsonLd += "\n" + jsonLdTag({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `${page.catLabel} i ${page.municipality}`,
        numberOfItems: page.institutions.length,
        itemListElement: page.institutions.map((inst, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: inst.name,
          url: `${SITE_URL}/institution/${inst.id}`,
        })),
      });
    }
  } else if (page.jsonLdType === "institution" && page.instData) {
    const d = page.instData;
    const schemaType = ["Folkeskole", "Privatskole", "Efterskole"].includes(d.type) ? "School" : "ChildCare";
    const schema = {
      "@context": "https://schema.org",
      "@type": schemaType,
      name: d.name,
      address: {
        "@type": "PostalAddress",
        streetAddress: d.address || undefined,
        postalCode: d.postalCode || undefined,
        addressLocality: d.city || d.municipality,
        addressRegion: d.municipality,
        addressCountry: "DK",
      },
    };
    if (d.phone) schema.telephone = d.phone;
    if (d.price > 0) schema.priceRange = `${d.price} DKK/md`;
    if (d.lat && d.lng) {
      schema.geo = {
        "@type": "GeoCoordinates",
        latitude: d.lat,
        longitude: d.lng,
      };
    }

    const catRoute = d.category === "folkeskole" || d.category === "privatskole" ? "skole" : (d.category || "");
    const catLabel = CATEGORY_LABELS[catRoute] || INST_TYPE_LABELS[d.type] || d.type;

    jsonLd = jsonLdTag(schema) + "\n" + jsonLdTag(breadcrumbJsonLd([
      { name: "Forside", url: `${SITE_URL}/` },
      { name: catLabel, url: `${SITE_URL}/${catRoute}` },
      { name: d.municipality, url: `${SITE_URL}/kommune/${encodeURIComponent(d.municipality)}` },
      { name: d.name, url: `${SITE_URL}${page.path}` },
    ]));

    // FAQ structured data
    const faqs = [];
    if (d.address) {
      faqs.push({ q: `Hvor ligger ${d.name}?`, a: `${d.name} ligger på ${d.address}, ${d.postalCode} ${d.city} i ${d.municipality} Kommune.` });
    }
    if (d.price > 0) {
      faqs.push({ q: `Hvad koster ${d.name}?`, a: `Månedsprisen for ${d.name} er ${d.price.toLocaleString("da-DK")} kr. i 2026.${d.ownership ? ` ${d.name} er en ${d.ownership} institution.` : ""}` });
    }
    if (d.normering && d.normering.ratio > 0) {
      faqs.push({ q: `Hvad er normeringen i ${d.municipality} for ${d.normering.ageGroup}?`, a: `Den gennemsnitlige normering i ${d.municipality} er ${d.normering.ratio} børn per voksen for ${d.normering.ageGroup} (data fra Danmarks Statistik, 2023).` });
    }
    if (d.quality && d.category === "skole" && d.quality.k) {
      faqs.push({ q: `Hvad er karaktersnittet på ${d.name}?`, a: `${d.name} har et karaktersnit på ${d.quality.k}${d.quality.ts ? ` (landsgennemsnit: ~7.0). Trivslen er ${d.quality.ts}/5` : " (landsgennemsnit: ~7.0)"}.` });
    }
    if (d.quality && d.category === "skole" && d.quality.ts && d.quality.k) {
      faqs.push({ q: `Er ${d.name} en god skole?`, a: `${d.name} har en samlet kvalitetsvurdering baseret på trivsel (${d.quality.ts}/5), karaktersnit (${d.quality.k})${d.quality.kv ? ` og kompetencedækning (${d.quality.kv}%)` : ""}. Se den fulde vurdering på Institutionsguiden.` });
    }
    if (d.nearby && d.nearby.length >= 3) {
      faqs.push({ q: `Hvilke andre ${catLabel.toLowerCase()} ligger tæt på ${d.name}?`, a: `De nærmeste ${catLabel.toLowerCase()} er ${d.nearby[0].name} (${d.nearby[0].distance.toFixed(1)} km), ${d.nearby[1].name} (${d.nearby[1].distance.toFixed(1)} km) og ${d.nearby[2].name} (${d.nearby[2].distance.toFixed(1)} km). Se alle ${catLabel.toLowerCase()} i ${d.municipality} på Institutionsguiden.` });
    }
    if (faqs.length > 0) {
      jsonLd += "\n" + jsonLdTag({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map(f => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      });
    }
  }

  if (jsonLd) {
    html = html.replace("</head>", `${jsonLd}\n</head>`);
  }

  // Inject rich SEO body content for institution detail pages
  if (page.seoContent) {
    html = html.replace("<noscript>", `${page.seoContent}\n<noscript>`);
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
  fritidsklub: "Fritidsklubber",
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

// Previously limited to top 15 municipalities — now we prerender ALL institutions

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

  // Build canonical municipality name set from dagtilbud data
  const canonicalMuns = new Set();
  for (const data of [vugData, bhData, dagData, sfoData]) {
    for (const d of data.i) { if (d.m) canonicalMuns.add(d.m); }
  }
  const canonicalBySlug = new Map();
  for (const name of canonicalMuns) { canonicalBySlug.set(toSlug(name), name); }

  function resolveSchoolMun(raw) {
    let m = raw.replace(/s? Regionskommune$/, "").replace(/ Kommune$/, "");
    if (canonicalMuns.has(m)) return m;
    if (m.endsWith("s") && canonicalMuns.has(m.slice(0, -1))) return m.slice(0, -1);
    const slug = toSlug(m);
    if (canonicalBySlug.has(slug)) return canonicalBySlug.get(slug);
    return m;
  }

  // Load institution stats for normering data
  let institutionStats = {};
  try {
    const statsData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "institution-stats.json"), "utf-8"));
    institutionStats = statsData.kommuner || {};
  } catch { /* optional */ }

  // Collect all institutions for detail page pre-rendering
  const allInstitutions = [];

  // Build municipality -> category -> institution count + price stats
  const munCatMap = new Map(); // munName -> { catName -> { count, prices[] } }

  function addInst(munName, cat, monthlyRate, instName, instId) {
    if (!munCatMap.has(munName)) munCatMap.set(munName, {});
    const mc = munCatMap.get(munName);
    if (!mc[cat]) mc[cat] = { count: 0, prices: [], names: [] };
    mc[cat].count++;
    if (monthlyRate && monthlyRate > 0) mc[cat].prices.push(monthlyRate);
    if (instName && instId) mc[cat].names.push({ name: instName, id: instId });
  }

  // Schools
  for (const s of skoleData.s) {
    const m = s.m ? resolveSchoolMun(s.m) : null;
    if (m) addInst(m, "skole", s.sfo || null, s.n, s.id ? `school-${s.id}` : null);
    if (s.id && s.n && m) {
      allInstitutions.push({
        id: `school-${s.id}`,
        name: s.n,
        municipality: m,
        type: s.t === "e" ? "efterskole" : s.t === "p" ? "privatskole" : "folkeskole",
        category: "skole",
        hasQuality: !!(s.q && s.q.r !== undefined),
        address: s.a || "",
        postalCode: s.z || "",
        city: s.c || "",
        ownership: "",
        phone: "",
        price: 0,
        lat: s.la || null,
        lng: s.lo || null,
        quality: s.q ? { r: s.q.r, k: s.q.k, ts: s.q.ts, kv: s.q.kv } : null,
      });
    }
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
      if (d.m) addInst(d.m, cat, d.mr || null, d.n, d.id);
      if (d.id && d.n && d.m) {
        allInstitutions.push({
          id: d.id,
          name: d.n,
          municipality: d.m,
          type: d.tp || cat,
          category: cat,
          hasQuality: false,
          address: d.a || "",
          postalCode: d.z || "",
          city: d.c || "",
          ownership: d.ow || "",
          phone: d.ph || "",
          price: d.mr || 0,
          lat: d.la || null,
          lng: d.lo || null,
          quality: null,
        });
      }
    }
  }

  processDagtilbud(vugData, "vuggestue");
  processDagtilbud(bhData, "boernehave");
  processDagtilbud(dagData, null);
  processDagtilbud(sfoData, "sfo");

  // Fritidsklub (optional)
  try {
    const fkData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "fritidsklub-data.json"), "utf-8"));
    processDagtilbud(fkData, "fritidsklub");
  } catch { /* optional */ }

  return { munCatMap, schoolQualityMuns, allInstitutions, institutionStats };
}

const INST_TYPE_LABELS = {
  folkeskole: "Folkeskole",
  privatskole: "Privatskole",
  efterskole: "Efterskole",
  vuggestue: "Vuggestue",
  boernehave: "Børnehave",
  dagpleje: "Dagpleje",
  sfo: "SFO",
  fritidsklub: "Fritidsklub",
  aldersintegreret: "Aldersintegreret institution",
};

const CAT_AGE_MAP = {
  vuggestue: "0-2 år", boernehave: "3-5 år", dagpleje: "0-2 år",
  skole: "6-16 år", sfo: "6-9 år", fritidsklub: "10-14 år", efterskole: "14-18 år",
};

// Cross-category link map: for each category, which other categories to link to
const CROSS_CATEGORY_LINKS = {
  vuggestue: ["boernehave", "dagpleje"],
  boernehave: ["vuggestue", "sfo", "skole"],
  dagpleje: ["vuggestue", "boernehave"],
  skole: ["sfo", "boernehave"],
  sfo: ["skole", "fritidsklub"],
  fritidsklub: ["sfo", "skole"],
};

// ---------------------------------------------------------------------------
// Haversine distance (km) between two lat/lng points
// ---------------------------------------------------------------------------
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeNearbyInstitutions(allInstitutions) {
  // Group by category for O(n) per category
  const byCategory = new Map();
  for (const inst of allInstitutions) {
    if (!byCategory.has(inst.category)) byCategory.set(inst.category, []);
    byCategory.get(inst.category).push(inst);
  }

  // For each institution, find 5 nearest in same category
  const nearbyMap = new Map(); // id -> [{id, name, distance, price}]
  for (const [, group] of byCategory) {
    const withCoords = group.filter(i => i.lat && i.lng);
    for (const inst of withCoords) {
      const distances = [];
      for (const other of withCoords) {
        if (other.id === inst.id) continue;
        const dist = haversineKm(inst.lat, inst.lng, other.lat, other.lng);
        distances.push({ id: other.id, name: other.name, distance: dist, price: other.price || 0 });
      }
      distances.sort((a, b) => a.distance - b.distance);
      nearbyMap.set(inst.id, distances.slice(0, 5));
    }
  }
  return nearbyMap;
}

// ---------------------------------------------------------------------------
// Build rich SEO body content for institution detail pages
// ---------------------------------------------------------------------------
function buildSeoContent(inst, nearbyMap, institutionStats) {
  const typeLabel = INST_TYPE_LABELS[inst.type] || INST_TYPE_LABELS[inst.category] || "Institution";
  const age = CAT_AGE_MAP[inst.category] || "";
  const catRoute = inst.category === "folkeskole" || inst.category === "privatskole" ? "skole" : (inst.category || "");
  const catLabel = CATEGORY_LABELS[catRoute] || CATEGORY_LABELS[inst.category] || typeLabel;
  const munSlug = toSlug(inst.municipality);
  const isDagtilbud = ["vuggestue", "boernehave", "dagpleje", "sfo"].includes(inst.category);

  const parts = [];
  parts.push(`<article>`);
  parts.push(`<h1>${esc(inst.name)} \u2014 ${esc(typeLabel)} i ${esc(inst.municipality)}</h1>`);

  // Intro paragraph
  let intro = `${esc(inst.name)} er en ${inst.ownership ? esc(inst.ownership) + " " : ""}${esc(typeLabel.toLowerCase())} i ${esc(inst.municipality)} Kommune`;
  if (age) intro += ` for b\u00f8rn i alderen ${age}`;
  intro += ".";
  parts.push(`<p>${intro}</p>`);

  // Price section
  if (inst.price > 0) {
    parts.push(`<h2>Takster og priser 2026</h2>`);
    parts.push(`<p>M\u00e5nedsprisen for ${esc(inst.name)} er ${inst.price.toLocaleString("da-DK")} kr. i 2026.</p>`);
  }

  // Address & contact
  if (inst.address || inst.postalCode || inst.city) {
    parts.push(`<h2>Adresse og kontakt</h2>`);
    const addrParts = [inst.address, `${inst.postalCode} ${inst.city}`.trim()].filter(Boolean);
    parts.push(`<p>Adresse: ${esc(addrParts.join(", "))}.</p>`);
    if (inst.phone) parts.push(`<p>Telefon: ${esc(inst.phone)}</p>`);
  }

  // Normering for dagtilbud
  if (isDagtilbud && institutionStats[inst.municipality]) {
    const stats = institutionStats[inst.municipality];
    let normering = null;
    let ageGroup = "";
    if (inst.category === "vuggestue" && stats.normering02) {
      normering = stats.normering02;
      ageGroup = "0-2 \u00e5r";
    } else if (inst.category === "boernehave" && stats.normering35) {
      normering = stats.normering35;
      ageGroup = "3-5 \u00e5r";
    } else if (inst.category === "dagpleje" && stats.normeringDagpleje) {
      normering = stats.normeringDagpleje;
      ageGroup = "dagpleje";
    }
    if (normering) {
      parts.push(`<h2>Normering i ${esc(inst.municipality)}</h2>`);
      parts.push(`<p>Den gennemsnitlige normering (b\u00f8rn per voksen) i ${esc(inst.municipality)} er ${normering} for ${ageGroup}.</p>`);
    }
  }

  // Quality data for schools
  if (inst.quality && inst.category === "skole") {
    const q = inst.quality;
    const qParts = [];
    if (q.k) qParts.push(`Karaktersnit: ${q.k}`);
    if (q.ts) qParts.push(`Trivsel: ${q.ts}/5`);
    if (q.kv) qParts.push(`Kompetenced\u00e6kning: ${q.kv}%`);
    if (qParts.length > 0) {
      parts.push(`<h2>Kvalitetsdata</h2>`);
      parts.push(`<p>${qParts.join(". ")}.</p>`);
    }
  }

  // Nearby institutions
  const nearby = nearbyMap.get(inst.id);
  if (nearby && nearby.length > 0) {
    parts.push(`<h2>Lignende ${esc(catLabel.toLowerCase())} i n\u00e6rheden</h2>`);
    parts.push(`<ul>`);
    for (const n of nearby) {
      const distStr = n.distance.toFixed(1);
      const priceStr = n.price > 0 ? `, ${n.price.toLocaleString("da-DK")} kr/md` : "";
      parts.push(`<li><a href="/institution/${esc(n.id)}">${esc(n.name)} \u2014 ${distStr} km${priceStr}</a></li>`);
    }
    parts.push(`</ul>`);
  }

  // Cross-category links
  const crossCats = CROSS_CATEGORY_LINKS[catRoute] || CROSS_CATEGORY_LINKS[inst.category] || [];
  if (crossCats.length > 0) {
    parts.push(`<h2>Andre institutioner i ${esc(inst.municipality)}</h2>`);
    parts.push(`<ul>`);
    for (const otherCat of crossCats) {
      const otherLabel = CATEGORY_LABELS[otherCat];
      if (otherLabel) {
        parts.push(`<li><a href="/${otherCat}/${munSlug}">Se alle ${esc(otherLabel.toLowerCase())} i ${esc(inst.municipality)}</a></li>`);
      }
    }
    parts.push(`</ul>`);
  }

  // Category and municipality links
  parts.push(`<nav>`);
  parts.push(`<a href="/${catRoute}/${munSlug}">Se alle ${esc(catLabel.toLowerCase())} i ${esc(inst.municipality)}</a>`);
  parts.push(`<a href="/kommune/${encodeURIComponent(inst.municipality)}">Alle institutioner i ${esc(inst.municipality)} Kommune</a>`);
  parts.push(`</nav>`);

  parts.push(`</article>`);

  return `<section class="seo-content" style="position:absolute;left:-9999px" aria-hidden="true">\n${parts.join("\n")}\n</section>`;
}

function generateInstitutionDetailPages(allInstitutions, nearbyMap, institutionStats) {
  // Deduplicate by ID (same institution can appear in multiple data sources)
  const seen = new Set();
  const unique = allInstitutions.filter((inst) => {
    if (seen.has(inst.id)) return false;
    seen.add(inst.id);
    return true;
  });

  return unique.map((inst) => {
    const typeLabel = INST_TYPE_LABELS[inst.type] || INST_TYPE_LABELS[inst.category] || "Institution";
    const isDagtilbud = ["vuggestue", "boernehave", "dagpleje", "sfo"].includes(inst.category);

    // Long-tail keyword-optimized descriptions
    let description;
    if (inst.category === "skole" && inst.quality && inst.quality.k) {
      const snit = inst.quality.k;
      const trivsel = inst.quality.ts || "";
      description = `${inst.name} i ${inst.municipality} \u2014 Karaktersnit ${snit}${trivsel ? `, trivsel ${trivsel}/5` : ""}. Se anmeldelser, kvalitetsdata og sammenlign med skoler i kommunen.`;
    } else if (isDagtilbud && inst.price > 0) {
      description = `${inst.name} i ${inst.municipality} \u2014 Takster 2026: ${inst.price.toLocaleString("da-DK")} kr/md. ${inst.ownership ? inst.ownership.charAt(0).toUpperCase() + inst.ownership.slice(1) + " " : ""}${typeLabel.toLowerCase()}. Se normering, anmeldelser og sammenlign.`;
    } else {
      description = `${inst.name} \u2014 ${typeLabel} i ${inst.municipality}. Se kontaktinfo, normering og anmeldelser 2026. Sammenlign med andre i ${inst.municipality} Kommune.`;
    }
    description = description.slice(0, 155);

    // Build SEO body content
    const seoContent = buildSeoContent(inst, nearbyMap, institutionStats);

    return {
      path: `/institution/${inst.id}`,
      title: `${inst.name} \u2014 ${typeLabel} i ${inst.municipality} | Institutionsguiden`,
      description,
      jsonLdType: "institution",
      seoContent,
      instData: {
        name: inst.name,
        municipality: inst.municipality,
        type: typeLabel,
        address: inst.address || "",
        postalCode: inst.postalCode || "",
        city: inst.city || "",
        price: inst.price || 0,
        ownership: inst.ownership || "",
        phone: inst.phone || "",
        category: inst.category,
        lat: inst.lat || null,
        lng: inst.lng || null,
        quality: inst.quality || null,
        nearby: (nearbyMap.get(inst.id) || []).slice(0, 3),
        normering: (() => {
          const isDt = ["vuggestue", "boernehave", "dagpleje", "sfo"].includes(inst.category);
          if (!isDt || !institutionStats[inst.municipality]) return null;
          const s = institutionStats[inst.municipality];
          if (inst.category === "vuggestue" && s.normering02) return { ratio: s.normering02, ageGroup: "0-2 år" };
          if (inst.category === "boernehave" && s.normering35) return { ratio: s.normering35, ageGroup: "3-5 år" };
          if (inst.category === "dagpleje" && s.normeringDagpleje) return { ratio: s.normeringDagpleje, ageGroup: "dagpleje" };
          return null;
        })(),
      },
    };
  });
}

// ---------------------------------------------------------------------------
// National ranking pages — top 20 cheapest / best nationally
// ---------------------------------------------------------------------------
function generateNationalRankingPages(allInstitutions) {
  const pages = [];

  // Helper: build SEO content for a cheapest-nationally page
  function buildCheapestPage(cat, catLabelPlural, catLabelSingular) {
    const filtered = allInstitutions
      .filter((i) => i.category === cat && i.price > 0)
      .sort((a, b) => a.price - b.price)
      .slice(0, 20);
    if (filtered.length === 0) return null;

    const parts = [];
    parts.push(`<article>`);
    parts.push(`<h1>Billigste ${catLabelPlural.toLowerCase()} i Danmark 2026</h1>`);
    parts.push(`<p>Her er de 20 billigste ${catLabelPlural.toLowerCase()} i Danmark rangeret efter m\u00e5nedspris. Priserne er baseret p\u00e5 officielle kommunale takster for 2026.</p>`);
    parts.push(`<ol>`);
    for (const inst of filtered) {
      parts.push(`<li><a href="/institution/${esc(inst.id)}">${esc(inst.name)}</a> \u2014 ${inst.price.toLocaleString("da-DK")} kr/md (${esc(inst.municipality)})</li>`);
    }
    parts.push(`</ol>`);
    parts.push(`<h2>S\u00e5dan finder du den billigste ${catLabelSingular}</h2>`);
    parts.push(`<p>Priserne p\u00e5 ${catLabelPlural.toLowerCase()} varierer markant mellem kommunerne. Den billigste ${catLabelSingular} koster ${filtered[0].price.toLocaleString("da-DK")} kr/md i ${esc(filtered[0].municipality)}, mens gennemsnittet ligger h\u00f8jere. Brug vores prissammenligning til at finde den billigste l\u00f8sning i din kommune.</p>`);
    parts.push(`<nav>`);
    parts.push(`<a href="/${cat}">Se alle ${catLabelPlural.toLowerCase()} i Danmark</a>`);
    parts.push(`<a href="/prissammenligning">Prissammenligning p\u00e5 tv\u00e6rs af kommuner</a>`);
    parts.push(`<a href="/friplads">Beregn fripladstilskud</a>`);
    parts.push(`</nav>`);
    parts.push(`</article>`);

    return `<section class="seo-content" style="position:absolute;left:-9999px" aria-hidden="true">\n${parts.join("\n")}\n</section>`;
  }

  // Billigste børnehave
  const bhContent = buildCheapestPage("boernehave", "B\u00f8rnehaver", "b\u00f8rnehave");
  if (bhContent) {
    pages.push({
      path: "/billigste-boernehave",
      title: "Billigste b\u00f8rnehaver i Danmark 2026 \u2014 Top 20 | Institutionsguiden",
      description: "Se de billigste b\u00f8rnehaver i Danmark 2026. Sammenlign m\u00e5nedspriser fra alle 98 kommuner.",
      seoContent: bhContent,
    });
  }

  // Billigste vuggestue
  const vugContent = buildCheapestPage("vuggestue", "Vuggestuer", "vuggestue");
  if (vugContent) {
    pages.push({
      path: "/billigste-vuggestue",
      title: "Billigste vuggestuer i Danmark 2026 \u2014 Top 20 | Institutionsguiden",
      description: "Se de billigste vuggestuer i Danmark 2026. Sammenlign m\u00e5nedspriser fra alle 98 kommuner.",
      seoContent: vugContent,
    });
  }

  // Billigste dagpleje
  const dagContent = buildCheapestPage("dagpleje", "Dagplejere", "dagpleje");
  if (dagContent) {
    pages.push({
      path: "/billigste-dagpleje",
      title: "Billigste dagpleje i Danmark 2026 \u2014 Top 20 | Institutionsguiden",
      description: "Se de billigste dagplejere i Danmark 2026. Sammenlign m\u00e5nedspriser fra alle 98 kommuner.",
      seoContent: dagContent,
    });
  }

  // Bedste skoler nationally
  const schoolsWithQuality = allInstitutions
    .filter((i) => i.category === "skole" && i.quality && i.quality.r !== undefined && i.quality.r > 0)
    .sort((a, b) => b.quality.r - a.quality.r)
    .slice(0, 20);

  if (schoolsWithQuality.length > 0) {
    const parts = [];
    parts.push(`<article>`);
    parts.push(`<h1>Bedste skoler i Danmark 2026 \u2014 Kvalitetsranking</h1>`);
    parts.push(`<p>De 20 bedste skoler i Danmark rangeret efter samlet kvalitetsscore baseret p\u00e5 officielle data for trivsel, karaktersnit og kompetenced\u00e6kning.</p>`);
    parts.push(`<ol>`);
    for (const s of schoolsWithQuality) {
      const q = s.quality;
      const details = [];
      if (q.k) details.push(`karaktersnit ${q.k}`);
      if (q.ts) details.push(`trivsel ${q.ts}/5`);
      parts.push(`<li><a href="/institution/${esc(s.id)}">${esc(s.name)}</a> \u2014 ${esc(s.municipality)}${details.length > 0 ? ` (${details.join(", ")})` : ""}</li>`);
    }
    parts.push(`</ol>`);
    parts.push(`<h2>Hvordan m\u00e5les skolekvalitet?</h2>`);
    parts.push(`<p>Kvalitetsscoren er baseret p\u00e5 officielle data fra Undervisningsministeriet og inkluderer trivsel, karaktersnit ved afgangseksamen og kompetenced\u00e6kning. Jo h\u00f8jere score, jo bedre klarer skolen sig samlet.</p>`);
    parts.push(`<nav>`);
    parts.push(`<a href="/skole">Se alle skoler i Danmark</a>`);
    parts.push(`<a href="/bedste-vaerdi">Bedste v\u00e6rdi for pengene \u2014 skoler</a>`);
    parts.push(`</nav>`);
    parts.push(`</article>`);

    pages.push({
      path: "/bedste-skoler",
      title: "Bedste skoler i Danmark 2026 \u2014 Kvalitetsranking | Institutionsguiden",
      description: "Se de 20 bedste skoler i Danmark baseret p\u00e5 trivsel, karaktersnit og kompetenced\u00e6kning. Officielle kvalitetsdata.",
      seoContent: `<section class="seo-content" style="position:absolute;left:-9999px" aria-hidden="true">\n${parts.join("\n")}\n</section>`,
    });
  }

  return pages;
}

function generateProgrammaticPages() {
  const { munCatMap, schoolQualityMuns, allInstitutions, institutionStats } = loadAllData();
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
        title: `${label} i ${mun} 2026 — Priser og sammenligning | Institutionsguiden`,
        description: `Der er ${data.count} ${label.toLowerCase()} i ${mun} Kommune.${avg ? ` Gennemsnitlig månedlig takst: ${avg} kr.` : ""} Se priser, kontakt og sammenlign.`,
        jsonLdType: "categoryMunicipality",
        catLabel: label,
        municipality: mun,
        institutions: (data.names || []).slice(0, 10),
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
        title: `Billigste ${singular} i ${mun} 2026 — Fra ${minPrice.toLocaleString("da-DK")} kr/md | Institutionsguiden`,
        description: `Se de billigste ${CATEGORY_LABELS[cat].toLowerCase()} i ${mun} Kommune rangeret efter pris. Billigste fra ${minPrice.toLocaleString("da-DK")} kr/md.`,
      });
    }
  }

  // 3. "Bedste skole" pages
  for (const mun of schoolQualityMuns) {
    const slug = toSlug(mun);
    pages.push({
      path: `/bedste-skole/${slug}`,
      title: `Bedste skoler i ${mun} 2026 — Kvalitetsranking | Institutionsguiden`,
      description: `Se de bedste skoler i ${mun} rangeret efter kvalitetsdata: trivsel, karaktersnit, fravær og kompetencedækning.`,
    });
  }

  // 4. "Bedste dagtilbud" pages (vuggestue, boernehave, dagpleje, sfo)
  const BEDSTE_CATS = ["vuggestue", "boernehave", "dagpleje", "sfo"];
  const BEDSTE_PLURAL = {
    vuggestue: "vuggestuer", boernehave: "børnehaver",
    dagpleje: "dagplejere", sfo: "SFO'er",
  };
  for (const mun of municipalities) {
    const mc = munCatMap.get(mun);
    for (const cat of BEDSTE_CATS) {
      const data = mc[cat];
      if (!data || data.count === 0) continue;
      const plural = BEDSTE_PLURAL[cat];
      const slug = toSlug(mun);

      pages.push({
        path: `/bedste-${cat}/${slug}`,
        title: `Bedste ${plural} i ${mun} 2026 — Kvalitetsranking | Institutionsguiden`,
        description: `Top ${Math.min(data.count, 10)} ${plural} i ${mun} rangeret efter kvalitetsdata. Se priser, normering og kvalitet.`,
      });
    }
  }

  // 5. Best value page (single national page)
  pages.push({
    path: "/bedste-vaerdi",
    title: "Bedste værdi for pengene — Skoler med mest kvalitet per krone 2026 | Institutionsguiden",
    description: "Top 25 skoler i Danmark rangeret efter kvalitet i forhold til SFO-pris. Find den skole der giver mest værdi for pengene.",
  });

  // 6. VS comparison pages
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
        title: `${singA.charAt(0).toUpperCase() + singA.slice(1)} vs ${singB} i ${mun} 2026 — Pris og forskelle | Institutionsguiden`,
        description: `Sammenlign ${singA} og ${singB} i ${mun}. ${dataA.count} ${CATEGORY_LABELS[catA].toLowerCase()} vs. ${dataB.count} ${CATEGORY_LABELS[catB].toLowerCase()}. Se priser og forskelle.`,
      });
    }
  }

  return { pages, allInstitutions, institutionStats };
}

function main() {
  const shellPath = path.join(DIST, "index.html");
  if (!fs.existsSync(shellPath)) {
    console.error("[prerender] dist/index.html not found — run vite build first");
    process.exit(1);
  }

  const shellHtml = fs.readFileSync(shellPath, "utf-8");

  let programmaticPages = [];
  let institutionDetailPages = [];
  let nationalRankingPages = [];
  try {
    const { pages, allInstitutions, institutionStats } = generateProgrammaticPages();
    programmaticPages = pages;
    console.log(`[prerender] Computing nearest neighbors for ${allInstitutions.length} institutions...`);
    const nearbyMap = computeNearbyInstitutions(allInstitutions);
    console.log(`[prerender] Nearby map computed for ${nearbyMap.size} institutions`);
    institutionDetailPages = generateInstitutionDetailPages(allInstitutions, nearbyMap, institutionStats);
    nationalRankingPages = generateNationalRankingPages(allInstitutions);
    console.log(`[prerender] Generated ${programmaticPages.length} programmatic SEO pages`);
    console.log(`[prerender] Generated ${institutionDetailPages.length} institution detail pages`);
    console.log(`[prerender] Generated ${nationalRankingPages.length} national ranking pages`);
  } catch (err) {
    console.warn("[prerender] Could not generate programmatic pages:", err.message);
  }

  const allPages = [...PAGES, ...getMunicipalityPages(), ...getKommuneIntelligensPages(), ...programmaticPages, ...institutionDetailPages, ...nationalRankingPages];
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
