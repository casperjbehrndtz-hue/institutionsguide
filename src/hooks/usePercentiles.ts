import { useMemo } from "react";
import type { UnifiedInstitution } from "@/lib/types";
import type { TranslationStrings } from "@/lib/translations/types";

export interface PercentileEntry {
  label: string;
  percentile: number;
  value: string;
  /** Optional badge text (e.g. "Kun folkeskoler") */
  badge?: string;
}

function pctRank(values: number[], val: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const below = sorted.filter((v) => v < val).length;
  return Math.round((below / sorted.length) * 100);
}

function pctRankInverse(values: number[], val: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const above = sorted.filter((v) => v > val).length;
  return Math.round((above / sorted.length) * 100);
}

export function usePercentiles(
  inst: UnifiedInstitution | undefined,
  institutions: UnifiedInstitution[],
  t: TranslationStrings,
): PercentileEntry[] | null {
  return useMemo(() => {
    if (!inst || inst.category !== "skole" || !inst.quality) return null;
    const schools = institutions.filter((i) => i.category === "skole" && i.quality);
    const q = inst.quality;
    const result: PercentileEntry[] = [];

    const isFolkeskole = inst.subtype === "folkeskole";
    const folkeskoleBadge = t.detail.folkeskoleOnly;

    const metrics: { key: keyof NonNullable<UnifiedInstitution["quality"]>; label: string; inverse?: boolean; suffix?: string; folkeskoleOnly?: boolean }[] = [
      { key: "ts", label: t.detail.wellbeing },
      { key: "tf", label: t.detail.wellbeingAcademic },
      { key: "tg", label: t.detail.wellbeingGeneral },
      { key: "tro", label: t.detail.wellbeingClassroom },
      { key: "tsi", label: t.detail.wellbeingSocialIsolation, inverse: true },
      { key: "k", label: t.detail.grades },
      { key: "fp", label: t.detail.absence, inverse: true, suffix: "%" },
      { key: "kp", label: t.detail.competenceCoverage, suffix: "%", folkeskoleOnly: true },
      { key: "kv", label: t.detail.classSize, inverse: true, folkeskoleOnly: true },
      { key: "oug", label: t.detail.transitionRate, suffix: "%" },
      { key: "srd", label: t.detail.socioEconomicDiff },
      { key: "epl", label: t.detail.studentsPerTeacher, inverse: true },
      { key: "upe", label: t.detail.teachingTimePerStudent, suffix: " t" },
    ];

    for (const m of metrics) {
      const val = q[m.key];
      if (val == null || typeof val !== "number") continue;
      // For folkeskole-only metrics, only compare against folkeskoler
      const pool = m.folkeskoleOnly
        ? schools.filter((s) => s.subtype === "folkeskole")
        : schools;
      const allVals = pool.map((s) => s.quality![m.key]).filter((v): v is number => v != null);
      if (allVals.length === 0) continue;
      const percentile = m.inverse ? pctRankInverse(allVals, val) : pctRank(allVals, val);
      const formatted = m.key === "srd"
        ? (val >= 0 ? "+" : "") + val.toLocaleString("da-DK") + (m.suffix ?? "")
        : val.toLocaleString("da-DK") + (m.suffix ?? "");
      result.push({
        label: m.label,
        percentile,
        value: formatted,
        badge: m.folkeskoleOnly && isFolkeskole ? folkeskoleBadge : undefined,
      });
    }

    return result;
  }, [inst, institutions, t]);
}
