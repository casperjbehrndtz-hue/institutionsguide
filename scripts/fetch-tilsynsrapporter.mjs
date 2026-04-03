#!/usr/bin/env node
/**
 * fetch-tilsynsrapporter.mjs
 *
 * Scrapes tilsynsrapporter (pedagogical inspection reports) from top Danish
 * municipality websites, downloads PDFs, extracts text with pdf-parse, and
 * uses Claude API to produce structured JSON for each report.
 *
 * The extracted data is matched to existing institutions via fuzzy name +
 * municipality matching.
 *
 * Usage:
 *   node scripts/fetch-tilsynsrapporter.mjs
 *   node scripts/fetch-tilsynsrapporter.mjs --dry-run
 *   node scripts/fetch-tilsynsrapporter.mjs --kommune koebenhavn
 *   node scripts/fetch-tilsynsrapporter.mjs --max-pdfs 5
 *
 * Output:
 *   public/data/tilsynsrapporter.json
 *
 * Environment:
 *   ANTHROPIC_API_KEY — required for Claude extraction
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..");
const OUTPUT_PATH = join(PROJECT_ROOT, "public", "data", "tilsynsrapporter.json");
const DATA_DIR = join(PROJECT_ROOT, "public", "data");

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
function getFlag(name) { return args.includes(`--${name}`); }
function getFlagValue(name) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

const DRY_RUN = getFlag("dry-run");
const TARGET_KOMMUNE = getFlagValue("kommune");
const MAX_PDFS = parseInt(getFlagValue("max-pdfs") || "50", 10);

// ---------------------------------------------------------------------------
// Municipality source URLs
// ---------------------------------------------------------------------------

const KOMMUNE_SOURCES = [
  {
    name: "København",
    slug: "koebenhavn",
    url: "https://www.kk.dk/borger/pasning-og-skole/kvalitet-og-tilsyn/paedagogisk-tilsyn-i-dagtilbud",
    // TODO: verify URL — KK may have restructured
  },
  {
    name: "Frederiksberg",
    slug: "frederiksberg",
    url: "https://www.frederiksberg.dk/dagtilbud-og-skole/tilsynsrapporter-for-dagtilbud",
    // TODO: verify URL
  },
  {
    name: "Aarhus",
    slug: "aarhus",
    url: "https://aarhus.dk/borger/pasning-skole-og-uddannelse/kvalitet-i-boern-og-unges-hverdag/tilsyn-i-boern-og-unge/tilsyn-i-dagtilbud/",
    // TODO: verify URL — Aarhus publishes per-institution
  },
  {
    name: "Aalborg",
    slug: "aalborg",
    url: "https://www.aalborg.dk/om-kommunen/tilsyn-og-servicegrundlag/tilsyn/boern-og-unge/tilsynsrapporter-for-daginstitutioner/",
  },
  {
    name: "Odense",
    slug: "odense",
    url: "https://www.odense.dk/borger/familie-boern-og-unge/dagtilbud",
    // TODO: verify URL — Odense has per-institution pages
  },
  {
    name: "Randers",
    slug: "randers",
    url: "https://www.randers.dk/borger/boern-unge-og-familie/dagtilbud-og-pasning/tilsyn/",
  },
  {
    name: "Roskilde",
    slug: "roskilde",
    url: "https://www.roskilde.dk/da-dk/service-og-selvbetjening/borger/familie-og-born/dagtilbud/kommunen-forer-tilsyn-med-dagtilbuddene/",
  },
  {
    name: "Esbjerg",
    slug: "esbjerg",
    url: "https://boernepasning.esbjerg.dk/praktisk-information/sikkerhed-og-tilsyn-i-dagtilbud",
    // TODO: verify URL — Esbjerg uses per-institution pages
  },
  {
    name: "Horsens",
    slug: "horsens",
    url: "https://dagtilbud.horsens.dk/",
    // TODO: verify URL — Horsens uses per-area pages
  },
  {
    name: "Vejle",
    slug: "vejle",
    url: "https://www.vejle.dk/borger/mit-liv/boern-og-familie/boernepasning/tilsyn-og-vedtaegter/",
    // TODO: verify URL
  },
  {
    name: "Gentofte",
    slug: "gentofte",
    url: "https://www.gentofte.dk/borger/boern-og-familie/dagtilbud/tilsyn-i-dagtilbud",
    // TODO: verify URL
  },
  {
    name: "Lyngby-Taarbæk",
    slug: "lyngby-taarbaek",
    url: "https://www.ltk.dk/borger/boern-og-familie/dagtilbud/tilsyn",
    // TODO: verify URL
  },
  {
    name: "Kolding",
    slug: "kolding",
    url: "https://www.kolding.dk/borger/familier-og-boern/dagtilbud",
    // TODO: verify URL
  },
];

// ---------------------------------------------------------------------------
// Rate-limited fetch (2s between requests)
// ---------------------------------------------------------------------------

const RATE_LIMIT_MS = 2000;
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
        "User-Agent": "Mozilla/5.0 (compatible; Institutionsguide/1.0; +https://institutionsguiden.dk)",
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
// HTML helpers
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
    try {
      if (!href.startsWith("http") && !href.startsWith("//")) {
        href = new URL(href, baseUrl).href;
      } else if (href.startsWith("//")) {
        href = "https:" + href;
      }
    } catch { continue; }
    links.push({ href, text });
  }
  return links;
}

function filterPdfLinks(links) {
  const seen = new Set();
  const results = [];
  for (const link of links) {
    if (seen.has(link.href)) continue;
    const lHref = link.href.toLowerCase();
    const lText = link.text.toLowerCase();
    const isPdf = lHref.endsWith(".pdf") || lHref.includes(".pdf");
    if (!isPdf) continue;
    const relevant =
      /tilsyn/i.test(lHref + " " + lText) ||
      /pædagogisk/i.test(lText) ||
      /rapport/i.test(lText);
    if (relevant) {
      seen.add(link.href);
      results.push(link);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// PDF download + text extraction
// ---------------------------------------------------------------------------

async function downloadAndExtractPdf(url) {
  const res = await rateLimitedFetch(url, {}, 30000);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("pdf") && !ct.includes("octet")) {
    throw new Error(`Not a PDF (content-type: ${ct})`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const parsed = await pdfParse(buffer);
  return parsed.text;
}

// ---------------------------------------------------------------------------
// Claude API extraction
// ---------------------------------------------------------------------------

async function extractWithClaude(text, municipality, pdfUrl) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("  [WARN] ANTHROPIC_API_KEY not set — using regex fallback");
    return extractWithRegex(text, municipality);
  }

  // Truncate very long texts
  const truncated = text.length > 12000 ? text.slice(0, 12000) + "\n...[truncated]" : text;

  const body = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Du er en ekspert i at analysere danske tilsynsrapporter for dagtilbud (børnehaver, vuggestuer, dagpleje).

Analyser denne tilsynsrapport og udtrk struktureret data. Svar KUN med valid JSON, ingen forklaringer.

JSON-format:
{
  "institutionName": "string — institutionens navn",
  "municipality": "${municipality}",
  "tilsynDate": "YYYY-MM-DD eller null",
  "overallVerdict": "tilfredsstillende" | "delvist tilfredsstillende" | "ikke tilfredsstillende",
  "strengths": ["styrke 1", "styrke 2"],
  "concerns": ["bekymring 1"],
  "followUpRequired": true/false,
  "skaerpetTilsyn": true/false,
  "summary": "2-3 sætninger der opsummerer tilsynets konklusion"
}

Mapping:
- "godkendt" / "tilfredsstillende" / "ingen bemærkninger" -> "tilfredsstillende"
- "godkendt med bemærkninger" / "delvist tilfredsstillende" -> "delvist tilfredsstillende"
- "skærpet tilsyn" / "ikke godkendt" / "ikke tilfredsstillende" -> "ikke tilfredsstillende"
- If no clear verdict, use "tilfredsstillende" as default

PDF kilde: ${pdfUrl}

Tilsynsrapport tekst:
${truncated}`,
      },
    ],
  };

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`  [WARN] Claude API ${res.status}: ${errText.slice(0, 200)}`);
      return extractWithRegex(text, municipality);
    }

    const data = await res.json();
    const content = data.content?.[0]?.text || "";

    // Extract JSON from response (may be wrapped in markdown code block)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("  [WARN] No JSON found in Claude response — using regex fallback");
      return extractWithRegex(text, municipality);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    // Validate required fields
    return {
      institutionName: parsed.institutionName || null,
      municipality: municipality,
      tilsynDate: parsed.tilsynDate || null,
      overallVerdict: ["tilfredsstillende", "delvist tilfredsstillende", "ikke tilfredsstillende"].includes(parsed.overallVerdict)
        ? parsed.overallVerdict
        : "tilfredsstillende",
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5) : [],
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns.slice(0, 5) : [],
      followUpRequired: !!parsed.followUpRequired,
      skaerpetTilsyn: !!parsed.skaerpetTilsyn,
      summary: parsed.summary || "",
    };
  } catch (err) {
    console.warn(`  [WARN] Claude API error: ${err.message} — using regex fallback`);
    return extractWithRegex(text, municipality);
  }
}

// ---------------------------------------------------------------------------
// Regex fallback extraction (when Claude API is unavailable)
// ---------------------------------------------------------------------------

function extractWithRegex(text, municipality) {
  const fullText = text.toLowerCase();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Institution name — first meaningful line in header
  let institutionName = null;
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const line = lines[i];
    if (/^(tilsynsrapport|pædagogisk tilsyn|tilsyn\s|rapport|dato|journal|side\s)/i.test(line)) continue;
    if (new RegExp(municipality, "i").test(line) && line.length < 30) continue;
    if (/^\d+$/.test(line)) continue;
    if (line.length < 4 || line.length > 100) continue;
    if (/^[A-ZÆØÅ]/.test(line) && line.length >= 4 && line.length <= 80) {
      institutionName = line;
      break;
    }
  }

  // Date
  let tilsynDate = null;
  const months = {
    januar: "01", februar: "02", marts: "03", april: "04", maj: "05", juni: "06",
    juli: "07", august: "08", september: "09", oktober: "10", november: "11", december: "12",
  };
  const datePatterns = [
    /(?:tilsynsdato|dato|gennemført|besøgsdato)[:\s]*(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/i,
    /(\d{1,2})\.\s*(januar|februar|marts|april|maj|juni|juli|august|september|oktober|november|december)\s*(\d{4})/i,
    /(\d{1,2})[.\-/](\d{1,2})[.\-/](20\d{2})/,
  ];
  for (const pattern of datePatterns) {
    const m = fullText.match(pattern);
    if (m) {
      if (months[m[2]]) {
        tilsynDate = `${m[3]}-${months[m[2]]}-${m[1].padStart(2, "0")}`;
      } else {
        tilsynDate = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
      }
      break;
    }
  }

  // Verdict
  let overallVerdict = "tilfredsstillende";
  let skaerpetTilsyn = false;
  let followUpRequired = false;
  if (/skærpet tilsyn|ikke godkendt|ikke tilfredsstillende/i.test(fullText)) {
    overallVerdict = "ikke tilfredsstillende";
    skaerpetTilsyn = true;
  } else if (/godkendt med bemærkninger|bemærkninger|delvist tilfredsstillende/i.test(fullText)) {
    overallVerdict = "delvist tilfredsstillende";
  }
  if (/opfølg|follow[\s-]?up/i.test(fullText)) {
    followUpRequired = true;
  }

  return {
    institutionName,
    municipality,
    tilsynDate,
    overallVerdict,
    strengths: [],
    concerns: [],
    followUpRequired,
    skaerpetTilsyn,
    summary: "",
  };
}

// ---------------------------------------------------------------------------
// Institution name matching (load from data files)
// ---------------------------------------------------------------------------

function loadInstitutionNames(kommuneName) {
  const names = new Map();
  const files = [
    { file: "vuggestue-data.json", prefix: "vug" },
    { file: "boernehave-data.json", prefix: "bh" },
    { file: "dagpleje-data.json", prefix: "dag" },
  ];
  try {
    for (const { file, prefix } of files) {
      const p = join(DATA_DIR, file);
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

  // Exact match
  if (nameMap.has(lower)) return nameMap.get(lower);

  // Substring match
  for (const [key, id] of nameMap) {
    if (lower.includes(key) || key.includes(lower)) return id;
  }

  // Word overlap match
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
// Scrape a single kommune
// ---------------------------------------------------------------------------

async function scrapeKommune(source) {
  console.log(`\n--- ${source.name} ---`);
  console.log(`  URL: ${source.url}`);

  // 1. Fetch listing page
  let html;
  try {
    const res = await rateLimitedFetch(source.url);
    if (!res.ok) {
      console.log(`  [SKIP] HTTP ${res.status}`);
      return [];
    }
    html = await res.text();
  } catch (err) {
    console.log(`  [SKIP] Fetch error: ${err.message}`);
    return [];
  }

  // 2. Extract PDF links
  const allLinks = extractLinks(html, source.url);
  console.log(`  Found ${allLinks.length} links on page`);

  let pdfLinks = filterPdfLinks(allLinks);

  // Also check one level of sub-pages for PDFs
  if (pdfLinks.length < 3) {
    const subPages = allLinks
      .filter((l) => {
        try {
          const u = new URL(l.href);
          const base = new URL(source.url);
          return u.hostname === base.hostname && !l.href.toLowerCase().endsWith(".pdf");
        } catch { return false; }
      })
      .filter((l) => /tilsyn|rapport|dagtilbud/i.test(l.href + " " + l.text))
      .slice(0, 10);

    for (const sub of subPages) {
      try {
        const res = await rateLimitedFetch(sub.href);
        if (!res.ok) continue;
        const subHtml = await res.text();
        const subLinks = extractLinks(subHtml, sub.href);
        pdfLinks.push(...filterPdfLinks(subLinks));
      } catch { /* skip */ }
    }
  }

  // Deduplicate
  const seen = new Set();
  pdfLinks = pdfLinks.filter((l) => {
    if (seen.has(l.href)) return false;
    seen.add(l.href);
    return true;
  });

  console.log(`  Found ${pdfLinks.length} tilsyn PDF links`);

  if (pdfLinks.length === 0) {
    console.log(`  [SKIP] No PDFs found for ${source.name}`);
    return [];
  }

  // Limit PDFs
  if (pdfLinks.length > MAX_PDFS) {
    console.log(`  Limiting to ${MAX_PDFS} PDFs (of ${pdfLinks.length})`);
    pdfLinks = pdfLinks.slice(0, MAX_PDFS);
  }

  // 3. Load institution names for matching
  const nameMap = loadInstitutionNames(source.name);
  console.log(`  Loaded ${nameMap.size} institution names for matching`);

  // 4. Download + extract each PDF
  const results = [];
  for (let i = 0; i < pdfLinks.length; i++) {
    const link = pdfLinks[i];
    process.stdout.write(`  [${i + 1}/${pdfLinks.length}] ${link.text.slice(0, 50)}... `);

    try {
      // Download and extract text
      const text = await downloadAndExtractPdf(link.href);
      if (!text || text.length < 100) {
        console.log("too short, skipping");
        continue;
      }

      // Extract structured data with Claude (or regex fallback)
      const extracted = await extractWithClaude(text, source.name, link.href);

      // Match to institution
      const institutionId = fuzzyMatch(extracted.institutionName, nameMap);

      results.push({
        ...extracted,
        institutionId: institutionId || null,
        sourceUrl: link.href,
        sourceLinkText: link.text,
      });

      console.log(
        `${extracted.overallVerdict}` +
        (extracted.institutionName ? ` — ${extracted.institutionName}` : "") +
        (institutionId ? ` [${institutionId}]` : " [unmatched]")
      );
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n=== Tilsynsrapporter Fetcher ===\n");

  if (DRY_RUN) {
    console.log("DRY RUN: will fetch data but not write output file\n");
  }

  // Filter to target kommune if specified
  let sources = KOMMUNE_SOURCES;
  if (TARGET_KOMMUNE) {
    sources = sources.filter(
      (s) => s.slug === TARGET_KOMMUNE || s.name.toLowerCase() === TARGET_KOMMUNE.toLowerCase()
    );
    if (sources.length === 0) {
      console.error(`Unknown kommune: ${TARGET_KOMMUNE}`);
      console.log("Available:", KOMMUNE_SOURCES.map((s) => s.slug).join(", "));
      process.exit(1);
    }
  }

  console.log(`Scraping ${sources.length} municipalities...`);

  const allReports = [];

  for (const source of sources) {
    try {
      const reports = await scrapeKommune(source);
      allReports.push(...reports);
    } catch (err) {
      console.error(`  [ERROR] ${source.name}: ${err.message}`);
    }
  }

  // Build output grouped by institution
  const byInstitution = {};
  for (const report of allReports) {
    if (!report.institutionId) continue;
    if (!byInstitution[report.institutionId]) {
      byInstitution[report.institutionId] = [];
    }
    byInstitution[report.institutionId].push({
      institutionName: report.institutionName,
      municipality: report.municipality,
      tilsynDate: report.tilsynDate,
      overallVerdict: report.overallVerdict,
      strengths: report.strengths,
      concerns: report.concerns,
      followUpRequired: report.followUpRequired,
      skaerpetTilsyn: report.skaerpetTilsyn,
      summary: report.summary,
      sourceUrl: report.sourceUrl,
    });
  }

  const output = {
    fetchedAt: new Date().toISOString(),
    totalReports: allReports.length,
    matchedReports: Object.values(byInstitution).flat().length,
    unmatchedReports: allReports.filter((r) => !r.institutionId).length,
    institutions: byInstitution,
  };

  // Print summary
  console.log("\n--- Summary ---");
  console.log(`  Total reports extracted: ${output.totalReports}`);
  console.log(`  Matched to institutions: ${output.matchedReports}`);
  console.log(`  Unmatched: ${output.unmatchedReports}`);
  console.log(`  Institutions with data: ${Object.keys(byInstitution).length}`);

  if (DRY_RUN) {
    console.log("\nDRY RUN — skipping file write");
    console.log("Would write to:", OUTPUT_PATH);

    // Print sample
    const sample = allReports[0];
    if (sample) {
      console.log("\nSample report:");
      console.log(JSON.stringify(sample, null, 2));
    }
    return;
  }

  // Ensure output directory exists
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\nSaved to: ${OUTPUT_PATH}`);
  console.log("Done.\n");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
