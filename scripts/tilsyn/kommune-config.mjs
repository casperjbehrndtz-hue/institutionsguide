/**
 * Kommune tilsynsrapport scraper configurations.
 *
 * Each kommune entry defines:
 *  - name: display name (must match municipality name in institution data files)
 *  - slug: URL-safe identifier used for output files
 *  - source: the platform/system used for publishing (kommune_website, hjernen_hjertet, per_institution)
 *  - listUrls: URL(s) that list/link to individual tilsyn PDFs or reports
 *  - alternativeUrls: fallback URLs to try
 *  - pdfPattern: extra regex to match tilsyn PDF links
 *  - notes: research notes about data availability
 *  - status: "ready" (URLs verified, PDFs found) | "needs_verification" | "placeholder"
 *
 * Research conducted 2026-03-29. Common platforms:
 *  - Hjernen&Hjertet (mit.hjernenhjertet.dk) — used by Aalborg, some others (HTML, not PDF)
 *  - Per-institution subdomains — used by Vejle, Horsens, Esbjerg
 *  - Centralized listing pages with PDFs — used by Randers, Roskilde
 *  - Decentralized (reports on individual institution websites) — Aarhus, Odense, Kolding
 */

export const KOMMUNE_CONFIGS = {
  // ─────────────────────────────────────────────────────────────────────────
  // RANDERS — Best source. Centralized page with 50+ PDF links for 2025
  // ─────────────────────────────────────────────────────────────────────────
  randers: {
    name: "Randers",
    slug: "randers",
    source: "kommune_website",
    listUrls: [
      "https://www.randers.dk/borger/boern-unge-og-familie/dagtilbud-og-pasning/tilsyn/",
    ],
    alternativeUrls: [],
    pdfPattern: /tilsyn|pædagogisk|rapport/i,
    notes:
      "Excellent centralized source. The tilsyn page has direct PDF links organized by area " +
      "(Dagtilbud Midt, Nordøst, Nordvest, Sydøst, Sydvest) plus selvejende and private. " +
      "~60 institution reports for 2025 plus an overall summary report.",
    status: "ready",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ROSKILDE — Excellent source. Centralized page with 20+ PDFs (2024-2025)
  // ─────────────────────────────────────────────────────────────────────────
  roskilde: {
    name: "Roskilde",
    slug: "roskilde",
    source: "kommune_website",
    listUrls: [
      "https://www.roskilde.dk/da-dk/service-og-selvbetjening/borger/familie-og-born/dagtilbud/kommunen-forer-tilsyn-med-dagtilbuddene/",
    ],
    alternativeUrls: [],
    pdfPattern: /tilsyn|pædagogisk/i,
    notes:
      "Centralized page with PDFs hosted at roskilde.dk/media/. Reports organized by " +
      "institution name, with both 'omfattende' (comprehensive) and 'opfølgende' (follow-up) " +
      "tilsyn documents. ~25 PDFs from 2024-2025. Also includes dagpleje and private summary docs.",
    status: "ready",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // AALBORG — Centralized listing but reports are on Hjernen&Hjertet (HTML)
  // ─────────────────────────────────────────────────────────────────────────
  aalborg: {
    name: "Aalborg",
    slug: "aalborg",
    source: "hjernen_hjertet",
    listUrls: [
      "https://www.aalborg.dk/om-kommunen/tilsyn-og-servicegrundlag/tilsyn/boern-og-unge/tilsynsrapporter-for-daginstitutioner/",
    ],
    alternativeUrls: [
      "https://www.aalborg.dk/familie-og-boern/boernepasning/tilsyn",
    ],
    pdfPattern: /tilsyn|rapport/i,
    // Special: Aalborg links to mit.hjernenhjertet.dk HTML reports, not PDFs.
    // The scraper has a special handler for Hjernen&Hjertet links.
    hjernenHjertetPattern: /mit\.hjernenhjertet\.dk\/pq\/publicReport/,
    notes:
      "Centralized listing at aalborg.dk with ~130 institutions organized by 11 geographic " +
      "areas, plus landsbyordninger, selvejende, special, and private. However, reports link " +
      "to Hjernen&Hjertet HTML pages (not PDFs). The scraper extracts text from those HTML pages instead.",
    status: "ready",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // AARHUS — Decentralized. Reports are on individual institution websites.
  // ─────────────────────────────────────────────────────────────────────────
  aarhus: {
    name: "Aarhus",
    slug: "aarhus",
    source: "per_institution",
    listUrls: [
      "https://aarhus.dk/borger/pasning-skole-og-uddannelse/kvalitet-i-boern-og-unges-hverdag/tilsyn-i-boern-og-unge/tilsyn-i-dagtilbud/",
    ],
    alternativeUrls: [
      "https://aarhus.dk/borger/pasning-skole-og-uddannelse/kvalitet-i-boern-og-unges-hverdag/kvalitetsrapporter/",
    ],
    pdfPattern: /tilsyn|kvalitet|rapport/i,
    notes:
      "Aarhus states that reports are on each institution's own website. The main tilsyn page " +
      "explains the process but does not link directly to reports. May need to crawl individual " +
      "institution pages or use Hjernen&Hjertet. The kvalitetsrapporter page may have aggregated data.",
    status: "needs_verification",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ODENSE — Per-institution pages on odense.dk
  // ─────────────────────────────────────────────────────────────────────────
  odense: {
    name: "Odense",
    slug: "odense",
    source: "per_institution",
    listUrls: [
      "https://www.odense.dk/dagtilbud/boerneinstitutioner/centrum-syd/om-institution-centrum-syd/tilsyn",
    ],
    alternativeUrls: [
      "https://www.odense.dk/borger/familie-boern-og-unge/dagtilbud",
    ],
    pdfPattern: /tilsyn|læringsmiljø|rapport/i,
    notes:
      "Odense has per-institution tilsyn pages at odense.dk/dagtilbud/boerneinstitutioner/{name}/tilsyn. " +
      "Individual learning environment observations are available. For detailed reports, contact " +
      "parent council or institution leader. Structure needs mapping of all institution URLs.",
    status: "needs_verification",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ESBJERG — Per-institution pages at boernepasning.esbjerg.dk
  // ─────────────────────────────────────────────────────────────────────────
  esbjerg: {
    name: "Esbjerg",
    slug: "esbjerg",
    source: "per_institution",
    listUrls: [
      "https://boernepasning.esbjerg.dk/daginstitutioner/kaskelotten/rapporter-og-dokumenter",
      "https://boernepasning.esbjerg.dk/daginstitutioner/boernehuset-guldager/rapporter-og-dokumenter",
      "https://boernepasning.esbjerg.dk/daginstitutioner/tangebo/rapporter-og-dokumenter",
      "https://boernepasning.esbjerg.dk/daginstitutioner/roerkjaerhusene/rapporter-og-dokumenter",
    ],
    alternativeUrls: [
      "https://boernepasning.esbjerg.dk/praktisk-information/sikkerhed-og-tilsyn-i-dagtilbud",
    ],
    // Esbjerg institution index page for discovering more institution URLs
    institutionIndexUrl: "https://boernepasning.esbjerg.dk/daginstitutioner",
    pdfPattern: /tilsyn|ordinært|uanmeldt/i,
    notes:
      "Esbjerg has per-institution 'rapporter-og-dokumenter' pages at boernepasning.esbjerg.dk. " +
      "PDFs include tilsynsrapporter covering multi-year periods (e.g. 2022-2024). " +
      "The institution index page can be crawled to discover all institution URLs, " +
      "then append /rapporter-og-dokumenter to each.",
    status: "ready",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // HORSENS — Per-dagtilbud-area pages at dagtilbud.horsens.dk
  // ─────────────────────────────────────────────────────────────────────────
  horsens: {
    name: "Horsens",
    slug: "horsens",
    source: "per_institution",
    listUrls: [
      "https://dagtilbud.horsens.dk/",
    ],
    alternativeUrls: [
      "https://horsens.dk/politik/strategierogpolitikker/tilsyn",
    ],
    // Known PDF: tilsynsrapport for Krokushaven
    knownPdfs: [
      "https://dagtilbud.horsens.dk/media/4tgdir4d/tilsynsrapportkrokushaventiloffentliggoerelse.pdf",
    ],
    // Horsens dagtilbud areas for crawling
    dagtilbudAreas: [
      "dagtilbudbankager", "dagtilbudbraedstrup", "dagtilbuddagnaes",
      "dagtilbudegebjerg", "dagtilbudgedved", "dagtilbudhatting",
      "dagtilbudhovedgaard", "dagtilbudhoejvang", "dagtilbudlangmark",
      "dagtilbudlund", "dagtilbudmidtby", "dagtilbudnim",
      "dagtilbudstensballe", "dagtilbudsoendermark", "dagtilbudsoevind",
      "dagtilbudtorsted", "dagtilbudvestbyen", "dagtilbudoestbirk",
    ],
    pdfPattern: /tilsyn|rapport/i,
    notes:
      "Horsens has 18 dagtilbud areas at dagtilbud.horsens.dk/{area}/. Each area has sub-pages " +
      "for 'kvalitet-og-politikker/paedagogisk-tilsyn' with PDF links. The main page lists all areas. " +
      "Also has retningslinjer PDF at horsens.dk. Individual tilsyn PDFs on area sub-pages.",
    status: "ready",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // VEJLE — Per-institution subdomains at {institution}.vejle.dk
  // ─────────────────────────────────────────────────────────────────────────
  vejle: {
    name: "Vejle",
    slug: "vejle",
    source: "per_institution",
    listUrls: [
      "https://www.vejle.dk/borger/mit-liv/boern-og-familie/boernepasning/tilsyn-og-vedtaegter/",
    ],
    // Known institution tilsyn pages
    knownInstitutionUrls: [
      "https://bguhrhoej.vejle.dk/tilsyn-og-undersoegelser/tilsynsrapporter/",
      "https://engum.vejle.dk/tilsyn-og-undersoegelser/tilsynsrapporter/",
      "https://regnbuen.vejle.dk/tilsyn-og-undersoegelser/tilsynsrapporter/",
    ],
    alternativeUrls: [],
    pdfPattern: /tilsyn|rapport/i,
    notes:
      "Vejle has per-institution subdomains at {institution}.vejle.dk/tilsyn-og-undersoegelser/tilsynsrapporter/. " +
      "The main tilsyn page explains the process but doesn't link directly to reports. " +
      "Need to discover institution subdomains from the main børnepasning page or from our data files.",
    status: "needs_verification",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // KOLDING — No centralized listing found
  // ─────────────────────────────────────────────────────────────────────────
  kolding: {
    name: "Kolding",
    slug: "kolding",
    source: "per_institution",
    listUrls: [
      "https://www.kolding.dk/borger/familier-og-boern/dagtilbud",
      "https://www.kolding.dk/borger/familier-og-boern/dagtilbud/privat-pasning/private-daginstitutioner",
    ],
    alternativeUrls: [
      "https://www.kolding.dk/borger/familier-og-boern/dagtilbud/politikker-og-strategier-dagtilbud",
    ],
    pdfPattern: /tilsyn|rapport/i,
    notes:
      "Kolding does not appear to have a centralized tilsynsrapport listing. " +
      "Private institution tilsyn reports are produced after meetings but no public PDF archive found. " +
      "May need to check individual institution pages or contact the municipality.",
    status: "needs_verification",
  },
};

/**
 * Return config for a single kommune by slug.
 */
export function getKommuneConfig(slug) {
  const normalized = slug
    .toLowerCase()
    .replace(/[æ]/g, "ae")
    .replace(/[ø]/g, "oe")
    .replace(/[å]/g, "aa");
  return KOMMUNE_CONFIGS[normalized] || KOMMUNE_CONFIGS[slug.toLowerCase()] || null;
}

/**
 * Return all kommune configs.
 */
export function getAllKommuneConfigs() {
  return Object.values(KOMMUNE_CONFIGS);
}

/**
 * Return all kommune slugs.
 */
export function getAllKommuneSlugs() {
  return Object.keys(KOMMUNE_CONFIGS);
}
