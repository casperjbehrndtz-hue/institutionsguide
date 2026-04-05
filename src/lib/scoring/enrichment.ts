import type {
  UnifiedInstitution,
  NormeringEntry,
  InstitutionStats,
} from "@/lib/types";
import type { MetricScore } from "./types";
import { fmt, contextLabel, pctRankHigherIsBetter, pctRankLowerIsBetter } from "./utils";

// Keys where lower raw values are better
const LOWER_IS_BETTER_KEYS = new Set(["pris", "normering", "fravaer", "klassestorrelse"]);

interface EnrichOpts {
  inst: UnifiedInstitution;
  allInstitutions?: UnifiedInstitution[];
  allInstitutionStats?: Record<string, InstitutionStats>;
  normering: NormeringEntry[];
}

export function enrichMetrics(metrics: MetricScore[], opts: EnrichOpts): MetricScore[] {
  const { inst, allInstitutions, allInstitutionStats, normering } = opts;
  if (!allInstitutions || allInstitutions.length === 0) return metrics;

  const sameCategory = allInstitutions.filter((i) => i.category === inst.category && i.id !== inst.id);
  const sameMunCat = sameCategory.filter((i) => i.municipality.toLowerCase() === inst.municipality.toLowerCase());

  return metrics.map((m) => {
    const rawValues = collectMetricValues(m.key, sameCategory, allInstitutionStats, normering);
    const munValues = collectMetricValues(m.key, sameMunCat, allInstitutionStats, normering);

    const numericVal = extractNumericValue(m);
    if (numericVal == null || rawValues.length === 0) {
      return { ...m, percentile: null, municipalityAvg: null, nationalAvg: null, context: null };
    }

    const lowerBetter = LOWER_IS_BETTER_KEYS.has(m.key);
    const percentile = lowerBetter
      ? pctRankLowerIsBetter(rawValues, numericVal)
      : pctRankHigherIsBetter(rawValues, numericVal);

    const natAvg = rawValues.length > 0 ? rawValues.reduce((a, b) => a + b, 0) / rawValues.length : null;
    const munAvg = munValues.length > 0 ? munValues.reduce((a, b) => a + b, 0) / munValues.length : null;

    return {
      ...m,
      percentile,
      municipalityAvg: munAvg != null ? formatMetricValue(m.key, munAvg) : null,
      nationalAvg: natAvg != null ? formatMetricValue(m.key, natAvg) : null,
      context: contextLabel(percentile),
    };
  });
}

function extractNumericValue(m: MetricScore): number | null {
  // Parse the first numeric part from value string like "5,8 børn/voksen" or "3.200 kr./md."
  const cleaned = m.value.replace(/\./g, "").replace(",", ".");
  const match = cleaned.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

function formatMetricValue(key: string, val: number): string {
  if (key === "pris") return `${Math.round(val).toLocaleString("da-DK")} kr.`;
  if (key === "normering") return fmt(val);
  if (key === "uddannelse" || key === "kompetence" || key === "fravaer") return `${fmt(val, 0)}%`;
  if (key === "tilfredshed") return fmt(val);
  if (key === "trivsel") return fmt(val);
  if (key === "karakterer") return fmt(val);
  if (key === "klassestorrelse") return fmt(val, 1);
  return fmt(val);
}

function collectMetricValues(
  key: string,
  institutions: UnifiedInstitution[],
  allStats?: Record<string, InstitutionStats>,
  normering?: NormeringEntry[],
): number[] {
  const values: number[] = [];

  for (const inst of institutions) {
    if (key === "pris") {
      if (inst.monthlyRate != null && inst.monthlyRate > 0) values.push(inst.monthlyRate);
    } else if (key === "normering") {
      const statsId = inst.id.replace(/^(vug|bh|dag|sfo)-/, "");
      const stats = allStats?.[statsId];
      const ageGroup = inst.category === "vuggestue" || inst.category === "dagpleje" ? "0-2" : "3-5";
      const instN = stats ? (ageGroup === "0-2" ? stats.normering02 : stats.normering35) : null;
      if (instN != null) { values.push(instN); continue; }
      if (normering) {
        const entries = normering.filter(
          (n) => n.municipality.toLowerCase() === inst.municipality.toLowerCase() && n.ageGroup === ageGroup,
        );
        const latest = entries.sort((a, b) => b.year - a.year)[0];
        if (latest) values.push(latest.ratio);
      }
    } else if (key === "uddannelse") {
      const statsId = inst.id.replace(/^(vug|bh|dag|sfo)-/, "");
      const stats = allStats?.[statsId];
      if (stats?.pctPaedagoger != null) values.push(stats.pctPaedagoger);
    } else if (key === "tilfredshed") {
      const statsId = inst.id.replace(/^(vug|bh|dag|sfo)-/, "");
      const stats = allStats?.[statsId];
      if (stats?.parentSatisfaction != null) values.push(stats.parentSatisfaction);
    } else if (key === "trivsel" && inst.quality?.ts != null) {
      values.push(inst.quality.ts);
    } else if (key === "karakterer" && inst.quality?.k != null) {
      values.push(inst.quality.k);
    } else if (key === "fravaer" && inst.quality?.fp != null) {
      values.push(inst.quality.fp);
    } else if (key === "kompetence" && inst.quality?.kp != null) {
      values.push(inst.quality.kp);
    } else if (key === "klassestorrelse" && inst.quality?.kv != null) {
      values.push(inst.quality.kv);
    } else if (key === "undervisningseffekt" && inst.quality?.sr != null) {
      const score = inst.quality.sr === "Over niveau" ? 100 : inst.quality.sr === "På niveau" ? 60 : inst.quality.sr === "Under niveau" ? 20 : 50;
      values.push(score);
    }
  }

  return values;
}
