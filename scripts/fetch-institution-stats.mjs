#!/usr/bin/env node
/**
 * fetch-institution-stats.mjs
 *
 * Fetches per-kommune data from the BUVM Uddannelsesstatistik API and maps it
 * to individual institutions:
 *   - Normering 0-2 år / 3-5 år / dagpleje (children per adult)
 *   - Staff education breakdown (pædagog, pæd. assistent, ingen pæd. udd.)
 *   - Number of enrolled children (børn ved nedslag, helårsbørn)
 *
 * The API only provides kommune-level data. Each institution inherits its
 * kommune's stats based on its pasningstilbud type.
 *
 * Usage:
 *   node scripts/fetch-institution-stats.mjs
 *   node scripts/fetch-institution-stats.mjs --dry-run
 *   node scripts/fetch-institution-stats.mjs --year 2023
 *   node scripts/fetch-institution-stats.mjs --explore
 *
 * Environment:
 *   UDDANNELSESSTATISTIK_API_KEY  — Required (or set in .env file).
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..");
const OUTPUT_PATH = join(PROJECT_ROOT, "public", "data", "institution-stats.json");

// Load .env manually (no dotenv dependency)
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
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch (_) {}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_KEY = process.env.UDDANNELSESSTATISTIK_API_KEY || process.env.BUVM_API_KEY;
if (!API_KEY) {
  console.error("ERROR: Set UDDANNELSESSTATISTIK_API_KEY environment variable (or .env file)");
  process.exit(1);
}

const DRY_RUN = process.argv.includes("--dry-run");
const EXPLORE = process.argv.includes("--explore");
const yearIdx = process.argv.indexOf("--year");
// 2023 is the latest year available in the API as of 2026
const TARGET_YEAR = yearIdx !== -1 ? parseInt(process.argv[yearIdx + 1], 10) : 2023;

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
  // Danish number formatting: dot = thousands separator, comma = decimal
  // Examples: "13.482" = 13482, "3,1" = 3.1, "50,4 %" = 50.4
  let cleaned = s.replace(/%/g, "").replace(/\s/g, "");
  // Remove thousands separator dots (digits.digits pattern where right side has 3 digits)
  // E.g. "13.482" -> "13482", but "3,1" stays as is
  cleaned = cleaned.replace(/\.(\d{3})/g, "$1");
  // Convert decimal comma to dot
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
    throw new Error(`API ${res.status} at ${url}: ${text}`);
  }
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Explore mode: dump available schemas
// ---------------------------------------------------------------------------

async function explore() {
  console.log("\n=== Exploring API schemas ===\n");

  // Step 1: List underemner for DAG
  console.log("--- Underemner for DAG ---");
  const underemner = await apiPost(API_SKEMA, { område: "DAG", emne: "DAG" });
  console.log(JSON.stringify(underemner, null, 2));

  // Step 2: For each underemne, list detaljer and nøgletal
  for (const ue of underemner) {
    console.log(`\n--- Schema for underemne: ${ue.ID} (${ue.Name}) ---`);
    try {
      const schema = await apiPost(API_SKEMA, {
        område: "DAG",
        emne: "DAG",
        underemne: ue.ID,
      });
      console.log("Detaljer:", JSON.stringify(schema.detaljer, null, 2));
      console.log("Nøgletal:", JSON.stringify(schema.nøgletal, null, 2));
      console.log("Rapporter:", schema.rapporter?.map((r) => `${r.id}: ${r.titel}`));
    } catch (err) {
      console.log(`  Error: ${err.message}`);
    }
    await sleep(300);
  }

  // Step 3: Check available years
  console.log("\n--- Available years (Normering) ---");
  try {
    const years = await apiPost(API_SKEMA, {
      område: "DAG",
      emne: "DAG",
      underemne: "Nrm",
      detalje: "[År].[År]",
    });
    console.log(JSON.stringify(years));
  } catch (err) {
    console.log(`  Error: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Fetch normering at kommune level
// ---------------------------------------------------------------------------

async function fetchNormering() {
  console.log(`\nFetching kommune-level normering for ${TARGET_YEAR}...`);

  // The API has two measure sets split at 2022/2023
  const measureName =
    TARGET_YEAR <= 2022
      ? "Normering kommune til og med 2022"
      : "Normering kommune fra 2023";

  const body = {
    område: "DAG",
    emne: "DAG",
    underemne: "Nrm",
    nøgletal: [measureName],
    detaljering: [
      "[Kommune].[Navn]",
      "[Pasningstilbud].[Pasningstilbud]",
      "[År].[År]",
    ],
    filtre: { "[År].[År]": [String(TARGET_YEAR)] },
    side: 1,
    side_størrelse: 100000,
  };

  try {
    const data = await apiPost(API_STATISTIK, body);
    console.log(`  Got ${data.length} rows`);
    return { data, measureName };
  } catch (err) {
    console.error(`  Failed: ${err.message}`);
    return { data: [], measureName };
  }
}

// ---------------------------------------------------------------------------
// Fetch staff education (personale uddannelsessammensætning)
// ---------------------------------------------------------------------------

async function fetchPersonale() {
  console.log(`\nFetching staff education data for ${TARGET_YEAR}...`);

  const body = {
    område: "DAG",
    emne: "DAG",
    underemne: "Pers",
    nøgletal: ["Personale uddannelse (andel)"],
    detaljering: [
      "[Kommune].[Navn]",
      "[Uddannelsessammensætning].[Uddannelsessammensætning]",
      "[Dagtilbudstype].[Dagtilbudstype]",
      "[År].[År]",
    ],
    filtre: { "[År].[År]": [String(TARGET_YEAR)] },
    side: 1,
    side_størrelse: 100000,
  };

  try {
    const data = await apiPost(API_STATISTIK, body);
    console.log(`  Got ${data.length} rows`);
    return { data };
  } catch (err) {
    console.error(`  Failed: ${err.message}`);
    return { data: [] };
  }
}

// ---------------------------------------------------------------------------
// Fetch child enrollment counts
// ---------------------------------------------------------------------------

async function fetchBoern() {
  console.log(`\nFetching child enrollment counts for ${TARGET_YEAR}...`);

  const body = {
    område: "DAG",
    emne: "DAG",
    underemne: "Brn",
    nøgletal: ["Børn ved nedslag (antal)", "Helårsbørn"],
    detaljering: [
      "[Kommune].[Navn]",
      "[Pasningstilbud].[Pasningstilbud]",
      "[År].[År]",
    ],
    filtre: { "[År].[År]": [String(TARGET_YEAR)] },
    side: 1,
    side_størrelse: 100000,
  };

  try {
    const data = await apiPost(API_STATISTIK, body);
    console.log(`  Got ${data.length} rows`);
    return { data };
  } catch (err) {
    console.error(`  Failed: ${err.message}`);
    return { data: [] };
  }
}

// ---------------------------------------------------------------------------
// Build kommune-level stats map
// ---------------------------------------------------------------------------

function buildKommuneMap(normeringResult, personaleResult, boernResult) {
  // Key: kommune name -> { normering: {0-2, 3-5, dagpleje}, personale: {...}, boern: {...} }
  const kommuner = {};

  function ensure(kommune) {
    if (!kommuner[kommune]) {
      kommuner[kommune] = {
        normering02: null,
        normering35: null,
        normeringDagpleje: null,
        pctPaedagog: null,
        pctPaedAssistent: null,
        pctAndenPaedUdd: null,
        pctIngenPaedUdd: null,
        pctStuderende: null,
        boernVedNedslag02: null,
        boernVedNedslag35: null,
        boernVedNedslagDagpleje: null,
        helaarBoern02: null,
        helaarBoern35: null,
        helaarBoernDagpleje: null,
      };
    }
    return kommuner[kommune];
  }

  // --- Normering ---
  const KOM_KEY = "[Kommune].[Navn].[Navn]";
  const PAS_KEY = "[Pasningstilbud].[Pasningstilbud].[Pasningstilbud]";

  for (const row of normeringResult.data) {
    const kommune = row[KOM_KEY];
    const pasning = row[PAS_KEY];
    const val = parseDanish(row[normeringResult.measureName]);
    if (!kommune || val === null) continue;

    const k = ensure(kommune);
    if (pasning === "0-2 år") k.normering02 = val;
    else if (pasning === "3-5 år") k.normering35 = val;
    else if (pasning === "Dagpleje") k.normeringDagpleje = val;
  }

  // --- Personale ---
  const UDD_KEY =
    "[Uddannelsessammensætning].[Uddannelsessammensætning].[Uddannelsessammensætning]";
  const DAG_TYPE_KEY = "[Dagtilbudstype].[Dagtilbudstype].[Dagtilbudstype]";
  const ANDEL_KEY = "Personale uddannelse (andel)";

  for (const row of personaleResult.data) {
    const kommune = row[KOM_KEY];
    const uddType = row[UDD_KEY];
    const dagType = row[DAG_TYPE_KEY];
    const val = parseDanish(row[ANDEL_KEY]);
    if (!kommune || val === null) continue;

    // Only use Daginstitution type (not Dagpleje for personale)
    if (dagType !== "Daginstitution") continue;

    const k = ensure(kommune);
    if (uddType === "Pædagog") k.pctPaedagog = val;
    else if (uddType === "Pædagogisk assistent") k.pctPaedAssistent = val;
    else if (uddType === "Anden pædagogisk uddannelse") k.pctAndenPaedUdd = val;
    else if (uddType === "Ingen pædagogisk uddannelse") k.pctIngenPaedUdd = val;
    else if (uddType === "Pædagogstuderende og PAU-elever") k.pctStuderende = val;
  }

  // --- Børn ---
  const BOERN_NEDSLAG_KEY = "Børn ved nedslag (antal)";
  const HELAAR_KEY = "Helårsbørn";

  for (const row of boernResult.data) {
    const kommune = row[KOM_KEY];
    const pasning = row[PAS_KEY];
    const nedslag = parseDanish(row[BOERN_NEDSLAG_KEY]);
    const helaar = parseDanish(row[HELAAR_KEY]);
    if (!kommune) continue;

    const k = ensure(kommune);
    if (pasning === "0-2 år") {
      if (nedslag !== null) k.boernVedNedslag02 = Math.round(nedslag);
      if (helaar !== null) k.helaarBoern02 = Math.round(helaar);
    } else if (pasning === "3-5 år") {
      if (nedslag !== null) k.boernVedNedslag35 = Math.round(nedslag);
      if (helaar !== null) k.helaarBoern35 = Math.round(helaar);
    } else if (pasning === "Dagpleje") {
      if (nedslag !== null) k.boernVedNedslagDagpleje = Math.round(nedslag);
      if (helaar !== null) k.helaarBoernDagpleje = Math.round(helaar);
    }
  }

  return kommuner;
}

// ---------------------------------------------------------------------------
// Map kommune stats to individual institutions
// ---------------------------------------------------------------------------

function mapToInstitutions(kommuneMap) {
  const institutions = {};

  const dataFiles = [
    { file: "boernehave-data.json", label: "børnehave" },
    { file: "vuggestue-data.json", label: "vuggestue" },
    { file: "dagpleje-data.json", label: "dagpleje" },
    { file: "sfo-data.json", label: "sfo" },
  ];

  let totalLoaded = 0;
  let totalMatched = 0;

  for (const { file, label } of dataFiles) {
    const path = join(PROJECT_ROOT, "public", "data", file);
    if (!existsSync(path)) {
      console.log(`  Skipping ${file} (not found)`);
      continue;
    }

    let items;
    try {
      const raw = JSON.parse(readFileSync(path, "utf-8"));
      items = raw.i || raw.institutions || (Array.isArray(raw) ? raw : []);
    } catch (err) {
      console.warn(`  Could not read ${file}: ${err.message}`);
      continue;
    }

    console.log(`  ${file}: ${items.length} institutions`);
    totalLoaded += items.length;

    for (const inst of items) {
      const id = inst.id;
      const kommune = inst.m; // kommune name
      const tp = inst.tp; // type: aldersintegreret, vuggestue, børnehave, dagpleje, etc.
      if (!id || !kommune) continue;

      const kStats = kommuneMap[kommune];
      if (!kStats) continue;

      totalMatched++;

      // Determine which normering applies based on institution type
      let normering = null;
      let boernNedslag = null;
      let helaarBoern = null;

      if (tp === "dagpleje") {
        normering = kStats.normeringDagpleje;
        boernNedslag = kStats.boernVedNedslagDagpleje;
        helaarBoern = kStats.helaarBoernDagpleje;
      } else if (tp === "vuggestue") {
        normering = kStats.normering02;
        boernNedslag = kStats.boernVedNedslag02;
        helaarBoern = kStats.helaarBoern02;
      } else if (tp === "børnehave") {
        normering = kStats.normering35;
        boernNedslag = kStats.boernVedNedslag35;
        helaarBoern = kStats.helaarBoern35;
      } else if (tp === "aldersintegreret") {
        // Combined institutions serve both age groups - use the average
        if (kStats.normering02 !== null && kStats.normering35 !== null) {
          normering = Math.round(((kStats.normering02 + kStats.normering35) / 2) * 10) / 10;
        } else {
          normering = kStats.normering02 ?? kStats.normering35;
        }
        // For children, sum both age groups
        if (kStats.boernVedNedslag02 !== null && kStats.boernVedNedslag35 !== null) {
          boernNedslag = kStats.boernVedNedslag02 + kStats.boernVedNedslag35;
        }
        if (kStats.helaarBoern02 !== null && kStats.helaarBoern35 !== null) {
          helaarBoern = kStats.helaarBoern02 + kStats.helaarBoern35;
        }
      } else {
        // SFO or unknown - just use 3-5 normering as closest
        normering = kStats.normering35;
        boernNedslag = kStats.boernVedNedslag35;
        helaarBoern = kStats.helaarBoern35;
      }

      institutions[id] = {
        kommune,
        type: tp,
        normering,
        normering02: kStats.normering02,
        normering35: kStats.normering35,
        pctPaedagog: kStats.pctPaedagog,
        pctPaedAssistent: kStats.pctPaedAssistent,
        pctAndenPaedUdd: kStats.pctAndenPaedUdd,
        pctIngenPaedUdd: kStats.pctIngenPaedUdd,
        boernVedNedslag: boernNedslag,
        helaarBoern: helaarBoern,
      };
    }
  }

  console.log(`\n  Loaded ${totalLoaded} institutions, matched ${totalMatched} to kommune data`);
  return institutions;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n=== Institution Stats Fetcher ===`);
  console.log(`Target year: ${TARGET_YEAR}`);
  console.log(`API: ${API_BASE}`);
  if (DRY_RUN) console.log("Mode: DRY RUN (no files will be written)\n");

  if (EXPLORE) {
    await explore();
    return;
  }

  // Fetch all three datasets from the API
  const normeringResult = await fetchNormering();
  await sleep(300);
  const personaleResult = await fetchPersonale();
  await sleep(300);
  const boernResult = await fetchBoern();

  // Log sample rows
  for (const [name, result] of [
    ["Normering", normeringResult],
    ["Personale", personaleResult],
    ["Børn", boernResult],
  ]) {
    const data = result.data;
    if (data.length > 0) {
      console.log(`\nSample ${name} row:`);
      console.log(JSON.stringify(data[0], null, 2));
    }
  }

  // Build kommune-level stats map
  const kommuneMap = buildKommuneMap(normeringResult, personaleResult, boernResult);
  const kommuneCount = Object.keys(kommuneMap).length;
  console.log(`\nBuilt stats for ${kommuneCount} kommuner`);

  // Show a sample kommune
  const sampleKommune = Object.keys(kommuneMap)[0];
  if (sampleKommune) {
    console.log(`Sample kommune (${sampleKommune}):`);
    console.log(JSON.stringify(kommuneMap[sampleKommune], null, 2));
  }

  // Map to individual institutions
  console.log("\nMapping kommune stats to institutions...");
  const institutions = mapToInstitutions(kommuneMap);
  const instCount = Object.keys(institutions).length;

  // Coverage stats
  const withNorm = Object.values(institutions).filter((i) => i.normering !== null).length;
  const withPaed = Object.values(institutions).filter((i) => i.pctPaedagog !== null).length;
  const withBoern = Object.values(institutions).filter((i) => i.boernVedNedslag !== null).length;

  console.log(`\nData coverage (${instCount} institutions):`);
  console.log(`  Normering: ${withNorm} (${((withNorm / instCount) * 100).toFixed(1)}%)`);
  console.log(`  Staff education: ${withPaed} (${((withPaed / instCount) * 100).toFixed(1)}%)`);
  console.log(`  Child count: ${withBoern} (${((withBoern / instCount) * 100).toFixed(1)}%)`);

  const output = {
    year: TARGET_YEAR,
    fetchedAt: new Date().toISOString(),
    source: "Uddannelsesstatistik.dk API (kommune-level)",
    kommuneCount,
    institutionCount: instCount,
    kommuner: kommuneMap,
    institutions,
  };

  const jsonStr = JSON.stringify(output, null, 2);

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] Would write ${jsonStr.length} bytes to:`);
    console.log(`  ${OUTPUT_PATH}`);
    // Sample entries
    const sampleIds = Object.keys(institutions).slice(0, 3);
    if (sampleIds.length > 0) {
      console.log("\nSample institution entries:");
      for (const id of sampleIds) {
        console.log(`  ${id}: ${JSON.stringify(institutions[id])}`);
      }
    }
    return;
  }

  // Write JSON
  const outputDir = dirname(OUTPUT_PATH);
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
  writeFileSync(OUTPUT_PATH, jsonStr, "utf-8");
  console.log(`\nWritten to ${OUTPUT_PATH} (${(jsonStr.length / 1024).toFixed(0)} KB)`);

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
