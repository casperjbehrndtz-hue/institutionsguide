#!/usr/bin/env node
/**
 * fetch-foraeldre-tilfredshed.mjs
 *
 * Extracts parent satisfaction (forældretilfredshed) data from the national
 * BTU survey (Brugertilfredshedsundersøgelse af dagtilbud).
 *
 * ─── Data source research ───────────────────────────────────────────────────
 *
 * The BTU survey was published by Indenrigs- og Sundhedsministeriets
 * Benchmarkingenhed. The most recent data covers Oct 2021 – Feb 2022.
 * A new survey is expected spring 2026.
 *
 * Data access methods investigated:
 *
 * 1. ISM dashboard (ism.dk) — embedded PowerBI dashboard, but the embed URL
 *    is loaded dynamically after cookie consent. Cannot be scraped without a
 *    headless browser + cookie acceptance flow. The dashboard shows per-
 *    institution scores across 5 categories on a 1-5 scale.
 *
 * 2. Benchmark.dk interactive universe — also PowerBI, same cookie-gating
 *    issue. The Benchmarking Unit was dissolved Oct 2025; site is frozen.
 *
 * 3. PDF reports (benchmark.dk/Media/...) — "Bilag 2: Kommunespecifikke
 *    nøgletal" contains:
 *      - Tabel 1: Municipality-level overall satisfaction (1-5), expected
 *        satisfaction, benchmark indicator, respondent count (98 kommuner)
 *      - Tabel 2: Per-institution benchmark indicator grouped by kommune
 *        (2,510 institutions, but only the deviation from expected — not the
 *        raw satisfaction score or category breakdowns)
 *      - Tabel 3: Municipality-level satisfaction split by type (dagpleje,
 *        vuggestue, børnehave)
 *
 * 4. No open data API, no Excel/CSV downloads available.
 *
 * ─── What this script does ──────────────────────────────────────────────────
 *
 * Since the PowerBI dashboard cannot be scraped without a headless browser,
 * this script:
 *   a) Downloads the Bilag 2 PDF and extracts all three tables
 *   b) Extracts per-institution benchmark indicators (Tabel 2)
 *   c) Extracts municipality-level satisfaction + respondent counts (Tabel 1)
 *   d) Extracts municipality-level type-split satisfaction (Tabel 3)
 *   e) Matches institutions to our dataset using fuzzy name matching
 *   f) For matched institutions, derives an estimated satisfaction score by
 *      combining the kommune-level score with the institution's benchmark
 *      indicator (actual = expected + indicator)
 *   g) Saves output to public/data/parent-satisfaction.json
 *   h) Optionally generates SQL for Supabase
 *
 * Usage:
 *   node scripts/fetch-foraeldre-tilfredshed.mjs                   # full run
 *   node scripts/fetch-foraeldre-tilfredshed.mjs --dry-run         # preview only
 *   node scripts/fetch-foraeldre-tilfredshed.mjs --match-report    # show match details
 *
 * Output:
 *   public/data/parent-satisfaction.json
 *   scripts/output/parent-satisfaction.sql          (Supabase INSERT)
 *   scripts/output/parent-satisfaction-raw.json     (full extracted data)
 *   scripts/output/btu-match-report.txt             (fuzzy match details)
 *
 * ─── Future: dashboard scraping ─────────────────────────────────────────────
 *
 * If a headless browser approach is added later, the PowerBI dashboard at:
 *   https://www.ism.dk/indenrigs/landsdaekkende-brugertilfredshedsundersoegelser-btu/brugertilfredshedsundersoegelse-af-dagtilbud
 * could yield per-institution scores for all 5 categories:
 *   - Overall satisfaction (overordnet tilfredshed)
 *   - Pedagogical effort (pædagogisk indsats)
 *   - Physical spaces (fysiske rammer)
 *   - Well-being (trivsel)
 *   - Parent-staff collaboration (samarbejde)
 *
 * The Bilag 2 PDF approach gives us a solid foundation with per-institution
 * benchmark indicators and municipality-level actual satisfaction scores.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "public", "data");
const OUTPUT_DIR = join(__dirname, "output");

// ── CLI args ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const MATCH_REPORT = args.includes("--match-report");

// ── PDF source URLs ────────────────────────────────────────────────────────

const BILAG2_URL =
  "https://benchmark.dk/Media/638096428953178760/Bilag%202%20-%20kommunefordelte%20n%c3%b8gletal.pdf";

const SURVEY_YEAR = 2022; // Oct 2021 – Feb 2022 survey

// ── PDF download ───────────────────────────────────────────────────────────

async function downloadPDF(url) {
  console.log(`  Downloading: ${url.split("/").pop()}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching PDF`);
  return Buffer.from(await res.arrayBuffer());
}

// ── PDF parsing ────────────────────────────────────────────────────────────

async function parsePDF(buffer) {
  // Import the inner lib directly to avoid pdf-parse's debug-mode file read
  const { createRequire } = await import("module");
  const require = createRequire(import.meta.url);
  const pdfParse = require("pdf-parse/lib/pdf-parse.js");
  const data = await pdfParse(buffer);
  return data.text;
}

/**
 * Parse Tabel 1: Municipality-level overall satisfaction
 * Format: "Kommune respondents actual expected indicator"
 * Returns Map<kommune, { respondents, actual, expected, indicator }>
 */
