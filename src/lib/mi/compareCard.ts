import type { MetricDef } from "./metrics";
import { METRICS_BY_TRACK } from "./metrics";
import { nationalPercentileOfMedian, type MIDataset } from "./aggregate";

export type Reliability = "high" | "medium" | "low";

export interface ComparisonRow {
  metric: MetricDef;
  this: { raw: number | null; percentile: number; reliability: Reliability };
  municipality: { raw: number | null; percentile: number };
  national: { raw: number | null; percentile: number };
  deltaVsMuni: number;
  deltaVsNational: number;
}

export interface ComparisonCardData {
  rows: ComparisonRow[];
  insufficientMunicipalityData: boolean;
}

const RELIABILITY: Record<0 | 1 | 2, Reliability> = { 0: "high", 1: "medium", 2: "low" };

/**
 * Build a Comparison Card: This institution × Municipality median × National median.
 * For "lower is better" metrics, percentiles are direction-corrected (higher is always better).
 */
export function buildComparisonCard(args: {
  dataset: MIDataset;
  institutionId: string;
}): ComparisonCardData {
  const { dataset, institutionId } = args;
  const row = dataset.rows.find((r) => r.institutionId === institutionId);
  const metrics = METRICS_BY_TRACK[dataset.track];
  const muniRows = row ? dataset.byMunicipality.get(row.municipality) ?? [] : [];
  const insufficientMunicipalityData = muniRows.length < 5;

  const rows: ComparisonRow[] = metrics.map((metric) => {
    const cell = row?.cells[metric.id];
    const muniMedian = row ? dataset.municipalityMedians[metric.id]?.[row.municipality] : undefined;
    const muniPercentile = muniMedian != null
      ? nationalPercentileOfMedian(metric, dataset, muniMedian)
      : 50;
    const natMedian = dataset.national[metric.id]?.median;
    const natPercentile = 50;

    const reliability: Reliability = cell ? RELIABILITY[cell.imputed] : "low";

    return {
      metric,
      this: {
        raw: cell?.value ?? null,
        percentile: cell?.percentile ?? 50,
        reliability,
      },
      municipality: {
        raw: muniMedian ?? null,
        percentile: muniPercentile,
      },
      national: {
        raw: natMedian ?? null,
        percentile: natPercentile,
      },
      deltaVsMuni: (cell?.percentile ?? 50) - muniPercentile,
      deltaVsNational: (cell?.percentile ?? 50) - natPercentile,
    };
  });

  return { rows, insufficientMunicipalityData };
}
