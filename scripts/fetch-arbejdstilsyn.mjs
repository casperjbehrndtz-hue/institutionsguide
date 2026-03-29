#!/usr/bin/env node
/**
 * fetch-arbejdstilsyn.mjs
 *
 * Fetches work environment inspection data from Arbejdstilsynet's "Tilsynsindblik"
 * system for childcare institutions (dagtilbud).
 *
 * The Tilsynsindblik tool (https://at.dk/arbejdsmiljoe-i-tal/tilsynsindblik/)
 * shows inspection decisions for the last 6 months. It replaced the old "smiley"
 * system on Feb 1, 2024.
 *
 * === Data Access Strategy ===
 *
 * The Tilsynsindblik is a client-side rendered tool with no public REST API.
 * This script supports two modes:
 *
 *   1. API mode (--mode=api):  Attempts to fetch data via discovered API endpoints.
 *      This is experimental and may break if AT changes their infrastructure.
 *
 *   2. Excel import mode (--mode=excel --file=<path>):  Imports data from an
 *      Excel export downloaded manually from the Tilsynsindblik dashboard.
 *      To export: open Tilsynsindblik, click the three dots (⋯) in the table
 *      corner, and choose "Eksporter til Excel".
 *
 * === CVR Matching ===
 *
 * Our institution data (vuggestue-data.json etc.) does NOT contain CVR numbers
 * in the compact format. This script builds a CVR→institution_id mapping from
 * the raw Dagtilbudsregisteret CSV (shared-childcare-engine/data/dagtilbud-register.csv).
 *
 * Usage:
 *   node scripts/fetch-arbejdstilsyn.mjs --mode=excel --file=tilsynsindblik.xlsx
 *   node scripts/fetch-arbejdstilsyn.mjs --mode=api --dry-run
 *   node scripts/fetch-arbejdstilsyn.mjs --mode=api --cvr=12345678
 *   node scripts/fetch-arbejdstilsyn.mjs --build-cvr-map
 *
 * Output:
 *   scripts/output/arbejdstilsyn.json        — All inspection data
 *   scripts/output/arbejdstilsyn.sql          — SQL INSERT statements for Supabase
 *   scripts/output/cvr-institution-map.json   — CVR→institution_id mapping
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUTPUT_DIR = join(__dirname, "output");
const PROJECT_ROOT = resolve(__dirname, "..");

// === CLI Arguments ===
const args = process.argv.slice(2);
const flags = {};
for (const arg of args) {
  if (arg.startsWith("--")) {
    const [key, ...rest] = arg.slice(2).split("=");
    flags[key] = rest.length > 0 ? rest.join("=") : true;
  }
}

const MODE = flags.mode || "excel";
const DRY_RUN = !!flags["dry-run"];
const EXCEL_FILE = flags.file || null;
const SINGLE_CVR = flags.cvr || null;
const BUILD_CVR_MAP_ONLY = !!flags["build-cvr-map"];

// Rate limiting
const RATE_LIMIT_MS = 1000; // 1 second between requests
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// === Logging ===
function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}
function warn(msg) {
  console.warn(`[${new Date().toISOString().slice(11, 19)}] WARN: ${msg}`);
}
function error(msg) {
  console.error(`[${new Date().toISOString().slice(11, 19)}] ERROR: ${msg}`);
}

// =============================================================================
// CVR Mapping: Build CVR → institution_id from raw Dagtilbudsregisteret CSV
// =============================================================================

function buildCvrMap() {
  const csvPath = resolve(__dirname, "../../shared-childcare-engine/data/dagtilbud-register.csv");

  if (!existsSync(csvPath)) {
    warn(`Raw CSV not found at ${csvPath}`);
    warn("Cannot build CVR mapping. Inspections will be stored without institution_id matching.");
    return new Map();
  }

  log(`Reading raw CSV from ${csvPath}`);
  const raw = readFileSync(csvPath, "utf-8");
  const lines = raw.replace(/^\uFEFF/, "").split("\n").filter(Boolean);
  const headers = lines[0].split(";").map((h) => h.trim());

  const cvrIdx = headers.indexOf("cvrNummer");
  const idIdx = headers.indexOf("anvisningsenhedsNummer");
  const altIdIdx = headers.indexOf("daginstitutionsNummer");
  const nameIdx = headers.indexOf("dagtilbudsNavn");
  const typeIdx = headers.indexOf("dagtilbudsType");
  const statusIdx = headers.findIndex((h) => h === "aktivitetsstatus");
  const instTypeIdx = headers.indexOf("instType3");
  const munIdx = headers.indexOf("kommuneKode_Tekst");

  if (cvrIdx === -1) {
    warn("CSV does not contain cvrNummer column");
    return new Map();
  }

  // Only include dagtilbud types relevant to childcare
  const CHILDCARE_TYPES = new Set(["6010", "6011", "6012", "6013", "6014", "6020", "6021"]);

  const cvrMap = new Map(); // CVR → { id, name, municipality }
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(";");
    const type = (values[typeIdx] || "").trim();
    const instType = (values[instTypeIdx] || "").trim();
    const status = (values[statusIdx] || "").trim();
    const cvr = (values[cvrIdx] || "").trim();
    const id = (values[idIdx] || values[altIdIdx] || "").trim();
    const name = (values[nameIdx] || "").trim();
    const municipality = (values[munIdx] || "").trim();

    // Only active anvisningsenheder with CVR
    if (type !== "anvisningsenhed" || status !== "Aktiv" || !cvr || !id) {
      skipped++;
      continue;
    }

    if (!CHILDCARE_TYPES.has(instType)) {
      skipped++;
      continue;
    }

    // A CVR can map to multiple institutions (one CVR = one legal entity)
    if (!cvrMap.has(cvr)) {
      cvrMap.set(cvr, []);
    }
    cvrMap.get(cvr).push({ id, name, municipality, instType });
  }

  log(`CVR map: ${cvrMap.size} unique CVR numbers covering ${[...cvrMap.values()].reduce((s, a) => s + a.length, 0)} institutions (skipped ${skipped} rows)`);

  // Save the map for reference
  const mapPath = join(OUTPUT_DIR, "cvr-institution-map.json");
  const mapData = {};
  for (const [cvr, institutions] of cvrMap) {
    mapData[cvr] = institutions;
  }
  writeFileSync(mapPath, JSON.stringify(mapData, null, 2), "utf-8");
  log(`CVR map saved to: ${mapPath}`);

  return cvrMap;
}

// =============================================================================
// Mode 1: API Discovery & Fetching
// =============================================================================

/**
 * Attempt to fetch inspection data from potential API endpoints.
 *
 * Known patterns explored:
 * - at.dk does NOT expose a public REST API for Tilsynsindblik
 * - The tool is rendered client-side (likely Angular/React SPA)
 * - Data may come from an internal API that requires session cookies
 *
 * This function tries several known/guessed API patterns.
 * If none work, it falls back to documenting the failure.
 */
