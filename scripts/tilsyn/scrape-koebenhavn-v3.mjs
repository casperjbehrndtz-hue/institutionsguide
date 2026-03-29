#!/usr/bin/env node
/**
 * scrape-koebenhavn-v3.mjs
 *
 * Downloads ALL tilsynsrapporter for Copenhagen from iwtilsynpdf.kk.dk
 * and extracts structured data using pdf-parse.
 *
 * Strategy:
 *   1. Fetch institution master list from KK Open Data API (535 institutions)
 *   2. Download PDFs from https://iwtilsynpdf.kk.dk/pdf/{kkorgnr}.pdf
 *   3. Parse PDFs and extract structured tilsyn data
 *   4. Match to our institution IDs via name/address fuzzy matching
 *   5. Output JSON for seeder
 *
 * Usage:
 *   node scripts/tilsyn/scrape-koebenhavn-v3.mjs
 *   node scripts/tilsyn/scrape-koebenhavn-v3.mjs --discover-only
 *   node scripts/tilsyn/scrape-koebenhavn-v3.mjs --max-pdfs 10
 *   node scripts/tilsyn/scrape-koebenhavn-v3.mjs --skip-download  (reuse cached PDFs)
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUTPUT_DIR = join(__dirname, "output");
const PDF_DIR = join(OUTPUT_DIR, "kbh-pdfs");
mkdirSync(PDF_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OPEN_DATA_API = "https://admin.opendata.dk/api/3/action/datastore_search";
const RESOURCE_ID = "612ebe2b-99b9-432a-af6a-827eeb215f40";
const PDF_BASE = "https://iwtilsynpdf.kk.dk/pdf";
const PDF_INDEX = "https://iwtilsynpdf.kk.dk";

const DISCOVER_ONLY = process.argv.includes("--discover-only");
const SKIP_DOWNLOAD = process.argv.includes("--skip-download");
const maxIdx = process.argv.indexOf("--max-pdfs");
const MAX_PDFS = maxIdx !== -1 ? parseInt(process.argv[maxIdx + 1], 10) : 9999;

// Rate limiting
const DELAY_MS = 200; // 200ms between PDF downloads
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Step 1: Fetch institution list from KK Open Data
// ---------------------------------------------------------------------------

async function fetchInstitutionList() {
  console.log("[1/4] Fetching institution list from KK Open Data...");

  const allRecords = [];
  let offset = 0;
  const limit = 500;

  while (true) {
    const url = `${OPEN_DATA_API}?resource_id=${RESOURCE_ID}&limit=${limit}&offset=${offset}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open Data API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const records = data.result?.records ?? [];
    allRecords.push(...records);
    console.log(`  Fetched ${records.length} records (total: ${allRecords.length})`);
    if (records.length < limit) break;
    offset += limit;
  }

  console.log(`  Total institutions: ${allRecords.length}`);
  return allRecords;
}

// ---------------------------------------------------------------------------
// Step 1b: Get all PDF IDs from the directory listing
// ---------------------------------------------------------------------------

async function fetchPdfIndex() {
  console.log("[1b] Fetching PDF directory listing from iwtilsynpdf.kk.dk...");
  const res = await fetch(PDF_INDEX);
  if (!res.ok) throw new Error(`PDF index ${res.status}`);
  const html = await res.text();

  // The index is plain-text URLs separated by <br /> tags:
  // https://iwtilsynpdf.kk.dk/pdf/1604.pdf<br />https://...
  const pdfIds = [];
  const regex = /\/(\d+)\.pdf/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    if (!pdfIds.includes(match[1])) pdfIds.push(match[1]);
  }

  console.log(`  Found ${pdfIds.length} PDFs in directory listing`);
  return pdfIds;
}

// ---------------------------------------------------------------------------
// Step 2: Download PDFs
// ---------------------------------------------------------------------------

async function downloadPdfs(kkorgnrs) {
  const toDownload = kkorgnrs.slice(0, MAX_PDFS);
  console.log(`\n[2/4] Downloading ${toDownload.length} PDFs...`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const id of toDownload) {
    const pdfPath = join(PDF_DIR, `${id}.pdf`);

    if (SKIP_DOWNLOAD && existsSync(pdfPath)) {
      skipped++;
      continue;
    }

    try {
      const url = `${PDF_BASE}/${id}.pdf`;
      const res = await fetch(url);
      if (!res.ok) {
        failed++;
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      writeFileSync(pdfPath, buffer);
      downloaded++;

      if (downloaded % 50 === 0) {
        console.log(`  Downloaded ${downloaded}/${toDownload.length}...`);
      }

      await sleep(DELAY_MS);
    } catch (e) {
      failed++;
    }
  }

  console.log(`  Done: ${downloaded} downloaded, ${skipped} cached, ${failed} failed`);
  return downloaded + skipped;
}

// ---------------------------------------------------------------------------
// Step 3: Parse PDFs
// ---------------------------------------------------------------------------

function extractTilsynData(text, filename) {
  const report = {
    kkorgnr: filename.replace(".pdf", ""),
    institutionName: null,
    reportType: null, // 'standard' or 'light'
    reportYear: null,
    overallAssessment: null,
    themes: [],
    strengths: [],
    areasForImprovement: [],
    rawTextLength: text.length,
  };

  // Extract institution name (usually in the first few lines)
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Look for institution name - typically after "Tilsynsrapport" or "Pædagogisk tilsyn"
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const line = lines[i];
    // Skip header lines
    if (/tilsynsrapport|pædagogisk tilsyn|københavns kommune|kvalitet|indhold/i.test(line)) continue;
    if (line.length > 3 && line.length < 100 && !/^\d+$/.test(line) && !/^side \d/i.test(line)) {
      report.institutionName = line;
      break;
    }
  }

  // Detect report type
  if (/lettest\s*tilsyn|let\s*tilsyn|vedligeholdende/i.test(text)) {
    report.reportType = "light";
  } else {
    report.reportType = "standard";
  }

  // Extract year
  const yearMatch = text.match(/tilsyn(?:et|srapport)?\s*(?:fra|i|foretaget)?\s*(\d{4})/i)
    || text.match(/(202[3-6])/);
  if (yearMatch) report.reportYear = parseInt(yearMatch[1]);

  // Extract themes/categories from the strengthened curriculum
  const themePatterns = [
    { key: "alsidig_personlig_udvikling", pattern: /alsidig\s+personlig\s+udvikling/i },
    { key: "social_udvikling", pattern: /social\s+udvikling/i },
    { key: "kommunikation_sprog", pattern: /kommunikation\s+og\s+sprog/i },
    { key: "krop_sanser_bevaegelse", pattern: /krop[,]?\s+sanser\s+og\s+bevægelse/i },
    { key: "natur_udeliv_science", pattern: /natur[,]?\s+udeliv\s+og\s+science/i },
    { key: "kultur_aesthetik_faellesskab", pattern: /kultur[,]?\s+æstetik\s+og\s+fællesskab/i },
  ];

  for (const { key, pattern } of themePatterns) {
    if (pattern.test(text)) {
      report.themes.push(key);
    }
  }

  // Extract strengths (look for positive keywords near section headers)
  const strengthPatterns = [
    /styrke(?:r|n)?[:\s]+([^\n.]{10,200})/gi,
    /(?:positiv|god|stærk|velfungerende)[^\n.]{5,150}/gi,
    /(?:det\s+er\s+en\s+styrke|det\s+fungerer\s+godt)[^\n.]{5,150}/gi,
  ];
  for (const pattern of strengthPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const m of matches.slice(0, 5)) {
        const clean = m.replace(/^styrke[r]?[:\s]+/i, "").trim();
        if (clean.length > 10 && clean.length < 200) {
          report.strengths.push(clean);
        }
      }
    }
  }

  // Extract areas for improvement
  const improvementPatterns = [
    /udviklingspunkt(?:er)?[:\s]+([^\n.]{10,200})/gi,
    /opmærksomhedspunkt(?:er)?[:\s]+([^\n.]{10,200})/gi,
    /anbefal(?:ing|er)[:\s]+([^\n.]{10,200})/gi,
    /(?:bør\s+arbejde|kan\s+med\s+fordel|anbefales\s+at)[^\n.]{5,150}/gi,
  ];
  for (const pattern of improvementPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const m of matches.slice(0, 5)) {
        const clean = m.replace(/^(?:udviklingspunkt|opmærksomhedspunkt|anbefaling)(?:er)?[:\s]+/i, "").trim();
        if (clean.length > 10 && clean.length < 200) {
          report.areasForImprovement.push(clean);
        }
      }
    }
  }

  // Deduplicate
  report.strengths = [...new Set(report.strengths)].slice(0, 5);
  report.areasForImprovement = [...new Set(report.areasForImprovement)].slice(0, 5);

  return report;
}

async function parsePdfs() {
  console.log(`\n[3/4] Parsing PDFs...`);

  const files = readdirSync(PDF_DIR).filter((f) => f.endsWith(".pdf"));
  console.log(`  Found ${files.length} PDFs to parse`);

  const reports = [];
  let parsed = 0;
  let failed = 0;

  for (const file of files) {
    try {
      const buffer = readFileSync(join(PDF_DIR, file));
      const data = await pdfParse(buffer);
      const report = extractTilsynData(data.text, file);
      report.pageCount = data.numpages;
      reports.push(report);
      parsed++;

      if (parsed % 50 === 0) {
        console.log(`  Parsed ${parsed}/${files.length}...`);
      }
    } catch (e) {
      failed++;
    }
  }

  console.log(`  Done: ${parsed} parsed, ${failed} failed`);
  return reports;
}

// ---------------------------------------------------------------------------
// Step 4: Match to our institution IDs
// ---------------------------------------------------------------------------

function loadOurInstitutions() {
  const dataDir = join(__dirname, "..", "..", "public", "data");
  const files = ["vuggestue-data.json", "boernehave-data.json", "dagpleje-data.json", "sfo-data.json"];
  const all = [];

  for (const file of files) {
    try {
      const data = JSON.parse(readFileSync(join(dataDir, file), "utf8"));
      for (const inst of data.i || []) {
        if (inst.m === "København" || inst.m === "Kobenhavn") {
          all.push(inst);
        }
      }
    } catch {}
  }

  return all;
}

function normalize(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-zæøå0-9]/gi, "")
    .replace(/ae/g, "æ")
    .replace(/oe/g, "ø")
    .replace(/aa/g, "å");
}

function matchInstitutions(reports, kkInstitutions, ourInstitutions) {
  console.log(`\n[4/4] Matching ${reports.length} reports to our ${ourInstitutions.length} KBH institutions...`);

  // Build kkorgnr -> KK institution map
  const kkMap = new Map();
  for (const inst of kkInstitutions) {
    if (inst.kkorgnr) kkMap.set(String(inst.kkorgnr), inst);
  }

  let matched = 0;
  let unmatched = 0;

  for (const report of reports) {
    const kkInst = kkMap.get(report.kkorgnr);
    if (kkInst) {
      report.kkName = kkInst.enhedsnavn;
      report.kkAddress = `${kkInst.vejnavn || ""} ${kkInst.husnummer || ""}`.trim();
      report.kkPostnummer = kkInst.postnummer;
      report.kkType = kkInst.enhedstype;
      report.kkEjerforhold = kkInst.ejerforhold;

      if (!report.institutionName) {
        report.institutionName = kkInst.enhedsnavn;
      }
    }

    // Use the KK name (from Open Data) for matching — much more reliable than PDF extraction
    const searchName = normalize(report.kkName || report.institutionName || "");
    if (!searchName) { unmatched++; continue; }

    // Also use address for disambiguation
    const searchAddr = normalize(report.kkAddress || "");

    let bestMatch = null;
    let bestScore = 0;

    for (const our of ourInstitutions) {
      const ourName = normalize(our.n);

      // Exact name match
      if (ourName === searchName) {
        bestMatch = our;
        bestScore = 1;
        break;
      }

      // Contains match (either direction)
      if (ourName.includes(searchName) || searchName.includes(ourName)) {
        const score = Math.min(ourName.length, searchName.length) / Math.max(ourName.length, searchName.length);
        if (score > bestScore && score > 0.4) {
          bestMatch = our;
          bestScore = score;
        }
      }

      // Address-based match as fallback
      if (!bestMatch && searchAddr && our.a) {
        const ourAddr = normalize(our.a);
        if (ourAddr === searchAddr || ourAddr.includes(searchAddr) || searchAddr.includes(ourAddr)) {
          bestMatch = our;
          bestScore = 0.7;
        }
      }
    }

    if (bestMatch) {
      report.ourInstitutionId = bestMatch.id;
      report.matchScore = bestScore;
      matched++;
    } else {
      unmatched++;
    }
  }

  console.log(`  Matched: ${matched}, Unmatched: ${unmatched}`);
  return reports;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== København Tilsynsrapporter Scraper v3 ===\n");

  // Step 1: Get institution list + PDF index
  const [kkInstitutions, pdfIds] = await Promise.all([
    fetchInstitutionList(),
    fetchPdfIndex(),
  ]);

  // Combine kkorgnr from both sources
  const kkKkorgnrs = kkInstitutions
    .map((i) => String(i.kkorgnr))
    .filter((k) => k && k !== "null");
  const allIds = [...new Set([...pdfIds, ...kkKkorgnrs])];
  console.log(`\n  Combined unique IDs: ${allIds.length} (${pdfIds.length} from PDF index, ${kkKkorgnrs.length} from Open Data)`);

  // Save discovery data
  writeFileSync(
    join(OUTPUT_DIR, "kbh-v3-discovery.json"),
    JSON.stringify({
      fetchedAt: new Date().toISOString(),
      kkInstitutionCount: kkInstitutions.length,
      pdfCount: pdfIds.length,
      combinedIds: allIds.length,
      sampleInstitutions: kkInstitutions.slice(0, 5).map((i) => ({
        kkorgnr: i.kkorgnr,
        name: i.enhedsnavn,
        type: i.enhedstype,
        ejerforhold: i.ejerforhold,
        bydel: i.bydel,
      })),
    }, null, 2)
  );

  if (DISCOVER_ONLY) {
    console.log("\n--discover-only: stopping after discovery.");
    return;
  }

  // Step 2: Download PDFs
  await downloadPdfs(allIds);

  // Step 3: Parse PDFs
  const reports = await parsePdfs();

  // Step 4: Match to our institutions
  const ourInstitutions = loadOurInstitutions();
  const matchedReports = matchInstitutions(reports, kkInstitutions, ourInstitutions);

  // Save output
  const output = {
    municipality: "København",
    fetchedAt: new Date().toISOString(),
    totalReports: matchedReports.length,
    matchedToOurData: matchedReports.filter((r) => r.ourInstitutionId).length,
    reports: matchedReports.map((r) => ({
      institutionId: r.ourInstitutionId || null,
      kkorgnr: r.kkorgnr,
      institutionName: r.institutionName || r.kkName,
      reportType: r.reportType,
      reportYear: r.reportYear,
      themes: r.themes,
      strengths: r.strengths,
      areasForImprovement: r.areasForImprovement,
      pageCount: r.pageCount,
      kkType: r.kkType,
      kkEjerforhold: r.kkEjerforhold,
      matchScore: r.matchScore,
    })),
  };

  const outPath = join(OUTPUT_DIR, "koebenhavn-v3-tilsyn.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nSaved ${output.totalReports} reports to ${outPath}`);
  console.log(`  Matched to our data: ${output.matchedToOurData}`);

  // Summary
  const byType = {};
  for (const r of output.reports) {
    byType[r.reportType || "unknown"] = (byType[r.reportType || "unknown"] || 0) + 1;
  }
  console.log(`  By type:`, byType);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
