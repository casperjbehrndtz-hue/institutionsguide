import { createMiddleware, createArticleFetcher, defaultMatcherConfig } from "./src/lib/dk-seo/middleware";
import type { RouteMeta } from "./src/lib/dk-seo/types";

// ── Blog fetcher for Institutionsguide ──
const fetchBlog = createArticleFetcher({
  table: "blog_posts",
  select: "title,meta_title,meta_description,content_html,published_at,updated_at,keyword",
  siteName: "Institutionsguide",
  siteUrl: "https://www.institutionsguiden.dk",
  urlPrefix: "/blog",
  parentLabel: "Blog",
  fields: { metaTitle: "meta_title", metaDescription: "meta_description", content: "content_html", publishedAt: "published_at", updatedAt: "updated_at", keyword: "keyword" },
});

// ── SEO metadata (loaded once per edge instance, then cached) ──
const SITE = "https://www.institutionsguiden.dk";
// [name, category, municipality, price, address, postalCode, city, ownership, phone, lat, lng, normering, qualityStr, sameCount]
let seoCache: { i: Record<string, [string, string, string, number, string, string, string, string, string, number, number, number, string, number]>; m: Record<string, string> } | null = null;

async function loadSeo() {
  if (seoCache) return seoCache;
  try {
    const res = await fetch(`${SITE}/data/seo-meta.json`);
    if (res.ok) seoCache = await res.json();
  } catch { /* ignore */ }
  if (!seoCache) seoCache = { i: {}, m: {} };
  return seoCache;
}

function munFromSlug(slug: string, meta: NonNullable<typeof seoCache>): string {
  return meta.m[slug] || decodeURIComponent(slug).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function munToSlug(name: string): string {
  const DANISH_MAP: Record<string, string> = { "æ": "ae", "ø": "oe", "å": "aa", "Æ": "Ae", "Ø": "Oe", "Å": "Aa" };
  return name.replace(/[æøåÆØÅ]/g, (ch) => DANISH_MAP[ch] || ch)
    .toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-");
}

const CAT_LABELS: Record<string, string> = {
  vuggestue: "Vuggestuer", boernehave: "Børnehaver", dagpleje: "Dagplejere",
  skole: "Skoler", sfo: "SFO'er", fritidsklub: "Fritidsklubber", efterskole: "Efterskoler",
};
const CAT_SINGULAR: Record<string, string> = {
  vuggestue: "vuggestue", boernehave: "børnehave", dagpleje: "dagpleje",
  skole: "skole", sfo: "SFO", fritidsklub: "fritidsklub", efterskole: "efterskole",
  folkeskole: "folkeskole", privatskole: "privatskole",
};
const CAT_AGE: Record<string, string> = {
  vuggestue: "0-2 år", boernehave: "3-5 år", dagpleje: "0-2 år",
  skole: "6-16 år", sfo: "6-9 år", fritidsklub: "10-14 år", efterskole: "14-18 år",
};

// ── Dynamic route fetchers ──

async function fetchInstitution(slug: string, _su: string, _sk: string): Promise<RouteMeta | null> {
  const meta = await loadSeo();
  const entry = meta.i[slug];
  if (!entry) return null;
  const [name, cat, mun, price, address, postalCode, city, ownership, phone, lat, lng, normering, qualityStr, sameCount] = entry;
  const catLabel = CAT_SINGULAR[cat] || cat;
  const catUpper = catLabel.charAt(0).toUpperCase() + catLabel.slice(1);
  const age = CAT_AGE[cat] || "";
  const isDagtilbud = ["vuggestue", "boernehave", "dagpleje"].includes(cat);
  const isSchool = ["skole", "folkeskole", "privatskole", "efterskole"].includes(cat);
  const munSlug = munToSlug(mun);
  const catRoute = cat === "folkeskole" || cat === "privatskole" ? "skole" : cat;

  // Parse quality string e.g. "k7.2 t3.8"
  let kvalK = "";
  let kvalT = "";
  if (qualityStr) {
    const km = qualityStr.match(/k([\d.]+)/);
    const tm = qualityStr.match(/t([\d.]+)/);
    if (km) kvalK = km[1];
    if (tm) kvalT = tm[1];
  }

  // Build description (max 155 chars) with long-tail keywords
  let description: string;
  if (isDagtilbud && price > 0) {
    const ownerLabel = ownership ? `${ownership.charAt(0).toUpperCase() + ownership.slice(1)}` : "";
    const normStr = normering > 0 ? ` Normering: ${normering} børn/voksen.` : "";
    description = `${name} i ${mun} — Takst 2026: ${price} kr/md.${ownerLabel ? ` ${ownerLabel} ${catLabel}.` : ""}${normStr} Anmeldelser og sammenligning.`;
  } else if (isSchool && kvalK) {
    description = `${name} i ${mun} — Karaktersnit ${kvalK}, trivsel ${kvalT}/5. Se anmeldelser og sammenlign med andre skoler i ${mun}.`;
  } else {
    const cntStr = sameCount > 0 ? ` Sammenlign med ${sameCount} andre.` : "";
    description = `${name} — ${catUpper} i ${mun}. Se priser, kontaktinfo og anmeldelser.${cntStr}`;
  }
  description = description.slice(0, 155);

  // Build rich body content for bots
  const bodyParts: string[] = [];
  bodyParts.push(`<h1>${name}</h1>`);
  bodyParts.push(`<p>${name} er en ${ownership ? ownership + " " : ""}${catLabel} i ${mun} Kommune${age ? ` for børn i alderen ${age}` : ""}.</p>`);

  if (price > 0) {
    bodyParts.push(`<h2>Takster og priser 2026</h2>`);
    bodyParts.push(`<p>Månedsprisen for ${name} er ${price.toLocaleString("da-DK")} kr.</p>`);
  }

  if (address || phone) {
    bodyParts.push(`<h2>Adresse og kontakt</h2>`);
    if (address) bodyParts.push(`<address>${address}, ${postalCode} ${city}</address>`);
    if (phone) bodyParts.push(`<p>Telefon: ${phone}</p>`);
  }

  if (isDagtilbud && normering > 0) {
    const ageGroup = cat === "boernehave" ? "børnehavebørn (3-5 år)" : "vuggestuebørn (0-2 år)";
    bodyParts.push(`<h2>Normering i ${mun}</h2>`);
    bodyParts.push(`<p>Den gennemsnitlige normering i ${mun} er ${normering} børn per voksen for ${ageGroup}.</p>`);
  }

  if (isSchool && kvalK) {
    bodyParts.push(`<h2>Kvalitetsdata</h2>`);
    bodyParts.push(`<p>Karaktersnit: ${kvalK}. Trivsel: ${kvalT}/5.</p>`);
  }

  bodyParts.push(`<nav>`);
  bodyParts.push(`<a href="/${catRoute}/${munSlug}">Se alle ${CAT_LABELS[catRoute] || catUpper} i ${mun}</a>`);
  bodyParts.push(`<a href="/kommune/${encodeURIComponent(mun)}">Alle institutioner i ${mun} Kommune</a>`);
  bodyParts.push(`</nav>`);

  // Rich JSON-LD
  const schemaType = ["folkeskole", "privatskole", "efterskole"].includes(cat) ? "School" : "ChildCare";
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaType,
    name,
    address: {
      "@type": "PostalAddress",
      streetAddress: address || undefined,
      postalCode: postalCode || undefined,
      addressLocality: city || mun,
      addressRegion: mun,
      addressCountry: "DK",
    },
  };
  if (phone) jsonLd.telephone = phone;
  if (price > 0) jsonLd.priceRange = `${price} DKK/md`;
  if (lat > 0 && lng > 0) {
    jsonLd.geo = { "@type": "GeoCoordinates", latitude: lat, longitude: lng };
  }

  bodyParts.push(`<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`);

  return {
    title: `${name} — ${catUpper} i ${mun} | Institutionsguide`,
    description,
    ogTitle: `${name} — ${catUpper} i ${mun}`,
    ogDescription: description,
    breadcrumbs: [
      { name: "Institutionsguide", url: "/" },
      { name: `${CAT_LABELS[cat] || catUpper}`, url: `/${catRoute}` },
      { name: mun, url: `/kommune/${encodeURIComponent(mun)}` },
      { name: name, url: `/institution/${slug}` },
    ],
    bodyContent: bodyParts.join("\n"),
  };
}

