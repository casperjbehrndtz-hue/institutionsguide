#!/usr/bin/env node
/**
 * fetch-school-staff.mjs
 *
 * Fetches per-school staff metrics from the Uddannelsesstatistik API and
 * merges them into public/data/skole-data.json.
 *
 * Data fetched (2 API calls):
 *   1. ELEVERAARSVAERK — Elever pr lærerårsværk, Elever pr årsværk
 *   2. PERSOEX — Undervisningstid pr elev, Beregnet årsværk
 *
 * These metrics are available for BOTH folkeskoler AND friskoler, filling
 * a key data gap for friskole comparison.
 *
 * Usage:
 *   node scripts/fetch-school-staff.mjs
 *   node scripts/fetch-school-staff.mjs --dry-run
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
  console.error("ERROR: Set UDDANNELSESSTATISTIK_API_KEY environment variable");
  process.exit(1);
}

const DRY_RUN = process.argv.includes("--dry-run");

const API_BASE = "https://api.uddannelsesstatistik.dk/Api/v1";
const API_STATISTIK = `${API_BASE}/statistik`;
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
// Discover latest available school year for a dataset
// ---------------------------------------------------------------------------

async function findLatestYear(emne, underemne, nøgletal) {
  const data = await apiPost(API_STATISTIK, {
    område: "GS",
    emne,
    underemne,
    nøgletal: [nøgletal],
    detaljering: ["[Skoleår].[Skoleår]"],
    side: 1,
    side_størrelse: 100,
  });
  const years = data
    .map((r) => r["[Skoleår].[Skoleår].[Skoleår]"])
    .filter(Boolean)
    .sort();
  return years[years.length - 1];
}

// ---------------------------------------------------------------------------
// Fetch Elever pr årsværk (students per staff FTE)
// ---------------------------------------------------------------------------

async function fetchElevPrAarsvaerk(schoolYear) {
  console.log(`  Fetching Elever pr årsværk for ${schoolYear}...`);

  const data = await apiPost(API_STATISTIK, {
    område: "GS",
    emne: "PERS",
    underemne: "ELEVERAARSVAERK",
    nøgletal: ["Elever pr lærerårsværk", "Elever pr årsværk"],
    detaljering: [
      "[Institution].[Afdelingsnummer]",
      "[Institution].[Afdeling]",
      "[Skoleår].[Skoleår]",
    ],
    filtre: { "[Skoleår].[Skoleår]": [schoolYear] },
    side: 1,
    side_størrelse: 100000,
  });

  console.log(`    → ${data.length} schools`);
  return data;
}

// ---------------------------------------------------------------------------
// Fetch Undervisningstid pr elev (teaching hours per student)
// ---------------------------------------------------------------------------

async function fetchUndervisningstid(schoolYear) {
  console.log(`  Fetching Undervisningstid pr elev for ${schoolYear}...`);

  const data = await apiPost(API_STATISTIK, {
    område: "GS",
    emne: "PERS",
    underemne: "PERSOEX",
    nøgletal: ["Undervisningstid pr elev"],
    detaljering: [
      "[Institution].[Afdelingsnummer]",
      "[Institution].[Afdeling]",
      "[Skoleår].[Skoleår]",
    ],
    filtre: { "[Skoleår].[Skoleår]": [schoolYear] },
    side: 1,
    side_størrelse: 100000,
  });

  console.log(`    → ${data.length} schools`);
  return data;
}

// ---------------------------------------------------------------------------
// Merge into skole-data.json
// ---------------------------------------------------------------------------

function mergeData(skoleData, elevData, undervisData, elevYear, undervisYear) {
  const ID_KEY = "[Institution].[Afdelingsnummer].[Afdelingsnummer]";

  // Build lookup: id → staff metrics
  const elevMap = new Map();
  for (const row of elevData) {
    const id = row[ID_KEY];
    if (!id) continue;
    elevMap.set(id, {
      epl: parseDanish(row["Elever pr lærerårsværk"]),
      epa: parseDanish(row["Elever pr årsværk"]),
    });
  }

  const undervisMap = new Map();
  for (const row of undervisData) {
    const id = row[ID_KEY];
    if (!id) continue;
    undervisMap.set(id, {
      upe: parseDanish(row["Undervisningstid pr elev"]),
    });
  }

  // Merge into school entries
  let matched = 0;
  let newData = 0;

  for (const school of skoleData.s) {
    const id = school.id;
    const elev = elevMap.get(id);
    const undervis = undervisMap.get(id);

    if (!elev && !undervis) continue;
    matched++;

    if (!school.q) school.q = {};

    // Only add if we got new data that wasn't there before
    const hadData = school.q.epl != null;

    if (elev) {
      if (elev.epl != null) school.q.epl = elev.epl;
      if (elev.epa != null) school.q.epa = elev.epa;
    }
    if (undervis) {
      if (undervis.upe != null) school.q.upe = undervis.upe;
    }

    if (!hadData && (school.q.epl != null || school.q.upe != null)) newData++;
  }

  // Track data years
  if (!skoleData.dataYears) skoleData.dataYears = {};
  skoleData.dataYears.elevAarsvaerk = elevYear;
  skoleData.dataYears.undervisningstid = undervisYear;
  skoleData.g = new Date().toISOString();

  // Compute national averages for new metrics
  const allEpl = [];
  const allUpe = [];
  for (const school of skoleData.s) {
    if (school.q?.epl != null) allEpl.push(school.q.epl);
    if (school.q?.upe != null) allUpe.push(school.q.upe);
  }
  const avg = (arr) =>
    arr.length
      ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
      : null;

  if (!skoleData.avg) skoleData.avg = {};
  skoleData.avg.elevPrLaerer = avg(allEpl);
  skoleData.avg.undervisningstid = avg(allUpe);

  return {
    matched,
    newData,
    totalElev: elevMap.size,
    totalUndervis: undervisMap.size,
    avgEpl: avg(allEpl),
    avgUpe: avg(allUpe),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║   School Staff Data Pipeline             ║");
  console.log("║   Source: Uddannelsesstatistik.dk API     ║");
  console.log("╚══════════════════════════════════════════╝\n");

  if (DRY_RUN) console.log("  Mode: DRY RUN\n");

  // Load existing skole-data.json
  if (!existsSync(SKOLE_PATH)) {
    console.error(`ERROR: ${SKOLE_PATH} not found`);
    process.exit(1);
  }
  const skoleData = JSON.parse(readFileSync(SKOLE_PATH, "utf-8"));
  const folkCount = skoleData.s.filter((s) => s.t === "f").length;
  const friCount = skoleData.s.filter((s) => s.t === "p").length;
  console.log(
    `  Loaded ${skoleData.s.length} schools (${folkCount} folk + ${friCount} fri)`
  );

  // Discover latest years
  console.log("  Discovering latest available years...");
  const elevYear = await findLatestYear(
    "PERS",
    "ELEVERAARSVAERK",
    "Elever pr lærerårsværk"
  );
  await sleep(300);
  const undervisYear = await findLatestYear(
    "PERS",
    "PERSOEX",
    "Undervisningstid pr elev"
  );
  console.log(`    Elev/årsværk:      ${elevYear}`);
  console.log(`    Undervisningstid:  ${undervisYear}\n`);

  // Fetch data
  console.log("  Fetching from API...");
  const elevData = await fetchElevPrAarsvaerk(elevYear);
  await sleep(500);
  const undervisData = await fetchUndervisningstid(undervisYear);

  // Merge
  console.log("\n  Merging data...");
  const stats = mergeData(
    skoleData,
    elevData,
    undervisData,
    elevYear,
    undervisYear
  );

  console.log(`\n  ┌───────────────────────────────────┐`);
  console.log(`  │ Results                           │`);
  console.log(`  ├───────────────────────────────────┤`);
  console.log(
    `  │ API schools (elev/åv):  ${String(stats.totalElev).padStart(5)}    │`
  );
  console.log(
    `  │ API schools (undervis): ${String(stats.totalUndervis).padStart(5)}    │`
  );
  console.log(
    `  │ Matched to our data:    ${String(stats.matched).padStart(5)}    │`
  );
  console.log(
    `  │ Newly enriched:         ${String(stats.newData).padStart(5)}    │`
  );
  console.log(
    `  │ Avg elev/lærer:         ${String(stats.avgEpl).padStart(5)}    │`
  );
  console.log(
    `  │ Avg underv.tid/elev:    ${String(stats.avgUpe).padStart(5)}    │`
  );
  console.log(`  └───────────────────────────────────┘\n`);

  // Show friskole examples
  const friExamples = skoleData.s
    .filter((s) => s.t === "p" && s.q?.epl != null)
    .slice(0, 3);
  if (friExamples.length > 0) {
    console.log("  Friskole examples:");
    for (const s of friExamples) {
      console.log(
        `    ${s.n}: ${s.q.epl} elev/lærer, ${s.q.upe ?? "?"} timer/elev`
      );
    }
    console.log();
  }

  if (DRY_RUN) {
    console.log("  [DRY RUN] No files written.");
    return;
  }

  // Write updated file
  const jsonStr = JSON.stringify(skoleData);
  writeFileSync(SKOLE_PATH, jsonStr, "utf-8");
  console.log(
    `  Written to ${SKOLE_PATH} (${(jsonStr.length / 1024).toFixed(0)} KB)`
  );
  console.log("\n  Done!\n");
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
