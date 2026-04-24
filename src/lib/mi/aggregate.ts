import type { UnifiedInstitution, InstitutionStats, NormeringEntry, KommuneStats } from "@/lib/types";
import { METRICS_BY_TRACK, institutionVolume, isInTrack, type MetricDef, type Track } from "./metrics";
import { buildEcdf, directionalPercentile, percentileOf, weightedQuantile } from "./percentiles";

/** Confidence multiplier for an imputed value (μ_kommune fill-in). */
export const ALPHA = 0.5;
/** Bayesian shrinkage prior strength. λ = N / (N + τ). */
export const TAU = 5;
/** Minimum institution count before consistency is reported. */
export const MIN_N_CONSISTENCY = 5;

export interface MetricCell {
  metricId: string;
  /** Raw value used (after potential imputation). */
  value: number;
  /** Was this value the kommune-median fallback? */
  imputed: 0 | 1 | 2;
  /** 0..100 direction-corrected national percentile. */
  percentile: number;
}

export interface InstitutionRow {
  institutionId: string;
  municipality: string;
  cells: Record<string, MetricCell | undefined>;
  volume: number;
}

export interface MIDataset {
  track: Track;
  rows: InstitutionRow[];
  /** Per-metric national medians, p20, p80 (raw values, NOT percentiles). */
  national: Record<string, NationalBenchmark | undefined>;
  /** Per-metric per-municipality medians (raw values). */
  municipalityMedians: Record<string, Record<string, number>>;
  /** Institutions grouped by municipality. */
  byMunicipality: Map<string, InstitutionRow[]>;
}

export interface NationalBenchmark {
  median: number;
  p20: number;
  p80: number;
  ecdf: number[];
}

/**
 * Build the per-track MIL dataset from raw inputs.
 *
 * Pipeline:
 *   1. Filter to track institutions
 *   2. Per metric: compute kommune-medians and national ECDF (from observed values only)
 *   3. Per institution × metric: impute missing → percentile-rank
 *
 * Pure function, deterministic given inputs. Memoize at the hook layer.
 */
export function buildMIDataset(args: {
  track: Track;
  institutions: UnifiedInstitution[];
  institutionStats: Record<string, InstitutionStats>;
  kommuneStats: Record<string, KommuneStats>;
  normering: NormeringEntry[];
}): MIDataset {
  const { track, institutions, institutionStats, kommuneStats, normering } = args;
  const metrics = METRICS_BY_TRACK[track];

  const trackInsts = institutions.filter((i) => isInTrack(track, i));

  const rawByMetric = new Map<string, { instId: string; municipality: string; raw: number | null }[]>();
  for (const m of metrics) rawByMetric.set(m.id, []);

  for (const inst of trackInsts) {
    const stats = institutionStats[inst.id];
    const kommune = kommuneStats[inst.municipality];
    for (const m of metrics) {
      const raw = m.extract({ inst, stats, kommuneStats: kommune, normering });
      rawByMetric.get(m.id)!.push({
        instId: inst.id,
        municipality: inst.municipality,
        raw: raw != null && Number.isFinite(raw) ? raw : null,
      });
    }
  }

  const municipalityMedians: Record<string, Record<string, number>> = {};
  const national: Record<string, NationalBenchmark> = {};
  for (const m of metrics) {
    const observations = rawByMetric.get(m.id)!;
    const observed = observations.filter((o) => o.raw != null).map((o) => o.raw!);
    const ecdf = buildEcdf(observed);
    if (ecdf.length > 0) {
      national[m.id] = {
        median: ecdf[Math.floor(ecdf.length / 2)],
        p20: ecdf[Math.floor(ecdf.length * 0.2)] ?? ecdf[0],
        p80: ecdf[Math.floor(ecdf.length * 0.8)] ?? ecdf[ecdf.length - 1],
        ecdf,
      };
    }

    const muniMap: Record<string, number> = {};
    const byMuni = new Map<string, number[]>();
    for (const o of observations) {
      if (o.raw == null) continue;
      let arr = byMuni.get(o.municipality);
      if (!arr) {
        arr = [];
        byMuni.set(o.municipality, arr);
      }
      arr.push(o.raw);
    }
    for (const [muni, arr] of byMuni) {
      arr.sort((a, b) => a - b);
      muniMap[muni] = arr[Math.floor(arr.length / 2)];
    }
    municipalityMedians[m.id] = muniMap;
  }

  const rows: InstitutionRow[] = trackInsts.map((inst) => {
    const stats = institutionStats[inst.id];
    const cells: Record<string, MetricCell> = {};
    for (const m of metrics) {
      const raw = m.extract({ inst, stats, kommuneStats: kommuneStats[inst.municipality], normering });
      const observed = raw != null && Number.isFinite(raw);
      if (observed) {
        const ecdf = national[m.id]?.ecdf;
        if (!ecdf) continue;
        cells[m.id] = {
          metricId: m.id,
          value: raw!,
          imputed: 0,
          percentile: directionalPercentile(m, ecdf, raw!),
        };
        continue;
      }
      const muniMedian = municipalityMedians[m.id]?.[inst.municipality];
      const natMedian = national[m.id]?.median;
      let value: number | null = null;
      let imputed: 1 | 2 = 1;
      if (muniMedian != null) {
        value = muniMedian;
        imputed = 1;
      } else if (natMedian != null) {
        value = natMedian;
        imputed = 2;
      }
      if (value == null || !national[m.id]) continue;
      cells[m.id] = {
        metricId: m.id,
        value,
        imputed,
        percentile: directionalPercentile(m, national[m.id]!.ecdf, value),
      };
    }
    return {
      institutionId: inst.id,
      municipality: inst.municipality,
      cells,
      volume: institutionVolume(track, inst, stats),
    };
  });

  const byMunicipality = new Map<string, InstitutionRow[]>();
  for (const row of rows) {
    let arr = byMunicipality.get(row.municipality);
    if (!arr) {
      arr = [];
      byMunicipality.set(row.municipality, arr);
    }
    arr.push(row);
  }

  return { track, rows, national, municipalityMedians, byMunicipality };
}