async function fetchKommune(slug: string, _su: string, _sk: string): Promise<RouteMeta | null> {
  const mun = decodeURIComponent(slug);
  if (!mun) return null;
  const meta = await loadSeo();

  // Build per-category lists
  const categories = ["vuggestue", "boernehave", "dagpleje", "skole", "sfo", "fritidsklub", "efterskole"] as const;
  const categorySections: string[] = [];
  for (const cat of categories) {
    const list = buildInstitutionList(meta, cat, mun, "name", 10);
    if (list) {
      categorySections.push(`<h2>${CAT_LABELS[cat] || cat} i ${mun}</h2>\n${list}`);
    }
  }
  const listsHtml = categorySections.join("\n");

  return {
    title: `Institutioner i ${mun} — Priser og sammenligning | Institutionsguide`,
    description: `Se alle vuggestuer, børnehaver, dagplejere, skoler og SFO'er i ${mun}. Sammenlign priser, kvalitetsdata og normeringer.`,
    ogTitle: `${mun} — Institutioner og børnepasning`,
    ogDescription: `Find alle institutioner i ${mun}. Priser, kvalitetsdata og normeringer.`,
    breadcrumbs: [
      { name: "Institutionsguide", url: "/" },
      { name: mun, url: `/kommune/${slug}` },
    ],
    bodyContent: `<h1>Institutioner i ${mun}</h1><p>Oversigt over alle vuggestuer, børnehaver, dagplejere, skoler og SFO'er i ${mun}. Sammenlign priser, kvalitetsdata og normeringer.</p>\n${listsHtml}`,
  };
}

async function fetchNormeringKommune(slug: string, _su: string, _sk: string): Promise<RouteMeta | null> {
  const meta = await loadSeo();
  const mun = munFromSlug(slug, meta);
  return {
    title: `Normering i ${mun} — Børn per voksen | Institutionsguide`,
    description: `Se normering (børn per voksen) i ${mun} for dagpleje, vuggestue og børnehave. Officielle data fra Danmarks Statistik.`,
    ogTitle: `Normering i ${mun}`,
    ogDescription: `Se børn per voksen i ${mun}. Sammenlign med landsgennemsnittet.`,
    breadcrumbs: [
      { name: "Institutionsguide", url: "/" },
      { name: "Normeringer", url: "/normering" },
      { name: mun, url: `/normering/${slug}` },
    ],
    bodyContent: `<h1>Normering i ${mun}</h1><p>Se normering (børn per voksen) for dagpleje (0-2 år), vuggestue (0-2 år) og børnehave (3-5 år) i ${mun}. Data fra Danmarks Statistik.</p>`,
  };
}

