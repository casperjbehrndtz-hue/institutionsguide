#!/usr/bin/env node

/**
 * Generic Kommune Tilsynsrapporter Scraper
 *
 * Scrapes tilsynsrapporter (inspection reports) for Danish municipalities.
 * Supports three source types:
 *   1. kommune_website — centralized pages with direct PDF links (Randers, Roskilde)
 *   2. hjernen_hjertet — Aalborg-style listing that links to Hjernen&Hjertet HTML reports
 *   3. per_institution — crawls institution index + sub-pages for PDFs (Esbjerg, Horsens)
 *
 * Usage:
 *   node scripts/tilsyn/scrape-kommune.mjs --kommune randers
 *   node scripts/tilsyn/scrape-kommune.mjs --all
 *   node scripts/tilsyn/scrape-kommune.mjs --kommune aalborg --discover-only
 *   node scripts/tilsyn/scrape-kommune.mjs --list
 *
 * Flags:
 *   --kommune <slug>   Scrape a single kommune
 *   --all              Scrape all configured kommuner (skips status=placeholder)
 *   --discover-only    Only discover report URLs, don't download/parse
 *   --list             List all configured kommuner and exit
 *   --max-pdfs <n>     Limit PDFs per kommune (default: 200)
 *   --skip-supabase    Don't upsert to Supabase
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUTPUT_DIR = join(__dirname, "output");
mkdirSync(OUTPUT_DIR, { recursive: true });

import {
  KOMMUNE_CONFIGS,
  getKommuneConfig,
  getAllKommuneConfigs,
  getAllKommuneSlugs,
} from "./kommune-config.mjs";

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
function getFlag(name) {
  return args.indexOf(`--${name}`) !== -1;
}
function getFlagValue(name) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

const MODE_LIST = getFlag("list");
const MODE_ALL = getFlag("all");
const MODE_DISCOVER = getFlag("discover-only");
const SKIP_SUPABASE = getFlag("skip-supabase");
const TARGET_KOMMUNE = getFlagValue("kommune");
const MAX_PDFS = parseInt(getFlagValue("max-pdfs") || "200", 10);

// ---------------------------------------------------------------------------
// Rate-limited fetch (1 request/second)
// ---------------------------------------------------------------------------

const RATE_LIMIT_MS = 1000;
let lastFetchTime = 0;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function rateLimitedFetch(url, options = {}, timeoutMs = 20000) {
  const elapsed = Date.now() - lastFetchTime;
  if (elapsed < RATE_LIMIT_MS) await sleep(RATE_LIMIT_MS - elapsed);
  lastFetchTime = Date.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Institutionsguide/1.0; +https://www.institutionsguiden.dk)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "da,en;q=0.5",
        ...options.headers,
      },
    });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// HTML link extraction (lightweight, no external dependency)
// ---------------------------------------------------------------------------

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
}

function extractLinks(html, baseUrl) {
  const links = [];
  const regex = /<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    let href = decodeHtmlEntities(match[1].trim());
    const text = match[2].replace(/<[^>]+>/g, "").trim();

    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("javascript:")) continue;

    // Resolve relative URLs
    try {
      if (!href.startsWith("http") && !href.startsWith("//")) {
        href = new URL(href, baseUrl).href;
      } else if (href.startsWith("//")) {
        href = "https:" + href;
      }
    } catch {
      continue;
    }

    links.push({ href, text });
  }
  return links;
}

/**
 * Filter links that look like tilsynsrapport PDFs.
 */
function filterTilsynPdfLinks(links, config) {
  const seen = new Set();
  const results = [];

  for (const link of links) {
    const { href, text } = link;
    if (seen.has(href)) continue;

    const lHref = href.toLowerCase();
    const lText = text.toLowerCase();

    const isPdf = lHref.endsWith(".pdf") || lHref.includes(".pdf");
    if (!isPdf) continue;

    // Must have some tilsyn/dagtilbud relevance
    const relevant =
      /tilsyn/i.test(lHref + " " + lText) ||
      /pædagogisk/i.test(lText) ||
      /rapport/i.test(lText) ||
      (config.pdfPattern && config.pdfPattern.test(lHref + " " + lText));

    if (relevant) {
      seen.add(href);
      results.push(link);
    }
  }
  return results;
}

/**
 * Filter links to Hjernen&Hjertet public reports.
 */
