import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ScoreResult, LocalizedText } from "@/lib/institutionScore";
import type { UnifiedInstitution, NormeringEntry, InstitutionStats } from "@/lib/types";
import { haversineKm } from "@/lib/geo";

export interface Assessment {
  headline: LocalizedText;
  summary: LocalizedText;
  pros: LocalizedText[];
  cons: LocalizedText[];
  recommendation: LocalizedText;
}

type State = "idle" | "loading" | "loaded" | "error";

/** Percentile rank: % of values strictly below val */
function pctRank(values: number[], val: number): number {
  if (values.length === 0) return 50;
  const sorted = [...values].sort((a, b) => a - b);
  const below = sorted.filter((v) => v < val).length;
  return Math.round((below / sorted.length) * 100);
}

/** Inverse percentile: % of values strictly above val (for metrics where lower is better) */
function pctRankInverse(values: number[], val: number): number {
  if (values.length === 0) return 50;
  const sorted = [...values].sort((a, b) => a - b);
  const above = sorted.filter((v) => v > val).length;
  return Math.round((above / sorted.length) * 100);
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

/**
 * Fetches AI-generated assessment for an institution.
 * 1. Checks Supabase cache (assessments table)
 * 2. If cache miss, calls edge function to generate + cache
 * 3. Falls back to deterministic ScoreResult text on any failure
 */
export function useAssessment(
  inst: UnifiedInstitution | undefined,
  scoreResult: ScoreResult | null,
  nearby: UnifiedInstitution[],
  normering: NormeringEntry[],
  municipalityAvgPrice: number | null,
  allInstitutions: UnifiedInstitution[],
  allInstitutionStats: Record<string, InstitutionStats>,
  nationalAverages: { trivsel: number; karakterer: number; fravaer: number },
): { assessment: Assessment | null; state: State } {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [state, setState] = useState<State>("idle");
  // Use refs to avoid re-triggering effect when these change (we only refetch on inst change)
  const instRef = useRef(inst);
  const nearbyRef = useRef(nearby);
  const normeringRef = useRef(normering);
  const avgPriceRef = useRef(municipalityAvgPrice);
  const scoreRef = useRef(scoreResult);
  const allInstRef = useRef(allInstitutions);
  const allStatsRef = useRef(allInstitutionStats);
  const natAvgRef = useRef(nationalAverages);
  useEffect(() => {
    instRef.current = inst;
    nearbyRef.current = nearby;
    normeringRef.current = normering;
    avgPriceRef.current = municipalityAvgPrice;
    scoreRef.current = scoreResult;
    allInstRef.current = allInstitutions;
    allStatsRef.current = allInstitutionStats;
    natAvgRef.current = nationalAverages;
  });

  const instId = inst?.id;
  useEffect(() => {
    const inst = instRef.current;
    if (!inst || !scoreRef.current || !scoreRef.current.hasData) return;
    if (!supabase) {
      queueMicrotask(() => setState("idle"));
      return;
    }

    let cancelled = false;

    async function fetchAssessment() {
      setState("loading");
      const sr = scoreRef.current!;
      const nr = nearbyRef.current;
      const norm = normeringRef.current;
      const avgPrice = avgPriceRef.current;

      try {
        // 1. Check cache
        const { data: cached } = await supabase!
          .from("assessments")
          .select("headline, summary, pros, cons, recommendation")
          .eq("institution_id", inst!.id)
          .gt("expires_at", new Date().toISOString())
          .single();

        if (cancelled) return;

        if (cached) {
          setAssessment({
            headline: cached.headline as LocalizedText,
            summary: cached.summary as LocalizedText,
            pros: cached.pros as LocalizedText[],
            cons: cached.cons as LocalizedText[],
            recommendation: cached.recommendation as LocalizedText,
          });
          setState("loaded");
          return;
        }

        // 2. Cache miss — call edge function
        const allInst = allInstRef.current;
        const allStats = allStatsRef.current;
        const natAvg = natAvgRef.current;
        const isSchool = inst!.category === "skole";
        const isDagtilbud = ["vuggestue", "boernehave", "dagpleje"].includes(inst!.category);

        const ageGroup =
          inst!.category === "vuggestue" || inst!.category === "dagpleje"
            ? "0-2" : "3-5";
        const entries = norm.filter(
          (n) => n.municipality.toLowerCase() === inst!.municipality.toLowerCase() && n.ageGroup === ageGroup,
        );
        const latest = entries.sort((a, b) => b.year - a.year)[0];

        // --- Compute comparative context for dagtilbud ---
        let normering_municipality_avg: number | null = null;
        let normering_national_avg: number | null = null;
        let normering_percentile: number | null = null;
        let staff_education_municipality_avg: number | null = null;
        let staff_education_national_avg: number | null = null;
        let staff_education_percentile: number | null = null;
        let parent_satisfaction_municipality_avg: number | null = null;
        let parent_satisfaction_national_avg: number | null = null;
        let parent_satisfaction_percentile: number | null = null;
        let price_percentile: number | null = null;

        if (isDagtilbud) {
          const instId = inst!.id.replace(/^(vug|bh|dag|sfo)-/, "");
          const thisStats = allStats[instId];

          // Normering: use institution-level stats if available, else municipality normering
          const normeringField = ageGroup === "0-2" ? "normering02" : "normering35";
          const allNormVals: number[] = [];
          const munNormVals: number[] = [];
          for (const [sid, s] of Object.entries(allStats)) {
            const v = s[normeringField];
            if (v != null && v > 0) {
              allNormVals.push(v);
              // Find the institution to check municipality
              const matchInst = allInst.find((i) => i.id.replace(/^(vug|bh|dag|sfo)-/, "") === sid);
              if (matchInst && matchInst.municipality === inst!.municipality) {
                munNormVals.push(v);
              }
            }
          }
          const instNormVal = thisStats?.[normeringField] ?? latest?.ratio ?? null;
          if (instNormVal != null && allNormVals.length > 0) {
            // For normering, lower is better (fewer children per adult)
            normering_percentile = pctRankInverse(allNormVals, instNormVal);
            normering_national_avg = avg(allNormVals);
            normering_municipality_avg = avg(munNormVals);
          }

          // Staff education (pctPaedagoger — higher is better)
          const allEduVals: number[] = [];
          const munEduVals: number[] = [];
          for (const [sid, s] of Object.entries(allStats)) {
            if (s.pctPaedagoger != null) {
              allEduVals.push(s.pctPaedagoger);
              const matchInst = allInst.find((i) => i.id.replace(/^(vug|bh|dag|sfo)-/, "") === sid);
              if (matchInst && matchInst.municipality === inst!.municipality) {
                munEduVals.push(s.pctPaedagoger);
              }
            }
          }
          if (thisStats?.pctPaedagoger != null && allEduVals.length > 0) {
            staff_education_percentile = pctRank(allEduVals, thisStats.pctPaedagoger);
            staff_education_national_avg = avg(allEduVals);
            staff_education_municipality_avg = avg(munEduVals);
          }

          // Parent satisfaction (higher is better)
          const allSatVals: number[] = [];
          const munSatVals: number[] = [];
          for (const [sid, s] of Object.entries(allStats)) {
            if (s.parentSatisfaction != null) {
              allSatVals.push(s.parentSatisfaction);
              const matchInst = allInst.find((i) => i.id.replace(/^(vug|bh|dag|sfo)-/, "") === sid);
              if (matchInst && matchInst.municipality === inst!.municipality) {
                munSatVals.push(s.parentSatisfaction);
              }
            }
          }
          if (thisStats?.parentSatisfaction != null && allSatVals.length > 0) {
            parent_satisfaction_percentile = pctRank(allSatVals, thisStats.parentSatisfaction);
            parent_satisfaction_national_avg = avg(allSatVals);
            parent_satisfaction_municipality_avg = avg(munSatVals);
          }

          // Price percentile within municipality (lower price = higher percentile)
          if (inst!.monthlyRate != null) {
            const munPrices = allInst
              .filter((i) => i.municipality === inst!.municipality && i.category === inst!.category && i.monthlyRate != null && i.monthlyRate > 0)
              .map((i) => i.monthlyRate!);
            if (munPrices.length > 0) {
              price_percentile = pctRankInverse(munPrices, inst!.monthlyRate);
            }
          }
        }

        // --- Compute comparative context for schools ---
        let trivsel_municipality_avg: number | null = null;
        let trivsel_national_avg: number | null = null;
        let trivsel_percentile: number | null = null;
        let karakterer_municipality_avg: number | null = null;
        let karakterer_national_avg: number | null = null;
        let karakterer_percentile: number | null = null;
        let fravaer_municipality_avg: number | null = null;
        let fravaer_national_avg: number | null = null;
        let fravaer_percentile: number | null = null;
        let kompetencedaekning_municipality_avg: number | null = null;
        let kompetencedaekning_national_avg: number | null = null;
        let kompetencedaekning_percentile: number | null = null;
        let klassestorrelse_municipality_avg: number | null = null;
        let klassestorrelse_national_avg: number | null = null;
        let klassestorrelse_percentile: number | null = null;

        if (isSchool && inst!.quality) {
          const schools = allInst.filter((i) => i.category === "skole" && i.quality);
          const munSchools = schools.filter((i) => i.municipality === inst!.municipality);
          const q = inst!.quality;

          // Helper to compute stats for a school quality field
          const computeSchoolStats = (
            field: "ts" | "k" | "fp" | "kp" | "kv",
            inverse: boolean,
          ) => {
            const allVals = schools.map((s) => s.quality![field]).filter((v): v is number => v != null);
            const munVals = munSchools.map((s) => s.quality![field]).filter((v): v is number => v != null);
            const val = q[field];
            if (val == null || allVals.length === 0) return { pct: null, munAvg: null, natAvg: null };
            return {
              pct: inverse ? pctRankInverse(allVals, val) : pctRank(allVals, val),
              munAvg: avg(munVals),
              natAvg: avg(allVals),
            };
          };

          const trivselStats = computeSchoolStats("ts", false);
          trivsel_percentile = trivselStats.pct;
          trivsel_municipality_avg = trivselStats.munAvg;
          trivsel_national_avg = trivselStats.natAvg ?? natAvg.trivsel;

          const karStats = computeSchoolStats("k", false);
          karakterer_percentile = karStats.pct;
          karakterer_municipality_avg = karStats.munAvg;
          karakterer_national_avg = karStats.natAvg ?? natAvg.karakterer;

          const fravStats = computeSchoolStats("fp", true);
          fravaer_percentile = fravStats.pct;
          fravaer_municipality_avg = fravStats.munAvg;
          fravaer_national_avg = fravStats.natAvg ?? natAvg.fravaer;

          const kompStats = computeSchoolStats("kp", false);
          kompetencedaekning_percentile = kompStats.pct;
          kompetencedaekning_municipality_avg = kompStats.munAvg;
          kompetencedaekning_national_avg = kompStats.natAvg;

          const klasseStats = computeSchoolStats("kv", true);
          klassestorrelse_percentile = klasseStats.pct;
          klassestorrelse_municipality_avg = klasseStats.munAvg;
          klassestorrelse_national_avg = klasseStats.natAvg;
        }

        const ctx = {
          institution_id: inst!.id,
          name: inst!.name,
          category: inst!.category,
          municipality: inst!.municipality,
          monthly_rate: inst!.monthlyRate ?? null,
          municipality_avg_price: avgPrice,
          ownership: inst!.ownership ?? null,
          normering_ratio: latest?.ratio ?? null,
          normering_age_group: latest ? ageGroup : null,
          trivsel: inst!.quality?.ts ?? null,
          karakterer: inst!.quality?.k ?? null,
          fravaer_pct: inst!.quality?.fp ?? null,
          kompetencedaekning_pct: inst!.quality?.kp ?? null,
          klassestorrelse: inst!.quality?.kv ?? null,
          undervisningseffekt: inst!.quality?.sr ?? null,
          socref_forskel: inst!.quality?.srd ?? null,
          overgang_ungdomsuddannelse_pct: inst!.quality?.oug ?? null,
          score: sr.overall,
          grade: sr.grade,
          nearby: nr.slice(0, 5).map((n) => ({
            name: n.name,
            distance_km: haversineKm(inst!.lat, inst!.lng, n.lat, n.lng),
            category: n.category,
            monthly_rate: n.monthlyRate ?? null,
          })),
          // Comparative context — dagtilbud
          normering_municipality_avg,
          normering_national_avg,
          normering_percentile,
          staff_education_pct: isDagtilbud ? (allStatsRef.current[inst!.id.replace(/^(vug|bh|dag|sfo)-/, "")]?.pctPaedagoger ?? null) : null,
          staff_education_municipality_avg,
          staff_education_national_avg,
          staff_education_percentile,
          parent_satisfaction: isDagtilbud ? (allStatsRef.current[inst!.id.replace(/^(vug|bh|dag|sfo)-/, "")]?.parentSatisfaction ?? null) : null,
          parent_satisfaction_municipality_avg,
          parent_satisfaction_national_avg,
          parent_satisfaction_percentile,
          price_percentile,
          // Comparative context — schools
          trivsel_municipality_avg,
          trivsel_national_avg,
          trivsel_percentile,
          karakterer_municipality_avg,
          karakterer_national_avg,
          karakterer_percentile,
          fravaer_municipality_avg,
          fravaer_national_avg,
          fravaer_percentile,
          kompetencedaekning_municipality_avg,
          kompetencedaekning_national_avg,
          kompetencedaekning_percentile,
          klassestorrelse_municipality_avg,
          klassestorrelse_national_avg,
          klassestorrelse_percentile,
        };

        const { data: fnData, error: fnError } = await supabase!.functions.invoke(
          "generate-assessment",
          { body: ctx },
        );

        if (cancelled) return;

        if (fnError || !fnData) {
          setState("error");
          return;
        }

        setAssessment({
          headline: fnData.headline as LocalizedText,
          summary: fnData.summary as LocalizedText,
          pros: fnData.pros as LocalizedText[],
          cons: fnData.cons as LocalizedText[],
          recommendation: fnData.recommendation as LocalizedText,
        });
        setState("loaded");
      } catch {
        if (!cancelled) setState("error");
      }
    }

    fetchAssessment();
    return () => { cancelled = true; };
  }, [instId]);

  return { assessment, state };
}