// Build an HTML list of institutions for a given category + municipality from seo-meta
function buildInstitutionList(
  meta: NonNullable<typeof seoCache>,
  category: string,
  mun: string,
  sortBy: "quality" | "price" | "name" = "name",
  limit = 15,
): string {
  const catMap: Record<string, string[]> = {
    vuggestue: ["vuggestue"],
    boernehave: ["boernehave"],
    dagpleje: ["dagpleje"],
    skole: ["skole", "folkeskole", "privatskole"],
    sfo: ["sfo"],
    fritidsklub: ["fritidsklub"],
    efterskole: ["efterskole"],
  };
  const allowedCats = catMap[category] || [category];
  const entries = Object.entries(meta.i)
    .filter(([, v]) => allowedCats.includes(v[1]) && v[2] === mun)
    .map(([slug, v]) => ({
      slug, name: v[0], cat: v[1], price: v[3], address: v[4],
      postalCode: v[5], city: v[6], ownership: v[7], normering: v[11],
      qualityStr: v[12],
    }));

  if (entries.length === 0) return "";

  // Sort
  if (sortBy === "price") {
    entries.sort((a, b) => (a.price || 99999) - (b.price || 99999));
  } else if (sortBy === "quality") {
    entries.sort((a, b) => {
      const aK = parseFloat(a.qualityStr?.match(/k([\d.]+)/)?.[1] || "0");
      const bK = parseFloat(b.qualityStr?.match(/k([\d.]+)/)?.[1] || "0");
      return bK - aK; // highest first
    });
  } else {
    entries.sort((a, b) => a.name.localeCompare(b.name, "da"));
  }

  const shown = entries.slice(0, limit);
  const rows = shown.map((e) => {
    const parts: string[] = [`<strong>${e.name}</strong>`];
    if (e.ownership) parts.push(e.ownership);
    if (e.price > 0) parts.push(`${e.price.toLocaleString("da-DK")} kr/md`);
    if (e.address) parts.push(`${e.address}, ${e.postalCode} ${e.city}`);
    const km = e.qualityStr?.match(/k([\d.]+)/);
    const tm = e.qualityStr?.match(/t([\d.]+)/);
    if (km) parts.push(`karaktersnit ${km[1]}`);
    if (tm) parts.push(`trivsel ${tm[1]}/5`);
    if (e.normering > 0) parts.push(`normering ${e.normering} børn/voksen`);
    return `<li><a href="/institution/${e.slug}">${parts.join(" — ")}</a></li>`;
  }).join("\n");

  const more = entries.length > limit ? `\n<p>Og ${entries.length - limit} flere. Se alle på Institutionsguide.</p>` : "";
  return `<ol>\n${rows}\n</ol>${more}`;
}

function makeCatMunFetcher(category: string) {
  const label = CAT_LABELS[category] || category;
  const singular = CAT_SINGULAR[category] || category;
  const age = CAT_AGE[category] || "";
  const ageStr = age ? ` (${age})` : "";

  return async function (slug: string, _su: string, _sk: string): Promise<RouteMeta | null> {
    const meta = await loadSeo();
    const mun = munFromSlug(slug, meta);
    const list = buildInstitutionList(meta, category, mun, "name");
    const listHtml = list ? `<h2>Alle ${label.toLowerCase()} i ${mun}</h2>\n${list}` : "";
    return {
      title: `${label} i ${mun} ${new Date().getFullYear()} — Priser og sammenligning | Institutionsguide`,
      description: `Find og sammenlign ${label.toLowerCase()}${ageStr} i ${mun}. Se priser, kvalitetsdata og beregn fripladstilskud.`,
      ogTitle: `${label} i ${mun}`,
      ogDescription: `Sammenlign ${label.toLowerCase()} i ${mun}. Priser, normeringer og kvalitetsdata.`,
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: label, url: `/${category}` },
        { name: mun, url: `/${category}/${slug}` },
      ],
      bodyContent: `<h1>${label} i ${mun}</h1><p>Oversigt over alle ${label.toLowerCase()}${ageStr} i ${mun}. Sammenlign priser, ejerskab og kvalitetsdata. Beregn evt. fripladstilskud.</p>\n${listHtml}`,
    };
  };
}

function makeBedsteFetcher(category: string) {
  const label = CAT_LABELS[category] || category;
  return async function (slug: string, _su: string, _sk: string): Promise<RouteMeta | null> {
    const meta = await loadSeo();
    const mun = munFromSlug(slug, meta);
    const isSchool = category === "skole";
    const t = isSchool
      ? `Bedste skoler i ${mun} — Kvalitetsranking | Institutionsguide`
      : `Bedste ${label.toLowerCase()} i ${mun} — Kvalitetsranking | Institutionsguide`;
    const d = isSchool
      ? `Se de bedste skoler i ${mun} baseret på trivsel, karakterer og undervisningseffekt. Officielle kvalitetsdata.`
      : `Se de bedste ${label.toLowerCase()} i ${mun} baseret på kvalitetsdata og normeringer.`;
    const list = buildInstitutionList(meta, category, mun, "quality", 10);
    const listHtml = list ? `<h2>Top ${label.toLowerCase()} i ${mun}</h2>\n${list}` : "";
    return {
      title: t,
      description: d,
      ogTitle: isSchool ? `Bedste skoler i ${mun}` : `Bedste ${label.toLowerCase()} i ${mun}`,
      ogDescription: d,
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: label, url: `/${category}` },
        { name: `Bedste i ${mun}`, url: `/bedste-${category}/${slug}` },
      ],
      bodyContent: `<h1>${t.split(" | ")[0]}</h1><p>${d}</p>\n${listHtml}`,
    };
  };
}

