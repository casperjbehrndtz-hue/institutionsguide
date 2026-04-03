#!/usr/bin/env node
/**
 * fetch-gymnasium-data.mjs
 *
 * Fetches gymnasium (upper secondary) data from multiple sources:
 *
 *   1. Uddannelsesstatistik API (requires UDDANNELSESSTATISTIK_API_KEY)
 *      - GYMOVER (Gymnasieoverblik) — per institution per year:
 *        Frafald, Karaktersnit, Overgang til videregaaende
 *
 *   2. Danmarks Statistik free API (fallback, no key needed):
 *      - GENMF10 — Completion rates for gymnasiale uddannelser
 *      - FORLOB15 — Transition from gymnasium to further education
 *
 * Output:
 *   public/data/gymnasium-data.json
 *
 * Usage:
 *   node scripts/fetch-gymnasium-data.mjs
 *   node scripts/fetch-gymnasium-data.mjs --dry-run
 *   node scripts/fetch-gymnasium-data.mjs --year 2023/2024
 *
 * Environment:
 *   UDDANNELSESSTATISTIK_API_KEY — Optional (falls back to DST free API).
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..");
const OUTPUT_PATH = join(PROJECT_ROOT, "public", "data", "gymnasium-data.json");

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

const DRY_RUN = process.argv.includes("--dry-run");
const yearArg = process.argv.find((a, i) => process.argv[i - 1] === "--year");

const API_BASE = "https://api.uddannelsesstatistik.dk/Api/v1";
const API_STATISTIK = `${API_BASE}/statistik`;
const API_SKEMA = `${API_BASE}/skema`;
const DST_API = "https://api.statbank.dk/v1/data";

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

async function apiPost(url, body, headers) {
  const res = await fetch(url, {
    method: "POST",
    headers: headers || { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.slice(0, 500)}`);
  }
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// DST (Danmarks Statistik) free API helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Uddannelsesstatistik API — gymnasium data (requires API key)
// ---------------------------------------------------------------------------

const BUVM_HEADERS = API_KEY
  ? { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` }
  : null;

/**
 * Fetch gymnasium overview from Uddannelsesstatistik API.
 * område: "GY" (gymnasiale uddannelser)
 */
