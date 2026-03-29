#!/usr/bin/env node
/**
 * fetch-dst-kommune-stats.mjs
 *
 * Fetches kommune-level childcare statistics from Danmarks Statistik's
 * free API (no authentication needed):
 *
 *   1. RES88  — Takster (yearly prices for dagpleje, vuggestue, boernehave, SFO)
 *   2. BOERN1 — Paedagogisk personale (staff by category/education)
 *   3. BOERN2 — Indskrevne boern (enrolled children by age group)
 *
 * Usage:
 *   node scripts/fetch-dst-kommune-stats.mjs
 *   node scripts/fetch-dst-kommune-stats.mjs --dry-run
 *   node scripts/fetch-dst-kommune-stats.mjs --supabase
 *
 * Output:
 *   public/data/kommune-stats.json
 *
 * Source: https://api.statbank.dk/v1/
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..");
const OUTPUT_PATH = join(PROJECT_ROOT, "public", "data", "kommune-stats.json");

const DST_API = "https://api.statbank.dk/v1/data";

const DRY_RUN = process.argv.includes("--dry-run");
const UPSERT_SUPABASE = process.argv.includes("--supabase");

// ---------------------------------------------------------------------------
// RES88 — Takster
// ---------------------------------------------------------------------------
// Variable INSTITUTION codes for the price types we want:
//   F47 = Kommunal dagpleje (0-2 år) inklusiv frokost
//   F03 = Vuggestue (0-2 år)
//   F50 = Børnehave (3-5 år)
//   F55 = Skolefritidsordninger (6-9 år)  (SFO)

const RES88_INSTITUTION_CODES = ["F47", "F03", "F50", "F55"];
const RES88_INSTITUTION_MAP = {
  F47: "dagplejeTakst",
  F03: "vuggestueTakst",
  F50: "boernehaveTakst",
  F55: "sfoTakst",
};

// ---------------------------------------------------------------------------
// BOERN1 — Personale
// ---------------------------------------------------------------------------
// OVERENS (stillingskategori):
//   TOT = I alt
//   7   = Pædagog
//   920 = Pædagogmedhjælper (2019-)
//   930 = Pædagogisk assistent (2019-)
// We fetch TOT + specific categories, then calculate percentages.

const BOERN1_STAFF_CODES = ["TOT", "7", "920", "930"];
const BOERN1_STAFF_MAP = {
  TOT: "total",
  "7": "paedagoger",
  "920": "medhjaelpere",
  "930": "assistenter",
};

// ---------------------------------------------------------------------------
// BOERN2 — Indskrevne børn
// ---------------------------------------------------------------------------
// PASKAT (pasningstilbud):
//   1 = Dagpleje
//   2 = Daginstitution 0-2 år
//   3 = Daginstitution 3-5 år

const BOERN2_CODES = ["1", "2", "3"];
const BOERN2_MAP = {
  "1": "antalDagpleje",
  "2": "antalBoern02",
  "3": "antalBoern35",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Post JSON to DST API and return parsed response */
