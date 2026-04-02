#!/usr/bin/env node

/**
 * København Tilsynsrapporter Scraper v2 — with PDF parsing
 *
 * Downloads PDFs from iwtilsynpdf.kk.dk, extracts text, and parses
 * structured data (institution name, rating, strengths, improvements).
 *
 * Usage: node --env-file=.env scripts/tilsyn/scrape-koebenhavn-v2.mjs
 */

import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OUTPUT_DIR = join(__dirname, "output");
mkdirSync(OUTPUT_DIR, { recursive: true });

const PDF_BASE_URL = "https://iwtilsynpdf.kk.dk/pdf";

// Known PDF IDs from research
const KNOWN_PDF_IDS = [
  { id: 2258, name: "Kennedygården - Vuggestue og Børnehave", year: 2025 },
  { id: 6374, name: "Børnehuset i Svinget", year: 2025 },
  { id: 2250, name: "Rosengården", year: 2025 },
  { id: 1681, name: "Snorretoppen", year: 2025 },
  { id: 2236, name: "Akvariet", year: 2025 },
  { id: 6099, name: "Børnehuset Bodil", year: 2025 },
  { id: 2078, name: "Drivhuset", year: 2025 },
  { id: 6030, name: "Topstykket", year: 2025 },
  { id: 1802, name: "Anna Wulffs", year: 2025 },
  { id: 1757, name: "Bakketoppen", year: 2024 },
];

// Scan ranges to discover more PDFs
const SCAN_RANGES = [
  { start: 1680, end: 1700 },
  { start: 1750, end: 1810 },
  { start: 2070, end: 2100 },
  { start: 2230, end: 2270 },
  { start: 6020, end: 6110 },
  { start: 6370, end: 6400 },
];

async function safeFetch(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Institutionsguide/1.0; +https://institutionsguiden.dk)",
      },
    });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function checkPdfExists(id) {
  const url = `${PDF_BASE_URL}/${id}.pdf`;
  try {
    const res = await safeFetch(url, 5000);
    const contentType = res.headers.get("content-type") || "";
    const exists = res.ok && (contentType.includes("pdf") || contentType.includes("octet"));
    return { id, url, exists };
  } catch {
    return { id, url, exists: false };
  }
}

