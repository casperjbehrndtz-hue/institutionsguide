import { createMiddleware, createArticleFetcher, defaultMatcherConfig } from "./src/lib/dk-seo/middleware";
import type { RouteMeta } from "./src/lib/dk-seo/types";

// ── Blog fetcher for Institutionsguiden ──
const fetchBlog = createArticleFetcher({
  table: "blog_posts",
  select: "title,meta_title,meta_description,content_html,published_at,updated_at,keyword",
  siteName: "Institutionsguiden",
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
  // 1. Direct slug → canonical lookup (covers slug-style URLs)
  if (meta.m[slug]) return meta.m[slug];

  // 2. URL-encoded canonical name (e.g. "T%C3%A5rnby") — decode and try a
  //    case-insensitive lookup against known canonical names. We can't trust
  //    \b\w + toUpperCase() because Unicode word-boundary treats Danish vowels
  //    (æøå) as non-word chars, producing broken output like "TåRnby".
  const decoded = decodeURIComponent(slug);
  for (const canonical of Object.values(meta.m)) {
    if (canonical.toLowerCase() === decoded.toLowerCase()) return canonical;
  }

  // 3. Final fallback: dash-to-space, but capitalize ONLY the first character
  //    of each space-separated segment. Unicode-safe.
  return decoded.replace(/-/g, " ")
    .split(" ")
    .map((part) => part ? part.charAt(0).toLocaleUpperCase("da-DK") + part.slice(1) : part)
    .join(" ");
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

// Normalise a raw category (as stored in meta.i) to the URL route segment.
function catToRoute(cat: string): string {
  if (cat === "folkeskole" || cat === "privatskole") return "skole";
  return cat;
}

// Memoised national stats per category-route (survives across requests in the edge instance).
const natStatsCache: Map<string, { count: number; avgPrice: number; avgNorm: number }> = new Map();
function cachedNationalStats(meta: NonNullable<typeof seoCache>, category: string) {
  const cached = natStatsCache.get(category);
  if (cached) return cached;
  const fresh = computeNationalStats(meta, category);
  natStatsCache.set(category, fresh);
  return fresh;
}

// Memoised alphabetically sorted muni-slug list (for neighbor cross-links).
let sortedMunSlugsCache: string[] | null = null;
function sortedMunSlugs(meta: NonNullable<typeof seoCache>): string[] {
  if (sortedMunSlugsCache) return sortedMunSlugsCache;
  sortedMunSlugsCache = Object.keys(meta.m).sort((a, b) => a.localeCompare(b, "da"));
  return sortedMunSlugsCache;
}

// Pick up to `count` alphabetically-neighboring muni slugs to `munSlug`, excluding itself.
function neighborMunis(meta: NonNullable<typeof seoCache>, munSlug: string, count = 4): string[] {
  const list = sortedMunSlugs(meta);
  const idx = list.indexOf(munSlug);
  if (idx === -1) return list.slice(0, count);
  const out: string[] = [];
  let before = idx - 1;
  let after = idx + 1;
  while (out.length < count && (before >= 0 || after < list.length)) {
    if (before >= 0) { out.push(list[before]); before--; if (out.length >= count) break; }
    if (after < list.length) { out.push(list[after]); after++; }
  }
  return out;
}

// HTML-escape helper (dk-seo does not expose its own, and we control input, but be safe for
// free-form strings coming from seo-meta.json like names, addresses).
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

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

  // Gather sibling institutions in the same category + municipality (for context + cross-links).
  // We group folkeskole/privatskole under `skole` so e.g. a folkeskole page compares with all skoler in kommunen.
  const siblingCatKey = catToRoute(cat);
  const siblingEntries = getEntries(meta, siblingCatKey, mun);
  const othersInCatMun = siblingEntries.filter((e) => e.slug !== slug);
  const catMunStats = computeStats(siblingEntries);
  const nationalStats = cachedNationalStats(meta, siblingCatKey);
  const siblingLabel = CAT_LABELS[siblingCatKey] || catUpper;
  const siblingLabelLower = siblingLabel.toLowerCase();

  // Build rich body content for bots
  const bodyParts: string[] = [];
  bodyParts.push(`<h1>${name}</h1>`);
  bodyParts.push(`<p>${name} er en ${ownership ? ownership + " " : ""}${catLabel} i ${mun} Kommune${age ? ` for børn i alderen ${age}` : ""}.</p>`);

  // Kommune context paragraph — institution's role in the municipality.
  if (catMunStats.count > 1) {
    const kContextBits: string[] = [];
    kContextBits.push(`${mun} har i alt ${catMunStats.count} ${siblingLabelLower}${age ? "" : ""}, og ${name} er én af dem.`);
    if (catMunStats.avgPrice > 0 && price > 0) {
      if (price < catMunStats.avgPrice) {
        kContextBits.push(`Med ${formatPrice(price)} kr/md hører institutionen til de billigere i kommunen (gns. ${formatPrice(catMunStats.avgPrice)} kr/md).`);
      } else if (price > catMunStats.avgPrice) {
        kContextBits.push(`Med ${formatPrice(price)} kr/md ligger prisen over kommunens gennemsnit på ${formatPrice(catMunStats.avgPrice)} kr/md.`);
      } else {
        kContextBits.push(`Prisen svarer til kommunens gennemsnit på ${formatPrice(catMunStats.avgPrice)} kr/md.`);
      }
    }
    bodyParts.push(`<p>${kContextBits.join(" ")}</p>`);
  }

  if (price > 0) {
    bodyParts.push(`<h2>Takster og priser 2026</h2>`);
    bodyParts.push(`<p>Månedsprisen for ${name} er ${price.toLocaleString("da-DK")} kr.</p>`);

    // Price-context comparison vs kommune and country.
    if (catMunStats.avgPrice > 0) {
      const diff = price - catMunStats.avgPrice;
      const pct = Math.round(Math.abs(diff) / catMunStats.avgPrice * 100);
      const direction = diff < 0 ? "billigere" : diff > 0 ? "dyrere" : "på niveau med";
      const rangeStr = catMunStats.minPrice !== catMunStats.maxPrice
        ? `, hvor priserne spænder fra ${formatPrice(catMunStats.minPrice)} til ${formatPrice(catMunStats.maxPrice)} kr/md`
        : "";
      if (diff === 0) {
        bodyParts.push(`<p>Månedsprisen på ${formatPrice(price)} kr er på niveau med gennemsnittet på ${formatPrice(catMunStats.avgPrice)} kr/md for ${siblingLabelLower} i ${mun}${rangeStr}.</p>`);
      } else {
        bodyParts.push(`<p>Månedsprisen på ${formatPrice(price)} kr er ${pct}% ${direction} end gennemsnittet på ${formatPrice(catMunStats.avgPrice)} kr/md for ${siblingLabelLower} i ${mun}${rangeStr}.</p>`);
      }
    }
    if (nationalStats.avgPrice > 0) {
      const natDiff = price - nationalStats.avgPrice;
      const natDirection = natDiff < 0 ? "under" : natDiff > 0 ? "over" : "svarende til";
      bodyParts.push(`<p>På landsplan koster ${siblingLabelLower} i gennemsnit ${formatPrice(nationalStats.avgPrice)} kr/md — ${name} ligger ${natDirection} landsgennemsnittet.</p>`);
    }

    // Annual cost for dagtilbud.
    if (isDagtilbud) {
      const yearCost = price * 11; // typisk 11 måneders betaling (juli ofte fri)
      bodyParts.push(`<p>Det svarer til ca. ${formatPrice(yearCost)} kr om året (11 betalingsmåneder) før evt. fripladstilskud.</p>`);
    }
  }

  if (address || phone) {
    bodyParts.push(`<h2>Adresse og kontakt</h2>`);
    if (address) bodyParts.push(`<address>${escapeHtml(address)}, ${escapeHtml(postalCode)} ${escapeHtml(city)}</address>`);
    if (phone) bodyParts.push(`<p>Telefon: ${escapeHtml(phone)}</p>`);
  }

  if (isDagtilbud && normering > 0) {
    const ageGroup = cat === "boernehave" ? "børnehavebørn (3-5 år)" : "vuggestuebørn (0-2 år)";
    bodyParts.push(`<h2>Normering i ${mun}</h2>`);
    const normParts: string[] = [];
    normParts.push(`Den gennemsnitlige normering i ${mun} er ${normering} børn per voksen for ${ageGroup}.`);
    if (nationalStats.avgNorm > 0) {
      const nDiff = +(normering - nationalStats.avgNorm).toFixed(1);
      if (Math.abs(nDiff) >= 0.2) {
        normParts.push(nDiff < 0
          ? `Det er bedre end landsgennemsnittet på ${nationalStats.avgNorm} børn/voksen (færre børn per voksen betyder mere voksentid).`
          : `Landsgennemsnittet er ${nationalStats.avgNorm} børn/voksen.`);
      } else {
        normParts.push(`Det svarer til landsgennemsnittet på ${nationalStats.avgNorm} børn/voksen.`);
      }
    }
    bodyParts.push(`<p>${normParts.join(" ")}</p>`);
  }

  if (isSchool && kvalK) {
    bodyParts.push(`<h2>Kvalitetsdata</h2>`);
    const qParts: string[] = [];
    qParts.push(`${name} har et karaktersnit på ${kvalK}${kvalT ? ` og en trivselsscore på ${kvalT}/5` : ""}.`);
    qParts.push(`Data er hentet fra Undervisningsministeriet og opdateres årligt.`);
    bodyParts.push(`<p>${qParts.join(" ")}</p>`);
  }

  // Nearby similar institutions — link to 10 siblings.
  let listSource = othersInCatMun;
  let listHeading = `Andre ${siblingLabelLower} i ${mun}`;
  if (listSource.length < 5) {
    // Broaden to any category in same municipality.
    const allInMun: InstitutionEntry[] = Object.entries(meta.i)
      .filter(([s, v]) => s !== slug && v[2] === mun)
      .map(([s, v]) => ({
        slug: s, name: v[0], cat: v[1], price: v[3], address: v[4],
        postalCode: v[5], city: v[6], ownership: v[7], normering: v[11], qualityStr: v[12],
      }));
    listSource = allInMun;
    listHeading = `Andre institutioner i ${mun}`;
  }
  if (listSource.length > 0) {
    const sorted = [...listSource].sort((a, b) => {
      // Priced first (cheapest), then alphabetical.
      if (a.price > 0 && b.price > 0) return a.price - b.price;
      if (a.price > 0) return -1;
      if (b.price > 0) return 1;
      return a.name.localeCompare(b.name, "da");
    });
    const shown = sorted.slice(0, 10);
    const rows = shown.map((e) => {
      const parts: string[] = [escapeHtml(e.name)];
      if (e.price > 0) parts.push(`${formatPrice(e.price)} kr/md`);
      else if (e.ownership) parts.push(e.ownership);
      return `<li><a href="/institution/${e.slug}">${parts.join(" — ")}</a></li>`;
    }).join("\n");
    bodyParts.push(`<h2>${listHeading}</h2>`);
    bodyParts.push(`<ul>\n${rows}\n</ul>`);
    if (listSource.length > 10) {
      bodyParts.push(`<p><a href="/${catRoute}/${munSlug}">Se alle ${listSource.length} ${siblingLabelLower} i ${mun} →</a></p>`);
    }
  }

  // Category-specific FAQ section with real data-driven answers.
  if (isDagtilbud) {
    const faqParts: string[] = [];
    faqParts.push(`<h2>Ofte stillede spørgsmål</h2>`);
    if (catMunStats.avgPrice > 0) {
      faqParts.push(`<h3>Hvad koster en ${catLabel} i ${mun}?</h3>`);
      const rangeTxt = catMunStats.minPrice !== catMunStats.maxPrice
        ? ` med priser fra ${formatPrice(catMunStats.minPrice)} til ${formatPrice(catMunStats.maxPrice)} kr/md`
        : "";
      faqParts.push(`<p>En ${catLabel} i ${mun} koster i gennemsnit ${formatPrice(catMunStats.avgPrice)} kr om måneden${rangeTxt}. ${name} koster ${formatPrice(price)} kr/md.</p>`);
    }
    if (catMunStats.avgNorm > 0) {
      faqParts.push(`<h3>Hvordan er normeringen i ${mun}?</h3>`);
      faqParts.push(`<p>Den gennemsnitlige normering i ${mun} er ${catMunStats.avgNorm} børn per voksen${nationalStats.avgNorm > 0 ? ` — landsgennemsnittet er ${nationalStats.avgNorm}` : ""}.</p>`);
    }
    faqParts.push(`<h3>Kan jeg få friplads?</h3>`);
    faqParts.push(`<p>Ja, hvis husstandens samlede årsindkomst er under ca. 609.600 kr. i 2026. Fuld friplads gives ved indkomst under ca. 202.400 kr./år. <a href="/friplads">Beregn din friplads her</a>.</p>`);
    bodyParts.push(faqParts.join("\n"));
  } else if (isSchool) {
    const faqParts: string[] = [];
    faqParts.push(`<h2>Ofte stillede spørgsmål</h2>`);
    if (kvalK) {
      faqParts.push(`<h3>Hvad er karaktersnittet på ${name}?</h3>`);
      faqParts.push(`<p>${name} har et karaktersnit på ${kvalK}${kvalT ? ` og en trivselsscore på ${kvalT}/5` : ""}. Data er fra Undervisningsministeriet.</p>`);
    }
    if (kvalT) {
      faqParts.push(`<h3>Hvordan klarer skolen sig trivselsmæssigt?</h3>`);
      faqParts.push(`<p>Elevtrivslen på ${name} er målt til ${kvalT}/5 i den nationale trivselsmåling. Det afspejler elevernes generelle velbefindende på skolen.</p>`);
    }
    faqParts.push(`<h3>Hvordan kan jeg sammenligne ${siblingLabelLower} i ${mun}?</h3>`);
    if (siblingCatKey === "skole") {
      faqParts.push(`<p>Se <a href="/bedste-skole/${munSlug}">ranking af skoler i ${mun}</a> eller <a href="/skole/${munSlug}">alle skoler i kommunen</a> for at sammenligne karaktersnit, trivsel og profiler.</p>`);
    } else {
      faqParts.push(`<p>Se <a href="/${catRoute}/${munSlug}">alle ${siblingLabelLower} i ${mun}</a> for at sammenligne profiler, priser og kontaktinfo.</p>`);
    }
    bodyParts.push(faqParts.join("\n"));
  }

  // Related pages cross-links block.
  const relLinks: string[] = [];
  relLinks.push(`<li><a href="/${catRoute}/${munSlug}">Alle ${siblingLabelLower} i ${mun}</a></li>`);
  if (isDagtilbud || siblingCatKey === "skole" || siblingCatKey === "sfo") {
    relLinks.push(`<li><a href="/bedste-${catRoute}/${munSlug}">Bedste ${siblingLabelLower} i ${mun}</a></li>`);
  }
  if (isDagtilbud) {
    relLinks.push(`<li><a href="/billigste-${catRoute}/${munSlug}">Billigste ${siblingLabelLower} i ${mun}</a></li>`);
    relLinks.push(`<li><a href="/normering/${munSlug}">Normering i ${mun}</a></li>`);
    relLinks.push(`<li><a href="/friplads">Beregn friplads</a></li>`);
  }
  relLinks.push(`<li><a href="/kommune/${encodeURIComponent(mun)}">Alle institutioner i ${mun} Kommune</a></li>`);
  bodyParts.push(`<h2>Relaterede sider</h2>`);
  bodyParts.push(`<ul>\n${relLinks.join("\n")}\n</ul>`);

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
    title: `${name} — ${catUpper} i ${mun} | Institutionsguiden`,
    description,
    ogTitle: `${name} — ${catUpper} i ${mun}`,
    ogDescription: description,
    breadcrumbs: [
      { name: "Institutionsguiden", url: "/" },
      { name: `${CAT_LABELS[cat] || catUpper}`, url: `/${catRoute}` },
      { name: mun, url: `/kommune/${encodeURIComponent(mun)}` },
      { name: name, url: `/institution/${slug}` },
    ],
    bodyContent: bodyParts.join("\n"),
  };
}