async function dstFetch(body) {
  const res = await fetch(DST_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DST API ${res.status}: ${text.slice(0, 500)}`);
  }
  return res.json();
}

/**
 * Parse JSONSTAT format from DST.
 * Returns an array of flat row objects with dimension labels + value.
 */
function parseJsonStat(jsonstat) {
  const ds = jsonstat.dataset ?? jsonstat;
  const dims = ds.dimension;
  // DST puts id/size inside dimension, not at dataset level
  const dimIds = dims.id ?? ds.id;
  const sizes = dims.size ?? ds.size;
  const values = ds.value; // flat array of values

  // Build label arrays for each dimension (in order)
  const dimLabels = dimIds.map((id) => {
    const cat = dims[id].category;
    const indexMap = cat.index; // code -> position  OR  array
    const labelMap = cat.label; // code -> label
    // Build ordered array of { code, label }
    let entries;
    if (Array.isArray(indexMap)) {
      entries = indexMap.map((code) => ({ code, label: labelMap[code] ?? code }));
    } else {
      entries = Object.entries(indexMap)
        .sort((a, b) => a[1] - b[1])
        .map(([code]) => ({ code, label: labelMap[code] ?? code }));
    }
    return { id, entries };
  });

  // Iterate all combinations
  const rows = [];
  const totalCells = values instanceof Array ? values.length : Object.keys(values).length;

  for (let flatIdx = 0; flatIdx < totalCells; flatIdx++) {
    const val = values instanceof Array ? values[flatIdx] : values[String(flatIdx)];
    if (val === null || val === undefined) continue;

    // Decompose flat index into per-dimension indices
    const row = { value: val };
    let remainder = flatIdx;
    for (let d = dimIds.length - 1; d >= 0; d--) {
      const dimSize = sizes[d];
      const idx = remainder % dimSize;
      remainder = Math.floor(remainder / dimSize);
      const entry = dimLabels[d].entries[idx];
      row[dimLabels[d].id + "_code"] = entry.code;
      row[dimLabels[d].id + "_label"] = entry.label;
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Find the latest year with actual data in a JSONSTAT response.
 * Falls back to the requested year.
 */
function detectLatestYear(rows, tidKey = "Tid") {
  const codeKey = tidKey + "_code";
  const years = [...new Set(rows.map((r) => r[codeKey]))].map(Number).filter(Boolean);
  return Math.max(...years);
}

// ---------------------------------------------------------------------------
// Region codes to skip (we only want actual kommuner, not aggregates)
// ---------------------------------------------------------------------------
const SKIP_CODES = new Set([
  "000",  // Hele landet
  "084",  // Region Hovedstaden
  "085",  // Region Sjælland
  "083",  // Region Syddanmark
  "081",  // Region Midtjylland (if present)
  "082",  // Region Nordjylland (if present)
]);

function isKommune(code) {
  return !SKIP_CODES.has(code);
}

// ---------------------------------------------------------------------------
// Fetch each table
// ---------------------------------------------------------------------------

async function fetchRES88(year) {
  console.log(`[RES88] Fetching takster for ${year}...`);
  const body = {
    table: "RES88",
    format: "JSONSTAT",
    variables: [
      { code: "OMRÅDE", values: ["*"] },
      { code: "INSTITUTION", values: RES88_INSTITUTION_CODES },
      { code: "Tid", values: [String(year)] },
    ],
  };

  const raw = await dstFetch(body);
  const rows = parseJsonStat(raw);
  console.log(`[RES88] Parsed ${rows.length} cells`);

  // Group by kommune
  const result = {};
  for (const r of rows) {
    const code = r.OMRÅDE_code;
    if (!isKommune(code)) continue;
    const name = r.OMRÅDE_label;
    if (!result[name]) result[name] = { code };
    const field = RES88_INSTITUTION_MAP[r.INSTITUTION_code];
    if (field) {
      result[name][field] = r.value;
    }
  }

  console.log(`[RES88] Got takster for ${Object.keys(result).length} kommuner`);
  return result;
}

async function fetchBOERN1(year) {
  console.log(`[BOERN1] Fetching personale for ${year}...`);
  const body = {
    table: "BOERN1",
    format: "JSONSTAT",
    variables: [
      { code: "OMRÅDE", values: ["*"] },
      { code: "OVERENS", values: BOERN1_STAFF_CODES },
      { code: "UDDANNELSE", values: ["TOT"] },
      { code: "Tid", values: [String(year)] },
    ],
  };

  const raw = await dstFetch(body);
  const rows = parseJsonStat(raw);
  console.log(`[BOERN1] Parsed ${rows.length} cells`);

  // Group by kommune
  const result = {};
  for (const r of rows) {
    const code = r.OMRÅDE_code;
    if (!isKommune(code)) continue;
    const name = r.OMRÅDE_label;
    if (!result[name]) result[name] = {};
    const field = BOERN1_STAFF_MAP[r.OVERENS_code];
    if (field) {
      result[name][field] = r.value;
    }
  }

  // Calculate percentages
  for (const [name, d] of Object.entries(result)) {
    const total = d.total || 0;
    if (total > 0) {
      d.pctPaedagoger = Math.round((d.paedagoger / total) * 1000) / 10;
      d.pctMedhjaelpere = Math.round((d.medhjaelpere / total) * 1000) / 10;
    } else {
      d.pctPaedagoger = null;
      d.pctMedhjaelpere = null;
    }
  }

  console.log(`[BOERN1] Got personale for ${Object.keys(result).length} kommuner`);
  return result;
}

async function fetchBOERN2(year) {
  console.log(`[BOERN2] Fetching indskrevne boern for ${year}...`);
  const body = {
    table: "BOERN2",
    format: "JSONSTAT",
    variables: [
      { code: "BLSTKOM", values: ["*"] },
      { code: "PASKAT", values: BOERN2_CODES },
      { code: "Tid", values: [String(year)] },
    ],
  };

  const raw = await dstFetch(body);
  const rows = parseJsonStat(raw);
  console.log(`[BOERN2] Parsed ${rows.length} cells`);

  // Group by kommune
  const result = {};
  for (const r of rows) {
    const code = r.BLSTKOM_code;
    if (!isKommune(code)) continue;
    const name = r.BLSTKOM_label;
    if (!result[name]) result[name] = {};
    const field = BOERN2_MAP[r.PASKAT_code];
    if (field) {
      result[name][field] = r.value;
    }
  }

  console.log(`[BOERN2] Got boernetal for ${Object.keys(result).length} kommuner`);
  return result;
}

// ---------------------------------------------------------------------------
// Supabase upsert (optional)
// ---------------------------------------------------------------------------

async function upsertToSupabase(output) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — skipping upsert");
    return;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const rows = Object.entries(output.kommuner).map(([name, data]) => ({
    kommune_name: name,
    kommune_code: data.code,
    year: output.year,
    dagpleje_takst: data.dagplejeTakst ?? null,
    vuggestue_takst: data.vuggestueTakst ?? null,
    boernehave_takst: data.boernehaveTakst ?? null,
    sfo_takst: data.sfoTakst ?? null,
    pct_paedagoger: data.pctPaedagoger ?? null,
    pct_medhjaelpere: data.pctMedhjaelpere ?? null,
    antal_dagpleje: data.antalDagpleje ?? null,
    antal_boern_0_2: data.antalBoern02 ?? null,
    antal_boern_3_5: data.antalBoern35 ?? null,
    fetched_at: output.fetchedAt,
  }));

  console.log(`[Supabase] Upserting ${rows.length} rows to kommune_stats...`);

  // Upsert in batches of 50
  const BATCH_SIZE = 50;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("kommune_stats")
      .upsert(batch, { onConflict: "kommune_code,year" });

    if (error) {
      console.error(`[Supabase] Upsert error at batch ${i}:`, error.message);
    }
  }

  console.log(`[Supabase] Done.`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n--- DST Kommune Stats Fetcher ---\n");

  if (DRY_RUN) {
    console.log("DRY RUN: will fetch data but not write files\n");
  }

  // RES88 has 2025 data, BOERN1/BOERN2 have 2024 as latest
  // We use the latest available year for each table
  const TAKST_YEAR = 2025;
  const BOERN_YEAR = 2024;

  // Fetch all three in parallel
  const [takster, personale, boern] = await Promise.all([
    fetchRES88(TAKST_YEAR),
    fetchBOERN1(BOERN_YEAR),
    fetchBOERN2(BOERN_YEAR),
  ]);

  // Combine into unified structure
  // Use all kommune names from takster as the base set
  const allNames = new Set([
    ...Object.keys(takster),
    ...Object.keys(personale),
    ...Object.keys(boern),
  ]);

  const kommuner = {};
  for (const name of [...allNames].sort()) {
    const t = takster[name] || {};
    const p = personale[name] || {};
    const b = boern[name] || {};

    kommuner[name] = {
      code: t.code || null,
      dagplejeTakst: t.dagplejeTakst ?? null,
      vuggestueTakst: t.vuggestueTakst ?? null,
      boernehaveTakst: t.boernehaveTakst ?? null,
      sfoTakst: t.sfoTakst ?? null,
      pctPaedagoger: p.pctPaedagoger ?? null,
      pctMedhjaelpere: p.pctMedhjaelpere ?? null,
      antalDagpleje: b.antalDagpleje ?? null,
      antalBoern02: b.antalBoern02 ?? null,
      antalBoern35: b.antalBoern35 ?? null,
    };
  }

  const output = {
    takstYear: TAKST_YEAR,
    boernYear: BOERN_YEAR,
    fetchedAt: new Date().toISOString(),
    kommuner,
  };

  // Print sample
  const sample = kommuner["København"];
  if (sample) {
    console.log("\nSample — København:");
    console.log(`  Dagpleje takst: ${sample.dagplejeTakst} kr/år`);
    console.log(`  Vuggestue takst: ${sample.vuggestueTakst} kr/år`);
    console.log(`  Børnehave takst: ${sample.boernehaveTakst} kr/år`);
    console.log(`  SFO takst: ${sample.sfoTakst} kr/år`);
    console.log(`  Pædagoger: ${sample.pctPaedagoger}%`);
    console.log(`  Medhjælpere: ${sample.pctMedhjaelpere}%`);
    console.log(`  Børn 0-2: ${sample.antalBoern02}`);
    console.log(`  Børn 3-5: ${sample.antalBoern35}`);
  }

  console.log(`\nTotal kommuner: ${Object.keys(kommuner).length}`);

  if (DRY_RUN) {
    console.log("\nDRY RUN — skipping file write and Supabase upsert");
    console.log("Would write to:", OUTPUT_PATH);
    return;
  }

  // Ensure output directory exists
  const outputDir = dirname(OUTPUT_PATH);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\nSaved to: ${OUTPUT_PATH}`);

  // Optional Supabase upsert
  if (UPSERT_SUPABASE) {
    await upsertToSupabase(output);
  }

  console.log("\nDone.\n");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