async function downloadPdf(id) {
  const url = `${PDF_BASE_URL}/${id}.pdf`;
  const res = await safeFetch(url, 30000);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function extractDataFromText(text, pdfId) {
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

  // Extract institution name — usually in first few lines
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i];
    // Skip generic headers
    if (/tilsynsrapport|pædagogisk tilsyn|københavns/i.test(line) && line.length < 40) continue;
    if (/^(dato|tilsyn|rapport|side|journal)/i.test(line)) continue;
    // A line that looks like an institution name (has capital letter, reasonable length)
    if (line.length >= 5 && line.length <= 80 && /^[A-ZÆØÅ]/.test(line)) {
      result.institution_name = line;
      break;
    }
  }

  // Extract date
  const datePatterns = [
    /(?:tilsynsdato|dato|gennemført)[:\s]*(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/i,
    /(\d{1,2})\.\s*(januar|februar|marts|april|maj|juni|juli|august|september|oktober|november|december)\s*(\d{4})/i,
    /(\d{1,2})[.\-/](\d{1,2})[.\-/](20\d{2})/,
  ];
  const fullText = text.toLowerCase();
  for (const pattern of datePatterns) {
    const m = fullText.match(pattern);
    if (m) {
      const months = { januar: 1, februar: 2, marts: 3, april: 4, maj: 5, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, december: 12 };
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

  // Extract year from text if date not found
  if (!result.report_year) {
    const yearMatch = text.match(/20(2[3-6])/);
    if (yearMatch) result.report_year = parseInt("20" + yearMatch[1]);
  }

  // Extract rating
  if (/skærpet tilsyn|ikke godkendt/i.test(fullText)) {
    result.overall_rating = "skærpet";
  } else if (/godkendt med bemærkninger|bemærkninger/i.test(fullText) && /godkendt/i.test(fullText)) {
    result.overall_rating = "godkendt_bemærkninger";
  } else if (/godkendt/i.test(fullText)) {
    result.overall_rating = "godkendt";
  }

  // Determine if announced or unannounced
  if (/uanmeldt/i.test(fullText)) {
    result.report_type = "uanmeldt";
  }

  // Extract strengths
  const strengthPatterns = [
    /styrk\w*[:\n]([\s\S]{10,500}?)(?=(?:udvikling|opmærksomhed|anbefaling|område|konklusion|$))/i,
    /fungerer godt[:\n]([\s\S]{10,500}?)(?=(?:udvikling|opmærksomhed|anbefaling|$))/i,
    /positi\w*[:\n]([\s\S]{10,500}?)(?=(?:udvikling|opmærksomhed|anbefaling|$))/i,
  ];
  for (const pattern of strengthPatterns) {
    const m = text.match(pattern);
    if (m) {
      const items = m[1].split(/[•\-\n]/).map((s) => s.trim()).filter((s) => s.length > 10 && s.length < 200);
      result.strengths = items.slice(0, 5);
      break;
    }
  }

  // Extract improvements
  const improvementPatterns = [
    /udvikling\w*[:\n]([\s\S]{10,500}?)(?=(?:styrk|konklusion|samlet|$))/i,
    /opmærksomhed\w*[:\n]([\s\S]{10,500}?)(?=(?:styrk|konklusion|samlet|$))/i,
    /anbefaling\w*[:\n]([\s\S]{10,500}?)(?=(?:styrk|konklusion|samlet|$))/i,
    /forbedring\w*[:\n]([\s\S]{10,500}?)(?=(?:styrk|konklusion|samlet|$))/i,
  ];
  for (const pattern of improvementPatterns) {
    const m = text.match(pattern);
    if (m) {
      const items = m[1].split(/[•\-\n]/).map((s) => s.trim()).filter((s) => s.length > 10 && s.length < 200);
      result.areas_for_improvement = items.slice(0, 5);
      break;
    }
  }

  return result;
}

// Load our vuggestue/boernehave data for name matching
function loadInstitutionNames() {
  const names = new Map();
  try {
    const vug = JSON.parse(readFileSync("public/data/vuggestue-data.json", "utf8")).i;
    const bh = JSON.parse(readFileSync("public/data/boernehave-data.json", "utf8")).i;
    const dag = JSON.parse(readFileSync("public/data/dagpleje-data.json", "utf8")).i;
    for (const inst of vug) {
      if (inst.m === "København") names.set(inst.n.toLowerCase(), `vug-${inst.id}`);
    }
    for (const inst of bh) {
      if (inst.m === "København") names.set(inst.n.toLowerCase(), `bh-${inst.id}`);
    }
    for (const inst of dag) {
      if (inst.m === "København") names.set(inst.n.toLowerCase(), `dag-${inst.id}`);
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

  // Word overlap match (at least 2 words in common)
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

async function main() {
  console.log("=== København Tilsynsrapporter Scraper v2 (PDF Parsing) ===\n");

  const nameMap = loadInstitutionNames();
  console.log(`Loaded ${nameMap.size} København institution names for matching\n`);

  // Step 1: Collect all PDF IDs to try
  const allIds = new Set(KNOWN_PDF_IDS.map((k) => k.id));

  console.log("1. Scanning ID ranges to discover PDFs...");
  for (const range of SCAN_RANGES) {
    process.stdout.write(`   Scanning ${range.start}-${range.end}...`);
    for (let id = range.start; id <= range.end; id++) {
      const check = await checkPdfExists(id);
      if (check.exists) allIds.add(id);
    }
    console.log(` total found so far: ${allIds.size}`);
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n   Total PDF IDs to process: ${allIds.size}\n`);

  // Step 2: Download and parse each PDF
  console.log("2. Downloading and parsing PDFs...\n");
  const results = [];
  let success = 0;
  let failed = 0;

  for (const id of Array.from(allIds).sort((a, b) => a - b)) {
    process.stdout.write(`   PDF ${id}... `);
    try {
      const buffer = await downloadPdf(id);
      const pdfData = await pdfParse(buffer);
      const extracted = extractDataFromText(pdfData.text, id);

      // Use known name if available
      const known = KNOWN_PDF_IDS.find((k) => k.id === id);
      if (known && !extracted.institution_name) {
        extracted.institution_name = known.name;
      }
      if (known && !extracted.report_year) {
        extracted.report_year = known.year;
      }

      // Try to match to our institution ID
      const matchedId = fuzzyMatch(extracted.institution_name, nameMap);

      results.push({
        pdf_id: id,
        pdf_url: `${PDF_BASE_URL}/${id}.pdf`,
        ...extracted,
        matched_institution_id: matchedId,
        text_length: pdfData.text.length,
        pages: pdfData.numpages,
      });

      console.log(`OK — ${extracted.institution_name || "?"} (${extracted.report_year || "?"}) [${pdfData.numpages}p, ${matchedId ? "matched" : "unmatched"}]`);
      success++;
    } catch (err) {
      console.log(`FAIL — ${err.message}`);
      failed++;
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 500));
  }

  // Step 3: Save results
  console.log(`\n3. Results: ${success} parsed, ${failed} failed\n`);

  const output = {
    municipality: "København",
    scraped_at: new Date().toISOString(),
    total_parsed: success,
    total_failed: failed,
    matched: results.filter((r) => r.matched_institution_id).length,
    unmatched: results.filter((r) => !r.matched_institution_id).length,
    reports: results,
  };

  const outputFile = join(OUTPUT_DIR, "koebenhavn-parsed.json");
  writeFileSync(outputFile, JSON.stringify(output, null, 2), "utf-8");
  console.log(`Written to: ${outputFile}`);

  // Step 4: Upsert to Supabase if available
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (SUPABASE_URL && SUPABASE_KEY) {
    console.log("\n4. Upserting matched reports to Supabase...");
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const toUpsert = results
      .filter((r) => r.matched_institution_id && r.report_year)
      .map((r) => ({
        institution_id: r.matched_institution_id,
        municipality: "København",
        report_date: r.report_date || `${r.report_year}-01-01`,
        report_year: r.report_year,
        report_type: r.report_type,
        overall_rating: r.overall_rating,
        summary: `Pædagogisk tilsyn ${r.report_year}: ${r.institution_name || "Ukendt institution"}.${r.overall_rating ? ` Vurdering: ${r.overall_rating}.` : ""}`,
        strengths: r.strengths,
        areas_for_improvement: r.areas_for_improvement,
        raw_text: null, // Don't store full text to save space
        report_url: r.pdf_url,
        source: "kk_dk_pdf_scrape",
      }));

    if (toUpsert.length > 0) {
      const { error } = await supabase
        .from("tilsynsrapporter")
        .upsert(toUpsert, { onConflict: "institution_id,report_year,report_type" });

      if (error) {
        console.error(`   Supabase error: ${error.message}`);
      } else {
        console.log(`   Upserted ${toUpsert.length} reports to Supabase`);
      }
    } else {
      console.log("   No matched reports to upsert");
    }
  }

  // Summary
  console.log("\n=== Summary ===");
  console.log(`PDFs found: ${allIds.size}`);
  console.log(`Parsed: ${success}, Failed: ${failed}`);
  console.log(`Matched to our data: ${results.filter((r) => r.matched_institution_id).length}`);
  console.log(`Ratings extracted: ${results.filter((r) => r.overall_rating).length}`);
  console.log(`With strengths: ${results.filter((r) => r.strengths.length > 0).length}`);
  console.log(`With improvements: ${results.filter((r) => r.areas_for_improvement.length > 0).length}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
