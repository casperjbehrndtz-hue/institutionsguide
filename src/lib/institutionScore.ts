import type {
  UnifiedInstitution,
  NormeringEntry,
  InstitutionStats,
  SchoolExtraStats,
  SFOStats,
} from "@/lib/types";
import type { ScoreResult } from "./scoring/types";
import { toGrade } from "./scoring/utils";
import { scoreSchool, schoolProsAndCons, schoolRecommendation } from "./scoring/school";
import { scoreDagtilbud, dagtilbudProsAndCons, dagtilbudRecommendation } from "./scoring/dagtilbud";
import { enrichMetrics } from "./scoring/enrichment";

export type { LocalizedText, MetricScore, ScoreResult } from "./scoring/types";

const DAGTILBUD_CATEGORIES = new Set([
  "vuggestue",
  "boernehave",
  "dagpleje",
  "sfo",
]);

export function computeScore(
  inst: UnifiedInstitution,
  _nearby: UnifiedInstitution[],
  normering: NormeringEntry[],
  municipalityAvgPrice: number | null,
  instStats?: InstitutionStats,
  allInstitutions?: UnifiedInstitution[],
  allInstitutionStats?: Record<string, InstitutionStats>,
  schoolExtraStats?: SchoolExtraStats,
  sfoStats?: SFOStats,
): ScoreResult {
  const noDataResult: ScoreResult = {
    overall: null,
    grade: null,
    hasData: false,
    metrics: [],
    pros: [],
    cons: [],
    recommendation: {
      da: "Ikke nok data til at beregne en score.",
      en: "Not enough data to compute a score.",
    },
  };

  const isSchool = inst.category === "skole";
  const enrichOpts = { inst, allInstitutions, allInstitutionStats, normering };

  if (isSchool && inst.quality) {
    const { metrics: rawMetrics, overall } = scoreSchool(inst.quality, schoolExtraStats);
    if (overall == null) {
      return noDataResult;
    }
    const metrics = allInstitutions ? enrichMetrics(rawMetrics, enrichOpts) : rawMetrics;
    const { pros, cons } = schoolProsAndCons(inst.quality);
    const recommendation = schoolRecommendation(overall, inst.quality);
    return { overall, grade: toGrade(overall), hasData: true, metrics, pros, cons, recommendation };
  }

  if (DAGTILBUD_CATEGORIES.has(inst.category)) {
    const { metrics: rawMetrics, overall } = scoreDagtilbud(inst, normering, municipalityAvgPrice, instStats, sfoStats);
    if (overall == null) {
      return noDataResult;
    }
    const metrics = allInstitutions ? enrichMetrics(rawMetrics, enrichOpts) : rawMetrics;
    const { pros, cons } = dagtilbudProsAndCons(inst, normering, municipalityAvgPrice, instStats);
    const recommendation = dagtilbudRecommendation(overall, inst, normering, municipalityAvgPrice);
    return { overall, grade: toGrade(overall), hasData: true, metrics, pros, cons, recommendation };
  }

  return noDataResult;
}
