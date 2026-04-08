import { useMemo } from "react";
import type { UnifiedInstitution } from "@/lib/types";

export interface CategoryStat {
  count: number;
  minPrice: number | null;
  minYearlyPrice: number | null;
}

export function useCategoryStats(institutions: UnifiedInstitution[]) {
  return useMemo(() => {
    const stats: Record<string, CategoryStat> = {};
    for (const inst of institutions) {
      const cat = inst.category;
      if (!stats[cat]) stats[cat] = { count: 0, minPrice: null, minYearlyPrice: null };
      stats[cat].count++;
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
    }
    return stats;
  }, [institutions]);
}