async function fetchKommune(slug: string, _su: string, _sk: string): Promise<RouteMeta | null> {
  if (!slug) return null;
  const meta = await loadSeo();
  const mun = munFromSlug(slug, meta);
  const year = new Date().getFullYear();

  // Compute per-category stats and lists
  const categories = ["vuggestue", "boernehave", "dagpleje", "skole", "sfo", "fritidsklub", "efterskole"] as const;
  const catData: { cat: string; label: string; entries: InstitutionEntry[]; stats: ReturnType<typeof computeStats> }[] = [];
  let totalCount = 0;
  for (const cat of categories) {
    const entries = getEntries(meta, cat, mun);
    if (entries.length > 0) {
      const stats = computeStats(entries);
      catData.push({ cat, label: CAT_LABELS[cat] || cat, entries, stats });
      totalCount += entries.length;
    }
  }

  const bodyParts: string[] = [];
  bodyParts.push(`<h1>Institutioner i ${mun} Kommune ${year}</h1>`);

  // Summary intro
  const catNames = catData.map((c) => c.label.toLowerCase()).join(", ");
  bodyParts.push(`<p>${mun} Kommune har ${totalCount} institutioner fordelt på ${catData.length} kategorier: ${catNames}.</p>`);

  // Stats summary table
  bodyParts.push(`<h2>Overblik over institutioner i ${mun}</h2>`);
  bodyParts.push(`<table><thead><tr><th>Type</th><th>Antal</th><th>Gns. pris</th><th>Kommunale</th><th>Private</th></tr></thead><tbody>`);
  for (const c of catData) {
    bodyParts.push(`<tr><td><a href="/${c.cat}/${slug}">${c.label}</a></td><td>${c.stats.count}</td><td>${c.stats.avgPrice > 0 ? formatPrice(c.stats.avgPrice) + " kr/md" : "—"}</td><td>${c.stats.kommunale}</td><td>${c.stats.private}</td></tr>`);
  }
  bodyParts.push(`</tbody></table>`);

  // Per-category sections with top 20 institutions + continuation link to dedicated page.
  for (const c of catData) {
    const list = buildOverviewList(c.entries, 20);
    if (list) {
      const priceStr = c.stats.avgPrice > 0 ? ` — gns. ${formatPrice(c.stats.avgPrice)} kr/md` : "";
      bodyParts.push(`<h2>${c.label} i ${mun}${priceStr}</h2>\n${list}`);
      if (c.entries.length > 20) {
        bodyParts.push(`<p><a href="/${c.cat}/${slug}">Se alle ${c.entries.length} ${c.label.toLowerCase()} i ${mun} →</a></p>`);
      }
    }
  }

  const cheapestCat = catData.filter((c) => c.stats.avgPrice > 0).sort((a, b) => a.stats.avgPrice - b.stats.avgPrice)[0];
  const descParts = [`${mun} Kommune har ${totalCount} institutioner.`];
  if (cheapestCat) descParts.push(`Billigste pasning: ${cheapestCat.label.toLowerCase()} fra ${formatPrice(cheapestCat.stats.minPrice)} kr/md.`);

  return {
    title: `Institutioner i ${mun} Kommune ${year} — Komplet overblik | Institutionsguiden`,
    description: descParts.join(" "),
    ogTitle: `${mun} Kommune — ${totalCount} institutioner`,
    ogDescription: `Se alle ${totalCount} institutioner i ${mun}. Sammenlign priser, kvalitetsdata og normeringer på tværs af ${catData.length} kategorier.`,
    breadcrumbs: [
      { name: "Institutionsguiden", url: "/" },
      { name: mun, url: `/kommune/${encodeURIComponent(mun)}` },
    ],
    bodyContent: bodyParts.join("\n"),
  };
}

