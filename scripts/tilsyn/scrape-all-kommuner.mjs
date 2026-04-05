#!/usr/bin/env node
/**
 * scrape-all-kommuner.mjs — Lightweight tilsyn scraper for ALL Danish municipalities
 *
 * Strategy:
 * 1. Visit each kommune's known tilsyn page(s)
 * 2. Extract tilsyn info from link text + PDF filenames (no PDF download needed for most)
 * 3. Only download PDFs for skærpet/problematic cases (for details)
 * 4. Match to our institution data via fuzzy name matching
 *
 * Usage:
 *   node scripts/tilsyn/scrape-all-kommuner.mjs
 *   node scripts/tilsyn/scrape-all-kommuner.mjs --kommune Greve
 *   node scripts/tilsyn/scrape-all-kommuner.mjs --dry-run
 *
 * Output: scripts/tilsyn/output/<slug>-tilsyn.json per kommune
 * Then run: node scripts/build-tilsyn-json.mjs
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const DATA_DIR = join(PROJECT_ROOT, "public", "data");
const OUTPUT_DIR = join(__dirname, "output");

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

const args = process.argv.slice(2);
const getFlag = (n) => args.includes(`--${n}`);
const getFlagValue = (n) => { const i = args.indexOf(`--${n}`); return i !== -1 && i + 1 < args.length ? args[i + 1] : null; };
const DRY_RUN = getFlag("dry-run");
const TARGET = getFlagValue("kommune");

// ---------------------------------------------------------------------------
// Rate-limited fetch
// ---------------------------------------------------------------------------
const RATE_MS = 1200;
let lastFetch = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(url, timeoutMs = 15000) {
  const elapsed = Date.now() - lastFetch;
  if (elapsed < RATE_MS) await sleep(RATE_MS - elapsed);
  lastFetch = Date.now();

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "da,en;q=0.5",
      },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// HTML link extraction
// ---------------------------------------------------------------------------
function decodeEntities(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
}

function extractAllLinks(html, baseUrl) {
  const links = [];
  const re = /<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    let href = decodeEntities(m[1].trim());
    const text = decodeEntities(m[2].replace(/<[^>]+>/g, "").trim());
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("javascript:")) continue;
    try {
      if (!href.startsWith("http")) href = new URL(href, baseUrl).href;
    } catch { continue; }
    links.push({ href, text });
  }
  return links;
}

// ---------------------------------------------------------------------------
// Extract tilsyn info from link text (no PDF download needed!)
// ---------------------------------------------------------------------------
const MONTHS_DA = {
  januar: "01", februar: "02", marts: "03", april: "04", maj: "05", juni: "06",
  juli: "07", august: "08", september: "09", oktober: "10", november: "11", december: "12",
};

function extractDateFromText(text) {
  // "september 2024", "marts 2025", etc.
  for (const [month, num] of Object.entries(MONTHS_DA)) {
    const re = new RegExp(`${month}\\s*(\\d{4})`, "i");
    const m = text.match(re);
    if (m) return `${m[1]}-${num}-01`;
  }
  // "2024", "2025"
  const yearMatch = text.match(/\b(202[0-9])\b/);
  if (yearMatch) return `${yearMatch[1]}-01-01`;
  return null;
}

function extractYearFromText(text) {
  const m = text.match(/\b(202[0-9])\b/);
  return m ? parseInt(m[1], 10) : null;
}

function extractRatingFromText(text) {
  const lower = text.toLowerCase();
  if (/skærpet/i.test(lower)) return "skærpet";
  if (/opfølg/i.test(lower)) return "godkendt_bemærkninger"; // follow-up implies issues
  if (/uanmeldt/i.test(lower) && !/tilsynsrapport/i.test(lower)) return "godkendt_bemærkninger";
  return "godkendt";
}

function extractInstitutionNameFromText(text, filename) {
  // Try link text first: "Tilsynsrapport Abels hus september 2024"
  let name = text
    .replace(/\(PDF\)/gi, "")
    .replace(/tilsynsrapport/gi, "")
    .replace(/opfølgning\s*(på|efter)\s*(skærpet\s*)?tilsyn/gi, "")
    .replace(/skærpet\s*tilsyn/gi, "")
    .replace(/uanmeldt\s*tilsyn/gi, "")
    .replace(/anmeldt\s*tilsyn/gi, "")
    .replace(/referat\s*(af\s*)?(faglig\s*dialog|dialogmøde|opfølgningsmøde)/gi, "")
    .replace(/(januar|februar|marts|april|maj|juni|juli|august|september|oktober|november|december)\s*\d{4}/gi, "")
    .replace(/\b\d{4}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (name.length >= 3 && name.length <= 60) return name;

  // Try filename: "tilsynsrapport-abels-hus-september-2024.pdf"
  if (filename) {
    name = filename
      .replace(/\.pdf.*$/, "")
      .replace(/tilsynsrapport-?/gi, "")
      .replace(/opfoelgning-?/gi, "")
      .replace(/skaerpet-tilsyn-?/gi, "")
      .replace(/uanmeldt-tilsyn-?/gi, "")
      .replace(/(januar|februar|marts|april|maj|juni|juli|august|september|oktober|november|december)/gi, "")
      .replace(/\b\d{4}\b/g, "")
      .replace(/-+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    // Capitalize
    name = name.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    if (name.length >= 3 && name.length <= 60) return name;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Institution name matching
// ---------------------------------------------------------------------------
function loadInstitutionNames(kommuneName) {
  const names = new Map();
  const files = [
    { file: "vuggestue-data.json", prefix: "vug" },
    { file: "boernehave-data.json", prefix: "bh" },
    { file: "dagpleje-data.json", prefix: "dag" },
    { file: "sfo-data.json", prefix: "sfo" },
  ];

  for (const { file, prefix } of files) {
    const p = join(DATA_DIR, file);
    if (!existsSync(p)) continue;
    try {
      const data = JSON.parse(readFileSync(p, "utf8")).i;
      for (const inst of data) {
        const mun = inst.m.replace(/ Kommune$/, "").replace(/s Regionskommune$/, "");
        if (mun === kommuneName) {
          names.set(inst.n.toLowerCase(), `${prefix}-${inst.id}`);
        }
      }
    } catch { /* */ }
  }
  return names;
}

