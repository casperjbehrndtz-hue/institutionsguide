import { useMemo } from "react";
import type { UnifiedInstitution } from "@/lib/types";

export interface PopularData {
  bestTrivsel: { id: string; navn: string; score: number }[];
  bestSchools: { id: string; navn: string; score: number }[];
}

export function usePopularData(institutions: UnifiedInstitution[]): PopularData | null {
  return useMemo(() => {
    if (!institutions.length) return null;

    const bestTrivsel = institutions
      .filter((i) => i.category === "skole" && i.quality?.ts != null && i.quality.ts > 0)
      .sort((a, b) => (b.quality!.ts! - a.quality!.ts!))
      .slice(0, 4)
      .map((s) => ({ id: s.id, navn: s.name, score: s.quality!.ts! }));

    const bestSchools = institutions
      .filter((i) => i.category === "skole" && i.quality?.k != null && i.quality.k > 0)
      .sort((a, b) => (b.quality!.k! - a.quality!.k!))
      .slice(0, 4)
      .map((s) => ({ id: s.id, navn: s.name, score: s.quality!.k! }));

    return { bestTrivsel, bestSchools };
  }, [institutions]);
}
