import type { UnifiedInstitution } from "@/lib/types";
import type { DimensionConfig, ScoringContext } from "./preferenceConfig";

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function linearMap(value: number, inMin: number, inMax: number): number {
  if (inMin === inMax) return 50; // avoid division by zero
  return clamp(((value - inMin) / (inMax - inMin)) * 100);
}

export interface DimensionScore {
  key: string;
  label: { da: string; en: string };
  icon: string;
  rawValue: number;
  formattedValue: string;
  normalizedScore: number; // 0-100
  weight: number;          // user's weight 0-100
  contribution: number;    // weighted contribution to total
  goodLabel: { da: string; en: string };
}

export interface ScoredInstitution {
  institution: UnifiedInstitution;
  totalScore: number;        // 0-100
  matchPct: number;          // 0-100, for display as "92% match"
  dimensions: DimensionScore[];
  dataCompleteness: number;  // 0-1
  distanceKm: number | null;
}

/**
 * Compute dynamic range for a dimension from actual data (p10/p90).
 * Returns [worst, best] where worst maps to 0 and best maps to 100.
 */
function computeDynamicRange(
  institutions: UnifiedInstitution[],
  dim: DimensionConfig,
  ctx: ScoringContext,
): [number, number] {
  const values: number[] = [];
  for (const inst of institutions) {
    const v = dim.extract(inst, ctx);
    if (v != null) values.push(v);
  }
  if (values.length < 3) return [1, 0]; // fallback — everything scores 100

  values.sort((a, b) => a - b);
  const p10 = values[Math.floor(values.length * 0.1)];
  const p90 = values[Math.floor(values.length * 0.9)];

  // For price: high = worst, low = best → [p90, p10]
  return [p90, p10];
}

export function rankInstitutions(
  institutions: UnifiedInstitution[],
  dimensions: DimensionConfig[],
  weights: Record<string, number>, // key → 0-100
  ctx: ScoringContext,
): { ranked: ScoredInstitution[]; excluded: ScoredInstitution[] } {
  // Only consider dimensions with weight > 0
  const activeDims = dimensions.filter((d) => (weights[d.key] ?? 0) > 0);
  if (activeDims.length === 0) return { ranked: [], excluded: [] };

  // Pre-compute dynamic ranges for dimensions that need it
  const resolvedRanges = new Map<string, [number, number]>();
  for (const dim of activeDims) {
    if (dim.range) {
      resolvedRanges.set(dim.key, dim.range);
    } else {
      resolvedRanges.set(dim.key, computeDynamicRange(institutions, dim, ctx));
    }
  }

  const ranked: ScoredInstitution[] = [];
  const excluded: ScoredInstitution[] = [];

  for (const inst of institutions) {
    const dimScores: DimensionScore[] = [];
    let weightedSum = 0;
    let totalWeight = 0;
    let dimsWithData = 0;

    for (const dim of activeDims) {
      const raw = dim.extract(inst, ctx);
      const w = weights[dim.key] ?? 0;

      if (raw == null) continue;
      dimsWithData++;

      const range = resolvedRanges.get(dim.key)!;
      const normalized = linearMap(raw, range[0], range[1]);
      const contribution = normalized * w;
      weightedSum += contribution;
      totalWeight += w;

      dimScores.push({
        key: dim.key,
        label: dim.label,
        icon: dim.icon,
        rawValue: raw,
        formattedValue: dim.format(raw),
        normalizedScore: Math.round(normalized),
        weight: w,
        contribution,
        goodLabel: dim.goodLabel,
      });
    }

    const dataCompleteness = activeDims.length > 0 ? dimsWithData / activeDims.length : 0;
    const totalScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Distance for display
    let distanceKm: number | null = null;
    if (ctx.userLocation) {
      const dLat = inst.lat - ctx.userLocation.lat;
      const dLng = (inst.lng - ctx.userLocation.lng) * Math.cos(ctx.userLocation.lat * Math.PI / 180);
      distanceKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111.32;
    }

    const result: ScoredInstitution = {
      institution: inst,
      totalScore: Math.round(totalScore),
      matchPct: Math.round(totalScore),
      dimensions: dimScores.sort((a, b) => b.contribution - a.contribution),
      dataCompleteness,
      distanceKm,
    };

    // Separate low-data institutions instead of hiding them
    if (dataCompleteness < 0.3 && activeDims.length > 1) {
      excluded.push(result);
    } else {
      ranked.push(result);
    }
  }

  ranked.sort((a, b) => b.totalScore - a.totalScore);
  excluded.sort((a, b) => b.totalScore - a.totalScore);

  return { ranked, excluded };
}