function parseTabel1(text) {
  // Find the table data section
  const startMarker = "Kommune Antal besvarelser Faktisk tilfredshed Forventet tilfredshed Benchmarkingindikatoren";
  const startIdx = text.indexOf(startMarker);
  if (startIdx === -1) throw new Error("Cannot find Tabel 1 header");

  const endIdx = text.indexOf("Dagtilbuddenes benchmarkingindikator", startIdx + startMarker.length);
  const section = text.substring(startIdx + startMarker.length, endIdx);

  const municipalities = new Map();

  // Match patterns: municipality name, then numbers
  // "Albertslund \n626 4,11 4,19 -0,08"
  // Some have "1.233" format for thousands
  const regex = /([A-ZÆØÅa-zæøå-]+(?:\s[A-ZÆØÅa-zæøå-]+)*)\s*\n?\s*(\d[\d.]*)\s+(\d+,\d+)\s+(\d+,\d+)\s+(-?\d+,\d+)/g;

  let match;
  while ((match = regex.exec(section)) !== null) {
    const name = match[1].trim();
    if (name === "Landsgennemsnit") continue;

    const respondents = parseInt(match[2].replace(/\./g, ""), 10);
    const actual = parseFloat(match[3].replace(",", "."));
    const expected = parseFloat(match[4].replace(",", "."));
    const indicator = parseFloat(match[5].replace(",", "."));

    municipalities.set(name, { respondents, actual, expected, indicator });
  }

  return municipalities;
}

/**
 * Parse Tabel 2: Per-institution benchmark indicators
 * Format: grouped by "Kommune Kommune" headers, then "InstitutionName score"
 * Returns Array<{ name, kommune, benchmarkIndicator }>
 */
