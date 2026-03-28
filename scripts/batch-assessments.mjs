#!/usr/bin/env node
/**
 * batch-assessments.mjs
 *
 * Pre-generates AI assessments for all institutions (or a subset).
 * Skips institutions that already have a valid (non-expired) cached assessment.
 *
 * Usage:
 *   node scripts/batch-assessments.mjs                    # all institutions
 *   node scripts/batch-assessments.mjs --limit 100        # first 100
 *   node scripts/batch-assessments.mjs --category skole   # only schools
 *   node scripts/batch-assessments.mjs --dry-run           # show what would be generated
 *
 * Required env vars:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
 *
 * Cost estimate: ~0.02-0.05 kr. per assessment with Sonnet.
 * Full run (~5,000 institutions): ~100-250 kr.
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

// ── Parse CLI args ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const limitIdx = args.indexOf("--limit");
const catIdx = args.indexOf("--category");
const regionIdx = args.indexOf("--region");
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;
const CATEGORY_FILTER = catIdx !== -1 ? args[catIdx + 1] : null;
const REGION_FILTER = regionIdx !== -1 ? args[regionIdx + 1] : null;
const DRY_RUN = args.includes("--dry-run");
const DELAY_MS = 500; // Rate limiting: 2 requests/sec

const REGIONS = {
  hovedstaden: ["København","Frederiksberg","Gentofte","Gladsaxe","Herlev","Rødovre","Hvidovre","Brøndby","Vallensbæk","Ishøj","Albertslund","Ballerup","Glostrup","Tårnby","Dragør","Rudersdal","Lyngby-Taarbæk","Furesø","Høje-Taastrup","Egedal","Frederikssund","Helsingør","Hillerød","Hørsholm","Fredensborg","Gribskov","Halsnæs","Allerød","Bornholm"],
  aarhus: ["Aarhus","Skanderborg","Favrskov","Syddjurs","Norddjurs","Odder","Silkeborg","Randers"],
  odense: ["Odense","Kerteminde","Nordfyns","Nyborg","Faaborg-Midtfyn","Assens","Middelfart","Svendborg"],
};

// ── Load data ───────────────────────────────────────────────────────────────

function loadData(file, category) {
  const raw = JSON.parse(readFileSync(join(DATA_DIR, file), "utf-8"));
  // Dagtilbud files use { i: [...] }, school file uses { s: [...] }
  const items = raw.i || raw.s || [];
  return items.map((inst) => ({ ...inst, category }));
}

const allInstitutions = [
  ...loadData("vuggestue-data.json", "vuggestue"),
  ...loadData("boernehave-data.json", "boernehave"),
  ...loadData("dagpleje-data.json", "dagpleje"),
  ...loadData("sfo-data.json", "sfo"),
  ...loadData("skole-data.json", "skole"),
];

const normering = JSON.parse(readFileSync(join(DATA_DIR, "normering-data.json"), "utf-8"));

console.log(`Loaded ${allInstitutions.length} institutions, ${normering.length} normering entries`);

// ── Scoring (mirrors client-side logic) ─────────────────────────────────────

function clamp(v, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

function linearMap(value, inMin, inMax, outMin = 0, outMax = 100) {
  return clamp(outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin));
}

function toGrade(score) {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "E";
}

function computeOverall(inst, avgPrice) {
  if (inst.category === "skole" && inst.q) {
    const q = inst.q;
    const metrics = [];
    if (q.ts != null) metrics.push({ w: 0.2, s: linearMap(q.ts, 3.5, 4.3) });
    if (q.k != null) metrics.push({ w: 0.2, s: linearMap(q.k, 5.0, 10.0) });
    if (q.fp != null) metrics.push({ w: 0.15, s: linearMap(q.fp, 12, 3) });
    if (q.kp != null) metrics.push({ w: 0.15, s: linearMap(q.kp, 70, 100) });
    if (q.kv != null) metrics.push({ w: 0.15, s: linearMap(q.kv, 28, 12) });
    if (q.sr != null) {
      const srScore = q.sr === "Over niveau" ? 100 : q.sr === "På niveau" ? 60 : q.sr === "Under niveau" ? 20 : 50;
      metrics.push({ w: 0.15, s: srScore });
    }
    if (metrics.length === 0) return 50;
    const totalW = metrics.reduce((s, m) => s + m.w, 0);
    return Math.round(metrics.reduce((s, m) => s + m.s * m.w / totalW, 0));
  }

  // Dagtilbud
  const metrics = [];
  if (inst.mr != null && avgPrice != null && avgPrice > 0) {
    const pctDiff = (inst.mr - avgPrice) / avgPrice;
    metrics.push({ w: 0.35, s: linearMap(pctDiff, 0.2, -0.2) });
  }
  const ageGroup = (inst.category === "vuggestue" || inst.category === "dagpleje") ? "0-2" : "3-5";
  const entries = normering.filter(
    (n) => (n.m || n.municipality || "").toLowerCase() === (inst.m || "").toLowerCase() && (n.ag || n.ageGroup) === ageGroup
  );
  const latest = entries.sort((a, b) => (b.y || b.year) - (a.y || a.year))[0];
  if (latest) {
    const ratio = latest.r || latest.ratio;
    const good = ageGroup === "0-2" ? 3.0 : 6.0;
    const bad = ageGroup === "0-2" ? 4.5 : 9.0;
    metrics.push({ w: 0.35, s: linearMap(ratio, bad, good) });
  }
  if (inst.ow) {
    const scores = { kommunal: 70, selvejende: 75, privat: 60 };
    metrics.push({ w: 0.15, s: scores[inst.ow.toLowerCase()] ?? 65 });
  }
  const contactCount = [inst.e, inst.ph, inst.w].filter(Boolean).length;
  metrics.push({ w: 0.15, s: contactCount === 3 ? 100 : contactCount >= 1 ? 50 : 20 });

  if (metrics.length === 0) return 50;
  const totalW = metrics.reduce((s, m) => s + m.w, 0);
  return Math.round(metrics.reduce((s, m) => s + m.s * m.w / totalW, 0));
}

// ── Build prompt context ────────────────────────────────────────────────────

function buildSystemPrompt(inst) {
  const isSchool = inst.category === "skole";
  return `Du er en datadrevet rådgiver for danske forældre der vælger ${isSchool ? "skole" : "daginstitution"}.
Du modtager strukturerede data om én institution og dens nærområde.
Din opgave er at vurdere institutionen ærligt og nuanceret — som en betroet ven der tilfældigvis kender alt til ${isSchool ? "skoler" : "børnepasning"} i Danmark.

Svar KUN med valid JSON. Ingen markdown, ingen backticks, ingen forklaring udenfor JSON.

{
  "headline": {"da": "<maks 6 ord>", "en": "<max 6 words>"},
  "summary": {"da": "<2-3 sætninger>", "en": "<2-3 sentences>"},
  "pros": [{"da": "<fordel>", "en": "<strength>"}, ...],
  "cons": [{"da": "<opmærksomhedspunkt>", "en": "<concern>"}, ...],
  "recommendation": {"da": "<2-3 sætninger, handlingsorienteret>", "en": "<2-3 sentences>"}
}

Regler for fordele og ulemper — vær SPECIFIK og datadrevet:
Gode eksempler: "Normering på 3.1 er markant bedre end kommunens gennemsnit på 3.4"
Dårlige eksempler: "God normering" (for vagt), "Hyggelig institution" (subjektivt)

- 2-4 pros, 1-3 cons (altid mindst én con)
- Brug konkrete tal fra dataen — sammenlign med kommunegennemsnit
- Cons skal være reelle, ikke konstruerede. Hvis data mangler, nævn det IKKE
- headline: kort, præcis (fx "Stærkt fagligt valg" eller "Billig, men høj normering")
- recommendation: hjælp forælderen med at HANDLE — hvem passer det til, hvad skal de være opmærksomme på, konkret råd
${isSchool ? `
Data du kan vurdere på:
- Trivsel: 3.5-4.3 skala, landsgennemsnit ~3.85
- Karakterer: 2-12 skala, landsgennemsnit ~7.0
- Fravær: lavere er bedre, landsgennemsnit ~6.5%
- Kompetencedækning: andel timer med kvalificeret lærer, mål 95%+
- Klassestørrelse: landsgennemsnit ~21 elever
- Undervisningseffekt (socioøkonomisk reference): "Over niveau" = skolen løfter eleverne` : `
Data du kan vurdere på:
- Normering 0-2 år: anbefalet ≤3.0, landsgennemsnit ~3.3
- Normering 3-5 år: anbefalet ≤6.0, landsgennemsnit ~6.4
- Pris: sammenlign med kommunegennemsnittet
- Ejerskab: kommunal (direkte tilsyn), selvejende (uafhængig drift), privat (egne valg)`}`;
}

function buildUserPrompt(inst, avgPrice, nearbyList) {
  const lines = [`Vurder denne institution:`];
  lines.push(`Navn: ${inst.n}`);
  lines.push(`Type: ${inst.category}`);
  lines.push(`Kommune: ${inst.m}`);

  const score = computeOverall(inst, avgPrice);
  lines.push(`Samlet score: ${score}/100 (grade: ${toGrade(score)})`);

  if (inst.mr != null) {
    lines.push(`Månedspris: ${inst.mr} kr.`);
    if (avgPrice != null) lines.push(`Kommunegennemsnit pris: ${Math.round(avgPrice)} kr.`);
  }
  if (inst.ow) lines.push(`Ejerskab: ${inst.ow}`);

  const ageGroup = (inst.category === "vuggestue" || inst.category === "dagpleje") ? "0-2" : "3-5";
  const entries = normering.filter(
    (n) => (n.m || n.municipality || "").toLowerCase() === (inst.m || "").toLowerCase() && (n.ag || n.ageGroup) === ageGroup
  );
  const latest = entries.sort((a, b) => (b.y || b.year) - (a.y || a.year))[0];
  if (latest) lines.push(`Normering: ${latest.r || latest.ratio} børn/voksen (${ageGroup})`);

  if (inst.q) {
    const q = inst.q;
    if (q.ts != null) lines.push(`Trivsel: ${q.ts}`);
    if (q.k != null) lines.push(`Karaktergennemsnit: ${q.k}`);
    if (q.fp != null) lines.push(`Fravær: ${q.fp}%`);
    if (q.kp != null) lines.push(`Kompetencedækning: ${q.kp}%`);
    if (q.kv != null) lines.push(`Klassestørrelse: ${q.kv} elever`);
    if (q.sr) lines.push(`Undervisningseffekt: ${q.sr}`);
  }

  if (nearbyList.length > 0) {
    lines.push(`\nNaboinstitutioner:`);
    for (const n of nearbyList.slice(0, 3)) {
      const parts = [n.n, `${n.dist.toFixed(1)} km`];
      if (n.mr) parts.push(`${n.mr} kr./md.`);
      lines.push(`  - ${parts.join(", ")}`);
    }
  }

  return lines.join("\n");
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // Filter institutions
  let candidates = allInstitutions;
  if (CATEGORY_FILTER) {
    candidates = candidates.filter((i) => i.category === CATEGORY_FILTER);
  }
  if (REGION_FILTER && REGIONS[REGION_FILTER]) {
    const munis = new Set(REGIONS[REGION_FILTER].map((m) => m.toLowerCase()));
    candidates = candidates.filter((i) => munis.has((i.m || "").toLowerCase()));
  }

  if (LIMIT < candidates.length) {
    candidates = candidates.slice(0, LIMIT);
  }

  console.log(`Candidates: ${candidates.length}${DRY_RUN ? " (dry run)" : ""}`);

  // Check which ones already have valid cache
  const { data: existing } = await supabase
    .from("assessments")
    .select("institution_id")
    .gt("expires_at", new Date().toISOString());

  const cachedIds = new Set((existing || []).map((r) => r.institution_id));
  const toGenerate = candidates.filter((i) => !cachedIds.has(i.id));

  console.log(`Already cached: ${cachedIds.size}, to generate: ${toGenerate.length}`);

  if (DRY_RUN) {
    console.log("Dry run — exiting.");
    return;
  }

  // Pre-compute municipality avg prices
  const pricesByMuniCat = {};
  for (const inst of allInstitutions) {
    const key = `${inst.m}|${inst.category}`;
    if (!pricesByMuniCat[key]) pricesByMuniCat[key] = [];
    if (inst.mr != null && inst.mr > 0) pricesByMuniCat[key].push(inst.mr);
  }
  const avgPrices = {};
  for (const [key, prices] of Object.entries(pricesByMuniCat)) {
    avgPrices[key] = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
  }

  let success = 0;
  let errors = 0;

  for (let i = 0; i < toGenerate.length; i++) {
    const inst = toGenerate[i];
    const avgPrice = avgPrices[`${inst.m}|${inst.category}`] ?? null;

    // Find nearby
    const nearby = allInstitutions
      .filter((o) => o.id !== inst.id && o.category === inst.category)
      .map((o) => ({
        ...o,
        dist: Math.hypot(o.la - inst.la, o.lo - inst.lo) * 111,
      }))
      .filter((o) => o.dist < 5)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3);

    const score = computeOverall(inst, avgPrice);
    const grade = toGrade(score);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1200,
          system: buildSystemPrompt(inst),
          messages: [{ role: "user", content: buildUserPrompt(inst, avgPrice, nearby) }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[${i + 1}/${toGenerate.length}] FAIL ${inst.id} ${inst.n}: ${response.status} ${errText.slice(0, 100)}`);
        errors++;
        await sleep(2000); // Back off on error
        continue;
      }

      const data = await response.json();
      let rawText = data.content[0].text.trim();
      // Strip markdown code fences if Claude wraps the JSON
      if (rawText.startsWith("```")) {
        rawText = rawText.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
      }
      const assessment = JSON.parse(rawText);

      const row = {
        institution_id: inst.id,
        score,
        grade,
        headline: assessment.headline,
        summary: assessment.summary,
        pros: assessment.pros,
        cons: assessment.cons,
        recommendation: assessment.recommendation,
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const { error: upsertError } = await supabase.from("assessments").upsert(row);

      if (upsertError) {
        console.error(`[${i + 1}/${toGenerate.length}] DB ERROR ${inst.id}: ${upsertError.message}`);
        errors++;
      } else {
        success++;
        if (success % 50 === 0 || i === toGenerate.length - 1) {
          console.log(`[${i + 1}/${toGenerate.length}] Progress: ${success} ok, ${errors} errors`);
        }
      }
    } catch (err) {
      console.error(`[${i + 1}/${toGenerate.length}] ERROR ${inst.id}: ${err.message}`);
      errors++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`\nDone. ${success} generated, ${errors} errors, ${cachedIds.size} already cached.`);
  const estimatedCost = success * 0.04; // ~0.04 kr per call estimate
  console.log(`Estimated cost: ~${estimatedCost.toFixed(0)} kr.`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