/**
 * Normalize user weights so they sum to 1. Throws on all-zero.
 * Metrics not in the user weights map default to 0 (ignored).
 */
export function normalizeWeights(weights: Record<string, number>): Record<string, number> {
  const entries = Object.entries(weights).filter(([, v]) => v > 0);
  const sum = entries.reduce((s, [, v]) => s + v, 0);
  if (sum === 0) throw new Error("ALL_WEIGHTS_ZERO");
  const out: Record<string, number> = {};
  for (const [k, v] of entries) out[k] = v / sum;
  return out;
}

export interface InstitutionScore {
  institutionId: string;
  municipality: string;
  wqi: number;
  reliability: number;
  volume: number;
}

/**
 * Per-institution Weighted Quality Index given user weights.
 *   WQI_i = Σ(w·c·p) / Σ(w·c)
 *   R_i   = Σ(w·c) / Σ(w)
 *   c = 1 if observed, ALPHA if imputed (kommune), ALPHA² if national-fallback
 */
export function scoreInstitution(row: InstitutionRow, normalizedWeights: Record<string, number>): InstitutionScore {
  let numerator = 0;
  let denominator = 0;
  let sumW = 0;
  for (const [metricId, w] of Object.entries(normalizedWeights)) {
    const cell = row.cells[metricId];
    sumW += w;
    if (!cell) continue;
    const c = cell.imputed === 0 ? 1 : cell.imputed === 1 ? ALPHA : ALPHA * ALPHA;
    numerator += w * c * cell.percentile;
    denominator += w * c;
  }
  return {
    institutionId: row.institutionId,
    municipality: row.municipality,
    wqi: denominator > 0 ? numerator / denominator : 50,
    reliability: sumW > 0 ? denominator / sumW : 0,
    volume: row.volume,
  };
}

export interface MunicipalityScore {
  municipality: string;
  /** N institutions in track */
  n: number;
  /** Bayesian-smoothed score 0..100 */
  score: number;
  /** Pre-shrinkage volume-weighted score */
  rawScore: number;
  /** Shrinkage factor λ = N/(N+τ) */
  lambda: number;
  /** Q80 - Q20 spread (null when n < 5) */
  qualitySpread: number | null;
  /** 0..100 consistency (null when n < 5) */
  consistency: number | null;
  /** Mean reliability across institutions */
  meanReliability: number;
}

export interface NationalScore {
  /** Volume × reliability weighted national mean WQI */
  mean: number;
  /** Number of institutions in the track */
  n: number;
}

export function scoreNational(rows: InstitutionRow[], normalizedWeights: Record<string, number>): NationalScore {
  let num = 0;
  let den = 0;
  let n = 0;
  for (const row of rows) {
    const s = scoreInstitution(row, normalizedWeights);
    const w = s.volume * s.reliability;
    num += w * s.wqi;
    den += w;
    n++;
  }
  return { mean: den > 0 ? num / den : 50, n };
}

