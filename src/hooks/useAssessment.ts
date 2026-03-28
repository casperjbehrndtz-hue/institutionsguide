import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ScoreResult, LocalizedText } from "@/lib/institutionScore";
import type { UnifiedInstitution, NormeringEntry } from "@/lib/types";

export interface Assessment {
  headline: LocalizedText;
  summary: LocalizedText;
  pros: LocalizedText[];
  cons: LocalizedText[];
  recommendation: LocalizedText;
}

type State = "idle" | "loading" | "loaded" | "error";

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
): { assessment: Assessment | null; state: State } {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [state, setState] = useState<State>("idle");

  useEffect(() => {
    if (!inst || !scoreResult) return;
    if (!supabase) {
      // No Supabase configured — stay with deterministic fallback
      setState("idle");
      return;
    }

    let cancelled = false;

    async function fetchAssessment() {
      setState("loading");

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
        const ageGroup =
          inst!.category === "vuggestue" || inst!.category === "dagpleje"
            ? "0-2" : "3-5";
        const entries = normering.filter(
          (n) => n.municipality.toLowerCase() === inst!.municipality.toLowerCase() && n.ageGroup === ageGroup,
        );
        const latest = entries.sort((a, b) => b.year - a.year)[0];

        const ctx = {
          institution_id: inst!.id,
          name: inst!.name,
          category: inst!.category,
          municipality: inst!.municipality,
          monthly_rate: inst!.monthlyRate ?? null,
          municipality_avg_price: municipalityAvgPrice,
          ownership: inst!.ownership ?? null,
          normering_ratio: latest?.ratio ?? null,
          normering_age_group: latest ? ageGroup : null,
          trivsel: inst!.quality?.ts ?? null,
          karakterer: inst!.quality?.k ?? null,
          fravaer_pct: inst!.quality?.fp ?? null,
          kompetencedaekning_pct: inst!.quality?.kp ?? null,
          klassestorrelse: inst!.quality?.kv ?? null,
          undervisningseffekt: inst!.quality?.sr ?? null,
          score: scoreResult!.overall,
          grade: scoreResult!.grade,
          nearby: nearby.slice(0, 5).map((n) => ({
            name: n.name,
            distance_km: Math.hypot(n.lat - inst!.lat, n.lng - inst!.lng) * 111,
            category: n.category,
            monthly_rate: n.monthlyRate ?? null,
          })),
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
  }, [inst?.id]); // Only re-fetch when institution changes

  return { assessment, state };
}