function parseTabel2(text) {
  // Find the section between first "Albertslund Kommune" and "Kommunernes brugertilfredshed opdelt"
  const startIdx = text.indexOf("Albertslund Kommune");
  if (startIdx === -1) throw new Error("Cannot find Tabel 2 start");

  // Find the last occurrence of this marker that appears after the institution data
  const allEnds = [...text.matchAll(/Kommunernes brugertilfredshed opdelt på tilbudsty/g)];
  const endIdx = allEnds.length > 1
    ? allEnds[allEnds.length - 1].index
    : text.length;

  const section = text.substring(startIdx, endIdx);

  let currentKommune = null;
  const institutions = [];
  const lines = section.split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Skip table headers and page markers
    if (
      /^Tabel 2/.test(line) ||
      /^Dagtilbuddenes/.test(line) ||
      /^Benchmarking-/.test(line) ||
      /^indikator/.test(line) ||
      /^Dagtilbud$/.test(line) ||
      /^\d+$/.test(line) ||
      /^Anm\./.test(line) ||
      /^Kilde/.test(line)
    ) continue;

    // Kommune header: "Xxx Kommune"
    const kommuneMatch = line.match(/^(.+?)\s+Kommune\s*$/);
    if (kommuneMatch) {
      currentKommune = kommuneMatch[1].trim();
      continue;
    }

    // Institution with score: "Institution Name -0,23" or "Institution Name 0,23"
    const scoreMatch = line.match(/^(.+?)\s+(-?\d+,\d+)\s*$/);
    if (scoreMatch && currentKommune) {
      const name = scoreMatch[1].replace(/\s+/g, " ").trim();
      // Skip if the name looks like a page number or header fragment
      if (name.length < 2) continue;

      institutions.push({
        name,
        kommune: currentKommune,
        benchmarkIndicator: parseFloat(scoreMatch[2].replace(",", ".")),
      });
      continue;
    }

    // Handle multi-line institution names (name split across lines)
    // The score will be on the next line or the name is continued
    // This is handled by pdf-parse joining lines with hyphens like "Kokke-\ndalen"
  }

  return institutions;
}

/**
 * Parse Tabel 3: Municipality-level satisfaction by type
 * Format: "Kommune dagpleje vuggestue børnehave"
 * Returns Map<kommune, { dagpleje, vuggestue, boernehave }>
 */
function parseTabel3(text) {
  // Find all occurrences of the Tabel 3 header
  const headerPattern = "Forældrenes tilfredshed med deres barns dagtilbud, opdelt på dagtilbudstype";
  const allHeaders = [...text.matchAll(new RegExp(headerPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))];

  // Skip the intro reference — use the one that's followed by actual data
  // The actual data tables appear after index ~94000
  const lastHeader = allHeaders[allHeaders.length - 2]; // second-to-last is first data table
  if (!lastHeader) throw new Error("Cannot find Tabel 3 data");

  const startIdx = lastHeader.index;

  // Find "Gennemsnitlig brugertilfredshed for hver region" as end marker
  const endIdx = text.indexOf("Gennemsnitlig brugertilfredshed for hver region", startIdx);
  const section = text.substring(startIdx, endIdx > -1 ? endIdx : text.length);

  const municipalities = new Map();

  // Match: "Kommune score1 score2 score3" or with "-" for missing
  const regex = /([A-ZÆØÅa-zæøå-]+(?:\s[A-ZÆØÅa-zæøå-]+)*)\s+([\d,]+|-)\s+([\d,]+|-)\s+([\d,]+|-)/g;

  let match;
  while ((match = regex.exec(section)) !== null) {
    const name = match[1].trim();
    if (name === "Landsgennemsnit" || name === "Kommune") continue;

    const parse = (v) => (v === "-" ? null : parseFloat(v.replace(",", ".")));
    municipalities.set(name, {
      dagpleje: parse(match[2]),
      vuggestue: parse(match[3]),
      boernehave: parse(match[4]),
    });
  }

  return municipalities;
}

// ── Fuzzy matching ─────────────────────────────────────────────────────────

/**
 * Normalize a Danish institution name for matching.
 * Strips common prefixes, lowercases, removes punctuation.
 */
