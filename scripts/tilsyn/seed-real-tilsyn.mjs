#!/usr/bin/env node
/**
 * Seed REAL tilsynsrapporter from scraped data into Supabase.
 *
 * Usage:
 *   node --env-file=.env scripts/tilsyn/seed-real-tilsyn.mjs
 *   node --env-file=.env scripts/tilsyn/seed-real-tilsyn.mjs --dry-run
 */

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "output");

const DRY_RUN = process.argv.includes("--dry-run");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DRY_RUN && (!SUPABASE_URL || !SUPABASE_KEY)) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars (or use --dry-run)");
  process.exit(1);
}

const supabase = DRY_RUN ? null : createClient(SUPABASE_URL, SUPABASE_KEY);

// Load all tilsyn JSON files from output directory
function loadTilsynFiles() {
  const files = readdirSync(OUTPUT_DIR).filter(f =>
    f.endsWith("-tilsyn.json") || f === "koebenhavn-v3-tilsyn.json"
  );

  const allReports = [];

  for (const file of files) {
    try {
      const data = JSON.parse(readFileSync(join(OUTPUT_DIR, file), "utf8"));
      const municipality = data.municipality || file.replace(/-tilsyn\.json$/, "");
      const reports = data.reports || [];

      for (const r of reports) {
        // Support both KBH format (institutionId) and kommune scraper format (matched_institution_id)
        const instId = r.institutionId || r.ourInstitutionId || r.matched_institution_id;
        if (!instId) continue; // skip unmatched

        const year = r.reportYear || r.report_year || 2025;
        const reportUrl = r.kkorgnr
          ? `https://iwtilsynpdf.kk.dk/pdf/${r.kkorgnr}.pdf`
          : r.reportUrl || r.pdf_url || null;

        allReports.push({
          institution_id: instId,
          municipality,
          report_date: r.report_date || (year ? `${year}-01-01` : null),
          report_year: year,
          report_url: reportUrl,
          report_type: r.report_type || (r.reportType === "light" ? "anmeldt" : "anmeldt"),
          overall_rating: r.overall_rating || "godkendt",
          summary: null,
          strengths: (r.strengths?.length > 0 ? r.strengths : null),
          areas_for_improvement: (r.areas_for_improvement || r.areasForImprovement || []).length > 0
            ? (r.areas_for_improvement || r.areasForImprovement)
            : null,
          raw_text: null, // don't store full text in DB to save space
          source: "scraper_v3",
        });
      }

      console.log(`  ${file}: ${reports.length} reports, ${allReports.length} total matched`);
    } catch (e) {
      console.error(`  Error loading ${file}:`, e.message);
    }
  }

  // Deduplicate: keep last entry per (institution_id, report_year, report_type)
  const seen = new Map();
  for (const r of allReports) {
    const key = `${r.institution_id}|${r.report_year}|${r.report_type}`;
    seen.set(key, r);
  }
  return [...seen.values()];
}

async function main() {
  console.log("=== Seed Real Tilsynsrapporter ===\n");

  const reports = loadTilsynFiles();
  console.log(`\nTotal reports to seed: ${reports.length}`);

  if (DRY_RUN) {
    console.log("\n--dry-run: would upsert these reports:");
    reports.slice(0, 5).forEach(r =>
      console.log(`  ${r.institution_id} | ${r.municipality} | ${r.report_year} | strengths: ${r.strengths?.length || 0}`)
    );
    console.log(`  ... and ${Math.max(0, reports.length - 5)} more`);
    return;
  }

  // Upsert in batches of 100
  const BATCH_SIZE = 100;
  let upserted = 0;
  let errors = 0;

  for (let i = 0; i < reports.length; i += BATCH_SIZE) {
    const batch = reports.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("tilsynsrapporter")
      .upsert(batch, { onConflict: "institution_id,report_year,report_type" });

    if (error) {
      console.error(`  Batch ${i}-${i + batch.length} error:`, error.message);
      errors += batch.length;
    } else {
      upserted += batch.length;
    }

    if ((i + BATCH_SIZE) % 500 === 0) {
      console.log(`  Upserted ${upserted}/${reports.length}...`);
    }
  }

  console.log(`\nDone: ${upserted} upserted, ${errors} errors`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