function filterHjernenHjertetLinks(links) {
  const seen = new Set();
  const results = [];
  for (const link of links) {
    if (seen.has(link.href)) continue;
    if (/mit\.hjernenhjertet\.dk\/pq\/publicReport/i.test(link.href)) {
      seen.add(link.href);
      results.push(link);
    }
  }
  return results;
}

/**
 * Find sub-pages within the same domain that might contain more tilsyn links.
 */
function findSubPages(links, baseUrl) {
  const base = new URL(baseUrl);
  const seen = new Set();
  const pages = [];

  for (const link of links) {
    try {
      const url = new URL(link.href);
      if (url.hostname !== base.hostname) continue;
      if (url.pathname === base.pathname) continue;
      if (seen.has(url.pathname)) continue;

      const lHref = link.href.toLowerCase();
      const lText = link.text.toLowerCase();
      const relevant =
        /tilsyn/i.test(lHref) || /tilsyn/i.test(lText) ||
        /rapport/i.test(lText) || /dagtilbud/i.test(lHref);
      const isPage = !/\.(pdf|jpg|png|gif|css|js|zip)$/i.test(lHref);

      if (relevant && isPage) {
        seen.add(url.pathname);
        pages.push(link.href);
      }
    } catch {
      continue;
    }
  }
  return pages;
}

// ---------------------------------------------------------------------------
// PDF download and text extraction
// ---------------------------------------------------------------------------