async function tryApiEndpoints(cvr) {
  const endpoints = [
    // Pattern 1: Direct API on at.dk
    `https://at.dk/api/tilsynsindblik/virksomhed/${cvr}`,
    `https://at.dk/api/tilsynsindblik/search?cvr=${cvr}`,
    // Pattern 2: Separate API subdomain
    `https://api.at.dk/tilsynsindblik/v1/virksomhed/${cvr}`,
    // Pattern 3: Common Danish government API patterns
    `https://at.dk/umbraco/api/tilsynsindblik/search?cvr=${cvr}`,
    `https://at.dk/umbraco/surface/tilsynsindblik/get?cvr=${cvr}`,
    // Pattern 4: Backend for SPA
    `https://at.dk/tilsynsindblik-api/virksomhed/${cvr}`,
    `https://at.dk/arbejdsmiljoe-i-tal/tilsynsindblik/api/search?cvr=${cvr}`,
  ];

  for (const url of endpoints) {
    try {
      log(`  Trying: ${url}`);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json, text/html",
          "User-Agent": "Mozilla/5.0 (compatible; Institutionsguide/1.0; +https://institutionsguide.dk)",
        },
      });
      clearTimeout(timer);

      const contentType = res.headers.get("content-type") || "";
      log(`  -> ${res.status} ${res.statusText} (${contentType})`);

      if (res.ok && contentType.includes("json")) {
        const data = await res.json();
        log(`  -> Got JSON response with ${JSON.stringify(data).length} bytes`);
        return { success: true, url, data };
      }

      // Check if HTML response contains useful data (embedded JSON)
      if (res.ok && contentType.includes("html")) {
        const html = await res.text();
        // Look for embedded JSON data in script tags
        const jsonMatch = html.match(/<script[^>]*>.*?window\.__DATA__\s*=\s*(\{[\s\S]*?\});/);
        if (jsonMatch) {
          try {
            const data = JSON.parse(jsonMatch[1]);
            log(`  -> Found embedded JSON data`);
            return { success: true, url, data };
          } catch { /* not valid JSON */ }
        }
      }
    } catch (err) {
      if (err.name === "AbortError") {
        log(`  -> Timeout`);
      } else {
        log(`  -> ${err.message}`);
      }
    }

    await sleep(500);
  }

  return { success: false };
}