function makeBilligsteFetcher(category: string) {
  const label = CAT_LABELS[category] || category;
  return async function (slug: string, _su: string, _sk: string): Promise<RouteMeta | null> {
    const meta = await loadSeo();
    const mun = munFromSlug(slug, meta);
    const list = buildInstitutionList(meta, category, mun, "price", 10);
    const listHtml = list ? `<h2>Billigste ${label.toLowerCase()} i ${mun}</h2>\n${list}` : "";
    return {
      title: `Billigste ${label.toLowerCase()} i ${mun} — Prissammenligning | Institutionsguide`,
      description: `Se de billigste ${label.toLowerCase()} i ${mun}. Sammenlign månedspriser og find den bedste pris.`,
      ogTitle: `Billigste ${label.toLowerCase()} i ${mun}`,
      ogDescription: `Find de billigste ${label.toLowerCase()} i ${mun}. Prissammenligning med alle institutioner.`,
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: label, url: `/${category}` },
        { name: `Billigste i ${mun}`, url: `/billigste-${category}/${slug}` },
      ],
      bodyContent: `<h1>Billigste ${label.toLowerCase()} i ${mun}</h1><p>Sammenlign priser for ${label.toLowerCase()} i ${mun}. Se alle institutioner sorteret efter månedspris.</p>\n${listHtml}`,
    };
  };
}

async function fetchVs(slug: string, _su: string, _sk: string): Promise<RouteMeta | null> {
  // slug = "vuggestue-vs-dagpleje/gentofte"
  const parts = slug.split("/");
  if (parts.length < 2) return null;
  const comparison = parts[0]; // "vuggestue-vs-dagpleje"
  const munSlug = parts.slice(1).join("/");
  const meta = await loadSeo();
  const mun = munFromSlug(munSlug, meta);
  const [catA, catB] = comparison.split("-vs-");
  const labelA = CAT_LABELS[catA] || catA;
  const labelB = CAT_LABELS[catB] || catB;
  return {
    title: `${labelA} vs. ${labelB} i ${mun} — Sammenligning | Institutionsguide`,
    description: `Sammenlign ${labelA.toLowerCase()} og ${labelB.toLowerCase()} i ${mun}. Priser, normeringer og forskelle.`,
    ogTitle: `${labelA} vs. ${labelB} i ${mun}`,
    ogDescription: `Hvad er forskellen på ${labelA.toLowerCase()} og ${labelB.toLowerCase()} i ${mun}? Se priser og sammenlign.`,
    breadcrumbs: [
      { name: "Institutionsguide", url: "/" },
      { name: `${labelA} vs. ${labelB}`, url: `/sammenlign/${comparison}/${munSlug}` },
    ],
    bodyContent: `<h1>${labelA} vs. ${labelB} i ${mun}</h1><p>Sammenlign ${labelA.toLowerCase()} og ${labelB.toLowerCase()} i ${mun}. Se priser, normeringer og hjælp til at vælge den rigtige pasningsform.</p>`,
  };
}

