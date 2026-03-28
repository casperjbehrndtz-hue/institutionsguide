/**
 * Insight Engine — transforms raw quality data into
 * human-readable risk signals, percentile profiles,
 * and contextual comparisons.
 *
 * This is the premium data layer of Institutionsguide.
 */

import type { SchoolQuality, UnifiedInstitution } from "./types";

// ── National percentile thresholds (precomputed from 2025 data) ─────────

interface PercentileThresholds {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

const THRESHOLDS: Record<string, PercentileThresholds> = {
  trivsel:    { p10: 3.8, p25: 3.8, p50: 3.9, p75: 4.0, p90: 4.1 },
  inklusion:  { p10: 2.9, p25: 3.0, p50: 3.1, p75: 3.2, p90: 3.3 },
  ro_orden:   { p10: 3.5, p25: 3.6, p50: 3.7, p75: 3.8, p90: 3.9 },
  karakterer: { p10: 6.3, p25: 6.9, p50: 7.4, p75: 8.0, p90: 8.5 },
  fravaer:    { p10: 5.4, p25: 6.3, p50: 7.4, p75: 8.3, p90: 9.3 },
  kompetence: { p10: 74.8, p25: 81.2, p50: 86.8, p75: 91.3, p90: 95.0 },
  klassekv:   { p10: 14.8, p25: 18.2, p50: 20.4, p75: 22.1, p90: 23.3 },
};

// National averages
const NATIONAL_AVG = {
  trivsel: 3.9,
  inklusion: 3.1,
  ro_orden: 3.7,
  karakterer: 7.4,
  fravaer: 7.4,
  kompetence: 86.8,
  klassekv: 20.4,
};

// ── Percentile calculation ──────────────────────────────────────────────

export type PercentileTier = "top10" | "top25" | "above_avg" | "average" | "below_avg" | "bottom25" | "bottom10";

export function getPercentileTier(value: number, metric: string, higherIsBetter = true): PercentileTier {
  const t = THRESHOLDS[metric];
  if (!t) return "average";

  if (higherIsBetter) {
    if (value >= t.p90) return "top10";
    if (value >= t.p75) return "top25";
    if (value >= t.p50) return "above_avg";
    if (value >= t.p25) return "average";
    if (value >= t.p10) return "below_avg";
    return "bottom10";
  } else {
    // Lower is better (e.g., absence, class size)
    if (value <= t.p10) return "top10";
    if (value <= t.p25) return "top25";
    if (value <= t.p50) return "above_avg";
    if (value <= t.p75) return "average";
    if (value <= t.p90) return "below_avg";
    return "bottom10";
  }
}

export function getPercentileLabel(tier: PercentileTier, lang: "da" | "en"): string {
  const labels: Record<PercentileTier, Record<string, string>> = {
    top10:     { da: "Top 10%", en: "Top 10%" },
    top25:     { da: "Top 25%", en: "Top 25%" },
    above_avg: { da: "Over middel", en: "Above average" },
    average:   { da: "Middel", en: "Average" },
    below_avg: { da: "Under middel", en: "Below average" },
    bottom25:  { da: "Bund 25%", en: "Bottom 25%" },
    bottom10:  { da: "Bund 10%", en: "Bottom 10%" },
  };
  return labels[tier][lang] || labels[tier].da;
}

// ── Flag system ─────────────────────────────────────────────────────────

export type FlagSeverity = "red" | "yellow" | "green";

export interface InsightFlag {
  severity: FlagSeverity;
  metric: string;
  title: { da: string; en: string };
  detail: { da: string; en: string };
  value: number;
  reference: number; // national average or threshold
  percentileTier: PercentileTier;
}

export function generateFlags(q: SchoolQuality): InsightFlag[] {
  const flags: InsightFlag[] = [];

  // ── Fravær (absence) — lower is better ──
  if (q.fp !== undefined) {
    const tier = getPercentileTier(q.fp, "fravaer", false);
    const pctAboveAvg = ((q.fp - NATIONAL_AVG.fravaer) / NATIONAL_AVG.fravaer * 100).toFixed(0);
    const missedDays = Math.round(q.fp / 100 * 200); // ~200 school days/year

    if (tier === "bottom10" || tier === "below_avg") {
      flags.push({
        severity: "red",
        metric: "fravaer",
        title: { da: "Højt fravær", en: "High absence" },
        detail: {
          da: `${q.fp.toLocaleString("da-DK")}% fravær — ${pctAboveAvg}% over landsgennemsnittet. Gennemsnitligt fravær svarer til ca. ${missedDays} tabte skoledage per elev om året.`,
          en: `${q.fp}% absence — ${pctAboveAvg}% above the national average. Average absence equals approx. ${missedDays} lost school days per student per year.`,
        },
        value: q.fp,
        reference: NATIONAL_AVG.fravaer,
        percentileTier: tier,
      });
    } else if (tier === "average") {
      flags.push({
        severity: "yellow",
        metric: "fravaer",
        title: { da: "Middel fravær", en: "Average absence" },
        detail: {
          da: `${q.fp.toLocaleString("da-DK")}% fravær — tæt på landsgennemsnittet (${NATIONAL_AVG.fravaer}%).`,
          en: `${q.fp}% absence — close to the national average (${NATIONAL_AVG.fravaer}%).`,
        },
        value: q.fp,
        reference: NATIONAL_AVG.fravaer,
        percentileTier: tier,
      });
    } else {
      flags.push({
        severity: "green",
        metric: "fravaer",
        title: { da: "Lavt fravær", en: "Low absence" },
        detail: {
          da: `${q.fp.toLocaleString("da-DK")}% fravær — under landsgennemsnittet (${NATIONAL_AVG.fravaer}%).`,
          en: `${q.fp}% absence — below the national average (${NATIONAL_AVG.fravaer}%).`,
        },
        value: q.fp,
        reference: NATIONAL_AVG.fravaer,
        percentileTier: tier,
      });
    }
  }

  // ── Social inklusion (bullying proxy) — higher is better ──
  if (q.tsi !== undefined) {
    const tier = getPercentileTier(q.tsi, "inklusion", true);
    const pctDiff = ((q.tsi - NATIONAL_AVG.inklusion) / NATIONAL_AVG.inklusion * 100).toFixed(0);

    if (tier === "bottom10" || tier === "below_avg") {
      flags.push({
        severity: "red",
        metric: "inklusion",
        title: { da: "Lav social inklusion", en: "Low social inclusion" },
        detail: {
          da: `Score: ${q.tsi.toLocaleString("da-DK")}/5 — ${Math.abs(Number(pctDiff))}% under landsgennemsnittet. Indikerer problemer med fællesskab og tilhørsforhold.`,
          en: `Score: ${q.tsi}/5 — ${Math.abs(Number(pctDiff))}% below the national average. Indicates challenges with community and belonging.`,
        },
        value: q.tsi,
        reference: NATIONAL_AVG.inklusion,
        percentileTier: tier,
      });
    } else if (tier === "top10" || tier === "top25") {
      flags.push({
        severity: "green",
        metric: "inklusion",
        title: { da: "Stærk social inklusion", en: "Strong social inclusion" },
        detail: {
          da: `Score: ${q.tsi.toLocaleString("da-DK")}/5 — over landsgennemsnittet. Eleverne oplever godt fællesskab.`,
          en: `Score: ${q.tsi}/5 — above the national average. Students experience strong community.`,
        },
        value: q.tsi,
        reference: NATIONAL_AVG.inklusion,
        percentileTier: tier,
      });
    }
  }

  // ── Ro og orden (classroom discipline) — higher is better ──
  if (q.tro !== undefined) {
    const tier = getPercentileTier(q.tro, "ro_orden", true);

    if (tier === "bottom10" || tier === "below_avg") {
      flags.push({
        severity: "red",
        metric: "ro_orden",
        title: { da: "Uro i undervisningen", en: "Classroom disruption" },
        detail: {
          da: `Score: ${q.tro.toLocaleString("da-DK")}/5 — eleverne oplever uro. Laveste ${tier === "bottom10" ? "10%" : "25%"} nationalt.`,
          en: `Score: ${q.tro}/5 — students experience disruption. Bottom ${tier === "bottom10" ? "10%" : "25%"} nationally.`,
        },
        value: q.tro,
        reference: NATIONAL_AVG.ro_orden,
        percentileTier: tier,
      });
    }
  }

  // ── Karakterer (grades) — higher is better ──
  if (q.k !== undefined) {
    const tier = getPercentileTier(q.k, "karakterer", true);
    const diff = (q.k - NATIONAL_AVG.karakterer).toFixed(1);

    if (tier === "bottom10" || tier === "bottom25") {
      flags.push({
        severity: "red",
        metric: "karakterer",
        title: { da: "Lavt karaktersnit", en: "Low grade average" },
        detail: {
          da: `Snit: ${q.k.toLocaleString("da-DK")} — ${Math.abs(Number(diff))} under landsgennemsnittet (${NATIONAL_AVG.karakterer}).${q.sr === "Under niveau" ? " Skolen præsterer under det forventede ift. elevgrundlaget." : ""}`,
          en: `Average: ${q.k} — ${Math.abs(Number(diff))} below the national average (${NATIONAL_AVG.karakterer}).${q.sr === "Under niveau" ? " The school underperforms relative to its student demographics." : ""}`,
        },
        value: q.k,
        reference: NATIONAL_AVG.karakterer,
        percentileTier: tier,
      });
    } else if (tier === "top10" || tier === "top25") {
      flags.push({
        severity: "green",
        metric: "karakterer",
        title: { da: "Højt karaktersnit", en: "High grade average" },
        detail: {
          da: `Snit: ${q.k.toLocaleString("da-DK")} — ${diff} over landsgennemsnittet.${q.sr === "Over niveau" ? " Skolen løfter eleverne mere end forventet." : ""}`,
          en: `Average: ${q.k} — ${diff} above the national average.${q.sr === "Over niveau" ? " The school outperforms relative to its student demographics." : ""}`,
        },
        value: q.k,
        reference: NATIONAL_AVG.karakterer,
        percentileTier: tier,
      });
    }
  }

  // ── Kompetencedækning (teacher qualifications) — higher is better ──
  if (q.kp !== undefined) {
    const tier = getPercentileTier(q.kp, "kompetence", true);
    const unqualifiedPct = (100 - q.kp).toFixed(0);

    if (tier === "bottom10" || tier === "below_avg") {
      flags.push({
        severity: "red",
        metric: "kompetence",
        title: { da: "Lav kompetencedækning", en: "Low teacher qualification" },
        detail: {
          da: `${q.kp.toLocaleString("da-DK")}% — ${unqualifiedPct}% af timerne undervises af lærere uden formel kompetence i faget.`,
          en: `${q.kp}% — ${unqualifiedPct}% of classes taught by teachers without formal subject competence.`,
        },
        value: q.kp,
        reference: NATIONAL_AVG.kompetence,
        percentileTier: tier,
      });
    } else if (tier === "top10" || tier === "top25") {
      flags.push({
        severity: "green",
        metric: "kompetence",
        title: { da: "Høj kompetencedækning", en: "High teacher qualification" },
        detail: {
          da: `${q.kp.toLocaleString("da-DK")}% af timerne dækkes af uddannede lærere — top ${tier === "top10" ? "10%" : "25%"} nationalt.`,
          en: `${q.kp}% of classes taught by qualified teachers — top ${tier === "top10" ? "10%" : "25%"} nationally.`,
        },
        value: q.kp,
        reference: NATIONAL_AVG.kompetence,
        percentileTier: tier,
      });
    }
  }

  // ── Klassekvotient (class size) — lower is better ──
  if (q.kv !== undefined) {
    const tier = getPercentileTier(q.kv, "klassekv", false);
    const minutesPerChild = (45 / q.kv).toFixed(1); // ~45 min class / kids

    if (tier === "bottom10" || tier === "below_avg") {
      flags.push({
        severity: "yellow",
        metric: "klassekv",
        title: { da: "Store klasser", en: "Large class sizes" },
        detail: {
          da: `${q.kv.toLocaleString("da-DK")} elever per klasse — hver elev får ca. ${minutesPerChild} min. opmærksomhed per lektion.`,
          en: `${q.kv} students per class — each student gets approx. ${minutesPerChild} min. of attention per lesson.`,
        },
        value: q.kv,
        reference: NATIONAL_AVG.klassekv,
        percentileTier: tier,
      });
    } else if (tier === "top10" || tier === "top25") {
      flags.push({
        severity: "green",
        metric: "klassekv",
        title: { da: "Små klasser", en: "Small class sizes" },
        detail: {
          da: `${q.kv.toLocaleString("da-DK")} elever per klasse — mere individuel opmærksomhed (${minutesPerChild} min/elev/lektion).`,
          en: `${q.kv} students per class — more individual attention (${minutesPerChild} min/student/lesson).`,
        },
        value: q.kv,
        reference: NATIONAL_AVG.klassekv,
        percentileTier: tier,
      });
    }
  }

  // ── Undervisningseffekt (socioeconomic reference) ──
  if (q.sr) {
    if (q.sr === "Under niveau") {
      flags.push({
        severity: "red",
        metric: "socref",
        title: { da: "Under forventet niveau", en: "Below expected level" },
        detail: {
          da: "Skolen løfter eleverne mindre end forventet ud fra deres socioøkonomiske baggrund. Andre skoler med lignende elevgrupper klarer sig bedre.",
          en: "The school underperforms relative to its student demographics. Similar schools achieve better results.",
        },
        value: -1,
        reference: 0,
        percentileTier: "bottom25",
      });
    } else if (q.sr === "Over niveau") {
      flags.push({
        severity: "green",
        metric: "socref",
        title: { da: "Over forventet niveau", en: "Above expected level" },
        detail: {
          da: "Skolen løfter eleverne mere end forventet — et tegn på stærk undervisning uanset elevernes baggrund.",
          en: "The school outperforms expectations — a sign of strong teaching regardless of student background.",
        },
        value: 1,
        reference: 0,
        percentileTier: "top25",
      });
    }
  }

  // Sort: red first, then yellow, then green
  const order: Record<FlagSeverity, number> = { red: 0, yellow: 1, green: 2 };
  flags.sort((a, b) => order[a.severity] - order[b.severity]);

  return flags;
}

// ── Percentile profile ──────────────────────────────────────────────────

export interface PercentileBar {
  metric: string;
  label: { da: string; en: string };
  value: number;
  tier: PercentileTier;
  filledBars: number; // 0-10 for visual bar
  isWarning: boolean;
}

export function generatePercentileProfile(q: SchoolQuality): PercentileBar[] {
  const bars: PercentileBar[] = [];

  function tierToFilled(tier: PercentileTier): number {
    const map: Record<PercentileTier, number> = {
      top10: 10, top25: 8, above_avg: 7, average: 5,
      below_avg: 3, bottom25: 2, bottom10: 1,
    };
    return map[tier];
  }

  if (q.ts !== undefined) {
    const tier = getPercentileTier(q.ts, "trivsel", true);
    bars.push({ metric: "trivsel", label: { da: "Trivsel", en: "Well-being" }, value: q.ts, tier, filledBars: tierToFilled(tier), isWarning: tier === "bottom10" || tier === "below_avg" });
  }

  if (q.tsi !== undefined) {
    const tier = getPercentileTier(q.tsi, "inklusion", true);
    bars.push({ metric: "inklusion", label: { da: "Social inklusion", en: "Social inclusion" }, value: q.tsi, tier, filledBars: tierToFilled(tier), isWarning: tier === "bottom10" || tier === "below_avg" });
  }

  if (q.tro !== undefined) {
    const tier = getPercentileTier(q.tro, "ro_orden", true);
    bars.push({ metric: "ro_orden", label: { da: "Ro og orden", en: "Classroom order" }, value: q.tro, tier, filledBars: tierToFilled(tier), isWarning: tier === "bottom10" || tier === "below_avg" });
  }

  if (q.k !== undefined) {
    const tier = getPercentileTier(q.k, "karakterer", true);
    bars.push({ metric: "karakterer", label: { da: "Karakterer", en: "Grades" }, value: q.k, tier, filledBars: tierToFilled(tier), isWarning: tier === "bottom10" || tier === "bottom25" });
  }

  if (q.fp !== undefined) {
    const tier = getPercentileTier(q.fp, "fravaer", false);
    bars.push({ metric: "fravaer", label: { da: "Fravær", en: "Absence" }, value: q.fp, tier, filledBars: tierToFilled(tier), isWarning: tier === "bottom10" || tier === "below_avg" });
  }

  if (q.kp !== undefined) {
    const tier = getPercentileTier(q.kp, "kompetence", true);
    bars.push({ metric: "kompetence", label: { da: "Kompetencedækning", en: "Teacher qualif." }, value: q.kp, tier, filledBars: tierToFilled(tier), isWarning: tier === "bottom10" || tier === "below_avg" });
  }

  if (q.kv !== undefined) {
    const tier = getPercentileTier(q.kv, "klassekv", false);
    bars.push({ metric: "klassekv", label: { da: "Klassestørrelse", en: "Class size" }, value: q.kv, tier, filledBars: tierToFilled(tier), isWarning: tier === "bottom10" || tier === "below_avg" });
  }

  return bars;
}

// ── Nearby comparison ───────────────────────────────────────────────────

export interface NearbyComparison {
  metric: string;
  label: { da: string; en: string };
  thisValue: number;
  areaAvg: number;
  diffPct: number; // positive = better, negative = worse (adjusted per metric)
  isBetter: boolean;
}

export function generateNearbyComparison(
  inst: UnifiedInstitution,
  nearby: UnifiedInstitution[]
): NearbyComparison[] {
  const comparisons: NearbyComparison[] = [];
  const q = inst.quality;
  if (!q) return comparisons;

  const nearbyWithQ = nearby.filter((n) => n.quality);
  if (nearbyWithQ.length < 2) return comparisons;

  function avg(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  // Grades
  const nearbyGrades = nearbyWithQ.filter((n) => n.quality!.k).map((n) => n.quality!.k!);
  if (q.k && nearbyGrades.length >= 2) {
    const areaAvg = avg(nearbyGrades);
    const diffPct = ((q.k - areaAvg) / areaAvg) * 100;
    comparisons.push({
      metric: "karakterer", label: { da: "Karaktersnit", en: "Grade average" },
      thisValue: q.k, areaAvg: Math.round(areaAvg * 10) / 10,
      diffPct: Math.round(diffPct), isBetter: diffPct > 0,
    });
  }

  // Absence
  const nearbyAbs = nearbyWithQ.filter((n) => n.quality!.fp).map((n) => n.quality!.fp!);
  if (q.fp && nearbyAbs.length >= 2) {
    const areaAvg = avg(nearbyAbs);
    const diffPct = ((q.fp - areaAvg) / areaAvg) * 100;
    comparisons.push({
      metric: "fravaer", label: { da: "Fravær", en: "Absence" },
      thisValue: q.fp, areaAvg: Math.round(areaAvg * 10) / 10,
      diffPct: Math.round(-diffPct), // invert: less absence = better
      isBetter: diffPct < 0,
    });
  }

  // Class size
  const nearbyKv = nearbyWithQ.filter((n) => n.quality!.kv).map((n) => n.quality!.kv!);
  if (q.kv && nearbyKv.length >= 2) {
    const areaAvg = avg(nearbyKv);
    const diffPct = ((q.kv - areaAvg) / areaAvg) * 100;
    comparisons.push({
      metric: "klassekv", label: { da: "Klassestørrelse", en: "Class size" },
      thisValue: q.kv, areaAvg: Math.round(areaAvg * 10) / 10,
      diffPct: Math.round(-diffPct), // invert: smaller = better
      isBetter: diffPct < 0,
    });
  }

  // Trivsel
  const nearbyTs = nearbyWithQ.filter((n) => n.quality!.ts).map((n) => n.quality!.ts!);
  if (q.ts && nearbyTs.length >= 2) {
    const areaAvg = avg(nearbyTs);
    const diffPct = ((q.ts - areaAvg) / areaAvg) * 100;
    comparisons.push({
      metric: "trivsel", label: { da: "Trivsel", en: "Well-being" },
      thisValue: q.ts, areaAvg: Math.round(areaAvg * 10) / 10,
      diffPct: Math.round(diffPct), isBetter: diffPct > 0,
    });
  }

  return comparisons;
}