async function fetchViaApi(cvrMap) {
  log("=== API Mode: Attempting to discover Tilsynsindblik API ===\n");

  // If a single CVR is specified, just test that
  const cvrsToTry = SINGLE_CVR ? [SINGLE_CVR] : [...cvrMap.keys()].slice(0, 3);

  log(`Testing ${cvrsToTry.length} CVR number(s) against potential API endpoints...\n`);

  let apiFound = false;
  const results = [];

  for (const cvr of cvrsToTry) {
    const institutions = cvrMap.get(cvr) || [{ id: "unknown", name: "Unknown" }];
    log(`CVR ${cvr} (${institutions[0]?.name || "?"}):`);

    const result = await tryApiEndpoints(cvr);

    if (result.success) {
      apiFound = true;
      log(`\n  SUCCESS! API endpoint found: ${result.url}\n`);
      results.push({ cvr, institutions, data: result.data });
    } else {
      log(`  No working API endpoint found for CVR ${cvr}\n`);
    }

    await sleep(RATE_LIMIT_MS);
  }

  if (!apiFound) {
    log("\n" + "=".repeat(70));
    log("API DISCOVERY FAILED");
    log("=".repeat(70));
    log("");
    log("None of the attempted API endpoints returned usable data.");
    log("The Tilsynsindblik tool appears to be a client-side application");
    log("without a publicly accessible REST API.");
    log("");
    log("RECOMMENDED: Use Excel import mode instead:");
    log("  1. Open https://at.dk/arbejdsmiljoe-i-tal/tilsynsindblik/");
    log("  2. The dashboard shows aggregate data for the last 6 months");
    log("  3. Click the three dots (...) in the table corner");
    log("  4. Choose 'Eksporter til Excel'");
    log("  5. Run: node scripts/fetch-arbejdstilsyn.mjs --mode=excel --file=<path>");
    log("");
    log("ALTERNATIVE: Use a headless browser (Playwright) to automate the tool:");
    log("  npm install playwright");
    log("  Then extend this script with a Playwright-based scraper.");
    log("=".repeat(70) + "\n");

    // Save API discovery report
    const reportPath = join(OUTPUT_DIR, "arbejdstilsyn-api-discovery.json");
    const report = {
      timestamp: new Date().toISOString(),
      status: "no_api_found",
      cvrs_tested: cvrsToTry,
      endpoints_tried: [
        "at.dk/api/tilsynsindblik/...",
        "api.at.dk/tilsynsindblik/...",
        "at.dk/umbraco/api/...",
        "at.dk/tilsynsindblik-api/...",
      ],
      recommendation: "Use Excel export from the Tilsynsindblik dashboard, or implement Playwright-based scraping",
      excel_instructions: [
        "Open https://at.dk/arbejdsmiljoe-i-tal/tilsynsindblik/",
        "View the aggregate decision table",
        "Click the ... menu in the table corner",
        "Choose 'Eksporter til Excel'",
        "Run: node scripts/fetch-arbejdstilsyn.mjs --mode=excel --file=<path>",
      ],
    };
    writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
    log(`Discovery report saved to: ${reportPath}`);
  }

  return results;
}

// =============================================================================
// Mode 2: Excel Import
// =============================================================================

/**
 * Parse an Excel export from Tilsynsindblik.
 *
 * Expected columns (based on the dashboard's table structure):
 * - Virksomhedsnavn / Company name
 * - CVR-nummer / CVR number
 * - P-nummer / Production unit number
 * - Tilsynsdato / Inspection date
 * - Afgørelsestype / Decision type (strakspåbud, påbud, etc.)
 * - Problemområde / Problem area (psykisk, ergonomisk, etc.)
 * - Emne / Subject
 * - Status
 *
 * Note: Column names may vary. The parser tries multiple known patterns.
 */