async function fetchGymnasiumFromBUVM(schoolYear) {
  if (!BUVM_HEADERS) return null;

  console.log(`  [BUVM] Fetching gymnasium data for ${schoolYear}...`);

  try {
    // Fetch gymnasium overview (frafald, karaktersnit, overgang)
    const body = {
      område: "GY",
      emne: "OVER",
      underemne: "OVERGYM",
      nøgletal: [
        "Frafald pct",
        "Karaktergennemsnit",
        "Andel i videre uddannelse",
        "Elevtal",
      ],
      detaljering: [
        "[Institution].[Institutionsnummer]",
        "[Institution].[Institution]",
        "[Uddannelse].[Uddannelsestype]",
        "[Geografi].[Kommune]",
        "[Geografi].[Adresse]",
        "[Geografi].[Postnummer]",
        "[Geografi].[By]",
        "[Skoleår].[Skoleår]",
      ],
      filtre: { "[Skoleår].[Skoleår]": [schoolYear] },
      side: 1,
      side_størrelse: 100000,
    };

    const data = await apiPost(API_STATISTIK, body, BUVM_HEADERS);
    console.log(`    [BUVM] Got ${data.length} gymnasium rows`);
    return data;
  } catch (err) {
    console.warn(`    [BUVM] Failed: ${err.message}`);
    console.warn(`    [BUVM] Falling back to DST free API...`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Danmarks Statistik — GENMF10 (completion rates)
// ---------------------------------------------------------------------------

/**
 * GENMF10: Fuldførelsesfrekvens for gymnasiale uddannelser
 * Variables: INSTNR (institution), UDDTYP (stx/hhx/htx/hf), Tid (year)
 */
async function fetchGENMF10(year) {
  console.log(`  [DST/GENMF10] Fetching completion rates for ${year}...`);

  try {
    const body = {
      table: "GENMF10",
      format: "JSONSTAT",
      variables: [
        { code: "INSTNR", values: ["*"] },
        { code: "UDDTYP", values: ["*"] },
        { code: "Tid", values: [String(year)] },
      ],
    };

    const raw = await dstFetch(body);
    const rows = parseJsonStat(raw);
    console.log(`    [DST/GENMF10] Parsed ${rows.length} cells`);

    // Group by institution
    const result = {};
    for (const r of rows) {
      const instCode = r.INSTNR_code;
      const instName = r.INSTNR_label;
      const uddType = r.UDDTYP_code?.toLowerCase();
      if (!instCode || instCode === "TOT") continue;

      if (!result[instCode]) {
        result[instCode] = { name: instName, types: {} };
      }
      result[instCode].types[uddType] = {
        completionPct: r.value,
      };
    }

    console.log(`    [DST/GENMF10] Got data for ${Object.keys(result).length} institutions`);
    return result;
  } catch (err) {
    console.warn(`    [DST/GENMF10] Failed: ${err.message}`);
    return {};
  }
}

// ---------------------------------------------------------------------------
// Danmarks Statistik — FORLOB15 (transition to further education)
// ---------------------------------------------------------------------------

/**
 * FORLOB15: Overgang fra gymnasial uddannelse til videregaaende uddannelse
 * Variables: INSTNR (institution), UDDTYP, Tid (year)
 */
async function fetchFORLOB15(year) {
  console.log(`  [DST/FORLOB15] Fetching transition rates for ${year}...`);

  try {
    const body = {
      table: "FORLOB15",
      format: "JSONSTAT",
      variables: [
        { code: "INSTNR", values: ["*"] },
        { code: "UDDTYP", values: ["*"] },
        { code: "Tid", values: [String(year)] },
      ],
    };

    const raw = await dstFetch(body);
    const rows = parseJsonStat(raw);
    console.log(`    [DST/FORLOB15] Parsed ${rows.length} cells`);

    const result = {};
    for (const r of rows) {
      const instCode = r.INSTNR_code;
      const instName = r.INSTNR_label;
      if (!instCode || instCode === "TOT") continue;

      if (!result[instCode]) {
        result[instCode] = { name: instName, types: {} };
      }
      const uddType = r.UDDTYP_code?.toLowerCase();
      if (!result[instCode].types[uddType]) {
        result[instCode].types[uddType] = {};
      }
      result[instCode].types[uddType].transitionPct = r.value;
    }

    console.log(`    [DST/FORLOB15] Got data for ${Object.keys(result).length} institutions`);
    return result;
  } catch (err) {
    console.warn(`    [DST/FORLOB15] Failed: ${err.message}`);
    return {};
  }
}

// ---------------------------------------------------------------------------
// Build gymnasium list from BUVM data
// ---------------------------------------------------------------------------

function buildFromBUVM(buvmData) {
  const ID_KEY = "[Institution].[Institutionsnummer].[Institutionsnummer]";
  const NAME_KEY = "[Institution].[Institution].[Institution]";
  const TYPE_KEY = "[Uddannelse].[Uddannelsestype].[Uddannelsestype]";
  const KOMMUNE_KEY = "[Geografi].[Kommune].[Kommune]";
  const ADDR_KEY = "[Geografi].[Adresse].[Adresse]";
  const ZIP_KEY = "[Geografi].[Postnummer].[Postnummer]";
  const CITY_KEY = "[Geografi].[By].[By]";

  const gymMap = new Map();

  for (const row of buvmData) {
    const instId = row[ID_KEY];
    if (!instId) continue;

    const typeRaw = (row[TYPE_KEY] || "").toLowerCase();
    let type = "stx";
    if (typeRaw.includes("hhx")) type = "hhx";
    else if (typeRaw.includes("htx")) type = "htx";
    else if (typeRaw.includes("hf")) type = "hf";
    else if (typeRaw.includes("eux")) type = "eux";

    const key = `${instId}-${type}`;
    if (!gymMap.has(key)) {
      gymMap.set(key, {
        id: `gym-${instId}-${type}`,
        name: row[NAME_KEY] || "",
        type,
        municipality: (row[KOMMUNE_KEY] || "").replace(" Kommune", ""),
        address: row[ADDR_KEY] || "",
        postalCode: row[ZIP_KEY] || "",
        city: row[CITY_KEY] || "",
        lat: 0,
        lng: 0,
        quality: {
          frafaldPct: parseDanish(row["Frafald pct"]),
          karaktersnit: parseDanish(row["Karaktergennemsnit"]),
          overgangVideregaaendePct: parseDanish(row["Andel i videre uddannelse"]),
        },
      });
    }
  }

  return Array.from(gymMap.values());
}

// ---------------------------------------------------------------------------
// Build gymnasium list from DST data (fallback)
// ---------------------------------------------------------------------------

function buildFromDST(genmf10Data, forlob15Data) {
  const allInstCodes = new Set([
    ...Object.keys(genmf10Data),
    ...Object.keys(forlob15Data),
  ]);

  const gymnasiums = [];

  for (const instCode of allInstCodes) {
    const genmf = genmf10Data[instCode];
    const forlob = forlob15Data[instCode];
    const name = genmf?.name || forlob?.name || `Institution ${instCode}`;
    const allTypes = new Set([
      ...Object.keys(genmf?.types || {}),
      ...Object.keys(forlob?.types || {}),
    ]);

    for (const type of allTypes) {
      // Normalize type
      let normalizedType = type;
      if (!["stx", "hhx", "htx", "hf", "eux"].includes(type)) {
        if (type.includes("stx")) normalizedType = "stx";
        else if (type.includes("hhx")) normalizedType = "hhx";
        else if (type.includes("htx")) normalizedType = "htx";
        else if (type.includes("hf")) normalizedType = "hf";
        else if (type.includes("eux")) normalizedType = "eux";
        else continue; // Skip unknown types
      }

      const completionPct = genmf?.types?.[type]?.completionPct ?? null;
      // Frafald = 100 - completion rate
      const frafaldPct = completionPct != null ? Math.round((100 - completionPct) * 10) / 10 : null;
      const transitionPct = forlob?.types?.[type]?.transitionPct ?? null;

      gymnasiums.push({
        id: `gym-${instCode}-${normalizedType}`,
        name,
        type: normalizedType,
        municipality: "",
        address: "",
        postalCode: "",
        city: "",
        lat: 0,
        lng: 0,
        quality: {
          frafaldPct,
          karaktersnit: null, // Not available from DST free API
          overgangVideregaaendePct: transitionPct,
        },
      });
    }
  }

  return gymnasiums;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n======================================");
  console.log("  Gymnasium Data Fetcher");
  console.log("  Sources: Uddannelsesstatistik + DST");
  console.log("======================================\n");

  if (DRY_RUN) console.log("  Mode: DRY RUN\n");

  const schoolYear = yearArg || "2023/2024";
  const dstYear = 2023;

  let gymnasiums = [];

  // Try BUVM API first (richer data)
  if (API_KEY) {
    console.log("  API key found — trying Uddannelsesstatistik API...\n");
    const buvmData = await fetchGymnasiumFromBUVM(schoolYear);
    if (buvmData && buvmData.length > 0) {
      gymnasiums = buildFromBUVM(buvmData);
      console.log(`\n  Built ${gymnasiums.length} gymnasium entries from BUVM API`);
    }
  } else {
    console.log("  No UDDANNELSESSTATISTIK_API_KEY found.");
    console.log("  Set it in .env to get richer data (address, grades, coordinates).\n");
  }

  // Fallback: DST free API
  if (gymnasiums.length === 0) {
    console.log("  Using Danmarks Statistik free API (GENMF10 + FORLOB15)...\n");

    const [genmf10Data, forlob15Data] = await Promise.all([
      fetchGENMF10(dstYear),
      fetchFORLOB15(dstYear),
    ]);

    gymnasiums = buildFromDST(genmf10Data, forlob15Data);
    console.log(`\n  Built ${gymnasiums.length} gymnasium entries from DST API`);
  }

  // Deduplicate by id
  const seen = new Set();
  gymnasiums = gymnasiums.filter((g) => {
    if (seen.has(g.id)) return false;
    seen.add(g.id);
    return true;
  });

  // Summary
  const byType = {};
  for (const g of gymnasiums) {
    byType[g.type] = (byType[g.type] || 0) + 1;
  }

  console.log(`\n  ┌─────────────────────────────────┐`);
  console.log(`  │ Results                         │`);
  console.log(`  ├─────────────────────────────────┤`);
  console.log(`  │ Total gymnasiums: ${String(gymnasiums.length).padStart(5)}        │`);
  for (const [type, count] of Object.entries(byType).sort()) {
    console.log(`  │   ${type.toUpperCase().padEnd(4)}: ${String(count).padStart(5)}                   │`);
  }
  console.log(`  │ With frafald:     ${String(gymnasiums.filter((g) => g.quality.frafaldPct != null).length).padStart(5)}        │`);
  console.log(`  │ With karakterer:  ${String(gymnasiums.filter((g) => g.quality.karaktersnit != null).length).padStart(5)}        │`);
  console.log(`  │ With overgang:    ${String(gymnasiums.filter((g) => g.quality.overgangVideregaaendePct != null).length).padStart(5)}        │`);
  console.log(`  └─────────────────────────────────┘\n`);

  if (DRY_RUN) {
    const sample = gymnasiums.find((g) => g.quality.frafaldPct != null);
    if (sample) {
      console.log("  Sample:");
      console.log(`    ${sample.name} (${sample.type.toUpperCase()})`);
      console.log(`    Quality:`, JSON.stringify(sample.quality, null, 2));
    }
    console.log("\n  [DRY RUN] No files written.");
    return;
  }

  // Ensure output directory exists
  const outputDir = dirname(OUTPUT_PATH);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const output = {
    fetchedAt: new Date().toISOString(),
    schoolYear,
    count: gymnasiums.length,
    gymnasiums,
  };

  const jsonStr = JSON.stringify(output);
  writeFileSync(OUTPUT_PATH, jsonStr, "utf-8");
  console.log(`  Written to ${OUTPUT_PATH} (${(jsonStr.length / 1024).toFixed(0)} KB)`);
  console.log("\n  Done!\n");
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
