import { useMemo } from "react";
import type { UnifiedInstitution } from "@/lib/types";

export interface CategoryStat {
  count: number;
  minPrice: number | null;
  minYearlyPrice: number | null;
  avgKaraktersnit: number | null;
  avgTrivsel: number | null;
  municipalityCount: number;
}

export function useCategoryStats(institutions: UnifiedInstitution[]) {
  return useMemo(() => {
    const stats: Record<string, CategoryStat> = {};
    const karakterValues: Record<string, number[]> = {};
    const trivselValues: Record<string, number[]> = {};
    const municipalities: Record<string, Set<string>> = {};

    for (const inst of institutions) {
      const cat = inst.category;
      if (!stats[cat]) stats[cat] = { count: 0, minPrice: null, minYearlyPrice: null, avgKaraktersnit: null, avgTrivsel: null, municipalityCount: 0 };
      if (!karakterValues[cat]) karakterValues[cat] = [];
      if (!trivselValues[cat]) trivselValues[cat] = [];
      if (!municipalities[cat]) municipalities[cat] = new Set();

      stats[cat].count++;
      municipalities[cat].add(inst.municipality);

      if (inst.monthlyRate && inst.monthlyRate > 0) {
        if (stats[cat].minPrice === null || inst.monthlyRate < stats[cat].minPrice!) {
          stats[cat].minPrice = inst.monthlyRate;
        }
      }
      if (inst.yearlyPrice && inst.yearlyPrice > 0) {
        if (stats[cat].minYearlyPrice === null || inst.yearlyPrice < stats[cat].minYearlyPrice!) {
          stats[cat].minYearlyPrice = inst.yearlyPrice;
        }
      }
      if (inst.quality?.k != null) karakterValues[cat].push(inst.quality.k);
      if (inst.quality?.ts != null) trivselValues[cat].push(inst.quality.ts);
    }

    for (const cat of Object.keys(stats)) {
      const kv = karakterValues[cat];
      if (kv.length > 0) stats[cat].avgKaraktersnit = Math.round((kv.reduce((a, b) => a + b, 0) / kv.length) * 10) / 10;
      const tv = trivselValues[cat];
      if (tv.length > 0) stats[cat].avgTrivsel = Math.round((tv.reduce((a, b) => a + b, 0) / tv.length) * 10) / 10;
      stats[cat].municipalityCount = municipalities[cat].size;
    }

    return stats;
  }, [institutions]);
}
