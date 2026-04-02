#!/usr/bin/env node

/**
 * København Tilsynsrapporter Scraper — POC
 *
 * Tries to discover and extract tilsynsrapport PDFs from kk.dk.
 * Copenhagen stores reports at: https://iwtilsynpdf.kk.dk/pdf/{id}.pdf
 * IDs are numeric (e.g. 2258, 6374, 1681).
 *
 * Strategy:
 * 1. Fetch the main tilsyn listing page on kk.dk
 * 2. Extract links to institution pages / PDF links
 * 3. For each found PDF, try to extract basic metadata from the URL/title
 * 4. Output results as JSON
 *
 * Usage: node scripts/tilsyn/scrape-koebenhavn.mjs
 */

import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OUTPUT_DIR = join(__dirname, "output");
const OUTPUT_FILE = join(OUTPUT_DIR, "koebenhavn-tilsyn.json");

// Known PDF IDs from research (seed data for POC)
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

const TILSYN_LISTING_URL =
  "https://www.kk.dk/borger/pasning-og-skole/kvalitet-og-tilsyn/paedagogisk-tilsyn-i-dagtilbud";

const PDF_BASE_URL = "https://iwtilsynpdf.kk.dk/pdf";

/** Fetch with timeout and error handling */
async function safeFetch(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Institutionsguide/1.0; +https://institutionsguiden.dk)",
      },
    });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/** Extract PDF links from HTML content */
