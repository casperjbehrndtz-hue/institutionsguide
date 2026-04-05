export interface LocalizedText {
  da: string;
  en: string;
}

export interface MetricScore {
  key: string;
  label: LocalizedText;
  score: number;
  value: string;
  icon: string;
  percentile: number | null;
  municipalityAvg: string | null;
  nationalAvg: string | null;
  context: LocalizedText | null;
}

export interface ScoreResult {
  overall: number | null;
  grade: "A" | "B" | "C" | "D" | "E" | null;
  hasData: boolean;
  metrics: MetricScore[];
  pros: LocalizedText[];
  cons: LocalizedText[];
  recommendation: LocalizedText;
}

export interface WeightedMetric {
  key: string;
  label: LocalizedText;
  weight: number;
  score: number;
  value: string;
  icon: string;
}