// ── Middleware ──
export default createMiddleware({
  siteUrl: "https://www.institutionsguiden.dk",
  siteName: "Institutionsguide",
  defaultOgImage: "/og-image.png",
  supabaseUrl: "https://epkwhvrwcyhlbdvwwvfi.supabase.co",

  organization: {
    name: "Institutionsguide",
    url: "https://www.institutionsguiden.dk",
    logo: "https://www.institutionsguiden.dk/og-image.png",
    description: "Danmarks mest komplette institutionsoversigt. Sammenlign priser, kvalitet og normeringer for 8.500+ institutioner i alle 98 kommuner.",
    foundingDate: "2025",
  },

  ecosystemLinks: [
    { name: "ParFinans", url: "https://www.parfinans.dk", description: "Fair fordeling af fællesudgifter for par. Beregn med præcis dansk skat." },
    { name: "NemtBudget", url: "https://nemtbudget.nu", description: "Beregn dit personlige rådighedsbeløb gratis på 3 minutter." },
    { name: "Børneskat.dk", url: "https://xn--brneskat-54a.dk", description: "Skatteeffektiv investering til dit barn via frikortet." },
  ],

  footerTagline: "Institutionsguide.dk — Danmarks mest komplette institutionsoversigt. Officielle data for 8.500+ institutioner.",

  routes: {
    "/": {
      title: "Institutionsguide — Sammenlign vuggestuer, børnehaver og skoler i hele Danmark",
      description: "Officielle data for 8.500+ institutioner i alle 98 kommuner. Sammenlign priser, kvalitetsdata, normeringer og beregn friplads. Helt gratis.",
      ogTitle: "Institutionsguide — Danmarks mest komplette institutionsoversigt",
      ogDescription: "Sammenlign 8.500+ vuggestuer, børnehaver, dagplejere og skoler. Priser, kvalitetsdata og normeringer for alle 98 kommuner.",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Institutionsguide",
          url: "https://www.institutionsguiden.dk",
          description: "Sammenlign priser, kvalitetsdata og normeringer for 8.500+ institutioner i alle 98 kommuner.",
          applicationCategory: "EducationalApplication",
          operatingSystem: "Web",
          inLanguage: "da",
          isAccessibleForFree: true,
          offers: { "@type": "Offer", price: "0", priceCurrency: "DKK" },
        },
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Institutionsguide",
          url: "https://www.institutionsguiden.dk",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://www.institutionsguiden.dk/?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        },
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            { "@type": "Question", name: "Hvad koster en vuggestue i Danmark?", acceptedAnswer: { "@type": "Answer", text: "Prisen for en kommunal vuggestueplads varierer fra ca. 2.500 til 4.200 kr./md. afhængigt af kommune. De billigste kommuner er typisk i Vest- og Nordjylland, mens hovedstadsområdet er dyrest. Se aktuelle priser for din kommune på Institutionsguide." } },
            { "@type": "Question", name: "Hvordan beregner man friplads?", acceptedAnswer: { "@type": "Answer", text: "Friplads (økonomisk fripladstilskud) beregnes ud fra husstandens samlede indkomst. I 2026 gives fuld friplads ved indkomst under ca. 202.400 kr./år. Tilskuddet aftrappes gradvist op til ca. 609.600 kr./år. Enlige forældre og familier med flere børn kan få ekstra tilskud." } },
            { "@type": "Question", name: "Hvad er normering i en vuggestue?", acceptedAnswer: { "@type": "Answer", text: "Normering angiver forholdet mellem antal børn per voksen. Minimumsnormeringen i Danmark kræver ca. 3 børn per voksen i vuggestuer og ca. 6 børn per voksen i børnehaver. Den faktiske normering varierer mellem kommuner og institutioner." } },
          ],
        },
      ],
    },
    "/vuggestue": {
      title: "Vuggestuer i Danmark — Priser, kvalitet og sammenligning | Institutionsguide",
      description: "Find og sammenlign vuggestuer (0-2 år) i alle 98 kommuner. Se priser, ejerskab og beregn friplads.",
      ogTitle: "Vuggestuer i Danmark — Sammenlign priser og kvalitet",
      ogDescription: "Find vuggestuer i din kommune. Se månedlige priser, normeringer og beregn evt. friplads.",
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: "Vuggestuer", url: "/vuggestue" },
      ],
    },
    "/boernehave": {
      title: "Børnehaver i Danmark — Priser, kvalitet og sammenligning | Institutionsguide",
      description: "Sammenlign børnehaver (3-5 år) i hele landet. Se kommunale, selvejende og private børnehaver med priser.",
      ogTitle: "Børnehaver i Danmark — Sammenlign priser og kvalitet",
      ogDescription: "Find børnehaver i din kommune. Sammenlign priser, ejerskab og normeringer.",
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: "Børnehaver", url: "/boernehave" },
      ],
    },
    "/dagpleje": {
      title: "Dagplejere i Danmark — Priser og sammenligning | Institutionsguide",
      description: "Find dagplejere (0-2 år) i din kommune. Ofte billigere end vuggestue med højere voksen-barn-ratio.",
      ogTitle: "Dagplejere i Danmark — Find og sammenlign",
      ogDescription: "Find dagplejere i din kommune. Se priser og sammenlign med vuggestuer.",
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: "Dagplejere", url: "/dagpleje" },
      ],
    },
    "/skole": {
      title: "Skoler i Danmark — Kvalitetsdata, karakterer og trivsel | Institutionsguide",
      description: "Sammenlign folkeskoler og privatskoler med kvalitetsdata: trivsel, karaktergennemsnit, fravær og kompetencedækning.",
      ogTitle: "Skoler i Danmark — Sammenlign kvalitet og karakterer",
      ogDescription: "Find skoler med kvalitetsdata. Trivsel, karakterer, fravær og kompetencedækning for alle skoler.",
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: "Skoler", url: "/skole" },
      ],
    },
    "/sfo": {
      title: "SFO i Danmark — Priser og sammenligning | Institutionsguide",
      description: "Find SFO (6-9 år) i din kommune. Se priser og sammenlign forskellige muligheder.",
      ogTitle: "SFO i Danmark — Find og sammenlign",
      ogDescription: "Find SFO-tilbud i din kommune. Se priser og sammenlign.",
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: "SFO", url: "/sfo" },
      ],
    },
    "/fritidsklub": {
      title: "Fritidsklubber i Danmark — Priser og sammenligning | Institutionsguide",
      description: "Find fritidsklubber (10-14 år) i din kommune. Se priser og sammenlign muligheder.",
      ogTitle: "Fritidsklubber i Danmark — Find og sammenlign",
      ogDescription: "Find fritidsklubber i din kommune. Se priser og sammenlign.",
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: "Fritidsklubber", url: "/fritidsklub" },
      ],
    },
    "/efterskole": {
      title: "Efterskoler i Danmark — Sammenlign 119+ efterskoler | Institutionsguide",
      description: "Sammenlign efterskoler i hele Danmark. Se profiler, priser og kontaktinfo for alle efterskoler.",
      ogTitle: "Efterskoler i Danmark — Sammenlign alle efterskoler",
      ogDescription: "Find og sammenlign 119+ efterskoler. Priser, profiler og kontaktinfo.",
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: "Efterskoler", url: "/efterskole" },
      ],
    },
    "/normering": {
      title: "Normeringer i Danmark — Børn per voksen i alle kommuner | Institutionsguide",
      description: "Se normeringer (børn per voksen) for vuggestuer, børnehaver og dagplejer i alle 98 kommuner. Officielle data fra Danmarks Statistik.",
      ogTitle: "Normeringer — Børn per voksen i alle kommuner",
      ogDescription: "Se faktiske normeringer for alle kommuner. Hvor mange børn per voksen i din institution?",
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: "Normeringer", url: "/normering" },
      ],
    },
    "/friplads": {
      title: "Fripladstilskud beregner — Beregn din friplads | Institutionsguide",
      description: "Beregn dit fripladstilskud (økonomisk friplads) baseret på husstandsindkomst. Se hvad du sparer på daginstitution.",
      ogTitle: "Fripladstilskud beregner — Se hvad du sparer",
      ogDescription: "Beregn friplads ud fra din indkomst. Se besparelse på vuggestue, børnehave eller SFO.",
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: "Friplads", url: "/friplads" },
      ],
    },
    "/prissammenligning": {
      title: "Prissammenligning — Institutionspriser i alle kommuner | Institutionsguide",
      description: "Sammenlign priser for vuggestuer, børnehaver, dagplejere og SFO på tværs af alle 98 kommuner.",
      ogTitle: "Prissammenligning — Institutionspriser i alle kommuner",
      ogDescription: "Se og sammenlign institutionspriser for alle 98 kommuner i Danmark.",
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: "Prissammenligning", url: "/prissammenligning" },
      ],
    },
    "/sammenlign": {
      title: "Sammenlign institutioner side om side | Institutionsguide",
      description: "Sammenlign op til 4 institutioner side om side. Se priser, kvalitetsdata og kontaktinfo.",
      ogTitle: "Sammenlign institutioner side om side",
      ogDescription: "Sammenlign op til 4 institutioner. Priser, kvalitet og kontaktinfo.",
    },
    "/guide": {
      title: "Guide til valg af institution — Institutionsguide",
      description: "Komplet guide til at vælge den rigtige daginstitution eller skole for dit barn. Trin-for-trin vejledning.",
      ogTitle: "Guide til valg af institution",
      ogDescription: "Trin-for-trin guide til at vælge vuggestue, børnehave eller skole.",
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: "Guide", url: "/guide" },
      ],
    },
    "/metode": {
      title: "Metode og datakilder — Institutionsguide",
      description: "Læs om vores datakilder, metode og opdateringsfrekvens. Data fra Undervisningsministeriet, Danmarks Statistik og kommunerne.",
      ogTitle: "Metode og datakilder",
      ogDescription: "Vores data kommer fra officielle kilder: Undervisningsministeriet, Danmarks Statistik og kommunerne.",
    },
    "/blog": {
      title: "Blog — Institutionsguide",
      description: "Artikler om daginstitutioner, skoler, normeringer og priser i Danmark. Guides og indsigter for forældre.",
      ogTitle: "Blog — Institutionsguide",
      ogDescription: "Artikler og guides om daginstitutioner og skoler i Danmark.",
    },
    "/om": {
      title: "Om Institutionsguide — Institutionsguide",
      description: "Institutionsguide er Danmarks mest komplette oversigt over daginstitutioner og skoler. Del af ParFinans-familien.",
    },
    "/privatliv": {
      title: "Privatlivspolitik — Institutionsguide",
      description: "Læs Institutionsguides privatlivspolitik. Vi respekterer dit privatliv og bruger minimal tracking.",
    },
    "/vilkaar": {
      title: "Vilkår og betingelser — Institutionsguide",
      description: "Læs vilkår og betingelser for brug af Institutionsguide.",
    },
    "/bedste-vaerdi": {
      title: "Bedste værdi — Institutioner med bedst pris-kvalitet | Institutionsguide",
      description: "Find institutioner med den bedste kombination af pris og kvalitet i din kommune.",
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: "Bedste værdi", url: "/bedste-vaerdi" },
      ],
    },
    "/samlet-pris": {
      title: "Samlet pris — Beregn institutionsudgifter over tid | Institutionsguide",
      description: "Beregn den samlede pris for daginstitution fra vuggestue til SFO. Se hvad det koster over hele perioden.",
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: "Samlet pris", url: "/samlet-pris" },
      ],
    },
    "/find": {
      title: "Find institution nær dig — Institutionsguide",
      description: "Find den nærmeste vuggestue, børnehave eller skole baseret på din adresse. Se afstand og priser.",
    },
    "/favoritter": {
      title: "Mine favoritter — Institutionsguide",
      description: "Se dine gemte favoritinstitutioner. Sammenlign og del med din partner.",
    },
  },

  dynamicRoutes: [
    // Blog (fetches from Supabase)
    {
      prefix: "/blog/",
      fetch: fetchBlog,
      fallback: { title: "Artikel — Institutionsguide", description: "Læs denne artikel om daginstitutioner og skoler i Danmark." },
    },
    // Institution detail pages (~7.000 pages)
    {
      prefix: "/institution/",
      fetch: fetchInstitution,
      fallback: { title: "Institution — Institutionsguide", description: "Se priser, kvalitetsdata og kontaktinfo for denne institution." },
    },
    // Kommune pages (~98 pages)
    {
      prefix: "/kommune/",
      fetch: fetchKommune,
      fallback: { title: "Kommune — Institutionsguide", description: "Se institutioner, priser og kvalitetsdata i denne kommune." },
    },
    // Normering per kommune (~98 pages)
    {
      prefix: "/normering/",
      fetch: fetchNormeringKommune,
      fallback: { title: "Normering — Institutionsguide", description: "Se normering (børn per voksen) i denne kommune." },
    },
    // "Bedste" pages
    { prefix: "/bedste-skole/", fetch: makeBedsteFetcher("skole"), fallback: { title: "Bedste skoler — Institutionsguide", description: "Se de bedste skoler i kommunen baseret på kvalitetsdata." } },
    { prefix: "/bedste-vuggestue/", fetch: makeBedsteFetcher("vuggestue"), fallback: { title: "Bedste vuggestuer — Institutionsguide", description: "Se de bedste vuggestuer i kommunen." } },
    { prefix: "/bedste-boernehave/", fetch: makeBedsteFetcher("boernehave"), fallback: { title: "Bedste børnehaver — Institutionsguide", description: "Se de bedste børnehaver i kommunen." } },
    { prefix: "/bedste-dagpleje/", fetch: makeBedsteFetcher("dagpleje"), fallback: { title: "Bedste dagplejere — Institutionsguide", description: "Se de bedste dagplejere i kommunen." } },
    { prefix: "/bedste-sfo/", fetch: makeBedsteFetcher("sfo"), fallback: { title: "Bedste SFO'er — Institutionsguide", description: "Se de bedste SFO'er i kommunen." } },
    // "Billigste" pages
    { prefix: "/billigste-vuggestue/", fetch: makeBilligsteFetcher("vuggestue"), fallback: { title: "Billigste vuggestuer — Institutionsguide", description: "Se de billigste vuggestuer i kommunen." } },
    { prefix: "/billigste-boernehave/", fetch: makeBilligsteFetcher("boernehave"), fallback: { title: "Billigste børnehaver — Institutionsguide", description: "Se de billigste børnehaver i kommunen." } },
    { prefix: "/billigste-dagpleje/", fetch: makeBilligsteFetcher("dagpleje"), fallback: { title: "Billigste dagplejere — Institutionsguide", description: "Se de billigste dagplejere i kommunen." } },
    // VS comparison pages
    {
      prefix: "/sammenlign/",
      fetch: fetchVs,
      fallback: { title: "Sammenligning — Institutionsguide", description: "Sammenlign institutionstyper i din kommune." },
    },
    // Category + municipality pages (~700+ per category)
    { prefix: "/vuggestue/", fetch: makeCatMunFetcher("vuggestue"), fallback: { title: "Vuggestuer — Institutionsguide", description: "Find vuggestuer i denne kommune." } },
    { prefix: "/boernehave/", fetch: makeCatMunFetcher("boernehave"), fallback: { title: "Børnehaver — Institutionsguide", description: "Find børnehaver i denne kommune." } },
    { prefix: "/dagpleje/", fetch: makeCatMunFetcher("dagpleje"), fallback: { title: "Dagplejere — Institutionsguide", description: "Find dagplejere i denne kommune." } },
    { prefix: "/skole/", fetch: makeCatMunFetcher("skole"), fallback: { title: "Skoler — Institutionsguide", description: "Find skoler i denne kommune." } },
    { prefix: "/sfo/", fetch: makeCatMunFetcher("sfo"), fallback: { title: "SFO — Institutionsguide", description: "Find SFO i denne kommune." } },
    { prefix: "/fritidsklub/", fetch: makeCatMunFetcher("fritidsklub"), fallback: { title: "Fritidsklubber — Institutionsguide", description: "Find fritidsklubber i denne kommune." } },
    { prefix: "/efterskole/", fetch: makeCatMunFetcher("efterskole"), fallback: { title: "Efterskoler — Institutionsguide", description: "Find efterskoler i denne kommune." } },
  ],

  pageContent: {
    "/": `
<h2>Find den rigtige institution til dit barn</h2>
<p>Institutionsguide samler officielle data for 8.500+ vuggestuer, børnehaver, dagplejere, skoler, SFO'er, fritidsklubber og efterskoler i alle 98 kommuner. Sammenlign priser, kvalitetsdata og normeringer — helt gratis.</p>

<h3>Hvad du kan</h3>
<ul>
  <li><strong>Sammenlign priser:</strong> Se hvad vuggestue, børnehave og SFO koster i din kommune vs. resten af landet.</li>
  <li><strong>Se kvalitetsdata:</strong> Skolers trivsel, karaktergennemsnit, fravær og kompetencedækning fra Undervisningsministeriet.</li>
  <li><strong>Normeringer:</strong> Se børn per voksen i din kommune — officielle tal fra Danmarks Statistik.</li>
  <li><strong>Beregn friplads:</strong> Se om du er berettiget til økonomisk fripladstilskud ud fra din indkomst.</li>
  <li><strong>Find nær dig:</strong> Brug din adresse og find de nærmeste institutioner med afstand.</li>
</ul>

<h3>Kategorier</h3>
<ul>
  <li><a href="https://www.institutionsguiden.dk/vuggestue">Vuggestuer</a> (0-2 år)</li>
  <li><a href="https://www.institutionsguiden.dk/boernehave">Børnehaver</a> (3-5 år)</li>
  <li><a href="https://www.institutionsguiden.dk/dagpleje">Dagplejere</a> (0-2 år)</li>
  <li><a href="https://www.institutionsguiden.dk/skole">Skoler</a> (6-16 år)</li>
  <li><a href="https://www.institutionsguiden.dk/sfo">SFO</a> (6-9 år)</li>
  <li><a href="https://www.institutionsguiden.dk/fritidsklub">Fritidsklubber</a> (10-14 år)</li>
  <li><a href="https://www.institutionsguiden.dk/efterskole">Efterskoler</a> (14-18 år)</li>
</ul>

<h3>Officielle datakilder</h3>
<p>Alle data stammer fra officielle kilder: Undervisningsministeriet (Uddannelsesstatistik), Danmarks Statistik og kommunernes egne hjemmesider. Data opdateres løbende.</p>`,

    "/vuggestue": `
<h2>Vuggestuer i Danmark</h2>
<p>Find og sammenlign vuggestuer (0-2 år) i alle 98 kommuner. Se kommunale, selvejende og private vuggestuer med månedlige priser, normeringer og kontaktinfo.</p>
<p>Prisen for en kommunal vuggestueplads varierer typisk fra ca. 2.500 til 4.200 kr./md. afhængigt af kommune. Brug fripladstilskud-beregneren for at se om du kan få rabat.</p>`,

    "/boernehave": `
<h2>Børnehaver i Danmark</h2>
<p>Sammenlign børnehaver (3-5 år) i hele landet. Se kommunale, selvejende og private børnehaver med priser og kontaktinfo.</p>
<p>En børnehaveplads koster typisk 1.800-3.200 kr./md. afhængigt af kommune og ejerform.</p>`,

    "/dagpleje": `
<h2>Dagplejere i Danmark</h2>
<p>Find dagplejere (0-2 år) i din kommune. Dagpleje er ofte billigere end vuggestue og tilbyder mindre grupper (max 4-5 børn) i et hjemligt miljø.</p>`,

    "/skole": `
<h2>Skoler i Danmark</h2>
<p>Sammenlign folkeskoler og privatskoler med officielle kvalitetsdata fra Undervisningsministeriet: trivsel, karaktergennemsnit ved afgangsprøven, fravær, kompetencedækning og undervisningseffekt.</p>
<p>Skoler markeret "Over gennemsnit" klarer sig bedre end forventet baseret på elevernes socioøkonomiske baggrund.</p>`,

    "/sfo": `
<h2>SFO i Danmark</h2>
<p>Find SFO-tilbud (6-9 år) i din kommune. Se priser og sammenlign forskellige muligheder for pasning efter skole.</p>`,

    "/fritidsklub": `
<h2>Fritidsklubber i Danmark</h2>
<p>Find fritidsklubber (10-14 år) i din kommune. Se priser og sammenlign muligheder for større børn.</p>`,

    "/efterskole": `
<h2>Efterskoler i Danmark</h2>
<p>Sammenlign 119+ efterskoler i hele Danmark. Se profiler, priser og kontaktinfo. Efterskoler tilbyder et alternativt skoleår for unge 14-18 år med fokus på fællesskab og personlig udvikling.</p>`,

    "/normering": `
<h2>Normeringer — Børn per voksen</h2>
<p>Se normeringer (børn per voksen) for vuggestuer, børnehaver og dagplejer i alle 98 kommuner. Officielle data fra Danmarks Statistik.</p>
<p>Minimumsnormeringen kræver ca. 3 børn per voksen i vuggestuer og ca. 6 børn per voksen i børnehaver. Se hvordan din kommune klarer sig.</p>`,

    "/friplads": `
<h2>Fripladstilskud beregner</h2>
<p>Beregn dit fripladstilskud baseret på husstandsindkomst. I 2026 gives fuld friplads ved indkomst under ca. 202.400 kr./år. Tilskuddet aftrappes gradvist op til ca. 609.600 kr./år.</p>
<p>Enlige forældre og familier med flere børn kan få ekstra tilskud. Brug beregneren til at se din besparelse.</p>`,

    "/prissammenligning": `
<h2>Prissammenligning — Institutionspriser i alle kommuner</h2>
<p>Sammenlign priser for vuggestuer, børnehaver, dagplejere og SFO på tværs af alle 98 kommuner. Se hvilke kommuner der er billigst og dyrest.</p>`,

    "/blog": `
<h2>Blog — Institutionsguide</h2>
<p>Artikler og guides om daginstitutioner, skoler, normeringer og priser i Danmark. Gratis indsigter for forældre.</p>`,
  },

  footerNav: `
      <a href="https://www.institutionsguiden.dk/vuggestue">Vuggestuer</a> ·
      <a href="https://www.institutionsguiden.dk/boernehave">Børnehaver</a> ·
      <a href="https://www.institutionsguiden.dk/skole">Skoler</a> ·
      <a href="https://www.institutionsguiden.dk/normering">Normeringer</a> ·
      <a href="https://www.institutionsguiden.dk/friplads">Friplads</a> ·
      <a href="https://www.institutionsguiden.dk/blog">Blog</a>`,
});

export const config = defaultMatcherConfig;