function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[''`"]/g, "")
    .replace(/børnehuset\s+/g, "")
    .replace(/børnehaven\s+/g, "")
    .replace(/vuggestuen\s+/g, "")
    .replace(/naturbørnehaven\s+/g, "")
    .replace(/dagplejen?\s*/g, "dagpleje")
    .replace(/\s+vuggestue og børnehave$/g, "")
    .replace(/,\s*afd\.\s*/g, " ")
    .replace(/afd\.\s*/g, "")
    .replace(/\s*-\s*dagpleje$/g, " dagpleje")
    .replace(/dagplejeområde\w*/g, "dagpleje")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Levenshtein distance between two strings.
 */
function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Compute similarity score between 0 and 1 (1 = identical).
 */
function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * Match BTU institution names to our dataset.
 * Uses exact match on normalized names first, then fuzzy matching within
 * the same kommune for remaining unmatched.
 *
 * @param btuInstitutions - Array from parseTabel2
 * @param ourInstitutions - Array from our data files
 * @returns Map<ourId, { btuName, score, matchType }>
 */
function matchInstitutions(btuInstitutions, ourInstitutions) {
  const matches = new Map();
  const matchLog = [];

  // Build lookup by kommune for our institutions
  const ourByKommune = new Map();
  for (const inst of ourInstitutions) {
    const kommune = inst.m; // municipality field in our data
    if (!ourByKommune.has(kommune)) ourByKommune.set(kommune, []);
    ourByKommune.get(kommune).push(inst);
  }

  // Track which of our institutions have been matched
  const matchedOurIds = new Set();

  for (const btu of btuInstitutions) {
    const btuNorm = normalizeName(btu.name);
    const candidates = ourByKommune.get(btu.kommune) || [];

    if (candidates.length === 0) {
      matchLog.push(`  SKIP ${btu.kommune} / ${btu.name} — kommune not in our data`);
      continue;
    }

    let bestMatch = null;
    let bestScore = 0;
    let matchType = "none";

    for (const cand of candidates) {
      if (matchedOurIds.has(cand.id)) continue;

      const candNorm = normalizeName(cand.n);

      // Exact match on normalized name
      if (btuNorm === candNorm) {
        bestMatch = cand;
        bestScore = 1.0;
        matchType = "exact";
        break;
      }

      // Check if one contains the other (for names like "Børnehuset X" vs "X")
      if (btuNorm.includes(candNorm) || candNorm.includes(btuNorm)) {
        const s = similarity(btuNorm, candNorm);
        if (s > bestScore) {
          bestMatch = cand;
          bestScore = s;
          matchType = "contains";
        }
        continue;
      }

      // Fuzzy match
      const s = similarity(btuNorm, candNorm);
      if (s > bestScore) {
        bestMatch = cand;
        bestScore = s;
        matchType = "fuzzy";
      }
    }

    // Threshold: require >= 0.65 similarity for fuzzy, >= 0.5 for contains
    const threshold = matchType === "contains" ? 0.5 : 0.65;
    if (bestMatch && bestScore >= threshold) {
      matchedOurIds.add(bestMatch.id);
      matches.set(bestMatch.id, {
        btuName: btu.name,
        ourName: bestMatch.n,
        kommune: btu.kommune,
        benchmarkIndicator: btu.benchmarkIndicator,
        score: bestScore,
        matchType,
      });
      matchLog.push(
        `  ${matchType.toUpperCase().padEnd(8)} [${bestScore.toFixed(2)}] ${btu.kommune}: "${btu.name}" → "${bestMatch.n}" (${bestMatch.id})`,
      );
    } else {
      const info = bestMatch
        ? `best="${bestMatch.n}" score=${bestScore.toFixed(2)}`
        : "no candidates";
      matchLog.push(
        `  MISS     ${btu.kommune}: "${btu.name}" — ${info}`,
      );
    }
  }

  return { matches, matchLog };
}

// ── Load our institution data ──────────────────────────────────────────────

function loadOurData() {
  const files = [
    { file: "vuggestue-data.json", category: "vuggestue" },
    { file: "boernehave-data.json", category: "boernehave" },
    { file: "dagpleje-data.json", category: "dagpleje" },
    { file: "sfo-data.json", category: "sfo" },
  ];

  const all = [];
  for (const { file, category } of files) {
    const path = join(DATA_DIR, file);
    if (!existsSync(path)) {
      console.warn(`  Warning: ${file} not found, skipping`);
      continue;
    }
    const raw = JSON.parse(readFileSync(path, "utf-8"));
    const items = raw.i || raw.s || [];
    for (const item of items) {
      all.push({ ...item, category });
    }
  }

  return all;
}

// ── Output generation ──────────────────────────────────────────────────────

function buildOutputJSON(matches, municipalitySatisfaction, municipalityByType) {
  const institutions = {};

  for (const [id, match] of matches) {
    const kommune = match.kommune;
    const muniData = municipalitySatisfaction.get(kommune);
    const typeData = municipalityByType.get(kommune);

    if (!muniData) continue;

    // Derive estimated satisfaction:
    // The benchmark indicator = actual - expected
    // Institution actual ≈ kommune expected + institution benchmark indicator
    // This is an approximation since the institution's expected may differ
    // from the kommune's expected. But it's the best we can do from the PDF.
    const estimatedSatisfaction = Math.round(
      (muniData.expected + match.benchmarkIndicator) * 100,
    ) / 100;

    institutions[id] = {
      overallSatisfaction: estimatedSatisfaction,
      benchmarkIndicator: match.benchmarkIndicator,
      kommuneSatisfaction: muniData.actual,
      kommuneRespondents: muniData.respondents,
      matchConfidence: match.score,
      matchType: match.matchType,
      btuName: match.btuName,
    };

    // Add type-level kommune averages if available
    if (typeData) {
      institutions[id].kommuneDagpleje = typeData.dagpleje;
      institutions[id].kommuneVuggestue = typeData.vuggestue;
      institutions[id].kommuneBoernehave = typeData.boernehave;
    }
  }

  return {
    surveyYear: SURVEY_YEAR,
    surveyPeriod: "October 2021 – February 2022",
    source: "Indenrigs- og Sundhedsministeriets Benchmarkingenhed (BTU)",
    sourceUrl: "https://benchmark.dk/analyser/dagtilbud-skole-og-uddannelse/brugertilfredshed-paa-dagtilbudsomraadet",
    pdfSource: BILAG2_URL,
    methodology: "Per-institution satisfaction estimated from kommune expected score + institution benchmark indicator. Benchmark indicator = deviation from expected satisfaction given local conditions. Municipality-level scores are directly from the survey.",
    fetchedAt: new Date().toISOString(),
    stats: {
      totalBtuInstitutions: 0, // filled in main()
      matchedInstitutions: Object.keys(institutions).length,
      municipalities: 0,
    },
    municipalities: {}, // filled in main()
    institutions,
  };
}

function generateSQL(output) {
  const lines = [
    `-- BTU parent satisfaction data`,
    `-- Survey: ${output.surveyPeriod}`,
    `-- Generated: ${new Date().toISOString().slice(0, 10)}`,
    `-- Matched institutions: ${output.stats.matchedInstitutions}`,
    ``,
    `-- Institution-level data`,
    `INSERT INTO parent_satisfaction (institution_id, survey_year, overall_satisfaction, benchmark_indicator, kommune_satisfaction, match_confidence, btu_name, source)`,
    `VALUES`,
  ];

  const entries = Object.entries(output.institutions);
  const valueLines = entries.map(([id, d], i) => {
    const esc = (s) => `'${String(s).replace(/'/g, "''")}'`;
    return `  (${esc(id)}, ${SURVEY_YEAR}, ${d.overallSatisfaction}, ${d.benchmarkIndicator}, ${d.kommuneSatisfaction}, ${d.matchConfidence.toFixed(2)}, ${esc(d.btuName)}, 'btu-bilag2')${i < entries.length - 1 ? "," : ""}`;
  });

  lines.push(...valueLines);
  lines.push(`ON CONFLICT (institution_id, survey_year) DO UPDATE SET`);
  lines.push(`  overall_satisfaction = EXCLUDED.overall_satisfaction,`);
  lines.push(`  benchmark_indicator = EXCLUDED.benchmark_indicator,`);
  lines.push(`  kommune_satisfaction = EXCLUDED.kommune_satisfaction;`);
  lines.push(``);

  // Also insert municipality-level data
  lines.push(`-- Municipality-level satisfaction by type`);
  lines.push(`INSERT INTO municipality_satisfaction (municipality, survey_year, overall, dagpleje, vuggestue, boernehave, respondents, source)`);
  lines.push(`VALUES`);

  const muniEntries = Object.entries(output.municipalities);
  const muniLines = muniEntries.map(([name, d], i) => {
    const esc = (s) => `'${String(s).replace(/'/g, "''")}'`;
    const n = (v) => (v === null || v === undefined ? "NULL" : v);
    return `  (${esc(name)}, ${SURVEY_YEAR}, ${n(d.actual)}, ${n(d.dagpleje)}, ${n(d.vuggestue)}, ${n(d.boernehave)}, ${n(d.respondents)}, 'btu-bilag2')${i < muniEntries.length - 1 ? "," : ""}`;
  });

  lines.push(...muniLines);
  lines.push(`ON CONFLICT (municipality, survey_year) DO UPDATE SET`);
  lines.push(`  overall = EXCLUDED.overall,`);
  lines.push(`  dagpleje = EXCLUDED.dagpleje,`);
  lines.push(`  vuggestue = EXCLUDED.vuggestue,`);
  lines.push(`  boernehave = EXCLUDED.boernehave,`);
  lines.push(`  respondents = EXCLUDED.respondents;`);

  return lines.join("\n");
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n--- BTU Parent Satisfaction Fetcher ---\n");
  console.log(`Survey year: ${SURVEY_YEAR}`);
  console.log(`Dry run: ${DRY_RUN}`);
  console.log();

  // Step 1: Download PDF
  console.log("Step 1: Downloading Bilag 2 PDF...");
  const pdfBuffer = await downloadPDF(BILAG2_URL);
  console.log(`  Downloaded ${(pdfBuffer.length / 1024).toFixed(0)} KB\n`);

  // Step 2: Parse PDF
  console.log("Step 2: Parsing PDF...");
  const pdfText = await parsePDF(pdfBuffer);
  console.log(`  Extracted ${pdfText.length} characters of text\n`);

  // Step 3: Extract tables
  console.log("Step 3: Extracting tables...");

  const municipalitySatisfaction = parseTabel1(pdfText);
  console.log(`  Tabel 1 (kommune overall): ${municipalitySatisfaction.size} kommuner`);

  const btuInstitutions = parseTabel2(pdfText);
  console.log(`  Tabel 2 (institution indicators): ${btuInstitutions.length} institutions`);

  const municipalityByType = parseTabel3(pdfText);
  console.log(`  Tabel 3 (kommune by type): ${municipalityByType.size} kommuner`);

  // Sample output
  const sampleKommune = "København";
  const sampleData = municipalitySatisfaction.get(sampleKommune);
  if (sampleData) {
    console.log(`\n  Sample — ${sampleKommune}:`);
    console.log(`    Respondents: ${sampleData.respondents}`);
    console.log(`    Actual satisfaction: ${sampleData.actual}`);
    console.log(`    Expected satisfaction: ${sampleData.expected}`);
    console.log(`    Benchmark indicator: ${sampleData.indicator}`);
    const typeData = municipalityByType.get(sampleKommune);
    if (typeData) {
      console.log(`    By type — dagpleje: ${typeData.dagpleje}, vuggestue: ${typeData.vuggestue}, børnehave: ${typeData.boernehave}`);
    }
  }
  console.log();

  // Step 4: Load our institution data
  console.log("Step 4: Loading our institution data...");
  const ourInstitutions = loadOurData();
  console.log(`  Loaded ${ourInstitutions.length} institutions from our dataset\n`);

  // Step 5: Match institutions
  console.log("Step 5: Matching BTU institutions to our dataset...");
  const { matches, matchLog } = matchInstitutions(btuInstitutions, ourInstitutions);
  console.log(`  Matched: ${matches.size} / ${btuInstitutions.length} BTU institutions`);
  console.log(`  Match rate: ${((matches.size / btuInstitutions.length) * 100).toFixed(1)}%`);

  // Match type breakdown
  const typeBreakdown = {};
  for (const m of matches.values()) {
    typeBreakdown[m.matchType] = (typeBreakdown[m.matchType] || 0) + 1;
  }
  console.log(`  By type: ${JSON.stringify(typeBreakdown)}`);
  console.log();

  // Step 6: Build output
  console.log("Step 6: Building output...");
  const output = buildOutputJSON(matches, municipalitySatisfaction, municipalityByType);
  output.stats.totalBtuInstitutions = btuInstitutions.length;
  output.stats.municipalities = municipalitySatisfaction.size;

  // Add municipality-level data to output
  for (const [name, data] of municipalitySatisfaction) {
    const typeData = municipalityByType.get(name);
    output.municipalities[name] = {
      respondents: data.respondents,
      actual: data.actual,
      expected: data.expected,
      indicator: data.indicator,
      dagpleje: typeData?.dagpleje ?? null,
      vuggestue: typeData?.vuggestue ?? null,
      boernehave: typeData?.boernehave ?? null,
    };
  }

  // Satisfaction distribution
  const scores = Object.values(output.institutions).map((i) => i.overallSatisfaction);
  if (scores.length > 0) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    console.log(`  Institution satisfaction — avg: ${avg.toFixed(2)}, min: ${min.toFixed(2)}, max: ${max.toFixed(2)}`);
  }
  console.log();

  if (DRY_RUN) {
    console.log("--- DRY RUN — not writing files ---\n");
    console.log(`Would write:`);
    console.log(`  public/data/parent-satisfaction.json (${Object.keys(output.institutions).length} institutions, ${Object.keys(output.municipalities).length} kommuner)`);
    console.log(`  scripts/output/parent-satisfaction.sql`);
    console.log(`  scripts/output/parent-satisfaction-raw.json`);
    if (MATCH_REPORT) {
      console.log(`\n--- Match report (first 100 entries) ---\n`);
      matchLog.slice(0, 100).forEach((l) => console.log(l));
      console.log(`  ... (${matchLog.length} total entries)`);
    }
    return;
  }

  // Step 7: Write files
  console.log("Step 7: Writing files...");

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  // Public JSON (compact — only what the frontend needs)
  const publicJSON = {
    surveyYear: output.surveyYear,
    surveyPeriod: output.surveyPeriod,
    source: output.source,
    fetchedAt: output.fetchedAt,
    municipalities: output.municipalities,
    institutions: output.institutions,
  };
  const publicPath = join(DATA_DIR, "parent-satisfaction.json");
  writeFileSync(publicPath, JSON.stringify(publicJSON), "utf-8");
  console.log(`  Written: ${publicPath}`);

  // Full raw JSON for inspection
  const rawPath = join(OUTPUT_DIR, "parent-satisfaction-raw.json");
  writeFileSync(rawPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`  Written: ${rawPath}`);

  // SQL for Supabase
  const sql = generateSQL(output);
  const sqlPath = join(OUTPUT_DIR, "parent-satisfaction.sql");
  writeFileSync(sqlPath, sql, "utf-8");
  console.log(`  Written: ${sqlPath}`);

  // Match report
  if (MATCH_REPORT) {
    const reportPath = join(OUTPUT_DIR, "btu-match-report.txt");
    const report = [
      `BTU Institution Matching Report`,
      `Generated: ${new Date().toISOString()}`,
      `BTU institutions: ${btuInstitutions.length}`,
      `Our institutions: ${ourInstitutions.length}`,
      `Matched: ${matches.size} (${((matches.size / btuInstitutions.length) * 100).toFixed(1)}%)`,
      `Match types: ${JSON.stringify(typeBreakdown)}`,
      ``,
      `--- Details ---`,
      ``,
      ...matchLog,
    ].join("\n");
    writeFileSync(reportPath, report, "utf-8");
    console.log(`  Written: ${reportPath}`);
  }

  console.log(`\nDone! ${matches.size} institutions matched with satisfaction data.`);
  console.log(`Paste scripts/output/parent-satisfaction.sql into Supabase SQL Editor to load.\n`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
