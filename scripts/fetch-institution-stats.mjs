#!/usr/bin/env node
/**
 * fetch-institution-stats.mjs
 *
 * Fetches per-institution data from the BUVM Uddannelsesstatistik API:
 *   - Normering 0-2 år / 3-5 år (children per adult)
 *   - Staff education breakdown (pædagoger, pæd. assistenter, uden pæd. udd.)
 *   - Number of enrolled children
 *
 * Usage:
 *   UDDANNELSESSTATISTIK_API_KEY=<key> node scripts/fetch-institution-stats.mjs
 *   UDDANNELSESSTATISTIK_API_KEY=<key> node scripts/fetch-institution-stats.mjs --dry-run
 *   UDDANNELSESSTATISTIK_API_KEY=<key> node scripts/fetch-institution-stats.mjs --year 2023
 *   UDDANNELSESSTATISTIK_API_KEY=<key> node scripts/fetch-institution-stats.mjs --explore
 *
 * Environment variables:
 *   UDDANNELSESSTATISTIK_API_KEY  — Required. Bearer token for the API.
 *   SUPABASE_URL                  — Optional. If set with SUPABASE_SERVICE_KEY, upserts to Supabase.
 *   SUPABASE_SERVICE_KEY          — Optional. Service role key for Supabase.
 *
 * Output:
 *   public/data/institution-stats.json
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..");
const OUTPUT_PATH = join(PROJECT_ROOT, "public", "data", "institution-stats.json");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_KEY = process.env.UDDANNELSESSTATISTIK_API_KEY || process.env.BUVM_API_KEY;
if (!API_KEY) {
  console.error("ERROR: Set UDDANNELSESSTATISTIK_API_KEY (or BUVM_API_KEY) environment variable");
  process.exit(1);
}

const DRY_RUN = process.argv.includes("--dry-run");
const EXPLORE = process.argv.includes("--explore");
const yearIdx = process.argv.indexOf("--year");
const TARGET_YEAR = yearIdx !== -1 ? parseInt(process.argv[yearIdx + 1], 10) : 2024;

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
  return parseFloat(s.replace(",", "."));
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

async function apiGet(url) {
  const res = await fetch(url, { headers: HEADERS });
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
// Step 0: Explore available schemas (--explore mode)
// ---------------------------------------------------------------------------

async function explore() {
  console.log("\n=== Exploring API schemas ===\n");

  // Try to list available schemas for DAG area
  const explorations = [
    { label: "Skema for DAG (all)", body: { område: "DAG" } },
    {
      label: "Skema for DAG > Normering",
      body: { område: "DAG", emne: "DAG", underemne: "Normering" },
    },
    {
      label: "Skema for DAG > Personale",
      body: { område: "DAG", emne: "DAG", underemne: "Personale" },
    },
    {
      label: "Skema for DAG > Børn",
      body: { område: "DAG", emne: "DAG", underemne: "Børn" },
    },
    {
      label: "Skema for DAG > Institutioner",
      body: { område: "DAG", emne: "DAG", underemne: "Institutioner" },
    },
  ];

  for (const { label, body } of explorations) {
    console.log(`--- ${label} ---`);
    try {
      const data = await apiPost(API_SKEMA, body);
      console.log(JSON.stringify(data, null, 2).slice(0, 3000));
    } catch (err) {
      console.log(`  Error: ${err.message}`);
    }
    console.log();
    await sleep(500);
  }

  // Also try GET on api-docs
  console.log("--- GET /api-docs ---");
  try {
    const docs = await apiGet("https://api.uddannelsesstatistik.dk/api-docs");
    console.log(JSON.stringify(docs, null, 2).slice(0, 3000));
  } catch (err) {
    console.log(`  Error: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Step 1: Fetch normering at institution level
// ---------------------------------------------------------------------------

async function fetchNormeringInstitution() {
  console.log(`\nFetching institution-level normering for ${TARGET_YEAR}...`);

  // The API has two measure sets split at 2022/2023
  const measures =
    TARGET_YEAR <= 2022
      ? ["Normering institution til og med 2022"]
      : ["Normering institution fra 2023"];

  // We try multiple possible measure names since the API naming isn't always predictable
  const measureVariants = [
    measures,
    ["Normering institution"],
    ["Normering dagtilbud"],
    [
      TARGET_YEAR <= 2022
        ? "Normering til og med 2022"
        : "Normering fra 2023",
    ],
  ];

  const baseBody = {
    område: "DAG",
    emne: "DAG",
    underemne: "Normering",
    detaljering: [
      "[Institution].[Institution]",
      "[Pasningstilbud].[Pasningstilbud]",
      "[År].[År]",
    ],
    filtre: { "[År].[År]": [String(TARGET_YEAR)] },
    side: 1,
    side_størrelse: 100000,
  };

  for (const nøgletal of measureVariants) {
    const body = { ...baseBody, nøgletal };
    try {
      console.log(`  Trying nøgletal: ${JSON.stringify(nøgletal)}`);
      const data = await apiPost(API_STATISTIK, body);
      if (data && data.length > 0) {
        console.log(`  Got ${data.length} rows`);
        return { data, measures: nøgletal };
      }
      console.log(`  Got 0 rows, trying next variant...`);
    } catch (err) {
      console.log(`  Failed: ${err.message.slice(0, 200)}`);
    }
    await sleep(300);
  }

  // Fallback: try without institution detail, using the kommune measures
  // but with institution detaljering
  console.log("  Trying kommune measure names with institution detaljering...");
  const fallbackMeasures =
    TARGET_YEAR <= 2022
      ? ["Normering kommune til og med 2022"]
      : ["Normering kommune fra 2023"];

  try {
    const data = await apiPost(API_STATISTIK, {
      ...baseBody,
      nøgletal: fallbackMeasures,
    });
    if (data && data.length > 0) {
      console.log(`  Got ${data.length} rows (using kommune measures with institution detail)`);
      return { data, measures: fallbackMeasures };
    }
  } catch (err) {
    console.log(`  Failed: ${err.message.slice(0, 200)}`);
  }

  console.warn("  WARNING: Could not fetch institution-level normering.");
  return { data: [], measures: [] };
}

// ---------------------------------------------------------------------------
// Step 2: Fetch staff education (personaleuddannelse)
// ---------------------------------------------------------------------------

async function fetchPersonale() {
  console.log(`\nFetching staff education data for ${TARGET_YEAR}...`);

  const measureVariants = [
    [
      "Pædagoguddannede pct.",
      "Pædagogisk assistentuddannede pct.",
      "Uden pædagogisk uddannelse pct.",
    ],
    [
      "Andel pædagoguddannede",
      "Andel pædagogisk assistentuddannede",
      "Andel uden pædagogisk uddannelse",
    ],
    [
      "Pædagoger pct.",
      "Pædagogiske assistenter pct.",
    ],
    [
      "Andel pædagoger",
      "Andel pædagogiske assistenter",
    ],
  ];

  const baseBody = {
    område: "DAG",
    emne: "DAG",
    underemne: "Personale",
    detaljering: [
      "[Institution].[Institution]",
      "[År].[År]",
    ],
    filtre: { "[År].[År]": [String(TARGET_YEAR)] },
    side: 1,
    side_størrelse: 100000,
  };

  for (const nøgletal of measureVariants) {
    const body = { ...baseBody, nøgletal };
    try {
      console.log(`  Trying nøgletal: ${JSON.stringify(nøgletal)}`);
      const data = await apiPost(API_STATISTIK, body);
      if (data && data.length > 0) {
        console.log(`  Got ${data.length} rows`);
        return { data, measures: nøgletal };
      }
      console.log(`  Got 0 rows, trying next variant...`);
    } catch (err) {
      console.log(`  Failed: ${err.message.slice(0, 200)}`);
    }
    await sleep(300);
  }

  console.warn("  WARNING: Could not fetch staff education data.");
  return { data: [], measures: [] };
}

// ---------------------------------------------------------------------------
// Step 3: Fetch child enrollment counts
// ---------------------------------------------------------------------------

async function fetchBoernetal() {
  console.log(`\nFetching child enrollment counts for ${TARGET_YEAR}...`);

  const measureVariants = [
    ["Antal børn"],
    ["Antal indskrevne børn"],
    ["Børnetal"],
    ["Indskrevne børn"],
  ];

  const underemneVariants = ["Børn", "Børnetal", "Institutioner"];

  for (const underemne of underemneVariants) {
    for (const nøgletal of measureVariants) {
      const body = {
        område: "DAG",
        emne: "DAG",
        underemne,
        nøgletal,
        detaljering: [
          "[Institution].[Institution]",
          "[År].[År]",
        ],
        filtre: { "[År].[År]": [String(TARGET_YEAR)] },
        side: 1,
        side_størrelse: 100000,
      };
      try {
        console.log(`  Trying underemne=${underemne}, nøgletal: ${JSON.stringify(nøgletal)}`);
        const data = await apiPost(API_STATISTIK, body);
        if (data && data.length > 0) {
          console.log(`  Got ${data.length} rows`);
          return { data, measures: nøgletal };
        }
        console.log(`  Got 0 rows, trying next...`);
      } catch (err) {
        console.log(`  Failed: ${err.message.slice(0, 200)}`);
      }
      await sleep(300);
    }
  }

  console.warn("  WARNING: Could not fetch child enrollment data.");
  return { data: [], measures: [] };
}

// ---------------------------------------------------------------------------
// Step 4: Parse and merge data
// ---------------------------------------------------------------------------

function extractInstitutionId(row) {
  // The API returns institution IDs in various column formats
  // Try common patterns
  for (const key of Object.keys(row)) {
    if (key.includes("[Institution]")) {
      const val = row[key];
      if (typeof val === "string" && /^G\d+$/.test(val)) return val;
      // Sometimes the ID is in a separate field
      if (typeof val === "string" && val.includes("(G")) {
        const m = val.match(/\(G(\d+)\)/);
        if (m) return `G${m[1]}`;
      }
    }
  }
  // Check for inst_id or similar
  for (const key of Object.keys(row)) {
    const val = row[key];
    if (typeof val === "string" && /^G\d{4,6}$/.test(val)) return val;
  }
  return null;
}

function extractAgeGroup(row) {
  for (const key of Object.keys(row)) {
    if (key.includes("[Pasningstilbud]")) {
      const val = row[key];
      if (val === "0-2 år") return "0-2";
      if (val === "3-5 år") return "3-5";
      if (val === "Dagpleje") return "dagpleje";
    }
  }
  return null;
}

function buildInstitutionMap(normeringResult, personaleResult, boerneResult) {
  const institutions = {};

  function ensure(id) {
    if (!institutions[id]) {
      institutions[id] = {
        normering02: null,
        normering35: null,
        pctPaedagoger: null,
        pctPaedAssistenter: null,
        pctUdenPaedUdd: null,
        antalBoern: null,
      };
    }
    return institutions[id];
  }

  // Parse normering
  if (normeringResult.data.length > 0) {
    const measureName = normeringResult.measures[0];
    for (const row of normeringResult.data) {
      const id = extractInstitutionId(row);
      if (!id) continue;

      const ageGroup = extractAgeGroup(row);
      const value = parseDanish(row[measureName]);
      if (value === null) continue;

      const inst = ensure(id);
      if (ageGroup === "0-2") inst.normering02 = value;
      else if (ageGroup === "3-5") inst.normering35 = value;
    }
  }

  // Parse personale
  if (personaleResult.data.length > 0) {
    for (const row of personaleResult.data) {
      const id = extractInstitutionId(row);
      if (!id) continue;
      const inst = ensure(id);

      // Try each measure name from the result
      for (const measure of personaleResult.measures) {
        const val = parseDanish(row[measure]);
        if (val === null) continue;
        const ml = measure.toLowerCase();
        if (ml.includes("uden")) inst.pctUdenPaedUdd = val;
        else if (ml.includes("assistent")) inst.pctPaedAssistenter = val;
        else if (ml.includes("pædagog")) inst.pctPaedagoger = val;
      }
    }
  }

  // Parse børnetal
  if (boerneResult.data.length > 0) {
    for (const row of boerneResult.data) {
      const id = extractInstitutionId(row);
      if (!id) continue;
      const inst = ensure(id);

      for (const measure of boerneResult.measures) {
        const val = parseDanish(row[measure]);
        if (val !== null) inst.antalBoern = Math.round(val);
      }
    }
  }

  return institutions;
}

// ---------------------------------------------------------------------------
// Step 5: Match to our existing institution IDs
// ---------------------------------------------------------------------------

function loadOurInstitutionIds() {
  const ids = new Set();
  const dataFiles = [
    "boernehave-data.json",
    "vuggestue-data.json",
    "dagpleje-data.json",
    "sfo-data.json",
  ];

  for (const file of dataFiles) {
    const path = join(PROJECT_ROOT, "public", "data", file);
    if (!existsSync(path)) continue;
    try {
      const data = JSON.parse(readFileSync(path, "utf-8"));
      const items = data.i || data.institutions || data;
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item.id) ids.add(item.id);
        }
      }
    } catch (err) {
      console.warn(`  Could not read ${file}: ${err.message}`);
    }
  }
  return ids;
}

// ---------------------------------------------------------------------------
// Step 6: Supabase upsert
// ---------------------------------------------------------------------------

async function upsertToSupabase(institutions) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.log("\nSkipping Supabase upsert (SUPABASE_URL / SUPABASE_SERVICE_KEY not set)");
    return;
  }

  console.log("\nUpserting to Supabase table 'institution_stats'...");

  const rows = Object.entries(institutions).map(([id, stats]) => ({
    institution_id: id,
    year: TARGET_YEAR,
    normering_02: stats.normering02,
    normering_35: stats.normering35,
    pct_paedagoger: stats.pctPaedagoger,
    pct_paed_assistenter: stats.pctPaedAssistenter,
    pct_uden_paed_udd: stats.pctUdenPaedUdd,
    antal_boern: stats.antalBoern,
    updated_at: new Date().toISOString(),
  }));

  // Upsert in batches of 500
  const BATCH_SIZE = 500;
  let upserted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/institution_stats`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify(batch),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      console.error(`  Supabase error (batch ${i / BATCH_SIZE + 1}): ${res.status} ${text}`);
    } else {
      upserted += batch.length;
    }
  }

  console.log(`  Upserted ${upserted} rows to Supabase`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n=== Institution Stats Fetcher ===`);
  console.log(`Target year: ${TARGET_YEAR}`);
  if (DRY_RUN) console.log("Mode: DRY RUN (no files will be written)\n");

  // Explore mode: just dump API schema info and exit
  if (EXPLORE) {
    await explore();
    return;
  }

  // Load our institution IDs for matching
  const ourIds = loadOurInstitutionIds();
  console.log(`Loaded ${ourIds.size} institution IDs from existing data files`);

  // Fetch all three datasets
  const normeringResult = await fetchNormeringInstitution();
  const personaleResult = await fetchPersonale();
  const boerneResult = await fetchBoernetal();

  // Log sample rows for debugging
  for (const [name, result] of [
    ["Normering", normeringResult],
    ["Personale", personaleResult],
    ["Børnetal", boerneResult],
  ]) {
    if (result.data.length > 0) {
      console.log(`\nSample ${name} row:`);
      console.log(JSON.stringify(result.data[0], null, 2));
    }
  }

  // Build merged institution map
  const allInstitutions = buildInstitutionMap(normeringResult, personaleResult, boerneResult);
  const totalKeys = Object.keys(allInstitutions).length;
  console.log(`\nMerged data for ${totalKeys} institutions from API`);

  // Filter to only institutions we know about
  const matched = {};
  let matchCount = 0;
  for (const [id, stats] of Object.entries(allInstitutions)) {
    if (ourIds.has(id)) {
      matched[id] = stats;
      matchCount++;
    }
  }
  console.log(`Matched ${matchCount} institutions to our data (${ourIds.size} known IDs)`);

  // Also include unmatched for completeness
  const unmatched = totalKeys - matchCount;
  if (unmatched > 0) {
    console.log(`  ${unmatched} API institutions not in our dataset (included anyway)`);
  }

  // Use all institutions in output (users may want the full set)
  const output = {
    year: TARGET_YEAR,
    fetchedAt: new Date().toISOString(),
    matchedCount: matchCount,
    totalCount: totalKeys,
    institutions: allInstitutions,
  };

  // Stats summary
  const withNorm02 = Object.values(allInstitutions).filter((i) => i.normering02 !== null).length;
  const withNorm35 = Object.values(allInstitutions).filter((i) => i.normering35 !== null).length;
  const withPaed = Object.values(allInstitutions).filter((i) => i.pctPaedagoger !== null).length;
  const withBoern = Object.values(allInstitutions).filter((i) => i.antalBoern !== null).length;

  console.log(`\nData coverage:`);
  console.log(`  Normering 0-2: ${withNorm02} institutions`);
  console.log(`  Normering 3-5: ${withNorm35} institutions`);
  console.log(`  Staff education: ${withPaed} institutions`);
  console.log(`  Child count: ${withBoern} institutions`);

  if (DRY_RUN) {
    console.log("\n[DRY RUN] Would write to:");
    console.log(`  ${OUTPUT_PATH}`);
    console.log(`  (${JSON.stringify(output).length} bytes)`);
    if (process.env.SUPABASE_URL) {
      console.log(`  + Supabase table 'institution_stats'`);
    }
    // Print a few sample entries
    const sampleIds = Object.keys(allInstitutions).slice(0, 3);
    if (sampleIds.length > 0) {
      console.log("\nSample output entries:");
      for (const id of sampleIds) {
        console.log(`  ${id}: ${JSON.stringify(allInstitutions[id])}`);
      }
    }
    return;
  }

  // Write JSON
  const outputDir = dirname(OUTPUT_PATH);
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\nWritten to ${OUTPUT_PATH}`);

  // Supabase upsert
  await upsertToSupabase(allInstitutions);

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