async function downloadPdf(url) {
  const res = await rateLimitedFetch(url, {}, 30000);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("pdf") && !ct.includes("octet")) {
    throw new Error(`Not a PDF (content-type: ${ct})`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Fetch Hjernen&Hjertet HTML report and extract text.
 */
async function fetchHjernenHjertetReport(url) {
  const res = await rateLimitedFetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  // Strip HTML tags to get plain text
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text;
}

// ---------------------------------------------------------------------------
// Text parsing — extract structured data from tilsyn report text
// ---------------------------------------------------------------------------

function extractDataFromText(text, sourceUrl, kommuneName) {
  const result = {
    institution_name: null,
    report_date: null,
    report_year: null,
    overall_rating: null,
    strengths: [],
    areas_for_improvement: [],
    report_type: "anmeldt",
  };

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const fullText = text.toLowerCase();

  // --- Institution name ---
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const line = lines[i];
    if (/^(tilsynsrapport|pædagogisk tilsyn|tilsyn\s|rapport|dato|journal|side\s)/i.test(line)) continue;
    if (new RegExp(kommuneName, "i").test(line) && line.length < 30) continue;
    if (/^\d+$/.test(line)) continue;
    if (line.length < 4 || line.length > 100) continue;
    if (/^[A-ZÆØÅ]/.test(line) && line.length >= 4 && line.length <= 80) {
      result.institution_name = line;
      break;
    }
  }

  // --- Date ---
  const datePatterns = [
    /(?:tilsynsdato|dato|gennemført|besøgsdato)[:\s]*(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/i,
    /(\d{1,2})\.\s*(januar|februar|marts|april|maj|juni|juli|august|september|oktober|november|december)\s*(\d{4})/i,
    /(\d{1,2})[.\-/](\d{1,2})[.\-/](20\d{2})/,
  ];
  const months = {
    januar: 1, februar: 2, marts: 3, april: 4, maj: 5, juni: 6,
    juli: 7, august: 8, september: 9, oktober: 10, november: 11, december: 12,
  };
  for (const pattern of datePatterns) {
    const m = fullText.match(pattern);
    if (m) {
      if (months[m[2]]) {
        result.report_date = `${m[3]}-${String(months[m[2]]).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
        result.report_year = parseInt(m[3]);
      } else {
        result.report_year = parseInt(m[3]);
        result.report_date = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
      }
      break;
    }
  }
  if (!result.report_year) {
    const ym = text.match(/20(2[3-6])/);
    if (ym) result.report_year = parseInt("20" + ym[1]);
  }

  // --- Rating ---
  if (/skærpet tilsyn|ikke godkendt/i.test(fullText)) {
    result.overall_rating = "skærpet";
  } else if (/godkendt med bemærkninger|bemærkninger/i.test(fullText) && /godkendt/i.test(fullText)) {
    result.overall_rating = "godkendt_bemærkninger";
  } else if (/godkendt/i.test(fullText)) {
    result.overall_rating = "godkendt";
  }

  // --- Report type ---
  if (/uanmeldt/i.test(fullText)) {
    result.report_type = "uanmeldt";
  }

  // --- Strengths ---
  const strengthPatterns = [
    /styrk\w*[:\n]([\s\S]{10,500}?)(?=(?:udvikling|opmærksomhed|anbefaling|område|konklusion|forbedring|$))/i,
    /fungerer\s+(?:særligt\s+)?godt[:\n]([\s\S]{10,500}?)(?=(?:udvikling|opmærksomhed|anbefaling|$))/i,
    /positi\w*[:\n]([\s\S]{10,500}?)(?=(?:udvikling|opmærksomhed|anbefaling|$))/i,
    /det\s+gode[:\n]([\s\S]{10,500}?)(?=(?:udvikling|opmærksomhed|anbefaling|$))/i,
  ];
  for (const pattern of strengthPatterns) {
    const m = text.match(pattern);
    if (m) {
      result.strengths = m[1].split(/[•\-\n]/).map((s) => s.trim()).filter((s) => s.length > 10 && s.length < 200).slice(0, 5);
      break;
    }
  }

  // --- Areas for improvement ---
  const improvementPatterns = [
    /udvikling\w*[:\n]([\s\S]{10,500}?)(?=(?:styrk|konklusion|samlet|$))/i,
    /opmærksomhed\w*[:\n]([\s\S]{10,500}?)(?=(?:styrk|konklusion|samlet|$))/i,
    /anbefaling\w*[:\n]([\s\S]{10,500}?)(?=(?:styrk|konklusion|samlet|$))/i,
    /forbedring\w*[:\n]([\s\S]{10,500}?)(?=(?:styrk|konklusion|samlet|$))/i,
    /opmærksomhedspunkt\w*[:\n]([\s\S]{10,500}?)(?=(?:styrk|konklusion|samlet|$))/i,
  ];
  for (const pattern of improvementPatterns) {
    const m = text.match(pattern);
    if (m) {
      result.areas_for_improvement = m[1].split(/[•\-\n]/).map((s) => s.trim()).filter((s) => s.length > 10 && s.length < 200).slice(0, 5);
      break;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Institution name matching
// ---------------------------------------------------------------------------

function loadInstitutionNames(kommuneName) {
  const names = new Map();
  const dataDir = join(__dirname, "..", "..", "public", "data");
  const files = [
    { file: "vuggestue-data.json", prefix: "vug" },
    { file: "boernehave-data.json", prefix: "bh" },
    { file: "dagpleje-data.json", prefix: "dag" },
  ];
  try {
    for (const { file, prefix } of files) {
      const p = join(dataDir, file);
      if (!existsSync(p)) continue;
      const data = JSON.parse(readFileSync(p, "utf8")).i;
      for (const inst of data) {
        if (inst.m === kommuneName) {
          names.set(inst.n.toLowerCase(), `${prefix}-${inst.id}`);
        }
      }
    }
  } catch { /* ignore */ }
  return names;
}

function fuzzyMatch(name, nameMap) {
  if (!name) return null;
  const lower = name.toLowerCase();

  if (nameMap.has(lower)) return nameMap.get(lower);

  for (const [key, id] of nameMap) {
    if (lower.includes(key) || key.includes(lower)) return id;
  }

  const nameWords = lower.split(/\s+/).filter((w) => w.length > 2);
  let bestMatch = null;
  let bestOverlap = 0;
  for (const [key, id] of nameMap) {
    const keyWords = key.split(/\s+/).filter((w) => w.length > 2);
    const overlap = nameWords.filter((w) => keyWords.includes(w)).length;
    if (overlap > bestOverlap && overlap >= 2) {
      bestOverlap = overlap;
      bestMatch = id;
    }
  }
  return bestMatch;
}

// ---------------------------------------------------------------------------
// Discovery strategies per source type
// ---------------------------------------------------------------------------

/**
 * Discover PDFs from centralized listing pages (Randers, Roskilde).
 * Crawls the listing page and 1 level of sub-pages.
 */
async function discoverFromListingPages(config) {
  const allPdfLinks = [];
  const visited = new Set();

  const urls = [...config.listUrls, ...(config.alternativeUrls || [])];

  for (const url of urls) {
    if (visited.has(url)) continue;
    visited.add(url);

    process.stdout.write(`     Fetching: ${url} ... `);
    try {
      const res = await rateLimitedFetch(url);
      if (!res.ok) { console.log(`HTTP ${res.status}`); continue; }
      const html = await res.text();
      const links = extractLinks(html, url);
      console.log(`${links.length} links`);

      const pdfLinks = filterTilsynPdfLinks(links, config);
      console.log(`     -> ${pdfLinks.length} tilsyn PDFs`);
      allPdfLinks.push(...pdfLinks);

      // Crawl sub-pages (up to 15)
      const subPages = findSubPages(links, url);
      for (const sub of subPages.slice(0, 15)) {
        if (visited.has(sub)) continue;
        visited.add(sub);

        process.stdout.write(`     Sub-page: ${sub} ... `);
        try {
          const subRes = await rateLimitedFetch(sub);
          if (!subRes.ok) { console.log(`HTTP ${subRes.status}`); continue; }
          const subHtml = await subRes.text();
          const subLinks = extractLinks(subHtml, sub);
          const subPdfs = filterTilsynPdfLinks(subLinks, config);
          console.log(`${subPdfs.length} PDFs`);
          allPdfLinks.push(...subPdfs);
        } catch (err) {
          console.log(`ERROR: ${err.message}`);
        }
      }
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
    }
  }

  // Deduplicate
  const seen = new Set();
  return allPdfLinks.filter((l) => {
    if (seen.has(l.href)) return false;
    seen.add(l.href);
    return true;
  });
}

/**
 * Discover Hjernen&Hjertet links from Aalborg-style listing page.
 */
async function discoverHjernenHjertet(config) {
  const allLinks = [];
  const visited = new Set();

  for (const url of config.listUrls) {
    if (visited.has(url)) continue;
    visited.add(url);

    process.stdout.write(`     Fetching: ${url} ... `);
    try {
      const res = await rateLimitedFetch(url);
      if (!res.ok) { console.log(`HTTP ${res.status}`); continue; }
      const html = await res.text();
      const links = extractLinks(html, url);
      console.log(`${links.length} links`);

      const hhLinks = filterHjernenHjertetLinks(links);
      console.log(`     -> ${hhLinks.length} Hjernen&Hjertet report links`);
      allLinks.push(...hhLinks);

      // Also collect any PDFs
      const pdfLinks = filterTilsynPdfLinks(links, config);
      if (pdfLinks.length) {
        console.log(`     -> ${pdfLinks.length} direct PDF links`);
        allLinks.push(...pdfLinks);
      }
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
    }
  }

  const seen = new Set();
  return allLinks.filter((l) => {
    if (seen.has(l.href)) return false;
    seen.add(l.href);
    return true;
  });
}

/**
 * Discover PDFs from per-institution pages (Esbjerg, Horsens).
 * First finds institution listing pages, then crawls each for PDFs.
 */
async function discoverFromInstitutionPages(config) {
  const allPdfLinks = [];
  const visited = new Set();

  // Collect all institution page URLs to visit
  let institutionUrls = [...config.listUrls];

  // For Horsens: build URLs from known dagtilbud areas
  if (config.dagtilbudAreas) {
    for (const area of config.dagtilbudAreas) {
      institutionUrls.push(
        `https://dagtilbud.horsens.dk/${area}/`,
        `https://dagtilbud.horsens.dk/${area}/kvalitet-og-politikker/paedagogisk-tilsyn/`
      );
    }
  }

  // Add known institution URLs
  if (config.knownInstitutionUrls) {
    institutionUrls.push(...config.knownInstitutionUrls);
  }

  // Add known PDFs directly
  if (config.knownPdfs) {
    for (const pdfUrl of config.knownPdfs) {
      allPdfLinks.push({ href: pdfUrl, text: pdfUrl.split("/").pop() });
    }
  }

  // For Esbjerg: try to discover institution index first
  if (config.institutionIndexUrl) {
    process.stdout.write(`     Fetching institution index: ${config.institutionIndexUrl} ... `);
    try {
      const res = await rateLimitedFetch(config.institutionIndexUrl);
      if (res.ok) {
        const html = await res.text();
        const links = extractLinks(html, config.institutionIndexUrl);
        console.log(`${links.length} links`);

        // Find institution page links and add /rapporter-og-dokumenter
        for (const link of links) {
          if (/\/daginstitutioner\/[a-z]/.test(link.href) && !link.href.includes("/rapporter")) {
            const docUrl = link.href.replace(/\/$/, "") + "/rapporter-og-dokumenter";
            institutionUrls.push(docUrl);
          }
        }
      } else {
        console.log(`HTTP ${res.status}`);
      }
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
    }
  }

  // Visit each URL and collect PDF links
  for (const url of institutionUrls) {
    if (visited.has(url)) continue;
    visited.add(url);

    process.stdout.write(`     ${url.split("/").filter(Boolean).pop() || url} ... `);
    try {
      const res = await rateLimitedFetch(url);
      if (!res.ok) { console.log(`HTTP ${res.status}`); continue; }
      const html = await res.text();
      const links = extractLinks(html, url);

      // Collect PDFs
      const pdfLinks = filterTilsynPdfLinks(links, config);
      if (pdfLinks.length) {
        console.log(`${pdfLinks.length} PDFs`);
        allPdfLinks.push(...pdfLinks);
      } else {
        // Also try: any PDF on the page
        const anyPdfs = links.filter((l) => l.href.toLowerCase().endsWith(".pdf"));
        if (anyPdfs.length) {
          console.log(`${anyPdfs.length} PDFs (unfiltered)`);
          allPdfLinks.push(...anyPdfs);
        } else {
          console.log("0 PDFs");
        }
      }

      // For listing pages, also follow sub-pages
      const subPages = findSubPages(links, url);
      for (const sub of subPages.slice(0, 5)) {
        if (visited.has(sub)) continue;
        visited.add(sub);

        process.stdout.write(`       Sub: ${sub.split("/").filter(Boolean).pop()} ... `);
        try {
          const subRes = await rateLimitedFetch(sub);
          if (!subRes.ok) { console.log(`HTTP ${subRes.status}`); continue; }
          const subHtml = await subRes.text();
          const subLinks = extractLinks(subHtml, sub);
          const subPdfs = filterTilsynPdfLinks(subLinks, config);
          console.log(`${subPdfs.length} PDFs`);
          allPdfLinks.push(...subPdfs);
        } catch (err) {
          console.log(`ERROR: ${err.message}`);
        }
      }
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
    }
  }

  const seen = new Set();
  return allPdfLinks.filter((l) => {
    if (seen.has(l.href)) return false;
    seen.add(l.href);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Main scrape pipeline for a single kommune
// ---------------------------------------------------------------------------

async function scrapeKommune(config) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${config.name} — [${config.status}] — source: ${config.source}`);
  console.log(`${"=".repeat(60)}\n`);

  const nameMap = loadInstitutionNames(config.name);
  console.log(`  Loaded ${nameMap.size} institution names for matching\n`);

  // Step 1: Discover report links
  console.log("  1. Discovering reports...\n");
  let discoveredLinks = [];

  switch (config.source) {
    case "hjernen_hjertet":
      discoveredLinks = await discoverHjernenHjertet(config);
      break;
    case "per_institution":
      discoveredLinks = await discoverFromInstitutionPages(config);
      break;
    case "kommune_website":
    default:
      discoveredLinks = await discoverFromListingPages(config);
      break;
  }

  console.log(`\n     Total unique report links: ${discoveredLinks.length}`);

  // Discover-only mode: save URLs and exit
  if (MODE_DISCOVER) {
    const discovery = {
      municipality: config.name,
      discovered_at: new Date().toISOString(),
      source: config.source,
      total_links: discoveredLinks.length,
      links: discoveredLinks,
    };
    const outFile = join(OUTPUT_DIR, `${config.slug}-discovery.json`);
    writeFileSync(outFile, JSON.stringify(discovery, null, 2), "utf-8");
    console.log(`     Written discovery to: ${outFile}`);
    return discovery;
  }

  if (discoveredLinks.length === 0) {
    console.log("\n  No reports found. The page structure may have changed.");
    console.log(`  Notes: ${config.notes}\n`);
    const output = {
      municipality: config.name,
      scraped_at: new Date().toISOString(),
      total_parsed: 0,
      total_failed: 0,
      matched: 0,
      unmatched: 0,
      reports: [],
      notes: "No report links discovered. URLs may need manual verification.",
    };
    const outFile = join(OUTPUT_DIR, `${config.slug}-tilsyn.json`);
    writeFileSync(outFile, JSON.stringify(output, null, 2), "utf-8");
    return output;
  }

  // Step 2: Download and parse reports
  const toProcess = discoveredLinks.slice(0, MAX_PDFS);
  console.log(`\n  2. Processing ${toProcess.length} reports...\n`);

  const results = [];
  let success = 0;
  let failed = 0;

  for (const link of toProcess) {
    const label = link.text?.slice(0, 50) || link.href.split("/").pop()?.slice(0, 50) || "?";
    process.stdout.write(`     ${label} ... `);

    try {
      let extracted;
      const isHH = /mit\.hjernenhjertet\.dk/i.test(link.href);
      const isPdf = link.href.toLowerCase().endsWith(".pdf") || link.href.toLowerCase().includes(".pdf");

      if (isHH) {
        // Hjernen&Hjertet HTML report
        const text = await fetchHjernenHjertetReport(link.href);
        extracted = extractDataFromText(text, link.href, config.name);
        extracted._source_type = "hjernen_hjertet_html";
        extracted._text_length = text.length;
        extracted._pages = null;
      } else if (isPdf) {
        // PDF download + parse
        const buffer = await downloadPdf(link.href);
        const pdfData = await pdfParse(buffer);
        extracted = extractDataFromText(pdfData.text, link.href, config.name);
        extracted._source_type = "pdf";
        extracted._text_length = pdfData.text.length;
        extracted._pages = pdfData.numpages;
      } else {
        // HTML page — extract text
        const text = await fetchHjernenHjertetReport(link.href);
        extracted = extractDataFromText(text, link.href, config.name);
        extracted._source_type = "html";
        extracted._text_length = text.length;
        extracted._pages = null;
      }

      // Fallback: use link text as institution name
      if (!extracted.institution_name && link.text) {
        const clean = link.text
          .replace(/tilsynsrapport|tilsyn|pædagogisk|rapport|opfølgende|omfattende/gi, "")
          .replace(/\d{4}/g, "")
          .replace(/\.pdf/i, "")
          .replace(/\s+/g, " ")
          .trim();
        if (clean.length > 3) extracted.institution_name = clean;
      }

      const matchedId = fuzzyMatch(extracted.institution_name, nameMap);

      results.push({
        pdf_url: link.href,
        link_text: link.text,
        institution_name: extracted.institution_name,
        report_date: extracted.report_date,
        report_year: extracted.report_year,
        overall_rating: extracted.overall_rating,
        strengths: extracted.strengths,
        areas_for_improvement: extracted.areas_for_improvement,
        report_type: extracted.report_type,
        matched_institution_id: matchedId,
        text_length: extracted._text_length,
        pages: extracted._pages,
      });

      console.log(
        `OK — ${extracted.institution_name || "?"} (${extracted.report_year || "?"}) [${matchedId ? "matched" : "unmatched"}]`
      );
      success++;
    } catch (err) {
      console.log(`FAIL — ${err.message}`);
      failed++;
    }
  }

  // Step 3: Save output (matches KBH scraper format)
  const output = {
    municipality: config.name,
    scraped_at: new Date().toISOString(),
    total_parsed: success,
    total_failed: failed,
    matched: results.filter((r) => r.matched_institution_id).length,
    unmatched: results.filter((r) => !r.matched_institution_id).length,
    reports: results,
  };

  const outFile = join(OUTPUT_DIR, `${config.slug}-tilsyn.json`);
  writeFileSync(outFile, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\n  3. Written to: ${outFile}`);

  // Step 4: Upsert to Supabase
  if (!SKIP_SUPABASE) {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (SUPABASE_URL && SUPABASE_KEY) {
      console.log("\n  4. Upserting to Supabase...");
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

      const toUpsert = results
        .filter((r) => r.matched_institution_id && r.report_year)
        .map((r) => ({
          institution_id: r.matched_institution_id,
          municipality: config.name,
          report_date: r.report_date || `${r.report_year}-01-01`,
          report_year: r.report_year,
          report_type: r.report_type,
          overall_rating: r.overall_rating,
          summary: `Pædagogisk tilsyn ${r.report_year}: ${r.institution_name || "Ukendt"}.${r.overall_rating ? ` Vurdering: ${r.overall_rating}.` : ""}`,
          strengths: r.strengths,
          areas_for_improvement: r.areas_for_improvement,
          raw_text: null,
          report_url: r.pdf_url,
          source: `${config.slug}_scrape`,
        }));

      if (toUpsert.length > 0) {
        const BATCH = 50;
        let upserted = 0;
        for (let i = 0; i < toUpsert.length; i += BATCH) {
          const batch = toUpsert.slice(i, i + BATCH);
          const { error } = await supabase
            .from("tilsynsrapporter")
            .upsert(batch, { onConflict: "institution_id,report_year,report_type" });
          if (error) {
            console.error(`     Batch error: ${error.message}`);
          } else {
            upserted += batch.length;
          }
        }
        console.log(`     Upserted ${upserted} reports`);
      } else {
        console.log("     No matched reports to upsert");
      }
    }
  }

  // Summary
  console.log(`\n  --- ${config.name} Summary ---`);
  console.log(`  Discovered: ${discoveredLinks.length} links`);
  console.log(`  Parsed: ${success}, Failed: ${failed}`);
  console.log(`  Matched: ${results.filter((r) => r.matched_institution_id).length}`);
  console.log(`  Ratings: ${results.filter((r) => r.overall_rating).length}`);
  console.log(`  Strengths: ${results.filter((r) => r.strengths.length > 0).length}`);
  console.log(`  Improvements: ${results.filter((r) => r.areas_for_improvement.length > 0).length}`);

  return output;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Kommune Tilsynsrapporter Scraper ===\n");

  if (MODE_LIST) {
    console.log("Configured kommuner:\n");
    for (const slug of getAllKommuneSlugs()) {
      const c = KOMMUNE_CONFIGS[slug];
      const status = c.status === "ready" ? "READY" : c.status === "needs_verification" ? "VERIFY" : "PLACEHOLDER";
      console.log(
        `  ${slug.padEnd(12)} ${c.name.padEnd(12)} [${status.padEnd(11)}]  ${c.source.padEnd(18)} ${c.listUrls.length} URL(s)`
      );
    }
    console.log(`\nTotal: ${getAllKommuneSlugs().length} kommuner`);
    console.log(`Ready: ${getAllKommuneConfigs().filter((c) => c.status === "ready").length}`);
    console.log(`Needs verification: ${getAllKommuneConfigs().filter((c) => c.status === "needs_verification").length}`);
    return;
  }

  let targets = [];

  if (MODE_ALL) {
    targets = getAllKommuneConfigs();
    console.log(`Scraping all ${targets.length} kommuner...\n`);
  } else if (TARGET_KOMMUNE) {
    const config = getKommuneConfig(TARGET_KOMMUNE) || KOMMUNE_CONFIGS[TARGET_KOMMUNE.toLowerCase()];
    if (!config) {
      console.error(`Unknown kommune: ${TARGET_KOMMUNE}`);
      console.error(`Available: ${getAllKommuneSlugs().join(", ")}`);
      process.exit(1);
    }
    targets = [config];
  } else {
    console.error("Usage: node scripts/tilsyn/scrape-kommune.mjs --kommune <slug> | --all | --list");
    console.error(`Available: ${getAllKommuneSlugs().join(", ")}`);
    process.exit(1);
  }

  const allResults = [];

  for (const config of targets) {
    try {
      const result = await scrapeKommune(config);
      if (result) allResults.push(result);
    } catch (err) {
      console.error(`\n  FATAL ERROR scraping ${config.name}: ${err.message}`);
      console.error(err.stack);
    }
  }

  if (allResults.length > 1) {
    console.log(`\n${"=".repeat(60)}`);
    console.log("  OVERALL SUMMARY");
    console.log(`${"=".repeat(60)}\n`);

    let totalParsed = 0;
    let totalMatched = 0;
    for (const r of allResults) {
      const parsed = r.total_parsed || 0;
      const matched = r.matched || 0;
      totalParsed += parsed;
      totalMatched += matched;
      console.log(`  ${(r.municipality || "?").padEnd(14)} ${String(parsed).padStart(3)} parsed, ${String(matched).padStart(3)} matched`);
    }
    console.log(`\n  Total: ${totalParsed} parsed, ${totalMatched} matched across ${allResults.length} kommuner`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
