#!/usr/bin/env node
/**
 * fetch-dst-sfo-stats.mjs
 *
 * Fetches SFO-level municipality statistics from Danmarks Statistik's
 * free API (no authentication needed):
 *
 *   1. BOERN5  — SFO enrollment by municipality
 *   2. BOERN61 — SFO pedagogical staff by municipality
 *
 * Usage:
 *   node scripts/fetch-dst-sfo-stats.mjs
 *   node scripts/fetch-dst-sfo-stats.mjs --dry-run
 *
 * Output:
 *   public/data/sfo-stats.json
 *
 * Source: https://api.statbank.dk/v1/
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..");
const OUTPUT_PATH = join(PROJECT_ROOT, "public", "data", "sfo-stats.json");

const DST_API = "https://api.statbank.dk/v1/data";

const DRY_RUN = process.argv.includes("--dry-run");

// ---------------------------------------------------------------------------
// Helpers (same pattern as fetch-dst-kommune-stats.mjs)
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
  const dimIds = dims.id ?? ds.id;
  const sizes = dims.size ?? ds.size;
  const values = ds.value;

  const dimLabels = dimIds.map((id) => {
    const cat = dims[id].category;
    const indexMap = cat.index;
    const labelMap = cat.label;
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

  const rows = [];
  const totalCells = values instanceof Array ? values.length : Object.keys(values).length;

  for (let flatIdx = 0; flatIdx < totalCells; flatIdx++) {
    const val = values instanceof Array ? values[flatIdx] : values[String(flatIdx)];
    if (val === null || val === undefined) continue;

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

// Region codes to skip (only want actual kommuner)
const SKIP_CODES = new Set([
  "000", "084", "085", "083", "081", "082",
  "910", "920", "930", "940", "960",
]);

function isKommune(code) {
  return !SKIP_CODES.has(code);
}

// ---------------------------------------------------------------------------
// BOERN5 — SFO enrollment by municipality
// ---------------------------------------------------------------------------

async function fetchBOERN5(year) {
  console.log(`[BOERN5] Fetching SFO enrollment for ${year}...`);
  const body = {
    table: "BOERN5",
    format: "JSONSTAT",
    variables: [
      { code: "OMRÅDE", values: ["*"] },
      { code: "PASKAT", values: ["TOT"] },
      { code: "Tid", values: [String(year)] },
    ],
  };

  const raw = await dstFetch(body);
  const rows = parseJsonStat(raw);
  console.log(`[BOERN5] Parsed ${rows.length} cells`);

  const result = {};
  for (const r of rows) {
    const code = r.OMRÅDE_code;
    if (!isKommune(code)) continue;
    const name = r.OMRÅDE_label;
    result[name] = { code, enrolledChildren: r.value };
  }

  console.log(`[BOERN5] Got enrollment for ${Object.keys(result).length} kommuner`);
  return result;
}

// ---------------------------------------------------------------------------
// BOERN61 — SFO pedagogical staff by municipality
// ---------------------------------------------------------------------------
// OVERENS (stillingskategori):
//   TOT = I alt
//   7   = Pædagog
//   920 = Pædagogmedhjælper
//   930 = Pædagogisk assistent

const BOERN61_STAFF_CODES = ["TOT", "7", "920", "930"];
const BOERN61_STAFF_MAP = {
  TOT: "total",
  "7": "paedagoger",
  "920": "medhjaelpere",
  "930": "assistenter",
};

async function fetchBOERN61(year) {
  console.log(`[BOERN61] Fetching SFO staff for ${year}...`);
  const body = {
    table: "BOERN61",
    format: "JSONSTAT",
    variables: [
      { code: "OMRÅDE", values: ["*"] },
      { code: "OVERENS", values: BOERN61_STAFF_CODES },
      { code: "UDDANNELSE", values: ["TOT"] },
      { code: "Tid", values: [String(year)] },
    ],
  };

  const raw = await dstFetch(body);
  const rows = parseJsonStat(raw);
  console.log(`[BOERN61] Parsed ${rows.length} cells`);

  const result = {};
  for (const r of rows) {
    const code = r.OMRÅDE_code;
    if (!isKommune(code)) continue;
    const name = r.OMRÅDE_label;
    if (!result[name]) result[name] = {};
    const field = BOERN61_STAFF_MAP[r.OVERENS_code];
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
      d.pctAssistenter = Math.round((d.assistenter / total) * 1000) / 10;
    } else {
      d.pctPaedagoger = null;
      d.pctMedhjaelpere = null;
      d.pctAssistenter = null;
    }
  }

  console.log(`[BOERN61] Got SFO staff for ${Object.keys(result).length} kommuner`);
  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n--- DST SFO Stats Fetcher ---\n");

  if (DRY_RUN) {
    console.log("DRY RUN: will fetch data but not write files\n");
  }

  const YEAR = 2024;

  // Fetch both in parallel
  const [enrollment, staff] = await Promise.all([
    fetchBOERN5(YEAR),
    fetchBOERN61(YEAR),
  ]);

  // Combine into unified structure
  const allNames = new Set([
    ...Object.keys(enrollment),
    ...Object.keys(staff),
  ]);

  const kommuner = {};
  for (const name of [...allNames].sort()) {
    const e = enrollment[name] || {};
    const s = staff[name] || {};

    kommuner[name] = {
      municipality: name,
      enrolledChildren: e.enrolledChildren ?? null,
      pctPaedagoger: s.pctPaedagoger ?? null,
      pctMedhjaelpere: s.pctMedhjaelpere ?? null,
      pctAssistenter: s.pctAssistenter ?? null,
      totalStaff: s.total ?? null,
    };
  }

  const output = {
    year: YEAR,
    fetchedAt: new Date().toISOString(),
    kommuner,
  };

  // Print sample
  const sample = kommuner["København"];
  if (sample) {
    console.log("\nSample — København:");
    console.log(`  Enrolled children: ${sample.enrolledChildren}`);
    console.log(`  Pædagoger: ${sample.pctPaedagoger}%`);
    console.log(`  Medhjælpere: ${sample.pctMedhjaelpere}%`);
    console.log(`  Assistenter: ${sample.pctAssistenter}%`);
    console.log(`  Total staff: ${sample.totalStaff}`);
  }

  console.log(`\nTotal kommuner: ${Object.keys(kommuner).length}`);

  if (DRY_RUN) {
    console.log("\nDRY RUN — skipping file write");
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

  console.log("\nDone.\n");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