async function importFromExcel(filePath, cvrMap) {
  log("=== Excel Import Mode ===\n");

  if (!filePath) {
    error("No Excel file specified. Use --file=<path>");
    error("Example: node scripts/fetch-arbejdstilsyn.mjs --mode=excel --file=tilsynsindblik.xlsx");
    process.exit(1);
  }

  const absPath = resolve(filePath);
  if (!existsSync(absPath)) {
    error(`File not found: ${absPath}`);
    process.exit(1);
  }

  // Try to use xlsx package
  let XLSX;
  try {
    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);
    XLSX = require("xlsx");
  } catch {
    error("The 'xlsx' package is required for Excel import.");
    error("Install it: npm install xlsx");
    process.exit(1);
  }

  log(`Reading Excel file: ${absPath}`);
  const workbook = XLSX.readFile(absPath);

  const sheetName = workbook.SheetNames[0];
  log(`Using sheet: "${sheetName}"`);

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  log(`Found ${rows.length} rows in Excel file\n`);

  if (rows.length === 0) {
    warn("Excel file is empty");
    return [];
  }

  // Log column names for debugging
  const columns = Object.keys(rows[0]);
  log(`Columns found: ${columns.join(", ")}\n`);

  // Column name mapping — try multiple known patterns (Danish/English)
  function findColumn(row, patterns) {
    for (const p of patterns) {
      const key = Object.keys(row).find((k) => k.toLowerCase().includes(p.toLowerCase()));
      if (key) return row[key];
    }
    return null;
  }

  // Parse rows
  const inspections = [];
  let matched = 0;
  let unmatched = 0;

  for (const row of rows) {
    const cvr = String(
      findColumn(row, ["cvr", "CVR-nummer", "CVR nummer", "cvrnummer"]) || ""
    ).trim().replace(/\D/g, "");

    const companyName = String(
      findColumn(row, ["virksomhed", "Virksomhedsnavn", "company", "navn"]) || ""
    ).trim();

    const inspectionDateRaw = findColumn(row, [
      "tilsynsdato", "Tilsynsdato", "inspection_date", "dato", "Dato",
    ]);

    const decisionType = String(
      findColumn(row, [
        "afgørelse", "Afgørelsestype", "decision", "type", "påbud",
        "Afgørelse", "afgørelsestype",
      ]) || ""
    ).trim();

    const problemArea = String(
      findColumn(row, [
        "problemområde", "Problemområde", "problem", "område", "area",
      ]) || ""
    ).trim();

    const subject = String(
      findColumn(row, ["emne", "Emne", "subject", "beskrivelse"]) || ""
    ).trim();

    const status = String(
      findColumn(row, ["status", "Status"]) || ""
    ).trim();

    if (!cvr && !companyName) continue;

    // Parse date
    let inspectionDate = null;
    if (inspectionDateRaw) {
      if (inspectionDateRaw instanceof Date) {
        inspectionDate = inspectionDateRaw.toISOString().slice(0, 10);
      } else if (typeof inspectionDateRaw === "number") {
        // Excel serial date
        const d = XLSX.SSF.parse_date_code(inspectionDateRaw);
        if (d) inspectionDate = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
      } else {
        const str = String(inspectionDateRaw).trim();
        // Try DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY
        const m = str.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/);
        if (m) {
          inspectionDate = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
        }
        // Try YYYY-MM-DD
        const m2 = str.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (!inspectionDate && m2) {
          inspectionDate = `${m2[1]}-${m2[2]}-${m2[3]}`;
        }
      }
    }

    // Normalize decision type
    const normalizedDecision = normalizeDecisionType(decisionType);

    // Match CVR to our institution IDs
    const institutionMatches = cvr ? (cvrMap.get(cvr) || []) : [];
    const institutionId = institutionMatches.length === 1 ? institutionMatches[0].id : null;

    if (institutionMatches.length > 0) {
      matched++;
    } else {
      unmatched++;
    }

    inspections.push({
      cvr: cvr || null,
      company_name: companyName || null,
      inspection_date: inspectionDate,
      decision_type: normalizedDecision,
      problem_area: problemArea || null,
      description: subject || null,
      status: normalizeStatus(status),
      institution_id: institutionId,
      institution_matches: institutionMatches.length > 1
        ? institutionMatches.map((m) => m.id)
        : undefined,
    });
  }

  log(`Parsed ${inspections.length} inspections`);
  log(`  Matched to our institutions: ${matched}`);
  log(`  Unmatched (non-childcare or unknown CVR): ${unmatched}`);

  return inspections;
}

function normalizeDecisionType(raw) {
  const lower = (raw || "").toLowerCase();
  if (lower.includes("strakspåbud") || lower.includes("straks")) return "strakspåbud";
  if (lower.includes("rådgivningspåbud") || lower.includes("rådgivning")) return "rådgivningspåbud";
  if (lower.includes("påbud") && !lower.includes("uden")) return "påbud";
  if (lower.includes("uden påbud") || lower.includes("afgørelse uden")) return "afgørelse uden påbud";
  if (lower.includes("forbud")) return "forbud";
  return raw || "ukendt";
}

