import type { ScoreResult, LocalizedText, MetricScore, WeightedMetric } from "./types";

export function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

export function linearMap(
  value: number,
  inMin: number,
  inMax: number,
  outMin = 0,
  outMax = 100,
): number {
  return clamp(
    outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin),
  );
}

export function toGrade(score: number): ScoreResult["grade"] {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "E";
}

export function fmt(n: number, decimals = 1): string {
  return n.toFixed(decimals).replace(".", ",");
}

export function weightedOverall(available: WeightedMetric[]): number {
  const totalWeight = available.reduce((s, m) => s + m.weight, 0);
  const scale = 1 / totalWeight;
  return Math.round(
    available.reduce((s, m) => s + m.score * m.weight * scale, 0),
  );
}

export function toMetricScores(available: WeightedMetric[]): MetricScore[] {
  return available.map((m) => ({
    key: m.key,
    label: m.label,
    score: Math.round(m.score),
    value: m.value,
    icon: m.icon,
    percentile: null,
    municipalityAvg: null,
    nationalAvg: null,
    context: null,
  }));
}

export function contextLabel(percentile: number): LocalizedText {
  if (percentile >= 90) return { da: "Top 10% nationalt", en: "Top 10% nationally" };
  if (percentile >= 75) return { da: "Top 25% nationalt", en: "Top 25% nationally" };
  if (percentile >= 60) return { da: "Over middel", en: "Above average" };
  if (percentile >= 40) return { da: "Middel", en: "Average" };
  return { da: "Under middel", en: "Below average" };
}

export function pctRankHigherIsBetter(values: number[], val: number): number {
  if (values.length === 0) return 50;
  const below = values.filter((v) => v < val).length;
  return Math.round((below / values.length) * 100);
}

export function pctRankLowerIsBetter(values: number[], val: number): number {
  if (values.length === 0) return 50;
  const above = values.filter((v) => v > val).length;
  return Math.round((above / values.length) * 100);
}
