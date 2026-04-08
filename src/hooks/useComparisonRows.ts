import { useMemo } from "react";
import type { UnifiedInstitution, InstitutionStats, NormeringEntry, SchoolExtraStats, SFOStats } from "@/lib/types";
import { computeScore } from "@/lib/institutionScore";

export interface ComparisonRow {
  inst: UnifiedInstitution & { dist: number };
  score: number | null;
  trivsel: number | null;
  fravaer: number | null;
  karakter: number | null;
  dist: number;
}

export function useComparisonRows(
  inst: UnifiedInstitution | undefined,
  hasScore: boolean,
  nearby: (UnifiedInstitution & { dist: number })[],
  normering: NormeringEntry[],
  institutions: UnifiedInstitution[],
  institutionStats: Record<string, InstitutionStats>,
  schoolExtraStats: Record<string, SchoolExtraStats>,
  sfoStats: Record<string, SFOStats>,
): ComparisonRow[] {
  return useMemo(() => {
    if (!inst || !hasScore) return [];
    return nearby.slice(0, 4).map((n) => {
      const nStats = institutionStats[n.id.replace(/^(vug|bh|dag|sfo)-/, "")];
      const nSchoolExtra = schoolExtraStats[n.municipality];
      const nSfoStats = sfoStats[n.municipality];
      const nNearby = institutions.filter((i) => i.id !== n.id && i.category === n.category).slice(0, 3);
      const nMuniAvg = (() => {
        const same = institutions.filter((i) => i.municipality === n.municipality && i.category === n.category && i.id !== n.id);
        const prices = same.map((i) => i.monthlyRate).filter((p): p is number => p != null && p > 0);
        return prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
      })();
      const nScore = computeScore(n, nNearby, normering, nMuniAvg, nStats, institutions, institutionStats, nSchoolExtra, nSfoStats);
      return {
        inst: n,
        score: nScore.overall != null ? Math.round(nScore.overall / 10 * 10) / 10 : null,
        trivsel: n.quality?.ts ?? null,
        fravaer: n.quality?.fp ?? null,
        karakter: n.quality?.k ?? null,
        dist: n.dist,
      };
    });
  }, [inst, hasScore, nearby, normering, institutions, institutionStats, schoolExtraStats, sfoStats]);
}
