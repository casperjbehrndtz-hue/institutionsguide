import type { Track } from "./metrics";

export interface WeightPreset {
  id: string;
  track: Track;
  labelDa: string;
  labelEn: string;
  descriptionDa: string;
  weights: Record<string, number>;
}

const DAYCARE_PRESETS: WeightPreset[] = [
  {
    id: "daycare-tryghed",
    track: "daycare",
    labelDa: "Tryghed først",
    labelEn: "Safety first",
    descriptionDa: "Mere voksentid og stabile pædagoger før pris.",
    weights: { d_norm: 5, d_stabil: 4, d_uddannet: 3, d_tilfreds: 3, d_takst: 0 },
  },
  {
    id: "daycare-budget",
    track: "daycare",
    labelDa: "Budgetbevidst familie",
    labelEn: "Budget-conscious",
    descriptionDa: "Pris vægter højt, men ikke på bekostning af normering.",
    weights: { d_norm: 3, d_stabil: 1, d_uddannet: 1, d_tilfreds: 2, d_takst: 5 },
  },
  {
    id: "daycare-kvalitet",
    track: "daycare",
    labelDa: "Kvalitetsmaksimerer",
    labelEn: "Quality maximizer",
    descriptionDa: "Alle kvalitetsmål tæller fuldt, pris ignoreres.",
    weights: { d_norm: 4, d_stabil: 3, d_uddannet: 3, d_tilfreds: 3, d_takst: 0 },
  },
];

const SCHOOL_PRESETS: WeightPreset[] = [
  {
    id: "school-fagligt",
    track: "school",
    labelDa: "Fagligt stærkt miljø",
    labelEn: "Academically strong",
    descriptionDa: "Undervisningseffekt og karakter vægter mest.",
    weights: { s_undeff: 5, s_triv_s: 2, s_triv_f: 3, s_grade: 4, s_komp: 3, s_fravaer: 1, s_overgang: 2 },
  },
  {
    id: "school-trivsel",
    track: "school",
    labelDa: "Trivsel først",
    labelEn: "Well-being first",
    descriptionDa: "Social og faglig trivsel prioriteres over karakter.",
    weights: { s_undeff: 3, s_triv_s: 5, s_triv_f: 4, s_grade: 1, s_komp: 2, s_fravaer: 3, s_overgang: 1 },
  },
  {
    id: "school-balanceret",
    track: "school",
    labelDa: "Balanceret",
    labelEn: "Balanced",
    descriptionDa: "Standardvægte — alle spec-anbefalede mål med.",
    weights: { s_undeff: 4, s_triv_s: 3, s_triv_f: 3, s_grade: 2, s_komp: 2, s_fravaer: 1, s_overgang: 1 },
  },
];

export const PRESETS_BY_TRACK: Record<Track, WeightPreset[]> = {
  daycare: DAYCARE_PRESETS,
  school: SCHOOL_PRESETS,
};

export function findPreset(id: string): WeightPreset | undefined {
  return [...DAYCARE_PRESETS, ...SCHOOL_PRESETS].find((p) => p.id === id);
}

/**
 * Match a given weight map against known presets. Returns the preset ID if
 * weights are a perfect match, otherwise null. Useful for highlighting the
 * active preset in the UI.
 */
export function matchPreset(track: Track, weights: Record<string, number>): string | null {
  for (const preset of PRESETS_BY_TRACK[track]) {
    let matches = true;
    const keys = new Set([...Object.keys(preset.weights), ...Object.keys(weights)]);
    for (const k of keys) {
      if ((preset.weights[k] ?? 0) !== (weights[k] ?? 0)) {
        matches = false;
        break;
      }
    }
    if (matches) return preset.id;
  }
  return null;
}
