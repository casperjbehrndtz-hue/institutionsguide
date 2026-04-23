import type { MetricDef } from "./metrics";

/**
 * Build an empirical CDF (sorted array of observed values) for a metric.
 * Used to map a raw value to its national percentile (Hazen plotting position).
 */
export function buildEcdf(values: number[]): number[] {
  return [...values].filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
}

/**
 * Hazen plotting position percentile, in [0, 100].
 * Returns the % of observations ≤ v, with a 0.5 offset to avoid 0/100 saturation.
 */
export function percentileOf(ecdf: number[], v: number): number {
  if (!Number.isFinite(v) || ecdf.length === 0) return 50;
  // Binary search for last index where ecdf[i] <= v
  let lo = 0;
  let hi = ecdf.length - 1;
  let count = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (ecdf[mid] <= v) {
      count = mid + 1;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ((count - 0.5) / ecdf.length) * 100;
}

/**
 * Direction-corrected percentile: higher always means "better".
 * For metrics where lower is better (fees, absence, kid/adult ratio), inverts the result.
 */
export function directionalPercentile(metric: MetricDef, ecdf: number[], rawValue: number): number {
  const p = percentileOf(ecdf, rawValue);
  return metric.direction === 1 ? p : 100 - p;
}

/**
 * Volume-weighted quantile of a series.
 * Used for the Quality Spread (Q80 - Q20) calculation.
 */
export function weightedQuantile(values: number[], weights: number[], q: number): number {
  if (values.length === 0) return 0;
  const pairs = values
    .map((v, i) => ({ v, w: weights[i] || 0 }))
    .filter((p) => Number.isFinite(p.v) && p.w > 0)
    .sort((a, b) => a.v - b.v);
  if (pairs.length === 0) return 0;
  const totalW = pairs.reduce((s, p) => s + p.w, 0);
  if (totalW === 0) return pairs[0].v;
  const target = q * totalW;
  let acc = 0;
  for (const p of pairs) {
    acc += p.w;
    if (acc >= target) return p.v;
  }
  return pairs[pairs.length - 1].v;
}