function normalizeStatus(raw) {
  const lower = (raw || "").toLowerCase();
  if (lower.includes("efterkommet") || lower.includes("opfyldt")) return "efterkommet";
  if (lower.includes("aktiv") || lower.includes("åben")) return "aktiv";
  if (lower.includes("frafaldet") || lower.includes("ophævet")) return "frafaldet";
  if (lower.includes("anket") || lower.includes("klage")) return "anket";
  return raw || null;
}

// =============================================================================
// Output: JSON & SQL
// =============================================================================

function saveResults(inspections) {
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  // Save JSON
  const jsonPath = join(OUTPUT_DIR, "arbejdstilsyn.json");
  const output = {
    generated_at: new Date().toISOString(),
    total: inspections.length,
    matched: inspections.filter((i) => i.institution_id).length,
    multi_match: inspections.filter((i) => i.institution_matches).length,
    by_decision_type: countBy(inspections, "decision_type"),
    by_problem_area: countBy(inspections, "problem_area"),
    inspections,
  };
  writeFileSync(jsonPath, JSON.stringify(output, null, 2), "utf-8");
  log(`JSON saved to: ${jsonPath}`);

  // Save SQL
  const sqlPath = join(OUTPUT_DIR, "arbejdstilsyn.sql");
  const sql = generateSQL(inspections);
  writeFileSync(sqlPath, sql, "utf-8");
  log(`SQL saved to: ${sqlPath}`);

  return { jsonPath, sqlPath };
}

function countBy(arr, key) {
  const counts = {};
  for (const item of arr) {
    const val = item[key] || "unknown";
    counts[val] = (counts[val] || 0) + 1;
  }
  return counts;
}

function esc(str) {
  if (str === null || str === undefined) return "NULL";
  return `'${String(str).replace(/'/g, "''")}'`;
}

function generateSQL(inspections) {
  const lines = [
    `-- Arbejdstilsyn inspection data from Tilsynsindblik`,
    `-- Generated: ${new Date().toISOString().slice(0, 10)}`,
    `-- Total rows: ${inspections.length}`,
    `-- Source: https://at.dk/arbejdsmiljoe-i-tal/tilsynsindblik/`,
    ``,
  ];

  // Filter to only inspections with CVR (required by table schema)
  const withCvr = inspections.filter((i) => i.cvr);

  if (withCvr.length === 0) {
    lines.push("-- No inspections with CVR numbers found.");
    return lines.join("\n");
  }

  lines.push(`INSERT INTO arbejdstilsyn (institution_id, cvr, company_name, inspection_date, decision_type, problem_area, description, status, source)`);
  lines.push(`VALUES`);

  const valueLines = withCvr.map(
    (r, i) =>
      `  (${esc(r.institution_id)}, ${esc(r.cvr)}, ${esc(r.company_name)}, ${r.inspection_date ? esc(r.inspection_date) : "NULL"}, ${esc(r.decision_type)}, ${esc(r.problem_area)}, ${esc(r.description)}, ${esc(r.status)}, 'tilsynsindblik')${i < withCvr.length - 1 ? "," : ""}`
  );

  lines.push(...valueLines);
  lines.push(`ON CONFLICT (cvr, inspection_date, decision_type, problem_area) DO UPDATE SET`);
  lines.push(`  institution_id = COALESCE(EXCLUDED.institution_id, arbejdstilsyn.institution_id),`);
  lines.push(`  company_name = EXCLUDED.company_name,`);
  lines.push(`  description = EXCLUDED.description,`);
  lines.push(`  status = EXCLUDED.status;`);

  return lines.join("\n");
}

// =============================================================================
// Supabase Upsert (optional)
// =============================================================================

