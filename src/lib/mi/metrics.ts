import type { UnifiedInstitution, InstitutionStats, NormeringEntry, KommuneStats } from "@/lib/types";

export type Track = "daycare" | "school";

export interface MetricDef {
  id: string;
  track: Track;
  /** +1 = higher is better, -1 = lower is better */
  direction: 1 | -1;
  labelDa: string;
  labelEn: string;
  unit: string;
  defaultWeight: number;
  source: string;
  /** Extract raw value for an institution; null = missing */
  extract: (ctx: ExtractCtx) => number | null;
}

export interface ExtractCtx {
  inst: UnifiedInstitution;
  stats?: InstitutionStats;
  kommuneStats?: KommuneStats;
  normering: NormeringEntry[];
}

const DAYCARE_METRICS: MetricDef[] = [
  {
    id: "d_norm",
    track: "daycare",
    direction: -1,
    labelDa: "Normering",
    labelEn: "Staff ratio",
    unit: "børn/voksen",
    defaultWeight: 4,
    source: "BUVM minimumsnormering + DST",
    extract: ({ inst, stats, normering }) => {
      const ageGroup = inst.category === "boernehave" ? "3-5" : "0-2";
      const fromInst = stats
        ? ageGroup === "0-2"
          ? stats.normering02
          : stats.normering35
        : null;
      if (fromInst != null) return fromInst;
      const muniLower = inst.municipality.toLowerCase();
      const fromKommune = normering
        .filter((n) => n.municipality.toLowerCase() === muniLower && n.ageGroup === ageGroup)
        .sort((a, b) => b.year - a.year)[0];
      return fromKommune?.ratio ?? null;
    },
  },
  {
    id: "d_uddannet",
    track: "daycare",
    direction: 1,
    labelDa: "Uddannede pædagoger",
    labelEn: "Qualified pedagogues",
    unit: "%",
    defaultWeight: 2,
    source: "KRL/BUVM",
    extract: ({ stats, kommuneStats }) =>
      stats?.pctPaedagoger ?? kommuneStats?.pctPaedagogerKommune ?? null,
  },
  {
    id: "d_tilfreds",
    track: "daycare",
    direction: 1,
    labelDa: "Forældretilfredshed",
    labelEn: "Parent satisfaction",
    unit: "/5",
    defaultWeight: 2,
    source: "BTU",
    extract: ({ stats }) => stats?.parentSatisfaction ?? null,
  },
  {
    id: "d_takst",
    track: "daycare",
    direction: -1,
    labelDa: "Forældrebetaling",
    labelEn: "Parental fee",
    unit: "kr./md.",
    defaultWeight: 1,
    source: "Kommunale takstblade",
    extract: ({ inst }) => inst.monthlyRate ?? null,
  },
];

const SCHOOL_METRICS: MetricDef[] = [
  {
    id: "s_undeff",
    track: "school",
    direction: 1,
    labelDa: "Undervisningseffekt",
    labelEn: "Teaching effectiveness",
    unit: "Δ karakter",
    defaultWeight: 4,
    source: "Uddannelsesstatistik (FP9 socref)",
    extract: ({ inst }) => inst.quality?.srd ?? null,
  },
  {
    id: "s_triv_s",
    track: "school",
    direction: 1,
    labelDa: "Social trivsel",
    labelEn: "Social well-being",
    unit: "/5",
    defaultWeight: 3,
    source: "Den Nationale Trivselsmåling",
    extract: ({ inst }) => inst.quality?.ts ?? null,
  },
  {
    id: "s_triv_f",
    track: "school",
    direction: 1,
    labelDa: "Faglig trivsel",
    labelEn: "Academic well-being",
    unit: "/5",
    defaultWeight: 3,
    source: "Den Nationale Trivselsmåling",
    extract: ({ inst }) => inst.quality?.tf ?? null,
  },
  {
    id: "s_grade",
    track: "school",
    direction: 1,
    labelDa: "Karaktergennemsnit",
    labelEn: "Grade average",
    unit: "FP9",
    defaultWeight: 2,
    source: "Uddannelsesstatistik",
    extract: ({ inst }) => inst.quality?.k ?? null,
  },
  {
    id: "s_komp",
    track: "school",
    direction: 1,
    labelDa: "Kompetencedækning",
    labelEn: "Teacher qualification coverage",
    unit: "%",
    defaultWeight: 2,
    source: "Uddannelsesstatistik",
    extract: ({ inst }) => inst.quality?.kp ?? null,
  },
  {
    id: "s_fravaer",
    track: "school",
    direction: -1,
    labelDa: "Elevfravær",
    labelEn: "Student absence",
    unit: "%",
    defaultWeight: 1,
    source: "Uddannelsesstatistik",
    extract: ({ inst }) => inst.quality?.fp ?? null,
  },
  {
    id: "s_overgang",
    track: "school",
    direction: 1,
    labelDa: "Overgang til ungdomsudd.",
    labelEn: "Transition to youth education",
    unit: "%",
    defaultWeight: 1,
    source: "Uddannelsesstatistik",
    extract: ({ inst }) => inst.quality?.oug ?? null,
  },
];

export const METRICS_BY_TRACK: Record<Track, MetricDef[]> = {
  daycare: DAYCARE_METRICS,
  school: SCHOOL_METRICS,
};

export function getMetric(id: string): MetricDef | undefined {
  return [...DAYCARE_METRICS, ...SCHOOL_METRICS].find((m) => m.id === id);
}

export function defaultWeights(track: Track): Record<string, number> {
  const w: Record<string, number> = {};
  for (const m of METRICS_BY_TRACK[track]) w[m.id] = m.defaultWeight;
  return w;
}

export function institutionVolume(track: Track, inst: UnifiedInstitution, stats?: InstitutionStats): number {
  if (track === "daycare") return Math.max(stats?.antalBoern ?? 30, 1);
  return Math.max(inst.quality?.el ?? 350, 1);
}

export function isInTrack(track: Track, inst: UnifiedInstitution): boolean {
  if (track === "daycare") return inst.category === "vuggestue" || inst.category === "boernehave" || inst.category === "dagpleje";
  return inst.category === "skole";
}
