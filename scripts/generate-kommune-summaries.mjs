#!/usr/bin/env node
/**
 * generate-kommune-summaries.mjs
 *
 * Pre-generates AI summaries for /kommune-intelligens/:kommune
 * (one per (municipality, track) — ~196 total).
 *
 * Mirrors the metric extraction in src/lib/mi/metrics.ts and the kommune-median
 * pattern in src/lib/mi/aggregate.ts, but at a level of detail that matches
 * what the LLM actually needs (raw kommune median vs national median, plus
 * weighted top-drivers). No ECDF math.
 *
 * Usage:
 *   node scripts/generate-kommune-summaries.mjs                    # all kommuner × tracks
 *   node scripts/generate-kommune-summaries.mjs --kommune Aarhus   # one kommune
 *   node scripts/generate-kommune-summaries.mjs --track school     # one track
 *   node scripts/generate-kommune-summaries.mjs --limit 1          # smoke test
 *   node scripts/generate-kommune-summaries.mjs --dry-run          # build context, skip API
 *
 * Required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
 *
 * Cost: ~0.05-0.10 kr. per call with Sonnet → 196 × ~0.08 ≈ 15-20 kr.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "public", "data");

// ── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ANTHROPIC_API_KEY) {
  console.error("Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const args = process.argv.slice(2);
const kommuneIdx = args.indexOf("--kommune");
const trackIdx = args.indexOf("--track");
const limitIdx = args.indexOf("--limit");
const KOMMUNE_FILTER = kommuneIdx !== -1 ? args[kommuneIdx + 1] : null;
const TRACK_FILTER = trackIdx !== -1 ? args[trackIdx + 1] : null;
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;
const DRY_RUN = args.includes("--dry-run");
const DELAY_MS = 600;

// ── Municipality name normalization ─────────────────────────────────────────
// Mirrors src/lib/dataTransform.ts:10-12

const GENITIVE = {
  "Københavns Kommune": "København",
  "Vesthimmerlands Kommune": "Vesthimmerland",
  "Bornholms Regionskommune": "Bornholm",
};

function normalizeMunicipality(m) {
  if (!m) return "";
  return GENITIVE[m] ?? m.replace(/ Kommune$/, "");
}

// ── Load source files ───────────────────────────────────────────────────────

function readJson(filename) {
  return JSON.parse(readFileSync(join(DATA_DIR, filename), "utf-8"));
}

const schoolFile = readJson("skole-data.json");
const vuggestueFile = readJson("vuggestue-data.json");
const boernehaveFile = readJson("boernehave-data.json");
const dagplejeFile = readJson("dagpleje-data.json");
const normeringFile = readJson("normering-data.json");
const kommuneStats = readJson("kommune-stats.json");
const institutionStats = readJson("institution-stats.json");
const parentSatisfaction = readJson("parent-satisfaction.json");

const schools = (schoolFile.s || schoolFile.i || []).map((s) => ({
  ...s,
  m: normalizeMunicipality(s.m),
  category: s.t === "f" ? "skole" : s.t === "p" ? "friskole" : s.t === "e" ? "efterskole" : "skole",
})).filter((s) => s.t === "f"); // only folkeskole (matches isInTrack(school) which excludes efterskole/friskole? -> isInTrack uses category === "skole")

// Actually src/lib/mi/metrics.ts uses category "skole" — schoolToUnified marks both folkeskole AND friskole as "skole" (only "e"=efterskole differs).
// Re-build with same rule:
const allSchools = (schoolFile.s || schoolFile.i || []).map((s) => ({
  ...s,
  m: normalizeMunicipality(s.m),
})).filter((s) => s.t !== "e" && s.t !== "u" && s.la && s.lo);

const vuggestue = (vuggestueFile.i || []).map((d) => ({ ...d, m: normalizeMunicipality(d.m), category: "vuggestue" }));
const boernehave = (boernehaveFile.i || []).map((d) => ({ ...d, m: normalizeMunicipality(d.m), category: "boernehave" }));
const dagpleje = (dagplejeFile.i || []).map((d) => ({ ...d, m: normalizeMunicipality(d.m), category: "dagpleje" }));
const allDaycare = [...vuggestue, ...boernehave, ...dagpleje];

const instStatsMap = institutionStats.institutions || {};
const parentSatMap = parentSatisfaction.municipalities || {};

console.log(`Loaded: ${allSchools.length} schools (folke+fri), ${allDaycare.length} daycare institutions`);

// ── Metric definitions (mirrors src/lib/mi/metrics.ts) ──────────────────────

// direction: +1 = higher better, -1 = lower better
// Each extract returns a number or null per institution.

function extractNormering(inst) {
  const ageGroup = inst.category === "boernehave" ? "3-5" : "0-2";
  const stats = instStatsMap[inst.id?.replace(/^(vuggestue-|boernehave-|dagpleje-)/, "")] ?? instStatsMap[inst.id];
  const fromInst = stats ? (ageGroup === "0-2" ? stats.normering02 : stats.normering35) : null;
  if (fromInst != null && Number.isFinite(fromInst)) return fromInst;
  // Fallback to kommune-level normering data
  const muniLower = inst.m.toLowerCase();
  const candidates = normeringFile
    .filter((n) => n.m.toLowerCase() === muniLower && n.ag === ageGroup)
    .sort((a, b) => b.y - a.y);
  return candidates[0]?.r ?? null;
}

function extractPctPaedagoger(inst) {
  const stats = instStatsMap[inst.id];
  if (stats?.pctPaedagog != null) return stats.pctPaedagog;
  const ks = kommuneStats.kommuner?.[inst.m];
  return ks?.pctPaedagoger ?? null;
}

function extractSygefravaer(inst) {
  const ks = kommuneStats.kommuner?.[inst.m];
  return ks?.avgSygefravaerDage ?? null;
}

function extractParentSatisfaction(inst) {
  const sat = parentSatMap[inst.id];
  return sat?.overallSatisfaction ?? null;
}

function extractTakst(inst) {
  return inst.mr ?? null;
}

const DAYCARE_METRICS = [
  { id: "d_norm",      direction: -1, weight: 4, label: "Normering",            unit: "børn/voksen", extract: extractNormering },
  { id: "d_uddannet",  direction:  1, weight: 2, label: "Uddannede pædagoger",  unit: "%",            extract: extractPctPaedagoger },
  { id: "d_stabil",    direction: -1, weight: 2, label: "Personalestabilitet",  unit: "sygedage/år",  extract: extractSygefravaer },
  { id: "d_tilfreds",  direction:  1, weight: 2, label: "Forældretilfredshed",  unit: "/5",           extract: extractParentSatisfaction },
  { id: "d_takst",     direction: -1, weight: 1, label: "Forældrebetaling",     unit: "kr./md.",      extract: extractTakst },
];

const SCHOOL_METRICS = [
  { id: "s_undeff",    direction:  1, weight: 4, label: "Undervisningseffekt",     unit: "Δ karakter", extract: (s) => s.q?.srd ?? null },
  { id: "s_triv_s",    direction:  1, weight: 3, label: "Social trivsel",          unit: "/5",          extract: (s) => s.q?.ts ?? null },
  { id: "s_triv_f",    direction:  1, weight: 3, label: "Faglig trivsel",          unit: "/5",          extract: (s) => s.q?.tf ?? null },
  { id: "s_grade",     direction:  1, weight: 2, label: "Karaktergennemsnit",      unit: "FP9",         extract: (s) => s.q?.k ?? null },
  { id: "s_komp",      direction:  1, weight: 2, label: "Kompetencedækning",       unit: "%",           extract: (s) => s.q?.kp ?? null },
  { id: "s_fravaer",   direction: -1, weight: 1, label: "Elevfravær",              unit: "%",           extract: (s) => s.q?.fp ?? null },
  { id: "s_overgang",  direction:  1, weight: 1, label: "Overgang til ungdomsudd.", unit: "%",          extract: (s) => s.q?.oug ?? null },
];

// ── Aggregation ─────────────────────────────────────────────────────────────

function median(arr) {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function buildSnapshot(track) {
  const insts = track === "daycare" ? allDaycare : allSchools;
  const metrics = track === "daycare" ? DAYCARE_METRICS : SCHOOL_METRICS;

  // Group institutions by kommune
  const byKommune = new Map();
  for (const inst of insts) {
    if (!inst.m) continue;
    let arr = byKommune.get(inst.m);
    if (!arr) { arr = []; byKommune.set(inst.m, arr); }
    arr.push(inst);
  }

  // Per metric: extract raw values, compute kommune medians + national median
  const perMetric = {};
  for (const metric of metrics) {
    const allValues = [];
    const byMuni = new Map();
    for (const inst of insts) {
      const v = metric.extract(inst);
      if (v == null || !Number.isFinite(v)) continue;
      allValues.push(v);
      let arr = byMuni.get(inst.m);
      if (!arr) { arr = []; byMuni.set(inst.m, arr); }
      arr.push(v);
    }
    const kommuneMedians = {};
    for (const [muni, vals] of byMuni) kommuneMedians[muni] = median(vals);
    perMetric[metric.id] = {
      metric,
      nationalMedian: median(allValues),
      kommuneMedians,
      observedKommuner: byMuni.size,
      totalObservations: allValues.length,
    };
  }

  return { track, byKommune, perMetric, metrics };
}

function formatValue(value, unit) {
  if (value == null || !Number.isFinite(value)) return "—";
  if (unit === "kr./md.") return `${Math.round(value).toLocaleString("da-DK")} kr.`;
  if (unit === "%") return `${value < 10 ? value.toFixed(1) : Math.round(value)}%`;
  if (unit === "/5") return `${value.toFixed(2)} / 5`;
  if (unit === "FP9") return value.toFixed(1);
  if (unit === "Δ karakter") return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
  if (unit === "børn/voksen") return `${value.toFixed(1)} pr. voksen`;
  if (unit === "sygedage/år") return `${value.toFixed(1)} dage`;
  return value.toFixed(1);
}

function buildContextForKommune(snapshot, kommune) {
  const rows = snapshot.metrics.map((metric) => {
    const cell = snapshot.perMetric[metric.id];
    const muniMedian = cell.kommuneMedians[kommune] ?? null;
    const natMedian = cell.nationalMedian;
    let deviation = null;
    let weightedScore = 0;
    if (muniMedian != null && natMedian != null && natMedian !== 0) {
      // Direction-corrected percent deviation
      const rawPct = (muniMedian - natMedian) / Math.abs(natMedian) * 100;
      deviation = rawPct * metric.direction; // positive = better than national
      weightedScore = deviation * metric.weight;
    }
    return { metric, muniMedian, natMedian, deviation, weightedScore };
  });

  const present = rows.filter((r) => r.muniMedian != null && r.natMedian != null);
  const drivers = [...present].sort((a, b) => Math.abs(b.weightedScore) - Math.abs(a.weightedScore));
  const topPositive = drivers.filter((d) => d.deviation > 5).slice(0, 3);
  const topNegative = drivers.filter((d) => d.deviation < -5).slice(0, 2);

  const nInst = (snapshot.byKommune.get(kommune) ?? []).length;
  return { rows, present, topPositive, topNegative, nInst };
}

// ── Prompt ──────────────────────────────────────────────────────────────────

function buildSystemPrompt() {
  return `Du er en datadrevet rådgiver for danske forældre der vælger kommune for deres barns dagtilbud eller folkeskole.
Du modtager strukturerede data om én kommune på ét af to spor (dagtilbud eller folkeskole).
Din opgave er at skrive en kort, ærlig narrativ om hvor kommunen står stærkt og svagt, baseret KUN på de tal du får.

Svar KUN med valid JSON. Ingen markdown, ingen backticks, ingen forklaring udenfor JSON.

{
  "summary": "<120-180 ord på dansk, ren prosa, 2-3 afsnit>",
  "strengths": ["<konkret styrke med tal>", "<konkret styrke med tal>"],
  "watchouts": ["<reelt opmærksomhedspunkt med tal>"]
}

Regler:
- Brug KUN tal og metrikker som er givet i input. Find ikke på data. Hvis et tal mangler, nævn det IKKE.
- Sammenlign altid med landsmedianen — fx "Trivsel 3.95 mod landsmedian 3.85".
- Vær konkret: "Normering 2.9 børn pr. voksen — bedre end landsmedian 3.2" slår "god normering".
- Prosaen skal hjælpe en forælder forstå HVORFOR kommunen rangerer som den gør, ikke kopiere tabellen.
- 2-4 strengths, 1-2 watchouts. Mindst én watchout hvis data viser svaghed; ellers udelad watchouts (tom liste).
- Ingen finansiel rådgivning, ingen superlativer ("bedst", "Danmarks førende"), ingen marketingsprog.
- Skriv som en betroet ven der kender alle 98 kommuner. Saglig, præcis, ikke tør.
- Brug kommunens navn naturligt (fx "Aarhus", ikke "Aarhus Kommune" hver gang).
- Slut prosaen med en sætning om hvad forældre bør være opmærksomme på når de vurderer kommunen.`;
}

function buildUserPrompt(kommune, track, ctx) {
  const trackLabel = track === "daycare" ? "dagtilbud (vuggestue, børnehave, dagpleje)" : "folkeskole";
  const lines = [
    `Kommune: ${kommune}`,
    `Spor: ${trackLabel}`,
    `Antal institutioner i sporet: ${ctx.nInst}`,
    "",
    "Metrikker (kommune-median vs landsmedian):",
  ];
  for (const r of ctx.rows) {
    if (r.muniMedian == null) {
      lines.push(`- ${r.metric.label}: data mangler i ${kommune}`);
      continue;
    }
    const muni = formatValue(r.muniMedian, r.metric.unit);
    const nat = formatValue(r.natMedian, r.metric.unit);
    const tag = r.deviation == null
      ? ""
      : r.deviation > 5 ? " (stærkere end landsmedian)"
      : r.deviation < -5 ? " (svagere end landsmedian)"
      : " (på linje med landsmedian)";
    lines.push(`- ${r.metric.label}: kommune ${muni} · landsmedian ${nat}${tag}`);
  }
  if (ctx.topPositive.length > 0) {
    lines.push("", "Stærkeste områder (vægtet afvigelse fra landsmedian, retning-korrigeret):");
    for (const d of ctx.topPositive) lines.push(`  · ${d.metric.label}: ${Math.abs(d.deviation).toFixed(0)}% bedre end landsmedian`);
  }
  if (ctx.topNegative.length > 0) {
    lines.push("", "Svagheder (vægtet afvigelse fra landsmedian, retning-korrigeret):");
    for (const d of ctx.topNegative) lines.push(`  · ${d.metric.label}: ${Math.abs(d.deviation).toFixed(0)}% værre end landsmedian`);
  }
  return lines.join("\n");
}

// ── Main ────────────────────────────────────────────────────────────────────

async function callClaude(systemPrompt, userPrompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic ${response.status}: ${errText.slice(0, 200)}`);
  }
  const data = await response.json();
  let raw = data.content[0].text.trim();
  if (raw.startsWith("```")) raw = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  return JSON.parse(raw);
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  const tracks = TRACK_FILTER ? [TRACK_FILTER] : ["daycare", "school"];
  const snapshots = {};
  for (const track of tracks) snapshots[track] = buildSnapshot(track);

  const tasks = [];
  for (const track of tracks) {
    const snap = snapshots[track];
    for (const kommune of snap.byKommune.keys()) {
      if (KOMMUNE_FILTER && kommune.toLowerCase() !== KOMMUNE_FILTER.toLowerCase()) continue;
      tasks.push({ track, kommune });
    }
  }
  tasks.sort((a, b) => a.kommune.localeCompare(b.kommune, "da-DK"));

  const limited = tasks.slice(0, LIMIT);
  console.log(`Tasks: ${limited.length}${DRY_RUN ? " (dry run)" : ""}`);

  let success = 0;
  let errors = 0;

  for (let i = 0; i < limited.length; i++) {
    const { track, kommune } = limited[i];
    const ctx = buildContextForKommune(snapshots[track], kommune);

    if (ctx.nInst === 0 || ctx.present.length < 2) {
      console.log(`[${i + 1}/${limited.length}] SKIP ${kommune} (${track}) — for lidt data (n=${ctx.nInst}, metrics=${ctx.present.length})`);
      continue;
    }

    const userPrompt = buildUserPrompt(kommune, track, ctx);
    const systemPrompt = buildSystemPrompt();

    if (DRY_RUN) {
      console.log(`\n=== ${kommune} (${track}) ===`);
      console.log(userPrompt);
      continue;
    }

    try {
      const result = await callClaude(systemPrompt, userPrompt);
      const row = {
        municipality: kommune,
        track,
        summary: result.summary,
        strengths: result.strengths || [],
        watchouts: result.watchouts || [],
        metrics_snapshot: {
          n_inst: ctx.nInst,
          rows: ctx.rows.map((r) => ({
            id: r.metric.id,
            label: r.metric.label,
            unit: r.metric.unit,
            muniMedian: r.muniMedian,
            natMedian: r.natMedian,
            deviation: r.deviation,
          })),
        },
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
      const { error } = await supabase.from("kommune_intelligens_summaries").upsert(row);
      if (error) {
        console.error(`[${i + 1}/${limited.length}] DB FAIL ${kommune} (${track}): ${error.message}`);
        errors++;
      } else {
        success++;
        console.log(`[${i + 1}/${limited.length}] OK ${kommune} (${track})`);
      }
    } catch (err) {
      console.error(`[${i + 1}/${limited.length}] ERROR ${kommune} (${track}): ${err.message}`);
      errors++;
      await sleep(2000);
    }

    await sleep(DELAY_MS);
  }

  console.log(`\nDone. ${success} ok, ${errors} errors of ${limited.length} tasks.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