async function upsertToSupabase(inspections) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    log("Supabase credentials not set. Skipping upsert.");
    log("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable.");
    return;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const toUpsert = inspections
    .filter((i) => i.cvr)
    .map((i) => ({
      institution_id: i.institution_id,
      cvr: i.cvr,
      company_name: i.company_name,
      inspection_date: i.inspection_date,
      decision_type: i.decision_type,
      problem_area: i.problem_area,
      description: i.description,
      status: i.status,
      source: "tilsynsindblik",
    }));

  if (toUpsert.length === 0) {
    log("No records with CVR to upsert.");
    return;
  }

  log(`Upserting ${toUpsert.length} records to Supabase...`);

  // Batch in groups of 100
  const BATCH_SIZE = 100;
  let upserted = 0;
  let errors = 0;

  for (let i = 0; i < toUpsert.length; i += BATCH_SIZE) {
    const batch = toUpsert.slice(i, i + BATCH_SIZE);
    const { error: err } = await supabase
      .from("arbejdstilsyn")
      .upsert(batch, { onConflict: "cvr,inspection_date,decision_type,problem_area" });

    if (err) {
      error(`Supabase batch error: ${err.message}`);
      errors++;
    } else {
      upserted += batch.length;
    }
  }

  log(`Supabase upsert: ${upserted} records inserted/updated, ${errors} batch errors`);
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log("");
  console.log("=".repeat(60));
  console.log("  Arbejdstilsyn Inspection Data Fetcher");
  console.log("  Source: Tilsynsindblik (at.dk)");
  console.log("=".repeat(60));
  console.log("");

  if (DRY_RUN) {
    log("DRY RUN mode — no data will be written to Supabase\n");
  }

  // Ensure output directory
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  // Step 1: Build CVR → institution_id mapping
  log("Step 1: Building CVR mapping from Dagtilbudsregisteret...\n");
  const cvrMap = buildCvrMap();

  if (BUILD_CVR_MAP_ONLY) {
    log("\n--build-cvr-map flag set. Done.");
    return;
  }

  // Step 2: Fetch or import inspection data
  let inspections = [];

  if (MODE === "api") {
    log("\nStep 2: Attempting API-based data fetch...\n");
    const apiResults = await fetchViaApi(cvrMap);

    if (apiResults.length > 0) {
      // Parse API results into our format
      for (const result of apiResults) {
        // The API response structure is unknown, so this is a best-effort parse
        const data = result.data;
        if (Array.isArray(data)) {
          for (const item of data) {
            inspections.push({
              cvr: result.cvr,
              company_name: item.virksomhedsnavn || item.companyName || null,
              inspection_date: item.tilsynsdato || item.inspectionDate || null,
              decision_type: normalizeDecisionType(item.afgørelsestype || item.decisionType || ""),
              problem_area: item.problemområde || item.problemArea || null,
              description: item.emne || item.description || null,
              status: normalizeStatus(item.status || ""),
              institution_id: result.institutions?.[0]?.id || null,
            });
          }
        }
      }
      log(`Parsed ${inspections.length} inspections from API`);
    }
  } else if (MODE === "excel") {
    log("\nStep 2: Importing from Excel export...\n");
    inspections = await importFromExcel(EXCEL_FILE, cvrMap);
  } else {
    error(`Unknown mode: ${MODE}. Use --mode=api or --mode=excel`);
    process.exit(1);
  }

  if (inspections.length === 0) {
    log("\nNo inspection data collected. Exiting.");
    return;
  }

  // Step 3: Save results
  log("\nStep 3: Saving results...\n");
  const { jsonPath, sqlPath } = saveResults(inspections);

  // Step 4: Upsert to Supabase (unless dry run)
  if (!DRY_RUN) {
    log("\nStep 4: Upserting to Supabase...\n");
    await upsertToSupabase(inspections);
  } else {
    log("\nStep 4: Skipped (dry run)");
  }

  // Summary
  console.log("");
  console.log("=".repeat(60));
  console.log("  Summary");
  console.log("=".repeat(60));
  console.log(`  Total inspections:      ${inspections.length}`);
  console.log(`  Matched to institution: ${inspections.filter((i) => i.institution_id).length}`);
  console.log(`  Multi-match (manual):   ${inspections.filter((i) => i.institution_matches).length}`);
  console.log(`  With CVR:               ${inspections.filter((i) => i.cvr).length}`);
  console.log(`  By decision type:`);
  const byType = countBy(inspections, "decision_type");
  for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${type}: ${count}`);
  }
  console.log(`  By problem area:`);
  const byArea = countBy(inspections, "problem_area");
  for (const [area, count] of Object.entries(byArea).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`    ${area}: ${count}`);
  }
  console.log("");
  console.log(`  Output:`);
  console.log(`    ${jsonPath}`);
  console.log(`    ${sqlPath}`);
  console.log(`    ${join(OUTPUT_DIR, "cvr-institution-map.json")}`);
  console.log("=".repeat(60));
  console.log("");
}

main().catch((err) => {
  error(`Fatal: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
