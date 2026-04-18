import { useMemo } from "react";
import type { UnifiedInstitution } from "@/lib/types";
import { normalizeSearch } from "@/lib/normalizeSearch";

export interface SearchIndexEntry {
  inst: UnifiedInstitution;
  nameLower: string;
  nameNorm: string;
  cityLower: string;
  cityNorm: string;
  addressLower: string;
  addressNorm: string;
}

export function useSearchIndex(institutions: UnifiedInstitution[]): SearchIndexEntry[] {
  return useMemo(() => {
    const out: SearchIndexEntry[] = new Array(institutions.length);
    for (let i = 0; i < institutions.length; i++) {
      const inst = institutions[i];
      const nameLower = inst.name.toLowerCase();
      const cityLower = inst.city.toLowerCase();
      const addressLower = inst.address.toLowerCase();
      out[i] = {
        inst,
        nameLower,
        nameNorm: normalizeSearch(nameLower),
        cityLower,
        cityNorm: normalizeSearch(cityLower),
        addressLower,
        addressNorm: normalizeSearch(addressLower),
      };
    }
    return out;
  }, [institutions]);
}

export function searchIndex(
  index: SearchIndexEntry[],
  query: string,
  limit = 8,
): UnifiedInstitution[] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];
  const qNorm = normalizeSearch(q);

  const prefix: UnifiedInstitution[] = [];
  const contains: UnifiedInstitution[] = [];
  const locationMatch: UnifiedInstitution[] = [];

  for (let i = 0; i < index.length; i++) {
    const e = index[i];
    if (e.nameLower.startsWith(q) || e.nameNorm.startsWith(qNorm)) {
      prefix.push(e.inst);
      if (prefix.length >= limit) break;
    } else if (e.nameLower.includes(q) || e.nameNorm.includes(qNorm)) {
      if (contains.length < limit) contains.push(e.inst);
    } else if (
      e.cityLower.includes(q) ||
      e.addressLower.includes(q) ||
      e.cityNorm.includes(qNorm) ||
      e.addressNorm.includes(qNorm)
    ) {
      if (locationMatch.length < limit) locationMatch.push(e.inst);
    }
  }

  return [...prefix, ...contains, ...locationMatch].slice(0, limit);
}
