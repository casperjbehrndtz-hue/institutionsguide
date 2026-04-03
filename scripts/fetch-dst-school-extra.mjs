#!/usr/bin/env node
/**
 * fetch-dst-school-extra.mjs
 *
 * Fetches school-level municipality statistics from Danmarks Statistik's
 * free API (no authentication needed):
 *
 *   1. KVOTIEN  — Klassekvotienter (class sizes per municipality)
 *   2. FORLOB10 — Overgang fra grundskole til videre uddannelse (regional)
 *
 * Note: SPECIAL1 does not have municipality-level data, only school type.
 * Note: FORLOB10 only has regional data (5 regions), not municipality.
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
// KVOTIEN — Klassekvotienter (class sizes per municipality)
// Variables: OMRÅDE, KLASSE, SKTPE, Tid
// ---------------------------------------------------------------------------

async function fetchKVOTIEN(year) {
  console.log(`[KVOTIEN] Fetching class sizes for ${year}...`);
  const body = {
    table: "KVOTIEN",
    format: "JSONSTAT",
    variables: [
      { code: "OMRÅDE", values: ["*"] },
      { code: "KLASSE", values: ["0000"] },     // I alt
      { code: "SKTPE", values: ["ANTALSUM"] },  // I alt (alle skoletyper)
      { code: "Tid", values: [String(year)] },
    ],
  };

  const raw = await dstFetch(body);
  const rows = parseJsonStat(raw);
  console.log(`[KVOTIEN] Parsed ${rows.length} cells`);

  const result = {};
  for (const r of rows) {
    const code = r["OMRÅDE_code"];
    if (!isKommune(code)) continue;
    const name = r["OMRÅDE_label"];
    result[name] = { code, avgClassSize: Math.round(r.value * 10) / 10 };
  }

  console.log(`[KVOTIEN] Got class sizes for ${Object.keys(result).length} kommuner`);
  return result;
}

// ---------------------------------------------------------------------------
// FORLOB10 — Overgang fra grundskole (regional, not municipality)
// Variables: AFGAARG, AFGKLAS, AFGREG, UDDSTAT, STATUSTID, UDDANNELSE, KOEN, HERKOMST, Tid
// We get: % in gymnasium + % in erhverv 1 year after graduation, per region
// ---------------------------------------------------------------------------

const REGION_MAP = {
  "084": "Region Hovedstaden",
  "085": "Region Sjælland",
  "083": "Region Syddanmark",
  "082": "Region Midtjylland",
  "081": "Region Nordjylland",
};

async function fetchFORLOB10(year) {
  console.log(`[FORLOB10] Fetching national transition rates for afgangsårgang ${year}...`);

  // Fetch national totals: "i gang med uddannelse" 1 year after grundskole
  // Use CSV format which is simpler to parse than JSONSTAT for this table
  const body = {
    table: "FORLOB10",
    format: "CSV",
    variables: [
      { code: "AFGAARG", values: [String(year)] },
      { code: "AFGKLAS", values: ["TOT"] },
      { code: "AFGREG", values: ["000", "084", "085", "083", "082", "081"] },
      { code: "UDDSTAT", values: ["1"] },          // I gang med uddannelse
      { code: "STATUSTID", values: ["015"] },       // 1 år efter
      { code: "UDDANNELSE", values: ["TOT", "H20", "H30"] },
      { code: "KOEN", values: ["10"] },
      { code: "HERKOMST", values: ["00"] },
      { code: "Tid", values: [String(year + 2)] },  // Tid is publication year
    ],
  };

  const res = await fetch(DST_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DST API ${res.status}: ${text.slice(0, 500)}`);
  }

  const csv = await res.text();
  const lines = csv.trim().split("\n");
  console.log(`[FORLOB10] Got ${lines.length - 1} rows`);

  // Parse CSV (semicolon-separated, with header)
  const header = lines[0].split(";").map((h) => h.replace(/"/g, "").trim());
  const regionIdx = header.findIndex((h) => h.includes("region") || h.includes("AFGREG"));
  const uddIdx = header.findIndex((h) => h.includes("UDDANNELSE") || h.includes("uddannelse"));
  const valIdx = header.length - 1; // Value is always last

  const totals = {}; // regionCode -> { total, gymnasium, erhverv }
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";").map((c) => c.replace(/"/g, "").trim());
    const region = cols[regionIdx] || cols[2] || ""; // Fallback to column index
    const udd = cols[uddIdx] || cols[5] || "";
    const val = parseInt(cols[valIdx], 10);
    if (isNaN(val)) continue;

    // Use the region text as key
    if (!totals[region]) totals[region] = { total: 0, gymnasium: 0, erhverv: 0 };
    if (udd.includes("I alt") || udd.includes("TOT")) totals[region].total = val;
    else if (udd.includes("Gymnasiale") || udd.includes("H20")) totals[region].gymnasium = val;
    else if (udd.includes("Erhvervsfaglige") || udd.includes("H30")) totals[region].erhverv = val;
  }

  const result = {};
  for (const [name, data] of Object.entries(totals)) {
    if (data.total === 0) continue;
    result[name] = {
      transitionGymnasiumPct: Math.round((data.gymnasium / data.total) * 1000) / 10,
      transitionErhvervPct: Math.round((data.erhverv / data.total) * 1000) / 10,
    };
  }

  console.log(`[FORLOB10] Got transition rates for ${Object.keys(result).length} regions`);
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

  // Try 2024 first, fall back to 2023
  let kvYear = 2024;
  let klassekv;
  try {
    klassekv = await fetchKVOTIEN(kvYear);
  } catch (e) {
    console.log(`[KVOTIEN] ${kvYear} failed, trying ${kvYear - 1}...`);
    kvYear = 2023;
    klassekv = await fetchKVOTIEN(kvYear);
  }

  let fYear = 2022; // FORLOB10 typically lags 2 years
  let forlob;
  try {
    forlob = await fetchFORLOB10(fYear);
  } catch (e) {
    console.log(`[FORLOB10] ${fYear} failed, trying ${fYear - 1}...`);
    fYear = 2021;
    forlob = await fetchFORLOB10(fYear);
  }

  // Combine into output: municipality-level class sizes + national transition rates
  const kommuner = {};
  for (const [name, data] of Object.entries(klassekv)) {
    kommuner[name] = {
      municipality: name,
      avgClassSize: data.avgClassSize,
      specialEducationPct: null, // Not available at municipality level from SPECIAL1
      transitionGymnasiumPct: null,
      transitionErhvervPct: null,
    };
  }

  // National transition rates (applied to all)
  const national = forlob["Hele landet"] ?? {};

  const output = {
    kvotienYear: kvYear,
    forlobYear: fYear,
    fetchedAt: new Date().toISOString(),
    kommuner,
    transitionRates: {
      national,
      regions: forlob,
    },
  };

  // Print sample
  const sample = kommuner["København"];
  if (sample) {
    console.log("\nSample — København:");
    console.log(`  Avg class size: ${sample.avgClassSize}`);
  }
  if (national.transitionGymnasiumPct) {
    console.log(`\nNational transition rates:`);
    console.log(`  Gymnasium: ${national.transitionGymnasiumPct}%`);
    console.log(`  Erhverv: ${national.transitionErhvervPct}%`);
  }

  console.log(`\nTotal kommuner: ${Object.keys(kommuner).length}`);

  if (DRY_RUN) {
    console.log("\nDRY RUN — skipping file write");
    return;
  }

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
