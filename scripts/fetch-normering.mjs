#!/usr/bin/env node
/**
 * fetch-normering.mjs
 *
 * Fetches kommune-level normering (children per staff) data from the
 * BUVM Uddannelsesstatistik API for all 98 kommuner, 2017-2023.
 *
 * Usage:
 *   BUVM_API_KEY=<your-jwt> node scripts/fetch-normering.mjs
 *
 * Output:
 *   scripts/output/normering-kommune-all.sql   — INSERT statements for Supabase
 *   scripts/output/normering-kommune-all.json   — Raw JSON for inspection
 *
 * The API splits normering into two measures:
 *   - "Normering kommune til og med 2022" (2017-2022)
 *   - "Normering kommune fra 2023" (2023+)
 * We fetch both and merge them.
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUTPUT_DIR = join(__dirname, "output");

const API_KEY = process.env.BUVM_API_KEY;
if (!API_KEY) {
  console.error("ERROR: Set BUVM_API_KEY environment variable");
  process.exit(1);
}

const API_URL = "https://api.uddannelsesstatistik.dk/Api/v1/statistik";

const MEASURES = [
  "Normering kommune til og med 2022",
  "Normering kommune fra 2023",
];

// Age group mapping from API values to our format
const AGE_GROUP_MAP = {
  "Dagpleje": "dagpleje",
  "0-2 år": "0-2",
  "3-5 år": "3-5",
};

async function fetchNormering() {
  const body = {
    område: "DAG",
    emne: "DAG",
    underemne: "Normering",
    nøgletal: MEASURES,
    detaljering: [
      "[Kommune].[Navn]",
      "[Pasningstilbud].[Pasningstilbud]",
      "[År].[År]",
    ],
    side: 1,
    side_størrelse: 100000,
  };

  console.log("Fetching normering data from BUVM API...");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`API error ${res.status}: ${text}`);
    process.exit(1);
  }

  const data = await res.json();
  console.log(`Got ${data.length} rows from API`);
  return data;
}

function parseRows(data) {
  const rows = [];

  for (const row of data) {
    const municipality = row["[Kommune].[Navn].[Navn]"];
    const ageGroupRaw = row["[Pasningstilbud].[Pasningstilbud].[Pasningstilbud]"];
    const year = parseInt(row["[År].[År].[År]"], 10);

    if (!municipality || !ageGroupRaw || isNaN(year)) continue;

    const ageGroup = AGE_GROUP_MAP[ageGroupRaw];
    if (!ageGroup) continue;

    // Pick the right measure based on year
    const measureKey = year <= 2022
      ? "Normering kommune til og med 2022"
      : "Normering kommune fra 2023";

    const rawValue = row[measureKey];
    if (!rawValue || rawValue === "") continue;

    // Danish number format: "2,8" → 2.8
    const ratio = parseFloat(rawValue.replace(",", "."));
    if (isNaN(ratio)) continue;

    rows.push({ municipality, ageGroup, year, ratio });
  }

  return rows;
}

function esc(str) {
  return `'${String(str).replace(/'/g, "''")}'`;
}

function generateSQL(rows) {
  const lines = [
    `-- Normering data from BUVM Uddannelsesstatistik API`,
    `-- Generated: ${new Date().toISOString().slice(0, 10)}`,
    `-- Total rows: ${rows.length}`,
    `-- Source: https://api.uddannelsesstatistik.dk`,
    ``,
    `INSERT INTO normering_snapshots (municipality, institution_id, age_group, children_per_staff, year, source)`,
    `VALUES`,
  ];

  const valueLines = rows.map(
    (r, i) =>
      `  (${esc(r.municipality)}, NULL, ${esc(r.ageGroup)}, ${r.ratio}, ${r.year}, 'buvm')${i < rows.length - 1 ? "," : ""}`
  );

  lines.push(...valueLines);
  lines.push(`ON CONFLICT (municipality, COALESCE(institution_id, ''), age_group, year) DO UPDATE SET`);
  lines.push(`  children_per_staff = EXCLUDED.children_per_staff;`);

  return lines.join("\n");
}

async function main() {
  console.log("\n📊 BUVM Normering Fetcher\n");

  const data = await fetchNormering();

  // Save raw JSON
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
  const jsonPath = join(OUTPUT_DIR, "normering-kommune-all.json");
  writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`Raw JSON saved to: ${jsonPath}`);

  // Parse
  const rows = parseRows(data);
  console.log(`Parsed ${rows.length} normering values`);

  // Stats
  const years = [...new Set(rows.map((r) => r.year))].sort();
  const munis = [...new Set(rows.map((r) => r.municipality))];
  const ageGroups = [...new Set(rows.map((r) => r.ageGroup))];
  console.log(`  Years: ${years.join(", ")}`);
  console.log(`  Kommuner: ${munis.length}`);
  console.log(`  Age groups: ${ageGroups.join(", ")}`);

  // Sample
  const kbh = rows.filter((r) => r.municipality === "København" && r.year === 2023);
  if (kbh.length > 0) {
    console.log(`\n  Sample — København 2023:`);
    kbh.forEach((r) => console.log(`    ${r.ageGroup}: ${r.ratio} børn/voksen`));
  }

  // Generate SQL
  const sql = generateSQL(rows);
  const sqlPath = join(OUTPUT_DIR, "normering-kommune-all.sql");
  writeFileSync(sqlPath, sql, "utf-8");
  console.log(`\n✅ SQL written to: ${sqlPath}`);
  console.log(`📋 Paste into Supabase SQL Editor to load.\n`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
