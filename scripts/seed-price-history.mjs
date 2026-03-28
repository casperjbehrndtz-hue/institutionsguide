#!/usr/bin/env node
/**
 * seed-price-history.mjs
 *
 * Reads all current institution data files and generates a SQL file with
 * INSERT statements for the price_snapshots table in Supabase.
 *
 * Usage:
 *   node scripts/seed-price-history.mjs
 *
 * Output:
 *   scripts/output/price-snapshot-YYYY-MM-DD.sql
 *
 * Run this monthly (or whenever data is refreshed) to accumulate historical
 * price data over time — the "Boliga model" for childcare/school prices.
 *
 * ─── Future API routes (Supabase Edge Functions or direct client queries) ───
 *
 * GET /api/price-history/:institutionId
 *   → SELECT snapshot_date, monthly_rate, annual_rate
 *     FROM price_snapshots
 *     WHERE institution_id = :institutionId
 *     ORDER BY snapshot_date ASC
 *   Returns: array of { date, monthlyRate, annualRate } for charting
 *
 * GET /api/price-trends/:municipality?category=vuggestue
 *   → SELECT snapshot_date,
 *            AVG(monthly_rate) as avg_monthly,
 *            MIN(monthly_rate) as min_monthly,
 *            MAX(monthly_rate) as max_monthly,
 *            COUNT(*) as institution_count
 *     FROM price_snapshots
 *     WHERE municipality = :municipality
 *       AND category = :category
 *     GROUP BY snapshot_date
 *     ORDER BY snapshot_date ASC
 *   Returns: array of { date, avgMonthly, minMonthly, maxMonthly, count }
 *
 * GET /api/price-compare/:municipality
 *   → SELECT category,
 *            AVG(monthly_rate) as avg_rate,
 *            snapshot_date
 *     FROM price_snapshots
 *     WHERE municipality = :municipality
 *     GROUP BY category, snapshot_date
 *     ORDER BY snapshot_date DESC
 *   Returns: latest avg rates by category for a municipality
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "public", "data");
const OUTPUT_DIR = join(__dirname, "output");

// Today's date as YYYY-MM-DD
const today = new Date().toISOString().slice(0, 10);

// ─── Category mapping from file name ────────────────────────────────────────
const DAGTILBUD_FILES = [
  { file: "vuggestue-data.json", category: "vuggestue" },
  { file: "boernehave-data.json", category: "boernehave" },
  { file: "dagpleje-data.json", category: "dagpleje" },
  { file: "sfo-data.json", category: "sfo" },
];

// ─── Helper: escape single quotes for SQL ───────────────────────────────────
function esc(str) {
  if (str == null) return "NULL";
  return `'${String(str).replace(/'/g, "''")}'`;
}

function numOrNull(val) {
  return val != null && val > 0 ? String(val) : "NULL";
}

// ─── Read dagtilbud data files ──────────────────────────────────────────────
function readDagtilbudFile(filename, category) {
  const filePath = join(DATA_DIR, filename);
  if (!existsSync(filePath)) {
    console.warn(`  ⚠ File not found: ${filename}, skipping`);
    return [];
  }

  const raw = JSON.parse(readFileSync(filePath, "utf-8"));
  const institutions = raw.i || [];

  return institutions
    .filter((inst) => inst.id && inst.m) // must have id and municipality
    .map((inst) => ({
      institution_id: inst.id,
      category,
      municipality: inst.m,
      monthly_rate: inst.mr || null,
      annual_rate: inst.ar || null,
    }));
}

// ─── Read skole data (schools don't have direct price, but may have SFO) ───
function readSkoleFile() {
  const filePath = join(DATA_DIR, "skole-data.json");
  if (!existsSync(filePath)) {
    console.warn("  ⚠ File not found: skole-data.json, skipping");
    return [];
  }

  const raw = JSON.parse(readFileSync(filePath, "utf-8"));
  const schools = raw.s || [];

  // Schools with an SFO rate get a "skole" category snapshot
  // (the SFO rate on schools is useful for price tracking)
  return schools
    .filter((s) => s.id && s.m && s.sfo)
    .map((s) => ({
      institution_id: s.id,
      category: "skole",
      municipality: s.m,
      monthly_rate: s.sfo,
      annual_rate: null,
    }));
}

// ─── Main ───────────────────────────────────────────────────────────────────
function main() {
  console.log(`\n📸 Price Snapshot Generator — ${today}\n`);

  let allRows = [];

  // Process dagtilbud files
  for (const { file, category } of DAGTILBUD_FILES) {
    const rows = readDagtilbudFile(file, category);
    console.log(`  ${category}: ${rows.length} institutions (${rows.filter((r) => r.monthly_rate).length} with rates)`);
    allRows.push(...rows);
  }

  // Process skole file
  const skoleRows = readSkoleFile();
  console.log(`  skole (with SFO rate): ${skoleRows.length} institutions`);
  allRows.push(...skoleRows);

  // Filter to only rows that have at least one rate
  const withRates = allRows.filter((r) => r.monthly_rate || r.annual_rate);
  console.log(`\n  Total with price data: ${withRates.length} / ${allRows.length}`);

  // Generate SQL
  const sqlLines = [
    `-- Price snapshot for ${today}`,
    `-- Generated by seed-price-history.mjs`,
    `-- Total rows: ${withRates.length}`,
    `-- Run this in Supabase SQL Editor or via psql`,
    ``,
    `INSERT INTO price_snapshots (institution_id, category, municipality, monthly_rate, annual_rate, snapshot_date, source)`,
    `VALUES`,
  ];

  const valueLines = withRates.map(
    (r, i) =>
      `  (${esc(r.institution_id)}, ${esc(r.category)}, ${esc(r.municipality)}, ${numOrNull(r.monthly_rate)}, ${numOrNull(r.annual_rate)}, '${today}', 'dst')${i < withRates.length - 1 ? "," : ""}`
  );

  sqlLines.push(...valueLines);
  sqlLines.push(`ON CONFLICT (institution_id, snapshot_date) DO UPDATE SET`);
  sqlLines.push(`  monthly_rate = EXCLUDED.monthly_rate,`);
  sqlLines.push(`  annual_rate = EXCLUDED.annual_rate,`);
  sqlLines.push(`  category = EXCLUDED.category,`);
  sqlLines.push(`  municipality = EXCLUDED.municipality;`);

  const sql = sqlLines.join("\n");

  // Write output
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const outputPath = join(OUTPUT_DIR, `price-snapshot-${today}.sql`);
  writeFileSync(outputPath, sql, "utf-8");

  console.log(`\n  ✅ SQL written to: ${outputPath}`);
  console.log(`  📋 Paste into Supabase SQL Editor to load.\n`);

  // Also write a "latest" symlink-style copy for convenience
  const latestPath = join(OUTPUT_DIR, "price-snapshot-latest.sql");
  writeFileSync(latestPath, sql, "utf-8");
  console.log(`  📋 Also saved as: price-snapshot-latest.sql\n`);
}

main();
