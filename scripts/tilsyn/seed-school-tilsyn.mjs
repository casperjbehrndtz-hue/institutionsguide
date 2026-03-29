/**
 * Seed tilsynsrapporter for all schools based on their real quality data.
 *
 * Uses the existing school quality metrics (trivsel, karakterer, fravær, etc.)
 * to generate meaningful tilsyn entries in Supabase.
 *
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/tilsyn/seed-school-tilsyn.mjs
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://epkwhvrwcyhlbdvwwvfi.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_KEY) {
  console.error("Set SUPABASE_SERVICE_KEY env var");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Load school data
const raw = JSON.parse(readFileSync("public/data/skole-data.json", "utf8"));
const schools = raw.s;
const schoolYear = raw.y || "2024/2025";

// Quality key mapping
// r = rating (1-5), o = overall (-1,0,1), ts = trivsel samlet, tf = trivsel faglig,
// tsi = trivsel social isolation, tro = trivsel ro/orden, tg = trivsel generel
// k = karakterer snit, fp = fravær pct, kp = kompetencedækning pct
// sr = status rapport tekst, kv = klasse-kvotient, el = elevtal

function deriveRating(q) {
  // Map school quality to tilsyn rating
  if (!q) return null;
  const o = q.o; // overall: 1 = over middel, 0 = middel, -1 = under middel
  if (o === 1) return "godkendt";
  if (o === 0) return "godkendt";
  if (o === -1) return "godkendt_bemærkninger";
  return null;
}

function deriveStrengths(q) {
  if (!q) return [];
  const strengths = [];
  if (q.ts >= 3.8) strengths.push("Høj trivsel blandt eleverne");
  if (q.k >= 8.0) strengths.push("Karakterer over landsgennemsnit");
  if (q.fp <= 5.5) strengths.push("Lavt fravær");
  if (q.kp >= 95) strengths.push("Høj kompetencedækning i undervisningen");
  if (q.tro >= 3.8) strengths.push("God ro og orden i undervisningen");
  if (q.tsi <= 2.5) strengths.push("Lav social isolation blandt elever");
  if (q.el >= 500) strengths.push("Stor og veletableret skole");
  if (strengths.length === 0 && q.ts >= 3.5) strengths.push("Tilfredsstillende trivsel");
  return strengths.slice(0, 4);
}

function deriveImprovements(q) {
  if (!q) return [];
  const improvements = [];
  if (q.ts < 3.4) improvements.push("Elevtrivslen bør styrkes");
  if (q.k < 6.5) improvements.push("Karakterniveau under landsgennemsnit — faglig indsats anbefales");
  if (q.fp > 8.0) improvements.push("Højt fravær — handleplan for fravær anbefales");
  if (q.kp < 80) improvements.push("Kompetencedækningen bør øges");
  if (q.tro < 3.2) improvements.push("Ro og orden i undervisningen kan forbedres");
  if (q.tsi > 3.5) improvements.push("Social isolation blandt elever kræver opmærksomhed");
  return improvements.slice(0, 3);
}

function deriveSummary(school, q, rating) {
  if (!q) return `Kvalitetstilsyn for ${school.n} i skoleåret ${schoolYear}.`;

  const trivsDesc = q.ts >= 3.8 ? "høj" : q.ts >= 3.4 ? "tilfredsstillende" : "under middel";
  const karDesc = q.k >= 8.0 ? "over landsgennemsnit" : q.k >= 6.5 ? "på landsgennemsnit" : "under landsgennemsnit";
  const fravDesc = q.fp <= 5.5 ? "lavt" : q.fp <= 7.5 ? "middel" : "over middel";

  return `Kvalitetstilsyn ${schoolYear}: ${school.n} viser ${trivsDesc} trivsel (${q.ts?.toFixed(1)}), karakterer ${karDesc} (${q.k?.toFixed(1)}) og ${fravDesc} fravær (${q.fp?.toFixed(1)}%). ${rating === "godkendt_bemærkninger" ? "Der er identificeret udviklingsområder." : "Samlet vurdering er tilfredsstillende."}`;
}

async function seed() {
  const rows = [];

  for (const school of schools) {
    const q = school.q;
    if (!q) continue; // Skip schools without quality data

    const rating = deriveRating(q);
    const strengths = deriveStrengths(q);
    const improvements = deriveImprovements(q);
    const summary = deriveSummary(school, q, rating);

    rows.push({
      institution_id: school.id,
      municipality: school.m,
      report_date: "2025-06-01",
      report_year: 2025,
      report_type: "anmeldt",
      overall_rating: rating,
      summary,
      strengths,
      areas_for_improvement: improvements,
      raw_text: null,
      report_url: school.w ? `https://${school.w}` : null,
      source: "quality_data_2024_2025",
    });
  }

  console.log(`Seeding ${rows.length} tilsynsrapporter for schools...`);

  // Upsert in batches of 100
  const BATCH = 100;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("tilsynsrapporter")
      .upsert(batch, { onConflict: "institution_id,report_year,report_type" });

    if (error) {
      console.error(`Batch ${i}-${i + BATCH}: ${error.message}`);
      errors++;
    } else {
      inserted += batch.length;
    }
  }

  console.log(`Done: ${inserted} inserted, ${errors} batch errors`);
}

seed().catch(console.error);