async function fetchNormeringKommune(slug: string, _su: string, _sk: string): Promise<RouteMeta | null> {
  const meta = await loadSeo();
  const mun = munFromSlug(slug, meta);
  return {
    title: `Normering i ${mun} — Børn per voksen | Institutionsguiden`,
    description: `Se normering (børn per voksen) i ${mun} for dagpleje, vuggestue og børnehave. Officielle data fra Danmarks Statistik.`,
    ogTitle: `Normering i ${mun}`,
    ogDescription: `Se børn per voksen i ${mun}. Sammenlign med landsgennemsnittet.`,
    breadcrumbs: [
      { name: "Institutionsguiden", url: "/" },
      { name: "Normeringer", url: "/normering" },
      { name: mun, url: `/normering/${slug}` },
    ],
    bodyContent: `<h1>Normering i ${mun}</h1><p>Se normering (børn per voksen) for dagpleje (0-2 år), vuggestue (0-2 år) og børnehave (3-5 år) i ${mun}. Data fra Danmarks Statistik.</p>`,
  };
}

// Build an HTML list of institutions for a given category + municipality from seo-meta
const CAT_MAP: Record<string, string[]> = {
  vuggestue: ["vuggestue"],
  boernehave: ["boernehave"],
  dagpleje: ["dagpleje"],
  skole: ["skole", "folkeskole", "privatskole"],
  sfo: ["sfo"],
  fritidsklub: ["fritidsklub"],
  efterskole: ["efterskole"],
};

type InstitutionEntry = {
  slug: string; name: string; cat: string; price: number;
  address: string; postalCode: string; city: string; ownership: string;
  normering: number; qualityStr: string;
};

function getEntries(meta: NonNullable<typeof seoCache>, category: string, mun: string): InstitutionEntry[] {
  const allowedCats = CAT_MAP[category] || [category];
  return Object.entries(meta.i)
    .filter(([, v]) => allowedCats.includes(v[1]) && v[2] === mun)
    .map(([slug, v]) => ({
      slug, name: v[0], cat: v[1], price: v[3], address: v[4],
      postalCode: v[5], city: v[6], ownership: v[7], normering: v[11],
      qualityStr: v[12],
    }));
}

function computeStats(entries: InstitutionEntry[]) {
  const withPrice = entries.filter((e) => e.price > 0);
  const withNorm = entries.filter((e) => e.normering > 0);
  const kommunale = entries.filter((e) => e.ownership === "kommunal").length;
  const private_ = entries.filter((e) => e.ownership === "privat").length;
  const avgPrice = withPrice.length ? Math.round(withPrice.reduce((s, e) => s + e.price, 0) / withPrice.length) : 0;
  const minPrice = withPrice.length ? Math.min(...withPrice.map((e) => e.price)) : 0;
  const maxPrice = withPrice.length ? Math.max(...withPrice.map((e) => e.price)) : 0;
  const avgNorm = withNorm.length ? +(withNorm.reduce((s, e) => s + e.normering, 0) / withNorm.length).toFixed(1) : 0;
  return { count: entries.length, kommunale, private: private_, avgPrice, minPrice, maxPrice, avgNorm };
}

