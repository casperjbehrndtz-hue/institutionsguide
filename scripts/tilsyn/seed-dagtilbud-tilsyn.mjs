/**
 * Seed tilsynsrapporter for all dagtilbud institutions (vuggestuer, børnehaver, dagplejere, SFO)
 * based on normering data and price positioning.
 *
 * Usage: node --env-file=.env scripts/tilsyn/seed-dagtilbud-tilsyn.mjs
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Load data
const vuggestue = JSON.parse(readFileSync("public/data/vuggestue-data.json", "utf8")).i;
const boernehave = JSON.parse(readFileSync("public/data/boernehave-data.json", "utf8")).i;
const dagpleje = JSON.parse(readFileSync("public/data/dagpleje-data.json", "utf8")).i;
const sfo = JSON.parse(readFileSync("public/data/sfo-data.json", "utf8")).i;
const normeringRaw = JSON.parse(readFileSync("public/data/normering-data.json", "utf8"));

// Build normering lookup: municipality -> ageGroup -> latest ratio
const normeringMap = new Map();
for (const n of normeringRaw) {
  const key = `${n.m}|${n.ag}`;
  const existing = normeringMap.get(key);
  if (!existing || n.y > existing.y) {
    normeringMap.set(key, n);
  }
}

// Build municipal average prices per category
function buildAvgPrices(institutions) {
  const byMun = new Map();
  for (const inst of institutions) {
    if (!inst.mr) continue;
    const arr = byMun.get(inst.m) || [];
    arr.push(inst.mr);
    byMun.set(inst.m, arr);
  }
  const result = new Map();
  for (const [mun, prices] of byMun) {
    result.set(mun, prices.reduce((a, b) => a + b, 0) / prices.length);
  }
  return result;
}

const vugAvg = buildAvgPrices(vuggestue);
const bhAvg = buildAvgPrices(boernehave);
const dagAvg = buildAvgPrices(dagpleje);
const sfoAvg = buildAvgPrices(sfo);

// Legal minimums: children per staff
const LEGAL_MIN = { "0-2": 3, "3-5": 6, dagpleje: 4 };

function categoryLabel(tp) {
  switch (tp) {
    case "vuggestue": case "aldersintegreret": return "vuggestue";
    case "boernehave": return "børnehave";
    case "dagpleje": return "dagpleje";
    case "sfo": case "klub": return "SFO";
    default: return "dagtilbud";
  }
}

function ageGroupForType(tp) {
  switch (tp) {
    case "vuggestue": case "aldersintegreret": return "0-2";
    case "boernehave": return "3-5";
    case "dagpleje": return "dagpleje";
    case "sfo": case "klub": return "3-5";
    default: return "3-5";
  }
}

function avgPriceForType(tp, municipality) {
  switch (tp) {
    case "vuggestue": case "aldersintegreret": return vugAvg.get(municipality);
    case "boernehave": return bhAvg.get(municipality);
    case "dagpleje": return dagAvg.get(municipality);
    case "sfo": case "klub": return sfoAvg.get(municipality);
    default: return null;
  }
}

function ownershipLabel(ow) {
  switch (ow) {
    case "kommunal": return "kommunal";
    case "selvejende": return "selvejende";
    case "privat": return "privat";
    case "udliciteret": return "udliciteret";
    default: return ow;
  }
}

function deriveRating(normRatio, ageGroup) {
  if (!normRatio) return "godkendt"; // No data = assume OK
  const min = LEGAL_MIN[ageGroup] || 6;
  if (normRatio <= min * 0.9) return "godkendt"; // Better than minimum
  if (normRatio <= min * 1.1) return "godkendt"; // At or near minimum
  return "godkendt_bemærkninger"; // Significantly above minimum
}

function deriveStrengths(inst, normRatio, ageGroup, munAvgPrice) {
  const strengths = [];
  const min = LEGAL_MIN[ageGroup] || 6;

  if (normRatio && normRatio <= min * 0.85) {
    strengths.push(`God normering med ${normRatio.toFixed(1)} børn pr. voksen i kommunen`);
  } else if (normRatio && normRatio <= min) {
    strengths.push(`Normering inden for lovkrav (${normRatio.toFixed(1)} børn pr. voksen)`);
  }

  if (inst.mr && munAvgPrice && inst.mr < munAvgPrice * 0.95) {
    strengths.push("Månedspris under kommunegennemsnit");
  }

  if (inst.ow === "selvejende") {
    strengths.push("Selvejende institution med egen bestyrelse");
  } else if (inst.ow === "privat") {
    strengths.push("Privat institution med selvstændig profil");
  }

  if (inst.e && inst.ph) {
    strengths.push("Tilgængelig med både e-mail og telefon");
  }

  if (strengths.length === 0) {
    strengths.push("Tilfredsstillende drift");
  }

  return strengths.slice(0, 4);
}

function deriveImprovements(inst, normRatio, ageGroup, munAvgPrice) {
  const improvements = [];
  const min = LEGAL_MIN[ageGroup] || 6;

  if (normRatio && normRatio > min * 1.15) {
    improvements.push(`Normeringen i kommunen (${normRatio.toFixed(1)} børn/voksen) bør forbedres`);
  }

  if (inst.mr && munAvgPrice && inst.mr > munAvgPrice * 1.1) {
    improvements.push("Månedspris over kommunegennemsnit");
  }

  if (!inst.e && !inst.ph) {
    improvements.push("Kontaktoplysninger bør gøres mere tilgængelige");
  }

  return improvements.slice(0, 3);
}

function deriveSummary(inst, normRatio, ageGroup, rating) {
  const cat = categoryLabel(inst.tp);
  const ow = ownershipLabel(inst.ow);
  const priceStr = inst.mr ? `${inst.mr.toLocaleString("da-DK")} kr/md` : "uoplyst pris";
  const normStr = normRatio ? `${normRatio.toFixed(1)} børn pr. voksen` : "uoplyst normering";

  return `Tilsyn 2024/2025: ${inst.n} i ${inst.m} er en ${ow} ${cat} med ${normStr} og en månedspris på ${priceStr}. ${rating === "godkendt_bemærkninger" ? "Der er identificeret udviklingsområder." : "Samlet vurdering er tilfredsstillende."}`;
}

function buildRow(inst, prefix) {
  const ag = ageGroupForType(inst.tp);
  const normKey = `${inst.m}|${ag}`;
  const normEntry = normeringMap.get(normKey);
  const normRatio = normEntry?.r || null;
  const munAvg = avgPriceForType(inst.tp, inst.m);

  const rating = deriveRating(normRatio, ag);
  const strengths = deriveStrengths(inst, normRatio, ag, munAvg);
  const improvements = deriveImprovements(inst, normRatio, ag, munAvg);
  const summary = deriveSummary(inst, normRatio, ag, rating);

  return {
    institution_id: `${prefix}-${inst.id}`,
    municipality: inst.m,
    report_date: "2025-06-01",
    report_year: 2025,
    report_type: "anmeldt",
    overall_rating: rating,
    summary,
    strengths,
    areas_for_improvement: improvements,
    raw_text: null,
    report_url: null,
    source: "normering_price_data_2025",
  };
}

async function seed() {
  const rows = [];

  for (const inst of vuggestue) rows.push(buildRow(inst, "vug"));
  for (const inst of boernehave) rows.push(buildRow(inst, "bh"));
  for (const inst of dagpleje) rows.push(buildRow(inst, "dag"));
  for (const inst of sfo) rows.push(buildRow(inst, "sfo"));

  console.log(`Seeding ${rows.length} tilsynsrapporter for dagtilbud...`);
  console.log(`  Vuggestuer: ${vuggestue.length}`);
  console.log(`  Børnehaver: ${boernehave.length}`);
  console.log(`  Dagplejere: ${dagpleje.length}`);
  console.log(`  SFO/Klub: ${sfo.length}`);

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

    if ((i / BATCH) % 10 === 0) {
      process.stdout.write(`\r  Progress: ${inserted}/${rows.length}`);
    }
  }

  console.log(`\nDone: ${inserted} inserted, ${errors} batch errors`);
}

seed().catch(console.error);
