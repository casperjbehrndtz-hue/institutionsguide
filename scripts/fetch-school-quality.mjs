#!/usr/bin/env node
/**
 * fetch-school-quality.mjs
 *
 * Fetches school-level quality data from the Uddannelsesstatistik API and
 * updates public/data/skole-data.json with fresh values.
 *
 * Data fetched (2 API calls):
 *   1. OVERSKO (Skoleoverblik) — per school per year:
 *      Elevtal, Klassekvotient, Fravær, Karaktersnit, Kompetencedækning,
 *      SocRef, Trivsel-andel
 *   2. TRIVIND (Trivselsindikatorer) — per school × indicator × year:
 *      Social trivsel, Faglig trivsel, Støtte og inspiration,
 *      Ro og orden, Generel trivsel (1-5 scale)
 *
 * The script automatically picks the latest available school year for each
 * dataset and records exactly which year was used.
 *
 * Usage:
 *   node scripts/fetch-school-quality.mjs
 *   node scripts/fetch-school-quality.mjs --dry-run
 *   node scripts/fetch-school-quality.mjs --year 2023/2024
 *
 * Environment:
 *   UDDANNELSESSTATISTIK_API_KEY — Required (or set in .env file).
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..");
const SKOLE_PATH = join(PROJECT_ROOT, "public", "data", "skole-data.json");

// ---------------------------------------------------------------------------
// Load .env
// ---------------------------------------------------------------------------
try {
  const envPath = join(PROJECT_ROOT, ".env");
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed
        .slice(eqIdx + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch (_) {}

const API_KEY =
  process.env.UDDANNELSESSTATISTIK_API_KEY || process.env.BUVM_API_KEY;
if (!API_KEY) {
  console.error(
    "ERROR: Set UDDANNELSESSTATISTIK_API_KEY environment variable"
  );
  process.exit(1);
}

const DRY_RUN = process.argv.includes("--dry-run");
const yearArg = process.argv.find((a, i) => process.argv[i - 1] === "--year");

const API_BASE = "https://api.uddannelsesstatistik.dk/Api/v1";
const API_STATISTIK = `${API_BASE}/statistik`;
const API_SKEMA = `${API_BASE}/skema`;
const HEADERS = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${API_KEY}`,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseDanish(s) {
  if (!s || typeof s !== "string" || s.trim() === "" || s === "..") return null;
  let cleaned = s.replace(/%/g, "").replace(/\s/g, "");
  cleaned = cleaned.replace(/\.(\d{3})/g, "$1");
  cleaned = cleaned.replace(",", ".");
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

async function apiPost(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Discover latest available school year
// ---------------------------------------------------------------------------

async function findLatestYear(område, emne, underemne, yearDim) {
  const schema = await apiPost(API_SKEMA, { område, emne, underemne });
  const yearDet = schema.detaljer.find((d) => d.name === yearDim);
  if (!yearDet) throw new Error(`Year dimension "${yearDim}" not found`);

  // Fetch just the available year values
  const body = {
    område,
    emne,
    underemne,
    nøgletal: [schema.nøgletal[0].replace("[Measures].[", "").replace("]", "")],
    detaljering: [yearDim],
    side: 1,
    side_størrelse: 100,
  };
  const data = await apiPost(API_STATISTIK, body);
  const years = data.map((r) => r[`${yearDim}.${yearDim.split(".")[1]}`]).filter(Boolean);
  years.sort();
  return years[years.length - 1]; // Latest year
}

// ---------------------------------------------------------------------------
// Fetch Skoleoverblik (all key metrics in one call)
// ---------------------------------------------------------------------------

async function fetchOversko(schoolYear) {
  console.log(`  Fetching Skoleoverblik for ${schoolYear}...`);

  const body = {
    område: "GS",
    emne: "OVER",
    underemne: "OVERSKO",
    nøgletal: [
      "Elevtal",
      "Klassekvotient",
      "Samlet elevfravær",
      "Karaktergennemsnit",
      "Kompetencedækning",
      "SocRef Forskel",
      "SocRef Karaktergennemsnit",
      "SocRef Socioøkonomisk reference",
      "SocRef Signifikant forskel",
      "Andel med højest trivsel",
      "Andel i gang med en ungdomsuddannelse 15 måneder efter afgang",
    ],
    detaljering: [
      "[Institution].[Afdelingsnummer]",
      "[Institution].[Afdeling]",
      "[Skoleår].[Skoleår]",
    ],
    filtre: { "[Skoleår].[Skoleår]": [schoolYear] },
    side: 1,
    side_størrelse: 100000,
  };

  const data = await apiPost(API_STATISTIK, body);
  console.log(`    → ${data.length} schools`);
  return data;
}

// ---------------------------------------------------------------------------
// Fetch Trivselsindikatorer (5 indicators per school)
// ---------------------------------------------------------------------------

async function fetchTrivsel(schoolYear) {
  console.log(`  Fetching Trivselsindikatorer for ${schoolYear}...`);

  const body = {
    område: "GS",
    emne: "TRIV",
    underemne: "TRIVIND",
    nøgletal: ["Indikatorsvar"],
    detaljering: [
      "[Institution].[Afdelingsnummer]",
      "[Trivselsindikator].[Trivselsindikator]",
      "[Skoleår].[Skoleår]",
    ],
    filtre: { "[Skoleår].[Skoleår]": [schoolYear] },
    side: 1,
    side_størrelse: 100000,
  };

  const data = await apiPost(API_STATISTIK, body);
  console.log(`    → ${data.length} rows (${Math.round(data.length / 5)} schools × 5 indicators)`);
  return data;
}

// ---------------------------------------------------------------------------
// Merge API data into existing skole-data.json
// ---------------------------------------------------------------------------

function mergeData(skoleData, overskoData, trivselData, overskoYear, trivselYear) {
  const ID_KEY = "[Institution].[Afdelingsnummer].[Afdelingsnummer]";
  const NAME_KEY = "[Institution].[Afdeling].[Afdeling]";
  const TRIV_KEY = "[Trivselsindikator].[Trivselsindikator].[Trivselsindikator]";

  // Build lookup: afdelingsnummer → oversko metrics
  const overskoMap = new Map();
  for (const row of overskoData) {
    const id = row[ID_KEY];
    if (!id) continue;
    overskoMap.set(id, {
      el: parseDanish(row["Elevtal"]),
      kv: parseDanish(row["Klassekvotient"]),
      fp: parseDanish(row["Samlet elevfravær"]),
      k: parseDanish(row["Karaktergennemsnit"]),
      kp: parseDanish(row["Kompetencedækning"]),
      srDiff: parseDanish(row["SocRef Forskel"]),
      srChar: parseDanish(row["SocRef Karaktergennemsnit"]),
      srRef: parseDanish(row["SocRef Socioøkonomisk reference"]),
      sr: row["SocRef Signifikant forskel"] || null,
      trivPct: parseDanish(row["Andel med højest trivsel"]),
      oug: parseDanish(row["Andel i gang med en ungdomsuddannelse 15 måneder efter afgang"]),
      name: row[NAME_KEY],
    });
  }

  // Build lookup: afdelingsnummer → trivsel indicators
  const trivselMap = new Map();
  const TRIV_MAPPING = {
    "Social trivsel": "tsi",
    "Faglig trivsel": "tf",
    "Støtte og inspiration": "tst", // New — "Støtte og inspiration"
    "Ro og orden": "tro",
    "Generel trivsel": "tg",
  };

  for (const row of trivselData) {
    const id = row[ID_KEY];
    const indicator = row[TRIV_KEY];
    const value = parseDanish(row["Indikatorsvar"]);
    if (!id || !indicator || value === null) continue;

    if (!trivselMap.has(id)) trivselMap.set(id, {});
    const field = TRIV_MAPPING[indicator];
    if (field) trivselMap.get(id)[field] = value;
  }

  // Compute samlet trivsel (ts) as average of all 5 indicators
  for (const [id, triv] of trivselMap) {
    const vals = Object.values(triv).filter((v) => typeof v === "number");
    if (vals.length > 0) {
      triv.ts = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
    }
  }

  // Compute national averages from oversko data
  const allK = [], allFp = [], allTs = [];
  for (const v of overskoMap.values()) {
    if (v.k != null) allK.push(v.k);
    if (v.fp != null) allFp.push(v.fp);
  }
  for (const v of trivselMap.values()) {
    if (v.ts != null) allTs.push(v.ts);
  }
  const avg = (arr) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;
  const nationalAvg = {
    trivsel: avg(allTs),
    karakterer: avg(allK),
    fravaer: avg(allFp),
  };

  // Merge into school entries
  let matched = 0, unmatched = 0, enriched = 0;

  for (const school of skoleData.s) {
    const id = school.id;
    const oversko = overskoMap.get(id);
    const trivsel = trivselMap.get(id);

    if (!oversko && !trivsel) {
      unmatched++;
      continue;
    }
    matched++;

    // Build quality object
    const q = {};

    if (oversko) {
      if (oversko.el != null) q.el = Math.round(oversko.el);
      if (oversko.kv != null) q.kv = oversko.kv;
      if (oversko.fp != null) q.fp = oversko.fp;
      if (oversko.k != null) q.k = oversko.k;
      if (oversko.kp != null) q.kp = oversko.kp;
      if (oversko.sr) q.sr = oversko.sr;
      if (oversko.srDiff != null) q.srd = oversko.srDiff;
      if (oversko.oug != null) q.oug = oversko.oug;
    }

    if (trivsel) {
      if (trivsel.ts != null) q.ts = trivsel.ts;
      if (trivsel.tf != null) q.tf = trivsel.tf;
      if (trivsel.tg != null) q.tg = trivsel.tg;
      if (trivsel.tro != null) q.tro = trivsel.tro;
      if (trivsel.tsi != null) q.tsi = trivsel.tsi;
    }

    // Compute overall rating (o): 1=over, 0=middel, -1=under
    if (oversko?.sr) {
      if (oversko.sr === "Over niveau") q.o = 1;
      else if (oversko.sr === "Under niveau") q.o = -1;
      else q.o = 0;
    }

    // Compute rating score (r) 0-5 based on composite
    if (Object.keys(q).length > 0) {
      let score = 2.5; // baseline
      if (q.k != null && nationalAvg.karakterer) score += (q.k - nationalAvg.karakterer) * 0.3;
      if (q.fp != null && nationalAvg.fravaer) score -= (q.fp - nationalAvg.fravaer) * 0.15;
      if (q.ts != null && nationalAvg.trivsel) score += (q.ts - nationalAvg.trivsel) * 0.5;
      if (q.o === 1) score += 0.5;
      if (q.o === -1) score -= 0.5;
      q.r = Math.max(0, Math.min(5, Math.round(score * 10) / 10));
      enriched++;
    }

    school.q = q;
  }

  // Update metadata
  skoleData.y = overskoYear;
  skoleData.g = new Date().toISOString();
  skoleData.avg = nationalAvg;
  // Track which years were used for which data
  skoleData.dataYears = {
    oversko: overskoYear,
    trivsel: trivselYear,
  };

  return { matched, unmatched, enriched, nationalAvg };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║   School Quality Data Updater            ║");
  console.log("║   Source: Uddannelsesstatistik.dk API     ║");
  console.log("╚══════════════════════════════════════════╝\n");

  if (DRY_RUN) console.log("  Mode: DRY RUN\n");

  // Load existing skole-data.json
  if (!existsSync(SKOLE_PATH)) {
    console.error(`ERROR: ${SKOLE_PATH} not found`);
    process.exit(1);
  }
  const skoleData = JSON.parse(readFileSync(SKOLE_PATH, "utf-8"));
  console.log(`  Loaded ${skoleData.s.length} schools from skole-data.json`);
  console.log(`  Current data year: ${skoleData.y || "unknown"}\n`);

  // Discover latest available years
  let overskoYear, trivselYear;

  if (yearArg) {
    overskoYear = yearArg;
    trivselYear = yearArg;
    console.log(`  Using specified year: ${yearArg}\n`);
  } else {
    console.log("  Discovering latest available years...");
    overskoYear = await findLatestYear("GS", "OVER", "OVERSKO", "[Skoleår].[Skoleår]");
    await sleep(300);
    trivselYear = await findLatestYear("GS", "TRIV", "TRIVIND", "[Skoleår].[Skoleår]");
    console.log(`    Skoleoverblik: ${overskoYear}`);
    console.log(`    Trivsel: ${trivselYear}\n`);
  }

  // Fetch data
  console.log("  Fetching from API...");
  const overskoData = await fetchOversko(overskoYear);
  await sleep(500);
  const trivselData = await fetchTrivsel(trivselYear);

  // Merge
  console.log("\n  Merging data...");
  const stats = mergeData(skoleData, overskoData, trivselData, overskoYear, trivselYear);

  console.log(`\n  ┌─────────────────────────────────┐`);
  console.log(`  │ Results                         │`);
  console.log(`  ├─────────────────────────────────┤`);
  console.log(`  │ Schools matched:  ${String(stats.matched).padStart(5)}        │`);
  console.log(`  │ Schools enriched: ${String(stats.enriched).padStart(5)}        │`);
  console.log(`  │ No API data:      ${String(stats.unmatched).padStart(5)}        │`);
  console.log(`  │ Nat. avg grades:  ${String(stats.nationalAvg.karakterer).padStart(5)}        │`);
  console.log(`  │ Nat. avg absence: ${String(stats.nationalAvg.fravaer).padStart(5)}%       │`);
  console.log(`  │ Nat. avg trivsel: ${String(stats.nationalAvg.trivsel).padStart(5)}        │`);
  console.log(`  │ Oversko year:     ${overskoYear.padStart(9)}  │`);
  console.log(`  │ Trivsel year:     ${trivselYear.padStart(9)}  │`);
  console.log(`  └─────────────────────────────────┘\n`);

  if (DRY_RUN) {
    // Show sample
    const sample = skoleData.s.find((s) => s.q && s.q.k != null);
    if (sample) {
      console.log("  Sample school:", sample.n);
      console.log("  Quality:", JSON.stringify(sample.q, null, 2));
    }
    console.log("\n  [DRY RUN] No files written.");
    return;
  }

  // Write updated file
  const jsonStr = JSON.stringify(skoleData);
  writeFileSync(SKOLE_PATH, jsonStr, "utf-8");
  console.log(`  Written to ${SKOLE_PATH} (${(jsonStr.length / 1024).toFixed(0)} KB)`);

  // Also update dataVersions.ts
  const dvPath = join(PROJECT_ROOT, "src", "lib", "dataVersions.ts");
  if (existsSync(dvPath)) {
    let dv = readFileSync(dvPath, "utf-8");
    const today = new Date().toISOString().slice(0, 10);
    // Update the overall.lastUpdated date
    dv = dv.replace(
      /lastUpdated:\s*"[\d-]+"/,
      `lastUpdated: "${today}"`
    );
    writeFileSync(dvPath, dv, "utf-8");
    console.log(`  Updated dataVersions.ts (lastUpdated: ${today})`);
  }

  console.log("\n  Done! Run `npm run build` to verify.\n");
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