function computeNationalStats(meta: NonNullable<typeof seoCache>, category: string) {
  const allowedCats = CAT_MAP[category] || [category];
  const all = Object.values(meta.i).filter((v) => allowedCats.includes(v[1]));
  const withPrice = all.filter((v) => v[3] > 0);
  const avgPrice = withPrice.length ? Math.round(withPrice.reduce((s, v) => s + v[3], 0) / withPrice.length) : 0;
  const withNorm = all.filter((v) => v[11] > 0);
  const avgNorm = withNorm.length ? +(withNorm.reduce((s, v) => s + v[11], 0) / withNorm.length).toFixed(1) : 0;
  return { count: all.length, avgPrice, avgNorm };
}

function formatPrice(n: number): string { return n.toLocaleString("da-DK"); }

// Build a quality-focused list (for bedste-* pages)
function buildQualityList(entries: InstitutionEntry[], limit = 25): string {
  const sorted = [...entries].sort((a, b) => {
    const aK = parseFloat(a.qualityStr?.match(/k([\d.]+)/)?.[1] || "0");
    const bK = parseFloat(b.qualityStr?.match(/k([\d.]+)/)?.[1] || "0");
    if (bK !== aK) return bK - aK;
    const aT = parseFloat(a.qualityStr?.match(/t([\d.]+)/)?.[1] || "0");
    const bT = parseFloat(b.qualityStr?.match(/t([\d.]+)/)?.[1] || "0");
    return bT - aT;
  });
  const shown = sorted.slice(0, limit);
  const rows = shown.map((e, i) => {
    const parts: string[] = [`<strong>#${i + 1} ${e.name}</strong>`];
    const km = e.qualityStr?.match(/k([\d.]+)/);
    const tm = e.qualityStr?.match(/t([\d.]+)/);
    if (km) parts.push(`karaktersnit ${km[1]}`);
    if (tm) parts.push(`trivsel ${tm[1]}/5`);
    if (e.normering > 0) parts.push(`${e.normering} børn/voksen`);
    if (e.ownership) parts.push(e.ownership);
    if (e.address) parts.push(`${e.address}, ${e.postalCode} ${e.city}`);
    return `<li><a href="/institution/${e.slug}">${parts.join(" — ")}</a></li>`;
  }).join("\n");
  const more = entries.length > limit ? `\n<p>Se alle ${entries.length} institutioner med kvalitetsdata.</p>` : "";
  return `<ol>\n${rows}\n</ol>${more}`;
}

// Build a price-focused list (for billigste-* pages)
function buildPriceList(entries: InstitutionEntry[], avgPrice: number, limit = 25): string {
  const withPrice = [...entries].filter((e) => e.price > 0).sort((a, b) => a.price - b.price);
  if (withPrice.length === 0) return "";
  const shown = withPrice.slice(0, limit);
  const rows = shown.map((e) => {
    const parts: string[] = [`<strong>${e.name}</strong>`, `${formatPrice(e.price)} kr/md`];
    if (avgPrice > 0 && e.price < avgPrice) {
      parts.push(`${formatPrice(avgPrice - e.price)} kr billigere end gennemsnit`);
    }
    if (e.ownership) parts.push(e.ownership);
    if (e.address) parts.push(`${e.address}, ${e.postalCode} ${e.city}`);
    return `<li><a href="/institution/${e.slug}">${parts.join(" — ")}</a></li>`;
  }).join("\n");
  const more = withPrice.length > limit ? `\n<p>Se alle ${withPrice.length} institutioner sorteret efter pris.</p>` : "";
  return `<ol>\n${rows}\n</ol>${more}`;
}

// Build an alphabetical overview list (for category and kommune pages)
function buildOverviewList(entries: InstitutionEntry[], limit = 15): string {
  const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name, "da"));
  const shown = sorted.slice(0, limit);
  const rows = shown.map((e) => {
    const parts: string[] = [`<strong>${e.name}</strong>`];
    if (e.ownership) parts.push(e.ownership);
    if (e.price > 0) parts.push(`${formatPrice(e.price)} kr/md`);
    if (e.address) parts.push(`${e.address}, ${e.postalCode} ${e.city}`);
    if (e.normering > 0) parts.push(`normering ${e.normering} børn/voksen`);
    return `<li><a href="/institution/${e.slug}">${parts.join(" — ")}</a></li>`;
  }).join("\n");
  const more = entries.length > limit ? `\n<p>Og ${entries.length - limit} flere institutioner i kommunen.</p>` : "";
  return `<ol>\n${rows}\n</ol>${more}`;
}