function extractPdfLinks(html) {
  const links = [];
  // Match href attributes pointing to iwtilsynpdf.kk.dk
  const pdfRegex = /href=["']?(https?:\/\/iwtilsynpdf\.kk\.dk\/pdf\/(\d+)\.pdf)["']?/gi;
  let match;
  while ((match = pdfRegex.exec(html)) !== null) {
    links.push({ url: match[1], id: parseInt(match[2], 10) });
  }
  // Also match relative PDF links
  const relRegex = /href=["']?(\/pdf\/(\d+)\.pdf)["']?/gi;
  while ((match = relRegex.exec(html)) !== null) {
    links.push({
      url: `${PDF_BASE_URL}/${match[2]}.pdf`,
      id: parseInt(match[2], 10),
    });
  }
  return links;
}

/** Extract institution name and year from nearby text context */
function extractContextFromHtml(html, pdfId) {
  // Try to find text near the PDF link that contains year and institution name
  const escapedId = String(pdfId);
  const contextRegex = new RegExp(
    `([^<]{0,200})${escapedId}\\.pdf[^>]*>([^<]{0,200})`,
    "i"
  );
  const match = contextRegex.exec(html);
  if (match) {
    const beforeText = match[1] || "";
    const linkText = match[2] || "";
    // Try to extract year
    const yearMatch = (beforeText + " " + linkText).match(/20\d{2}/);
    return {
      linkText: linkText.trim(),
      year: yearMatch ? parseInt(yearMatch[0], 10) : null,
    };
  }
  return { linkText: null, year: null };
}

/** Check if a PDF exists by doing a HEAD request */
async function checkPdfExists(id) {
  const url = `${PDF_BASE_URL}/${id}.pdf`;
  try {
    const res = await safeFetch(url, 5000);
    // We don't need to download the whole PDF, just check if it exists
    const contentType = res.headers.get("content-type") || "";
    const exists =
      res.ok && (contentType.includes("pdf") || contentType.includes("octet"));
    return { id, url, exists, status: res.status };
  } catch {
    return { id, url, exists: false, status: 0 };
  }
}

/** Scan a range of IDs to discover PDFs */
async function scanPdfRange(startId, endId, concurrency = 5) {
  const found = [];
  const ids = [];
  for (let i = startId; i <= endId; i++) {
    ids.push(i);
  }

  // Process in batches
  for (let i = 0; i < ids.length; i += concurrency) {
    const batch = ids.slice(i, i + concurrency);
    const results = await Promise.all(batch.map(checkPdfExists));
    for (const r of results) {
      if (r.exists) {
        found.push(r);
      }
    }
    // Be polite — small delay between batches
    if (i + concurrency < ids.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  return found;
}

async function main() {
  console.log("=== København Tilsynsrapporter Scraper (POC) ===\n");

  const results = [];

  // Step 1: Try to fetch the main listing page
  console.log("1. Fetching main tilsyn listing page...");
  let pageLinks = [];
  try {
    const res = await safeFetch(TILSYN_LISTING_URL);
    if (res.ok) {
      const html = await res.text();
      pageLinks = extractPdfLinks(html);
      console.log(`   Found ${pageLinks.length} PDF links on listing page`);

      // Try to extract context for each link
      for (const link of pageLinks) {
        const ctx = extractContextFromHtml(html, link.id);
        results.push({
          id: link.id,
          institution_name: ctx.linkText || null,
          year: ctx.year || null,
          report_url: link.url,
          municipality: "København",
          report_type: "anmeldt",
          overall_rating: null,
          source: "kk.dk-listing",
          discovered_at: new Date().toISOString(),
        });
      }
    } else {
      console.log(`   Page returned status ${res.status}`);
    }
  } catch (err) {
    console.log(`   Failed to fetch listing: ${err.message}`);
  }

  // Step 2: Add known PDFs (from web search research)
  console.log("\n2. Adding known PDF reports from research...");
  const existingIds = new Set(results.map((r) => r.id));
  for (const known of KNOWN_PDF_IDS) {
    if (!existingIds.has(known.id)) {
      results.push({
        id: known.id,
        institution_name: known.name,
        year: known.year,
        report_url: `${PDF_BASE_URL}/${known.id}.pdf`,
        municipality: "København",
        report_type: "anmeldt",
        overall_rating: null,
        source: "research",
        discovered_at: new Date().toISOString(),
      });
    }
  }
  console.log(`   Total reports so far: ${results.length}`);

  // Step 3: Scan a small range of IDs near known ones to discover more
  console.log("\n3. Scanning nearby PDF IDs to discover more reports...");
  // Scan around the highest known IDs (6000-6400 range seems active for 2025)
  const scanRanges = [
    { start: 6020, end: 6050 },
    { start: 6090, end: 6110 },
    { start: 6370, end: 6380 },
  ];

  for (const range of scanRanges) {
    console.log(`   Scanning IDs ${range.start}-${range.end}...`);
    try {
      const found = await scanPdfRange(range.start, range.end, 3);
      for (const f of found) {
        if (!existingIds.has(f.id)) {
          existingIds.add(f.id);
          results.push({
            id: f.id,
            institution_name: null, // Would need PDF parsing to extract
            year: null, // Would need PDF parsing to extract
            report_url: f.url,
            municipality: "København",
            report_type: "anmeldt",
            overall_rating: null,
            source: "id-scan",
            discovered_at: new Date().toISOString(),
          });
        }
      }
      console.log(`   Found ${found.length} valid PDFs in range`);
    } catch (err) {
      console.log(`   Scan failed for range: ${err.message}`);
    }
  }

  // Step 4: Verify known PDFs actually exist
  console.log("\n4. Verifying known PDF URLs...");
  let verified = 0;
  for (const report of results.slice(0, 10)) {
    try {
      const check = await checkPdfExists(report.id);
      report.verified = check.exists;
      if (check.exists) verified++;
    } catch {
      report.verified = false;
    }
  }
  console.log(`   Verified ${verified}/${Math.min(results.length, 10)} PDFs exist`);

  // Step 5: Write output
  console.log(`\n5. Writing ${results.length} results to output...`);
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const output = {
    municipality: "København",
    scraped_at: new Date().toISOString(),
    source_url: TILSYN_LISTING_URL,
    pdf_base_url: PDF_BASE_URL,
    total_reports: results.length,
    reports: results,
    notes: [
      "PDFs are at iwtilsynpdf.kk.dk/pdf/{id}.pdf with numeric IDs",
      "Full text extraction requires PDF parsing (not included in POC)",
      "Rating extraction requires PDF parsing — reports use categorical ratings",
      "Institution name matching to our IDs requires fuzzy matching",
    ],
  };

  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf-8");
  console.log(`   Written to: ${OUTPUT_FILE}`);

  // Summary
  console.log("\n=== Summary ===");
  console.log(`Total reports found: ${results.length}`);
  console.log(
    `Sources: listing=${pageLinks.length}, research=${KNOWN_PDF_IDS.length}, scan=${results.length - pageLinks.length - KNOWN_PDF_IDS.length}`
  );
  console.log(`\nNext steps:`);
  console.log(`  1. Add PDF text extraction (pdf-parse or similar)`);
  console.log(`  2. Extract ratings, strengths, areas for improvement from text`);
  console.log(`  3. Match institution names to our institution_id values`);
  console.log(`  4. Insert into Supabase tilsynsrapporter table`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
