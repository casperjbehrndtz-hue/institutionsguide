#!/usr/bin/env node
/**
 * fetch-dst-school-extra.mjs
 *
 * Fetches school-level municipality statistics from Danmarks Statistik's
 * free API (no authentication needed):
 *
 *   1. KVOTIEN  — Klassekvotienter (class sizes per municipality)
 *   2. SPECIAL1 — Specialundervisning (special education rates)
 *   3. FORLOB10 — Overgang fra grundskole til videre uddannelse
 *
 * Usage:
 *   node scripts/fetch-dst-school-extra.mjs
 *   node scripts/fetch-dst-school-extra.mjs --dry-run
 *
 * Output:
 *   public/data/school-extra-stats.json
 *
 * Source: https://api.statbank.dk/v1/
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..");
const OUTPUT_PATH = join(PROJECT_ROOT, "public", "data", "school-extra-stats.json");

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
// KVOTIEN — Klassekvotienter (class sizes)
// ---------------------------------------------------------------------------

async function fetchKVOTIEN(year) {
  console.log(`[KVOTIEN] Fetching class sizes for ${year}...`);
  const body = {
    table: "KVOTIEN",
    format: "JSONSTAT",
    variables: [
      { code: "OMRÅDE", values: ["*"] },
      { code: "KLASSETRIN", values: ["TOT"] },
      { code: "Tid", values: [String(year)] },
    ],
  };

  const raw = await dstFetch(body);
  const rows = parseJsonStat(raw);
  console.log(`[KVOTIEN] Parsed ${rows.length} cells`);

  const result = {};
  for (const r of rows) {
    const code = r.OMRÅDE_code;
    if (!isKommune(code)) continue;
    const name = r.OMRÅDE_label;
    result[name] = { code, avgClassSize: Math.round(r.value * 10) / 10 };
  }

  console.log(`[KVOTIEN] Got class sizes for ${Object.keys(result).length} kommuner`);
  return result;
}

// ---------------------------------------------------------------------------
// SPECIAL1 — Specialundervisning (special education rates)
// ---------------------------------------------------------------------------

async function fetchSPECIAL1(year) {
  console.log(`[SPECIAL1] Fetching special education rates for ${year}...`);
  const body = {
    table: "SPECIAL1",
    format: "JSONSTAT",
    variables: [
      { code: "OMRÅDE", values: ["*"] },
      { code: "FORANST", values: ["TOT"] },
      { code: "ENHED", values: ["1"] }, // Andel (pct)
      { code: "Tid", values: [String(year)] },
    ],
  };

  const raw = await dstFetch(body);
  const rows = parseJsonStat(raw);
  console.log(`[SPECIAL1] Parsed ${rows.length} cells`);

  const result = {};
  for (const r of rows) {
    const code = r.OMRÅDE_code;
    if (!isKommune(code)) continue;
    const name = r.OMRÅDE_label;
    result[name] = { code, specialEducationPct: Math.round(r.value * 10) / 10 };
  }

  console.log(`[SPECIAL1] Got special ed rates for ${Object.keys(result).length} kommuner`);
  return result;
}

// ---------------------------------------------------------------------------
// FORLOB10 — Overgang fra grundskole til videre uddannelse
// ---------------------------------------------------------------------------
// UDDGRUPPE codes:
//   10 = Gymnasiale uddannelser
//   20 = Erhvervsuddannelser

async function fetchFORLOB10(year) {
  console.log(`[FORLOB10] Fetching transition rates for ${year}...`);
  const body = {
    table: "FORLOB10",
    format: "JSONSTAT",
    variables: [
      { code: "BOPKOMM", values: ["*"] },
      { code: "UDDGRUPPE", values: ["10", "20"] },
      { code: "KØN", values: ["TOT"] },
      { code: "Tid", values: [String(year)] },
    ],
  };

  const raw = await dstFetch(body);
  const rows = parseJsonStat(raw);
  console.log(`[FORLOB10] Parsed ${rows.length} cells`);

  const result = {};
  for (const r of rows) {
    const code = r.BOPKOMM_code;
    if (!isKommune(code)) continue;
    const name = r.BOPKOMM_label;
    if (!result[name]) result[name] = { code };

    if (r.UDDGRUPPE_code === "10") {
      result[name].transitionGymnasiumPct = Math.round(r.value * 10) / 10;
    } else if (r.UDDGRUPPE_code === "20") {
      result[name].transitionErhvervPct = Math.round(r.value * 10) / 10;
    }
  }

  console.log(`[FORLOB10] Got transition rates for ${Object.keys(result).length} kommuner`);
  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n--- DST School Extra Stats Fetcher ---\n");

  if (DRY_RUN) {
    console.log("DRY RUN: will fetch data but not write files\n");
  }

  const YEAR = 2024;

  // Fetch all three in parallel
  const [klassekv, special, forlob] = await Promise.all([
    fetchKVOTIEN(YEAR),
    fetchSPECIAL1(YEAR),
    fetchFORLOB10(YEAR),
  ]);

  // Combine into unified structure
  const allNames = new Set([
    ...Object.keys(klassekv),
    ...Object.keys(special),
    ...Object.keys(forlob),
  ]);

  const kommuner = {};
  for (const name of [...allNames].sort()) {
    const k = klassekv[name] || {};
    const s = special[name] || {};
    const f = forlob[name] || {};

    kommuner[name] = {
      municipality: name,
      avgClassSize: k.avgClassSize ?? null,
      specialEducationPct: s.specialEducationPct ?? null,
      transitionGymnasiumPct: f.transitionGymnasiumPct ?? null,
      transitionErhvervPct: f.transitionErhvervPct ?? null,
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
    console.log(`  Avg class size: ${sample.avgClassSize}`);
    console.log(`  Special education: ${sample.specialEducationPct}%`);
    console.log(`  Transition gymnasium: ${sample.transitionGymnasiumPct}%`);
    console.log(`  Transition erhverv: ${sample.transitionErhvervPct}%`);
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
