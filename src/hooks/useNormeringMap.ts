import { useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { qualityLevelBadge } from "@/lib/badges";
import type { UnifiedInstitution } from "@/lib/types";

/** Pre-computes normering lookups keyed by "municipality|ageGroup" → latest ratio */
export function useNormeringMap() {
  const { normering } = useData();
  const { language } = useLanguage();

  const normeringMap = useMemo(() => {
    const map = new Map<string, number>();
    const nationalSums = new Map<string, { sum: number; count: number }>();
    for (const n of normering) {
      const key = `${n.municipality}|${n.ageGroup}`;
      const yearKey = `${key}|year`;
      const existingYear = map.get(yearKey);
      if (!existingYear || n.year > existingYear) {
        map.set(yearKey, n.year);
        map.set(key, n.ratio);
      }
      const nat = nationalSums.get(n.ageGroup) ?? { sum: 0, count: 0 };
      nat.sum += n.ratio;
      nat.count++;
      nationalSums.set(n.ageGroup, nat);
    }
    for (const [ag, { sum, count }] of nationalSums) {
      map.set(`__national__|${ag}`, sum / count);
    }
    return map;
  }, [normering]);

  function getInstNormering(inst: UnifiedInstitution): number | null {
    const agMap: Record<string, string> = { vuggestue: "0-2", boernehave: "3-5", dagpleje: "dagpleje", sfo: "3-5" };
    const ag = agMap[inst.category];
    if (!ag) return null;
    return normeringMap.get(`${inst.municipality}|${ag}`) ?? null;
  }

  function getInstQualityBadge(inst: UnifiedInstitution): { label: string; className: string } | null {
    const lang = language as "da" | "en";
    if (inst.category === "skole" && inst.quality?.o !== undefined) {
      return qualityLevelBadge(inst.quality.o, lang);
    }
    const agMap: Record<string, string> = { vuggestue: "0-2", boernehave: "3-5", dagpleje: "dagpleje", sfo: "3-5" };
    const ag = agMap[inst.category];
    if (!ag) return null;
    const ratio = normeringMap.get(`${inst.municipality}|${ag}`);
    const natAvg = normeringMap.get(`__national__|${ag}`);
    if (ratio == null || natAvg == null) return null;
    if (ratio < natAvg - 0.2) return qualityLevelBadge(1, lang);
    if (ratio > natAvg + 0.3) return qualityLevelBadge(-1, lang);
    return qualityLevelBadge(0, lang);
  }

  return { normeringMap, getInstNormering, getInstQualityBadge };
}