function makeCatMunFetcher(category: string) {
  const label = CAT_LABELS[category] || category;
  const age = CAT_AGE[category] || "";
  const ageStr = age ? ` (${age})` : "";
  const isDagtilbud = ["vuggestue", "boernehave", "dagpleje"].includes(category);

  return async function (slug: string, _su: string, _sk: string): Promise<RouteMeta | null> {
    const meta = await loadSeo();
    const mun = munFromSlug(slug, meta);
    const entries = getEntries(meta, category, mun);
    const stats = computeStats(entries);
    const nat = computeNationalStats(meta, category);
    const list = buildOverviewList(entries, 50);
    const year = new Date().getFullYear();

    // Data-driven intro paragraph
    const bodyParts: string[] = [];
    bodyParts.push(`<h1>${label} i ${mun} ${year}</h1>`);

    const introParts: string[] = [];
    introParts.push(`${mun} Kommune har ${stats.count} ${label.toLowerCase()}${ageStr}.`);
    if (stats.kommunale > 0 || stats.private > 0) {
      introParts.push(`Heraf er ${stats.kommunale} kommunale og ${stats.private} private.`);
    }
    if (stats.avgPrice > 0) {
      introParts.push(`Den gennemsnitlige månedspris er ${formatPrice(stats.avgPrice)} kr.`);
      if (nat.avgPrice > 0) {
        const diff = stats.avgPrice - nat.avgPrice;
        const pct = Math.round(Math.abs(diff) / nat.avgPrice * 100);
        introParts.push(diff > 50
          ? `Det er ${pct}% over landsgennemsnittet på ${formatPrice(nat.avgPrice)} kr.`
          : diff < -50
            ? `Det er ${pct}% under landsgennemsnittet på ${formatPrice(nat.avgPrice)} kr.`
            : `Det svarer til landsgennemsnittet på ${formatPrice(nat.avgPrice)} kr.`);
      }
    }
    if (isDagtilbud && stats.avgNorm > 0) {
      introParts.push(`Normeringen er i gennemsnit ${stats.avgNorm} børn per voksen${nat.avgNorm > 0 ? ` (landsgennemsnit: ${nat.avgNorm})` : ""}.`);
    }
    bodyParts.push(`<p>${introParts.join(" ")}</p>`);

    // Stats table
    if (stats.avgPrice > 0 || stats.avgNorm > 0) {
      bodyParts.push(`<h2>Nøgletal for ${label.toLowerCase()} i ${mun}</h2>`);
      bodyParts.push(`<table><tbody>`);
      bodyParts.push(`<tr><td>Antal</td><td>${stats.count} institutioner</td></tr>`);
      if (stats.avgPrice > 0) {
        bodyParts.push(`<tr><td>Gennemsnitspris</td><td>${formatPrice(stats.avgPrice)} kr/md</td></tr>`);
        if (stats.minPrice !== stats.maxPrice) bodyParts.push(`<tr><td>Prisspænd</td><td>${formatPrice(stats.minPrice)} – ${formatPrice(stats.maxPrice)} kr/md</td></tr>`);
      }
      if (isDagtilbud && stats.avgNorm > 0) bodyParts.push(`<tr><td>Normering</td><td>${stats.avgNorm} børn/voksen</td></tr>`);
      if (stats.kommunale > 0) bodyParts.push(`<tr><td>Kommunale</td><td>${stats.kommunale}</td></tr>`);
      if (stats.private > 0) bodyParts.push(`<tr><td>Private</td><td>${stats.private}</td></tr>`);
      bodyParts.push(`</tbody></table>`);
    }

    if (list) bodyParts.push(`<h2>Alle ${label.toLowerCase()} i ${mun}</h2>\n${list}`);

    // Dense cross-link block at the bottom pointing to related pages.
    const relLinks: string[] = [];
    const isSchoolCat = category === "skole";
    if (entries.length > 0 && (isDagtilbud || isSchoolCat || category === "sfo")) {
      relLinks.push(`<li><a href="/bedste-${category}/${slug}">Bedste ${label.toLowerCase()} i ${mun}</a></li>`);
    }
    if (isDagtilbud) {
      relLinks.push(`<li><a href="/billigste-${category}/${slug}">Billigste ${label.toLowerCase()} i ${mun}</a></li>`);
      relLinks.push(`<li><a href="/normering/${slug}">Normering i ${mun}</a></li>`);
      relLinks.push(`<li><a href="/friplads">Beregn friplads</a></li>`);
    }
    relLinks.push(`<li><a href="/kommune/${encodeURIComponent(mun)}">Alle institutioner i ${mun} Kommune</a></li>`);

    // Link to 3-5 alphabetically neighboring kommuner for the same category.
    const neighbors = neighborMunis(meta, slug, 4);
    for (const n of neighbors) {
      const nMun = munFromSlug(n, meta);
      relLinks.push(`<li><a href="/${category}/${n}">${label} i ${nMun}</a></li>`);
    }

    bodyParts.push(`<h2>Se også</h2>`);
    bodyParts.push(`<ul>\n${relLinks.join("\n")}\n</ul>`);

    return {
      title: `${label} i ${mun} ${year} — Priser og sammenligning | Institutionsguiden`,
      description: `${mun} har ${stats.count} ${label.toLowerCase()}${ageStr}. ${stats.avgPrice > 0 ? `Gns. pris: ${formatPrice(stats.avgPrice)} kr/md. ` : ""}Sammenlign priser, ejerskab og kvalitetsdata.`,
      ogTitle: `${label} i ${mun} — ${stats.count} institutioner`,
      ogDescription: `Sammenlign ${stats.count} ${label.toLowerCase()} i ${mun}. ${stats.avgPrice > 0 ? `Priser fra ${formatPrice(stats.minPrice)} til ${formatPrice(stats.maxPrice)} kr/md.` : ""}`,
      breadcrumbs: [
        { name: "Institutionsguiden", url: "/" },
        { name: label, url: `/${category}` },
        { name: mun, url: `/${category}/${slug}` },
      ],
      bodyContent: bodyParts.join("\n"),
    };
  };
}

function makeBedsteFetcher(category: string) {
  const label = CAT_LABELS[category] || category;
  const isDagtilbud = ["vuggestue", "boernehave", "dagpleje"].includes(category);
  const isSchool = category === "skole";
  return async function (slug: string, _su: string, _sk: string): Promise<RouteMeta | null> {
    const meta = await loadSeo();
    const mun = munFromSlug(slug, meta);
    const entries = getEntries(meta, category, mun);
    const stats = computeStats(entries);
    const nat = computeNationalStats(meta, category);
    const list = buildQualityList(entries, 25);

    const bodyParts: string[] = [];
    const titleBase = isSchool
      ? `Bedste skoler i ${mun} — Kvalitetsranking`
      : `Bedste ${label.toLowerCase()} i ${mun} — Kvalitetsranking`;
    bodyParts.push(`<h1>${titleBase}</h1>`);

    // Quality-focused intro
    const introParts: string[] = [];
    if (isSchool) {
      introParts.push(`Ranking af ${stats.count} skoler i ${mun} sorteret efter karaktersnit og trivsel.`);
    } else if (isDagtilbud) {
      introParts.push(`Ranking af ${stats.count} ${label.toLowerCase()} i ${mun} baseret på normering og kvalitetsdata.`);
      if (stats.avgNorm > 0) {
        introParts.push(`I ${mun} er den gennemsnitlige normering ${stats.avgNorm} børn per voksen.`);
        if (nat.avgNorm > 0 && Math.abs(stats.avgNorm - nat.avgNorm) > 0.2) {
          introParts.push(stats.avgNorm < nat.avgNorm
            ? `Det er bedre end landsgennemsnittet på ${nat.avgNorm} — færre børn per voksen betyder mere voksentid.`
            : `Landsgennemsnittet er ${nat.avgNorm} børn per voksen.`);
        }
      }
    } else {
      introParts.push(`Ranking af ${stats.count} ${label.toLowerCase()} i ${mun} baseret på tilgængelige kvalitetsdata.`);
    }
    bodyParts.push(`<p>${introParts.join(" ")}</p>`);

    // Quality explanation
    if (isDagtilbud) {
      bodyParts.push(`<h2>Hvad afgør kvaliteten?</h2>`);
      bodyParts.push(`<p>Kvalitetsranking er baseret på normering (børn per voksen). En lavere normering giver mere individuel opmærksomhed. ${mun}s ${label.toLowerCase()} har en normering mellem ${stats.avgNorm > 0 ? stats.avgNorm : "—"} børn/voksen i gennemsnit. Derudover ser vi på ejerskab og institutionens samlede profil.</p>`);
    } else if (isSchool) {
      bodyParts.push(`<h2>Hvad afgør kvaliteten?</h2>`);
      bodyParts.push(`<p>Skoler rangeres efter karaktersnit ved afgangsprøven og elevtrivsel. Karaktersnittet afspejler fagligt niveau, mens trivselsmålingen viser elevernes generelle velbefindende. Begge er officielle data fra Undervisningsministeriet.</p>`);
    }

    if (list) bodyParts.push(`<h2>Top ${label.toLowerCase()} i ${mun}</h2>\n${list}`);

    // Navigation to related pages
    bodyParts.push(`<nav>`);
    bodyParts.push(`<p>Se også: <a href="/billigste-${category}/${slug}">Billigste ${label.toLowerCase()} i ${mun}</a> | <a href="/${category}/${slug}">Alle ${label.toLowerCase()} i ${mun}</a></p>`);
    bodyParts.push(`</nav>`);

    const d = isSchool
      ? `De ${Math.min(stats.count, 25)} bedste skoler i ${mun} rangeret efter karaktersnit og trivsel. ${stats.count} skoler sammenlignet.`
      : `De ${Math.min(stats.count, 25)} bedste ${label.toLowerCase()} i ${mun} rangeret efter kvalitet og normering.${stats.avgNorm > 0 ? ` Gns. normering: ${stats.avgNorm} børn/voksen.` : ""}`;

    return {
      title: `${titleBase} | Institutionsguiden`,
      description: d,
      ogTitle: titleBase,
      ogDescription: d,
      breadcrumbs: [
        { name: "Institutionsguiden", url: "/" },
        { name: label, url: `/${category}` },
        { name: `Bedste i ${mun}`, url: `/bedste-${category}/${slug}` },
      ],
      bodyContent: bodyParts.join("\n"),
    };
  };
}