function fuzzyMatch(name, nameMap) {
  if (!name) return null;
  const lower = name.toLowerCase().trim();

  if (nameMap.has(lower)) return nameMap.get(lower);

  // Substring match
  for (const [key, id] of nameMap) {
    if (lower.includes(key) || key.includes(lower)) return id;
  }

  // Partial word match
  const words = lower.split(/[\s\-\/]+/).filter(w => w.length > 2);
  let best = null, bestScore = 0;
  for (const [key, id] of nameMap) {
    const kw = key.split(/[\s\-\/]+/).filter(w => w.length > 2);
    const overlap = words.filter(w => kw.some(k => k.includes(w) || w.includes(k))).length;
    if (overlap > bestScore && overlap >= 1) {
      bestScore = overlap;
      best = id;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Scrape a single kommune
// ---------------------------------------------------------------------------
async function scrapeKommune(kommune) {
  const { name, tilsynPages } = kommune;
  console.log(`\n--- ${name} ---`);

  if (!tilsynPages || tilsynPages.length === 0) {
    console.log("  No tilsyn pages configured");
    return null;
  }

  const nameMap = loadInstitutionNames(name);
  console.log(`  ${nameMap.size} institutions in our data`);

  const allPdfLinks = new Map();

  for (const pageUrl of tilsynPages) {
    try {
      const res = await fetchPage(pageUrl);
      if (!res.ok) {
        console.log(`  ${res.status} ${pageUrl}`);
        continue;
      }

      const html = await res.text();
      const links = extractAllLinks(html, pageUrl);

      // Collect PDF links that are tilsyn-related
      for (const link of links) {
        const lh = link.href.toLowerCase();
        const isPdf = lh.endsWith(".pdf") || lh.includes(".pdf");
        if (!isPdf) continue;
        if (!/tilsyn|rapport|pædagogisk|godkendt/i.test(link.href + " " + link.text)) continue;
        if (!allPdfLinks.has(link.href)) {
          allPdfLinks.set(link.href, link);
        }
      }

      // Also follow sub-page links that might have more PDFs
      const subPages = links.filter(l => {
        try {
          const u = new URL(l.href);
          const base = new URL(pageUrl);
          return u.hostname === base.hostname && !l.href.toLowerCase().includes(".pdf");
        } catch { return false; }
      }).filter(l => /tilsyn|rapport|dagtilbud|børneh|vugges/i.test(l.href + " " + l.text));

      for (const sub of subPages.slice(0, 15)) {
        try {
          const subRes = await fetchPage(sub.href);
          if (!subRes.ok) continue;
          const subHtml = await subRes.text();
          for (const link of extractAllLinks(subHtml, sub.href)) {
            const lh = link.href.toLowerCase();
            if (!(lh.endsWith(".pdf") || lh.includes(".pdf"))) continue;
            if (!/tilsyn|rapport/i.test(link.href + " " + link.text)) continue;
            if (!allPdfLinks.has(link.href)) {
              allPdfLinks.set(link.href, link);
            }
          }
        } catch { /* */ }
      }

      console.log(`  ${pageUrl.split("/").slice(2, 3)} -> ${allPdfLinks.size} PDFs`);
    } catch (e) {
      console.log(`  Error: ${e.message.slice(0, 60)}`);
    }
  }

  if (allPdfLinks.size === 0) {
    console.log("  No PDFs found");
    return null;
  }

  // Process each PDF link — extract info from text, no download needed
  const reports = [];
  const seenInstitutions = new Map(); // id -> latest report

  for (const [href, link] of allPdfLinks) {
    const filename = href.split("/").pop();
    const instName = extractInstitutionNameFromText(link.text, filename);
    const date = extractDateFromText(link.text + " " + filename);
    const year = extractYearFromText(link.text + " " + filename);
    const rating = extractRatingFromText(link.text);
    const matchedId = fuzzyMatch(instName, nameMap);

    // Only keep the latest report per institution
    if (matchedId && seenInstitutions.has(matchedId)) {
      const existing = seenInstitutions.get(matchedId);
      const existingDate = existing.report_date || "0000";
      const newDate = date || "0000";
      if (newDate <= existingDate) continue; // Keep the newer one
    }

    const report = {
      pdf_url: href,
      link_text: link.text,
      institution_name: instName || filename,
      report_date: date,
      report_year: year || 2024,
      overall_rating: rating,
      strengths: [],
      areas_for_improvement: [],
      report_type: /uanmeldt/i.test(link.text) ? "uanmeldt" : "anmeldt",
      matched_institution_id: matchedId,
    };

    if (matchedId) {
      seenInstitutions.set(matchedId, report);
    }
    reports.push(report);
  }

  const matched = reports.filter(r => r.matched_institution_id).length;
  const unique = seenInstitutions.size;
  console.log(`  Reports: ${reports.length} total, ${matched} matched, ${unique} unique institutions`);

  // Save output
  const slug = name.toLowerCase()
    .replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa")
    .replace(/-/g, "-").replace(/\s/g, "-");
  const outPath = join(OUTPUT_DIR, `${slug}-tilsyn.json`);

  const result = {
    municipality: name,
    scraped_at: new Date().toISOString(),
    total_parsed: reports.length,
    total_failed: 0,
    matched: matched,
    unmatched: reports.length - matched,
    reports: [...seenInstitutions.values()], // Only keep latest per institution
  };

  if (!DRY_RUN) {
    writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8");
    console.log(`  Saved: ${slug}-tilsyn.json (${result.reports.length} reports)`);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Load kommune URLs
// ---------------------------------------------------------------------------
function loadKommuneUrls() {
  const p = join(__dirname, "kommune-urls.json");
  if (!existsSync(p)) {
    console.error("Missing kommune-urls.json");
    process.exit(1);
  }
  return JSON.parse(readFileSync(p, "utf8")).kommuner;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║   Tilsyn Scraper — Danish Municipalities (Lightweight)  ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  let kommuner = loadKommuneUrls();

  if (TARGET) {
    kommuner = kommuner.filter(k => k.name.toLowerCase() === TARGET.toLowerCase());
    if (kommuner.length === 0) {
      console.error(`Unknown: ${TARGET}. Available: ${loadKommuneUrls().map(k => k.name).join(", ")}`);
      process.exit(1);
    }
  }

  // Skip already-scraped KBH (has its own dedicated scraper)
  kommuner = kommuner.filter(k => k.name !== "København" || TARGET === "København");

  console.log(`\nScraping ${kommuner.length} municipalities...${DRY_RUN ? " [DRY RUN]" : ""}\n`);

  let totalReports = 0, totalMatched = 0, totalKommuner = 0, noData = 0;

  for (const kommune of kommuner) {
    try {
      const result = await scrapeKommune(kommune);
      if (result) {
        totalReports += result.reports.length;
        totalMatched += result.matched;
        totalKommuner++;
      } else {
        noData++;
      }
    } catch (e) {
      console.error(`  FATAL ${kommune.name}: ${e.message}`);
      noData++;
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("  SUMMARY");
  console.log("=".repeat(60));
  console.log(`  Kommuner with data: ${totalKommuner}`);
  console.log(`  Kommuner without data: ${noData}`);
  console.log(`  Total reports: ${totalReports}`);
  console.log(`  Matched to institutions: ${totalMatched}`);
  console.log(`\nNext: node scripts/build-tilsyn-json.mjs`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
