import { useMemo } from "react";
import type { UnifiedInstitution } from "@/lib/types";

export interface PopularData {
  bestTrivsel: { id: string; navn: string; score: number }[];
  bestSchools: { id: string; navn: string; score: number }[];
  cheapestVuggestue: { id: string; navn: string; price: number }[];
  cheapestBoernehave: { id: string; navn: string; price: number }[];
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

    const cheapestVuggestue = institutions
      .filter((i) => i.category === "vuggestue" && i.monthlyRate != null && i.monthlyRate > 0)
      .sort((a, b) => a.monthlyRate! - b.monthlyRate!)
      .slice(0, 4)
      .map((s) => ({ id: s.id, navn: s.name, price: s.monthlyRate! }));

    const cheapestBoernehave = institutions
      .filter((i) => i.category === "boernehave" && i.monthlyRate != null && i.monthlyRate > 0)
      .sort((a, b) => a.monthlyRate! - b.monthlyRate!)
      .slice(0, 4)
      .map((s) => ({ id: s.id, navn: s.name, price: s.monthlyRate! }));

    return { bestTrivsel, bestSchools, cheapestVuggestue, cheapestBoernehave };
  }, [institutions]);
}