export function scoreMunicipality(args: {
  rows: InstitutionRow[];
  normalizedWeights: Record<string, number>;
  nationalMean: number;
  tau?: number;
}): MunicipalityScore {
  const { rows, normalizedWeights, nationalMean } = args;
  const tau = args.tau ?? TAU;
  if (rows.length === 0) {
    return {
      municipality: "",
      n: 0,
      score: nationalMean,
      rawScore: nationalMean,
      lambda: 0,
      qualitySpread: null,
      consistency: null,
      meanReliability: 0,
    };
  }
  let num = 0;
  let den = 0;
  let relSum = 0;
  const wqis: number[] = [];
  const vols: number[] = [];
  for (const row of rows) {
    const s = scoreInstitution(row, normalizedWeights);
    const w = s.volume * s.reliability;
    num += w * s.wqi;
    den += w;
    relSum += s.reliability;
    wqis.push(s.wqi);
    vols.push(s.volume);
  }
  const rawScore = den > 0 ? num / den : nationalMean;
  const n = rows.length;
  const lambda = n / (n + tau);
  const score = lambda * rawScore + (1 - lambda) * nationalMean;

  let qualitySpread: number | null = null;
  let consistency: number | null = null;
  if (n >= MIN_N_CONSISTENCY) {
    const q80 = weightedQuantile(wqis, vols, 0.8);
    const q20 = weightedQuantile(wqis, vols, 0.2);
    qualitySpread = q80 - q20;
    consistency = Math.max(0, Math.min(100, 100 - qualitySpread));
  }

  return {
    municipality: rows[0].municipality,
    n,
    score,
    rawScore,
    lambda,
    qualitySpread,
    consistency,
    meanReliability: relSum / n,
  };
}

/** Build the full leaderboard: 98 municipalities, sorted by smoothed score desc. */
export function leaderboard(dataset: MIDataset, weights: Record<string, number>): {
  municipalities: MunicipalityScore[];
  nationalMean: number;
} {
  const normalized = normalizeWeights(weights);
  const national = scoreNational(dataset.rows, normalized);
  const municipalities: MunicipalityScore[] = [];
  for (const [muni, rows] of dataset.byMunicipality) {
    const s = scoreMunicipality({
      rows,
      normalizedWeights: normalized,
      nationalMean: national.mean,
    });
    s.municipality = muni;
    municipalities.push(s);
  }
  municipalities.sort((a, b) => b.score - a.score);
  return { municipalities, nationalMean: national.mean };
}

/** Build a list of metrics with their raw + percentile values for one institution. */
export function institutionBreakdown(
  dataset: MIDataset,
  institutionId: string,
): { metric: MetricDef; cell: MetricCell | undefined }[] {
  const row = dataset.rows.find((r) => r.institutionId === institutionId);
  if (!row) return [];
  return METRICS_BY_TRACK[dataset.track].map((m) => ({
    metric: m,
    cell: row.cells[m.id],
  }));
}

export function nationalPercentileOfMedian(metric: MetricDef, dataset: MIDataset, rawMedian: number): number {
  const ecdf = dataset.national[metric.id]?.ecdf;
  if (!ecdf) return 50;
  const p = percentileOf(ecdf, rawMedian);
  return metric.direction === 1 ? p : 100 - p;
}

export interface MetricDriver {
  metric: MetricDef;
  /** Weighted delta vs national median (percentile points). Positive = lifts score. */
  contribution: number;
  /** Volume-weighted municipality median percentile for this metric. */
  municipalityPercentile: number;
}

/**
 * Which 2-3 metrics drive a municipality's score vs the national median?
 * Computes weighted contribution = normalizedWeight × (muniMedianPercentile − 50).
 * Positive drivers are shown first (what lifts the kommune), then negatives (drags).
 */
export function topDriversForMunicipality(args: {
  dataset: MIDataset;
  municipality: string;
  weights: Record<string, number>;
  max?: number;
}): MetricDriver[] {
  const { dataset, municipality, weights, max = 2 } = args;
  let normalized: Record<string, number>;
  try {
    normalized = normalizeWeights(weights);
  } catch {
    return [];
  }
  const rows = dataset.byMunicipality.get(municipality) ?? [];
  if (rows.length === 0) return [];
  const metrics = METRICS_BY_TRACK[dataset.track];

  const drivers: MetricDriver[] = [];
  for (const metric of metrics) {
    const w = normalized[metric.id] ?? 0;
    if (w === 0) continue;
    let num = 0;
    let den = 0;
    for (const row of rows) {
      const cell = row.cells[metric.id];
      if (!cell) continue;
      const c = cell.imputed === 0 ? 1 : cell.imputed === 1 ? ALPHA : ALPHA * ALPHA;
      num += row.volume * c * cell.percentile;
      den += row.volume * c;
    }
    if (den === 0) continue;
    const muniPercentile = num / den;
    drivers.push({
      metric,
      contribution: w * (muniPercentile - 50),
      municipalityPercentile: muniPercentile,
    });
  }
  drivers.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  return drivers.slice(0, max);
}
