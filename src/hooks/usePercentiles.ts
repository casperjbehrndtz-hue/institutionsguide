import { useMemo } from "react";
import type { UnifiedInstitution } from "@/lib/types";

export interface PercentileEntry {
  label: string;
  percentile: number;
  value: string;
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
  t: any,
): PercentileEntry[] | null {
  return useMemo(() => {
    if (!inst || inst.category !== "skole" || !inst.quality) return null;
    const schools = institutions.filter((i) => i.category === "skole" && i.quality);
    const q = inst.quality;
    const result: PercentileEntry[] = [];

    const metrics: { key: keyof NonNullable<UnifiedInstitution["quality"]>; label: string; inverse?: boolean; suffix?: string }[] = [
      { key: "ts", label: t.detail.wellbeing },
      { key: "tf", label: t.detail.wellbeingAcademic },
      { key: "tg", label: t.detail.wellbeingGeneral },
      { key: "tro", label: t.detail.wellbeingClassroom },
      { key: "tsi", label: t.detail.wellbeingSocialIsolation, inverse: true },
      { key: "k", label: t.detail.grades },
      { key: "fp", label: t.detail.absence, inverse: true, suffix: "%" },
      { key: "kp", label: t.detail.competenceCoverage, suffix: "%" },
      { key: "kv", label: t.detail.classSize, inverse: true },
      { key: "epl", label: t.detail.studentsPerTeacher, inverse: true },
      { key: "upe", label: t.detail.teachingTimePerStudent, suffix: " t" },
    ];

    for (const m of metrics) {
      const val = q[m.key];
      if (val == null || typeof val !== "number") continue;
      const allVals = schools.map((s) => s.quality![m.key]).filter((v): v is number => v != null);
      if (allVals.length === 0) continue;
      const percentile = m.inverse ? pctRankInverse(allVals, val) : pctRank(allVals, val);
      const formatted = val.toLocaleString("da-DK") + (m.suffix ?? "");
      result.push({ label: m.label, percentile, value: formatted });
    }

    return result;
  }, [inst, institutions, t]);
}