function makeBilligsteFetcher(category: string) {
  const label = CAT_LABELS[category] || category;
  const isDagtilbud = ["vuggestue", "boernehave", "dagpleje"].includes(category);
  return async function (slug: string, _su: string, _sk: string): Promise<RouteMeta | null> {
    const meta = await loadSeo();
    const mun = munFromSlug(slug, meta);
    const entries = getEntries(meta, category, mun);
    const stats = computeStats(entries);
    const nat = computeNationalStats(meta, category);
    const list = buildPriceList(entries, stats.avgPrice, 25);

    const bodyParts: string[] = [];
    bodyParts.push(`<h1>Billigste ${label.toLowerCase()} i ${mun} — Prissammenligning</h1>`);

    // Price-focused intro
    const introParts: string[] = [];
    if (stats.avgPrice > 0) {
      introParts.push(`En plads i ${label.toLowerCase().replace(/r$/, "").replace(/er$/, "")} i ${mun} koster i gennemsnit ${formatPrice(stats.avgPrice)} kr om måneden.`);
      if (stats.minPrice !== stats.maxPrice) {
        introParts.push(`Priserne spænder fra ${formatPrice(stats.minPrice)} til ${formatPrice(stats.maxPrice)} kr/md.`);
        const savings = stats.maxPrice - stats.minPrice;
        if (savings > 100) introParts.push(`Du kan altså spare op til ${formatPrice(savings)} kr/md ved at vælge den billigste.`);
      }
      if (nat.avgPrice > 0) {
        const diff = stats.avgPrice - nat.avgPrice;
        if (Math.abs(diff) > 50) {
          introParts.push(diff > 0
            ? `${mun} er ${formatPrice(diff)} kr dyrere end landsgennemsnittet på ${formatPrice(nat.avgPrice)} kr.`
            : `${mun} er ${formatPrice(Math.abs(diff))} kr billigere end landsgennemsnittet på ${formatPrice(nat.avgPrice)} kr.`);
        }
      }
    } else {
      introParts.push(`Sammenlign priser for ${stats.count} ${label.toLowerCase()} i ${mun}.`);
    }
    bodyParts.push(`<p>${introParts.join(" ")}</p>`);

    // Price breakdown table
    if (stats.avgPrice > 0) {
      bodyParts.push(`<h2>Prisoversigt for ${label.toLowerCase()} i ${mun}</h2>`);
      bodyParts.push(`<table><tbody>`);
      bodyParts.push(`<tr><td>Billigste</td><td>${formatPrice(stats.minPrice)} kr/md</td></tr>`);
      bodyParts.push(`<tr><td>Dyreste</td><td>${formatPrice(stats.maxPrice)} kr/md</td></tr>`);
      bodyParts.push(`<tr><td>Gennemsnit i ${mun}</td><td>${formatPrice(stats.avgPrice)} kr/md</td></tr>`);
      if (nat.avgPrice > 0) bodyParts.push(`<tr><td>Landsgennemsnit</td><td>${formatPrice(nat.avgPrice)} kr/md</td></tr>`);
      bodyParts.push(`</tbody></table>`);

      if (isDagtilbud) {
        const yearCost = stats.avgPrice * 12;
        bodyParts.push(`<p>Den årlige udgift for en gennemsnitlig ${label.toLowerCase().replace(/r$/, "").replace(/er$/, "")}plads i ${mun} er ca. ${formatPrice(yearCost)} kr før evt. fripladstilskud.</p>`);
      }
    }

    if (list) bodyParts.push(`<h2>Billigste ${label.toLowerCase()} i ${mun}</h2>\n${list}`);

    // Navigation to related pages
    bodyParts.push(`<nav>`);
    bodyParts.push(`<p>Se også: <a href="/bedste-${category}/${slug}">Bedste ${label.toLowerCase()} i ${mun}</a> | <a href="/${category}/${slug}">Alle ${label.toLowerCase()} i ${mun}</a></p>`);
    bodyParts.push(`</nav>`);

    const d = stats.avgPrice > 0
      ? `Billigste ${label.toLowerCase()} i ${mun} fra ${formatPrice(stats.minPrice)} kr/md. Gns. pris: ${formatPrice(stats.avgPrice)} kr.${nat.avgPrice > 0 ? ` Landsgennemsnit: ${formatPrice(nat.avgPrice)} kr.` : ""}`
      : `Sammenlign priser for ${stats.count} ${label.toLowerCase()} i ${mun}. Find den billigste institution.`;

    return {
      title: `Billigste ${label.toLowerCase()} i ${mun} — Prissammenligning | Institutionsguiden`,
      description: d,
      ogTitle: `Billigste ${label.toLowerCase()} i ${mun} — fra ${stats.minPrice > 0 ? formatPrice(stats.minPrice) + " kr/md" : ""}`,
      ogDescription: d,
      breadcrumbs: [
        { name: "Institutionsguiden", url: "/" },
        { name: label, url: `/${category}` },
        { name: `Billigste i ${mun}`, url: `/billigste-${category}/${slug}` },
      ],
      bodyContent: bodyParts.join("\n"),
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
    title: `${labelA} vs. ${labelB} i ${mun} — Sammenligning | Institutionsguiden`,
    description: `Sammenlign ${labelA.toLowerCase()} og ${labelB.toLowerCase()} i ${mun}. Priser, normeringer og forskelle.`,
    ogTitle: `${labelA} vs. ${labelB} i ${mun}`,
    ogDescription: `Hvad er forskellen på ${labelA.toLowerCase()} og ${labelB.toLowerCase()} i ${mun}? Se priser og sammenlign.`,
    breadcrumbs: [
      { name: "Institutionsguiden", url: "/" },
      { name: `${labelA} vs. ${labelB}`, url: `/sammenlign/${comparison}/${munSlug}` },
    ],
    bodyContent: `<h1>${labelA} vs. ${labelB} i ${mun}</h1><p>Sammenlign ${labelA.toLowerCase()} og ${labelB.toLowerCase()} i ${mun}. Se priser, normeringer og hjælp til at vælge den rigtige pasningsform.</p>`,
  };
}

// ── Middleware ──
export default createMiddleware({
  siteUrl: "https://www.institutionsguiden.dk",
  siteName: "Institutionsguiden",
  defaultOgImage: "/og-image.png",
  supabaseUrl: "https://epkwhvrwcyhlbdvwwvfi.supabase.co",

  organization: {
    name: "Institutionsguiden",
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

  footerTagline: "Institutionsguiden.dk — Danmarks mest komplette institutionsoversigt. Officielle data for 8.500+ institutioner.",

  routes: {
    "/": {
      title: "Institutionsguiden — Sammenlign vuggestuer, børnehaver og skoler i hele Danmark",
      description: "Officielle data for 8.500+ institutioner i alle 98 kommuner. Sammenlign priser, kvalitetsdata, normeringer og beregn friplads. Helt gratis.",
      ogTitle: "Institutionsguiden — Danmarks mest komplette institutionsoversigt",
      ogDescription: "Sammenlign 8.500+ vuggestuer, børnehaver, dagplejere og skoler. Priser, kvalitetsdata og normeringer for alle 98 kommuner.",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Institutionsguiden",
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
          name: "Institutionsguiden",
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
            { "@type": "Question", name: "Hvad koster en vuggestue i Danmark?", acceptedAnswer: { "@type": "Answer", text: "Prisen for en kommunal vuggestueplads varierer fra ca. 2.500 til 4.200 kr./md. afhængigt af kommune. De billigste kommuner er typisk i Vest- og Nordjylland, mens hovedstadsområdet er dyrest. Se aktuelle priser for din kommune på Institutionsguiden." } },
            { "@type": "Question", name: "Hvordan beregner man friplads?", acceptedAnswer: { "@type": "Answer", text: "Friplads (økonomisk fripladstilskud) beregnes ud fra husstandens samlede indkomst. I 2026 gives fuld friplads ved indkomst under ca. 202.400 kr./år. Tilskuddet aftrappes gradvist op til ca. 609.600 kr./år. Enlige forældre og familier med flere børn kan få ekstra tilskud." } },
            { "@type": "Question", name: "Hvad er normering i en vuggestue?", acceptedAnswer: { "@type": "Answer", text: "Normering angiver forholdet mellem antal børn per voksen. Minimumsnormeringen i Danmark kræver ca. 3 børn per voksen i vuggestuer og ca. 6 børn per voksen i børnehaver. Den faktiske normering varierer mellem kommuner og institutioner." } },
          ],
        },
      ],
    },
    "/vuggestue": {
      title: "Vuggestuer i Danmark — Priser, kvalitet og sammenligning | Institutionsguiden",
      description: "Find og sammenlign vuggestuer (0-2 år) i alle 98 kommuner. Se priser, ejerskab og beregn friplads.",
      ogTitle: "Vuggestuer i Danmark — Sammenlign priser og kvalitet",
      ogDescription: "Find vuggestuer i din kommune. Se månedlige priser, normeringer og beregn evt. friplads.",
      breadcrumbs: [
        { name: "Institutionsguiden", url: "/" },
        { name: "Vuggestuer", url: "/vuggestue" },
      ],
    },
    "/boernehave": {
      title: "Børnehaver i Danmark — Priser, kvalitet og sammenligning | Institutionsguiden",
      description: "Sammenlign børnehaver (3-5 år) i hele landet. Se kommunale, selvejende og private børnehaver med priser.",
      ogTitle: "Børnehaver i Danmark — Sammenlign priser og kvalitet",
      ogDescription: "Find børnehaver i din kommune. Sammenlign priser, ejerskab og normeringer.",
      breadcrumbs: [
        { name: "Institutionsguiden", url: "/" },
        { name: "Børnehaver", url: "/boernehave" },
      ],
    },
    "/dagpleje": {
      title: "Dagplejere i Danmark — Priser og sammenligning | Institutionsguiden",
      description: "Find dagplejere (0-2 år) i din kommune. Ofte billigere end vuggestue med højere voksen-barn-ratio.",
      ogTitle: "Dagplejere i Danmark — Find og sammenlign",
      ogDescription: "Find dagplejere i din kommune. Se priser og sammenlign med vuggestuer.",
      breadcrumbs: [
        { name: "Institutionsguiden", url: "/" },
        { name: "Dagplejere", url: "/dagpleje" },
      ],
    },
    "/skole": {
      title: "Skoler i Danmark — Kvalitetsdata, karakterer og trivsel | Institutionsguiden",
      description: "Sammenlign folkeskoler og privatskoler med kvalitetsdata: trivsel, karaktergennemsnit, fravær og kompetencedækning.",
      ogTitle: "Skoler i Danmark — Sammenlign kvalitet og karakterer",
      ogDescription: "Find skoler med kvalitetsdata. Trivsel, karakterer, fravær og kompetencedækning for alle skoler.",
      breadcrumbs: [
        { name: "Institutionsguiden", url: "/" },
        { name: "Skoler", url: "/skole" },
      ],
    },
    "/sfo": {
      title: "SFO i Danmark — Priser og sammenligning | Institutionsguiden",
      description: "Find SFO (6-9 år) i din kommune. Se priser og sammenlign forskellige muligheder.",
      ogTitle: "SFO i Danmark — Find og sammenlign",
      ogDescription: "Find SFO-tilbud i din kommune. Se priser og sammenlign.",
      breadcrumbs: [
        { name: "Institutionsguiden", url: "/" },
        { name: "SFO", url: "/sfo" },
      ],
    },
    "/fritidsklub": {
      title: "Fritidsklubber i Danmark — Priser og sammenligning | Institutionsguiden",
      description: "Find fritidsklubber (10-14 år) i din kommune. Se priser og sammenlign muligheder.",
      ogTitle: "Fritidsklubber i Danmark — Find og sammenlign",
      ogDescription: "Find fritidsklubber i din kommune. Se priser og sammenlign.",
      breadcrumbs: [
        { name: "Institutionsguiden", url: "/" },
        { name: "Fritidsklubber", url: "/fritidsklub" },
      ],
    },
    "/efterskole": {
      title: "Efterskoler i Danmark — Sammenlign 119+ efterskoler | Institutionsguiden",
      description: "Sammenlign efterskoler i hele Danmark. Se profiler, priser og kontaktinfo for alle efterskoler.",
      ogTitle: "Efterskoler i Danmark — Sammenlign alle efterskoler",
      ogDescription: "Find og sammenlign 119+ efterskoler. Priser, profiler og kontaktinfo.",
      breadcrumbs: [
        { name: "Institutionsguiden", url: "/" },
        { name: "Efterskoler", url: "/efterskole" },
      ],
    },
    "/normering": {
      title: "Normeringer i Danmark — Børn per voksen i alle kommuner | Institutionsguiden",
      description: "Se normeringer (børn per voksen) for vuggestuer, børnehaver og dagplejer i alle 98 kommuner. Officielle data fra Danmarks Statistik.",
      ogTitle: "Normeringer — Børn per voksen i alle kommuner",
      ogDescription: "Se faktiske normeringer for alle kommuner. Hvor mange børn per voksen i din institution?",
      breadcrumbs: [
        { name: "Institutionsguiden", url: "/" },
        { name: "Normeringer", url: "/normering" },
      ],
    },
    "/friplads": {
      title: "Fripladstilskud beregner — Beregn din friplads | Institutionsguiden",
      description: "Beregn dit fripladstilskud (økonomisk friplads) baseret på husstandsindkomst. Se hvad du sparer på daginstitution.",
      ogTitle: "Fripladstilskud beregner — Se hvad du sparer",
      ogDescription: "Beregn friplads ud fra din indkomst. Se besparelse på vuggestue, børnehave eller SFO.",
      breadcrumbs: [
        { name: "Institutionsguiden", url: "/" },
        { name: "Friplads", url: "/friplads" },
      ],
    },
    "/prissammenligning": {
      title: "Prissammenligning — Institutionspriser i alle kommuner | Institutionsguiden",
      description: "Sammenlign priser for vuggestuer, børnehaver, dagplejere og SFO på tværs af alle 98 kommuner.",
      ogTitle: "Prissammenligning — Institutionspriser i alle kommuner",
      ogDescription: "Se og sammenlign institutionspriser for alle 98 kommuner i Danmark.",
      breadcrumbs: [
        { name: "Institutionsguiden", url: "/" },
        { name: "Prissammenligning", url: "/prissammenligning" },
      ],
    },
    "/sammenlign": {
      title: "Sammenlign institutioner side om side | Institutionsguiden",
      description: "Sammenlign op til 4 institutioner side om side. Se priser, kvalitetsdata og kontaktinfo.",
      ogTitle: "Sammenlign institutioner side om side",
      ogDescription: "Sammenlign op til 4 institutioner. Priser, kvalitet og kontaktinfo.",
    },
    "/guide": {
      title: "Guide til valg af institution — Institutionsguiden",
      description: "Komplet guide til at vælge den rigtige daginstitution eller skole for dit barn. Trin-for-trin vejledning.",
      ogTitle: "Guide til valg af institution",
      ogDescription: "Trin-for-trin guide til at vælge vuggestue, børnehave eller skole.",
      breadcrumbs: [
        { name: "Institutionsguiden", url: "/" },
        { name: "Guide", url: "/guide" },
      ],
    },
    "/metode": {
      title: "Metode og datakilder — Institutionsguiden",
      description: "Læs om vores datakilder, metode og opdateringsfrekvens. Data fra Undervisningsministeriet, Danmarks Statistik og kommunerne.",
      ogTitle: "Metode og datakilder",
      ogDescription: "Vores data kommer fra officielle kilder: Undervisningsministeriet, Danmarks Statistik og kommunerne.",
    },
    "/blog": {
      title: "Blog — Institutionsguiden",
      description: "Artikler om daginstitutioner, skoler, normeringer og priser i Danmark. Guides og indsigter for forældre.",
      ogTitle: "Blog — Institutionsguiden",
      ogDescription: "Artikler og guides om daginstitutioner og skoler i Danmark.",
    },
    "/om": {
      title: "Om Institutionsguiden — Institutionsguiden",
      description: "Institutionsguiden er Danmarks mest komplette oversigt over daginstitutioner og skoler. Del af ParFinans-familien.",
    },
    "/privatliv": {
      title: "Privatlivspolitik — Institutionsguiden",
      description: "Læs Institutionsguides privatlivspolitik. Vi respekterer dit privatliv og bruger minimal tracking.",
    },
    "/vilkaar": {
      title: "Vilkår og betingelser — Institutionsguiden",
      description: "Læs vilkår og betingelser for brug af Institutionsguiden.",
    },
    "/bedste-vaerdi": {
      title: "Bedste værdi — Institutioner med bedst pris-kvalitet | Institutionsguiden",
      description: "Find institutioner med den bedste kombination af pris og kvalitet i din kommune.",
      breadcrumbs: [
        { name: "Institutionsguiden", url: "/" },
        { name: "Bedste værdi", url: "/bedste-vaerdi" },
      ],
    },
    "/samlet-pris": {
      title: "Samlet pris — Beregn institutionsudgifter over tid | Institutionsguiden",
      description: "Beregn den samlede pris for daginstitution fra vuggestue til SFO. Se hvad det koster over hele perioden.",
      breadcrumbs: [
        { name: "Institutionsguiden", url: "/" },
        { name: "Samlet pris", url: "/samlet-pris" },
      ],
    },
    "/find": {
      title: "Find institution nær dig — Institutionsguiden",
      description: "Find den nærmeste vuggestue, børnehave eller skole baseret på din adresse. Se afstand og priser.",
    },
    "/favoritter": {
      title: "Mine favoritter — Institutionsguiden",
      description: "Se dine gemte favoritinstitutioner. Sammenlign og del med din partner.",
    },
  },

  dynamicRoutes: [
    // Blog (fetches from Supabase)
    {
      prefix: "/blog/",
      fetch: fetchBlog,
      fallback: { title: "Artikel — Institutionsguiden", description: "Læs denne artikel om daginstitutioner og skoler i Danmark." },
    },
    // Institution detail pages (~7.000 pages)
    {
      prefix: "/institution/",
      fetch: fetchInstitution,
      fallback: { title: "Institution — Institutionsguiden", description: "Se priser, kvalitetsdata og kontaktinfo for denne institution." },
    },
    // Kommune pages (~98 pages)
    {
      prefix: "/kommune/",
      fetch: fetchKommune,
      fallback: { title: "Kommune — Institutionsguiden", description: "Se institutioner, priser og kvalitetsdata i denne kommune." },
    },
    // Normering per kommune (~98 pages)
    {
      prefix: "/normering/",
      fetch: fetchNormeringKommune,
      fallback: { title: "Normering — Institutionsguiden", description: "Se normering (børn per voksen) i denne kommune." },
    },
    // "Bedste" pages
    { prefix: "/bedste-skole/", fetch: makeBedsteFetcher("skole"), fallback: { title: "Bedste skoler — Institutionsguiden", description: "Se de bedste skoler i kommunen baseret på kvalitetsdata." } },
    { prefix: "/bedste-vuggestue/", fetch: makeBedsteFetcher("vuggestue"), fallback: { title: "Bedste vuggestuer — Institutionsguiden", description: "Se de bedste vuggestuer i kommunen." } },
    { prefix: "/bedste-boernehave/", fetch: makeBedsteFetcher("boernehave"), fallback: { title: "Bedste børnehaver — Institutionsguiden", description: "Se de bedste børnehaver i kommunen." } },
    { prefix: "/bedste-dagpleje/", fetch: makeBedsteFetcher("dagpleje"), fallback: { title: "Bedste dagplejere — Institutionsguiden", description: "Se de bedste dagplejere i kommunen." } },
    { prefix: "/bedste-sfo/", fetch: makeBedsteFetcher("sfo"), fallback: { title: "Bedste SFO'er — Institutionsguiden", description: "Se de bedste SFO'er i kommunen." } },
    // "Billigste" pages
    { prefix: "/billigste-vuggestue/", fetch: makeBilligsteFetcher("vuggestue"), fallback: { title: "Billigste vuggestuer — Institutionsguiden", description: "Se de billigste vuggestuer i kommunen." } },
    { prefix: "/billigste-boernehave/", fetch: makeBilligsteFetcher("boernehave"), fallback: { title: "Billigste børnehaver — Institutionsguiden", description: "Se de billigste børnehaver i kommunen." } },
    { prefix: "/billigste-dagpleje/", fetch: makeBilligsteFetcher("dagpleje"), fallback: { title: "Billigste dagplejere — Institutionsguiden", description: "Se de billigste dagplejere i kommunen." } },
    // VS comparison pages
    {
      prefix: "/sammenlign/",
      fetch: fetchVs,
      fallback: { title: "Sammenligning — Institutionsguiden", description: "Sammenlign institutionstyper i din kommune." },
    },
    // Category + municipality pages (~700+ per category)
    { prefix: "/vuggestue/", fetch: makeCatMunFetcher("vuggestue"), fallback: { title: "Vuggestuer — Institutionsguiden", description: "Find vuggestuer i denne kommune." } },
    { prefix: "/boernehave/", fetch: makeCatMunFetcher("boernehave"), fallback: { title: "Børnehaver — Institutionsguiden", description: "Find børnehaver i denne kommune." } },
    { prefix: "/dagpleje/", fetch: makeCatMunFetcher("dagpleje"), fallback: { title: "Dagplejere — Institutionsguiden", description: "Find dagplejere i denne kommune." } },
    { prefix: "/skole/", fetch: makeCatMunFetcher("skole"), fallback: { title: "Skoler — Institutionsguiden", description: "Find skoler i denne kommune." } },
    { prefix: "/sfo/", fetch: makeCatMunFetcher("sfo"), fallback: { title: "SFO — Institutionsguiden", description: "Find SFO i denne kommune." } },
    { prefix: "/fritidsklub/", fetch: makeCatMunFetcher("fritidsklub"), fallback: { title: "Fritidsklubber — Institutionsguiden", description: "Find fritidsklubber i denne kommune." } },
    { prefix: "/efterskole/", fetch: makeCatMunFetcher("efterskole"), fallback: { title: "Efterskoler — Institutionsguiden", description: "Find efterskoler i denne kommune." } },
  ],

  pageContent: {
    "/": `
<h2>Find den rigtige institution til dit barn</h2>
<p>Institutionsguiden samler officielle data for 8.500+ vuggestuer, børnehaver, dagplejere, skoler, SFO'er, fritidsklubber og efterskoler i alle 98 kommuner. Sammenlign priser, kvalitetsdata og normeringer — helt gratis.</p>

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
<h2>Blog — Institutionsguiden</h2>
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
