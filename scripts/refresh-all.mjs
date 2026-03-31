#!/usr/bin/env node
/**
 * Master data refresh pipeline — runs ALL data pipelines in correct order.
 *
 * Usage:
 *   node scripts/refresh-all.mjs            # run everything
 *   node scripts/refresh-all.mjs --dry-run  # show plan without executing
 *   npm run refresh:all                      # via npm
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DRY_RUN = process.argv.includes("--dry-run");

// ── Pipeline steps in dependency order ──────────────────────────────────
// Each step: [label, command, description]
const STEPS = [
  [
    "Dagtilbud CSV → JSON",
    "node scripts/rebuild-data.mjs",
    "Regenerates vuggestue/boernehave/dagpleje JSON from CSV sources",
  ],
  [
    "Skole kvalitetsdata",
    "node scripts/fetch-school-quality.mjs",
    "Fetches grades, absence, trivsel, kompetencedaekning from Uddannelsesstatistik",
  ],
  [
    "Skole personaledata",
    "node scripts/fetch-school-staff.mjs",
    "Fetches elever/lærer ratio and undervisningstid from Uddannelsesstatistik",
  ],
  [
    "Efterskoler",
    "node scripts/fetch-efterskoler.mjs",
    "Scrapes efterskole prices and profiles from efterskolerne.dk",
  ],
  [
    "Institutions-statistik (normering)",
    "node scripts/fetch-institution-stats.mjs",
    "Fetches normering/personale data from Uddannelsesstatistik API",
  ],
  [
    "Kommune-statistik (DST)",
    "node scripts/fetch-dst-kommune-stats.mjs",
    "Fetches kommune-level demographics from Danmarks Statistik",
  ],
  [
    "Foraeldre-tilfredshed",
    "node scripts/fetch-foraeldre-tilfredshed.mjs",
    "Fetches parent satisfaction scores from ISM",
  ],
  [
    "Normering compact",
    "node scripts/build-normering-data.mjs",
    "Compacts normering data for frontend consumption",
  ],
  [
    "Sitemap",
    "node scripts/generate-sitemap.mjs",
    "Generates sitemap.xml from current data",
  ],
];

// ── Helpers ─────────────────────────────────────────────────────────────
const FMT = { reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m", cyan: "\x1b[36m" };

function elapsed(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = ((ms % 60000) / 1000).toFixed(0);
  return `${m}m ${s}s`;
}

function header(text) {
  const line = "─".repeat(60);
  console.log(`\n${FMT.cyan}${line}${FMT.reset}`);
  console.log(`${FMT.bold}${FMT.cyan}  ${text}${FMT.reset}`);
  console.log(`${FMT.cyan}${line}${FMT.reset}\n`);
}

// ── Main ────────────────────────────────────────────────────────────────
async function main() {
  header("Institutionsguide — Full Data Refresh");

  if (DRY_RUN) {
    console.log(`${FMT.yellow}DRY RUN — showing pipeline plan without executing${FMT.reset}\n`);
    STEPS.forEach(([label, cmd, desc], i) => {
      console.log(`  ${FMT.bold}${i + 1}.${FMT.reset} ${label}`);
      console.log(`     ${FMT.dim}${cmd}${FMT.reset}`);
      console.log(`     ${desc}\n`);
    });
    console.log(`Total: ${STEPS.length} steps`);
    return;
  }

  const results = [];
  const totalStart = Date.now();

  for (let i = 0; i < STEPS.length; i++) {
    const [label, cmd, desc] = STEPS[i];
    const step = `[${i + 1}/${STEPS.length}]`;
    console.log(`${FMT.bold}${step} ${label}${FMT.reset}  ${FMT.dim}${desc}${FMT.reset}`);

    const start = Date.now();
    try {
      execSync(cmd, { cwd: ROOT, stdio: "inherit", timeout: 5 * 60 * 1000 });
      const ms = Date.now() - start;
      results.push({ label, status: "ok", ms });
      console.log(`${FMT.green}  ✓ ${label} done in ${elapsed(ms)}${FMT.reset}\n`);
    } catch (err) {
      const ms = Date.now() - start;
      results.push({ label, status: "FAIL", ms });
      console.error(`${FMT.red}  ✗ ${label} FAILED after ${elapsed(ms)}${FMT.reset}`);
      console.error(`${FMT.red}    ${err.message?.split("\n")[0] || err}${FMT.reset}\n`);
      // Continue with remaining steps — one failure shouldn't block independent pipelines
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────
  const totalMs = Date.now() - totalStart;
  const ok = results.filter((r) => r.status === "ok").length;
  const failed = results.filter((r) => r.status === "FAIL").length;

  header("Refresh Summary");

  const maxLabel = Math.max(...results.map((r) => r.label.length));
  for (const r of results) {
    const icon = r.status === "ok" ? `${FMT.green}✓` : `${FMT.red}✗`;
    const time = FMT.dim + elapsed(r.ms).padStart(8) + FMT.reset;
    console.log(`  ${icon} ${r.label.padEnd(maxLabel)}${FMT.reset}  ${time}`);
  }

  console.log(`\n  Total: ${elapsed(totalMs)}  |  ${FMT.green}${ok} passed${FMT.reset}${failed ? `  |  ${FMT.red}${failed} failed${FMT.reset}` : ""}\n`);

  // Update ALL lastUpdated dates in dataVersions.ts
  const versionsPath = resolve(ROOT, "src/lib/dataVersions.ts");
  if (existsSync(versionsPath)) {
    const content = readFileSync(versionsPath, "utf-8");
    const today = new Date().toISOString().slice(0, 10);
    const updated = content.replace(
      /lastUpdated: new Date\("[^"]*"\)/g,
      `lastUpdated: new Date("${today}")`
    );
    if (updated !== content) {
      writeFileSync(versionsPath, updated, "utf-8");
      console.log(`${FMT.dim}  Updated dataVersions.ts → all lastUpdated: "${today}"${FMT.reset}\n`);
    }
  }

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
