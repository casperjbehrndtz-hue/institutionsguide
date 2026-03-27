import { useMemo } from "react";
import type { UnifiedInstitution, InstitutionCategory, SortKey } from "@/lib/types";

interface FilterOptions {
  search: string;
  category: InstitutionCategory;
  municipality: string;
  qualityFilter: string;
  sortKey: SortKey;
}

export function useFilteredInstitutions(
  institutions: UnifiedInstitution[],
  options: FilterOptions
): UnifiedInstitution[] {
  return useMemo(() => {
    let result = [...institutions];

    // Category filter
    if (options.category !== "alle") {
      result = result.filter((i) => i.category === options.category);
    }

    // Municipality filter
    if (options.municipality) {
      result = result.filter((i) => i.municipality === options.municipality);
    }

    // Quality filter (schools only)
    if (options.qualityFilter) {
      const qVal = Number(options.qualityFilter);
      result = result.filter(
        (i) => i.category !== "skole" || (i.quality?.o !== undefined && i.quality.o === qVal)
      );
    }

    // Text search
    if (options.search.trim()) {
      const q = options.search.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.address.toLowerCase().includes(q) ||
          i.postalCode.includes(q) ||
          i.city.toLowerCase().includes(q) ||
          i.municipality.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (options.sortKey) {
        case "name":
          return a.name.localeCompare(b.name, "da");
        case "price": {
          const ap = a.monthlyRate ?? Infinity;
          const bp = b.monthlyRate ?? Infinity;
          return ap - bp;
        }
        case "municipality":
          return a.municipality.localeCompare(b.municipality, "da");
        case "rating": {
          const ar = a.quality?.r ?? -1;
          const br = b.quality?.r ?? -1;
          return br - ar;
        }
        case "grades": {
          const ag = a.quality?.k ?? -1;
          const bg = b.quality?.k ?? -1;
          return bg - ag;
        }
        case "absence": {
          const aa = a.quality?.fp ?? Infinity;
          const ba = b.quality?.fp ?? Infinity;
          return aa - ba;
        }
        default:
          return 0;
      }
    });

    return result;
  }, [institutions, options.search, options.category, options.municipality, options.qualityFilter, options.sortKey]);
}
