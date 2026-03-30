import { useMemo } from "react";
import type { UnifiedInstitution, InstitutionCategory, AgeGroup, SortKey } from "@/lib/types";

/** Normalize Danish characters for accent-tolerant search */
function normalizeSearch(str: string): string {
  return str
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/é/g, "e")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ä/g, "a");
}

const AGE_GROUP_CATEGORIES: Record<Exclude<AgeGroup, "">, InstitutionCategory[]> = {
  "0-2": ["vuggestue", "dagpleje"],
  "3-5": ["boernehave"],
  "6-9": ["skole", "sfo"],
  "10-16": ["skole", "fritidsklub", "efterskole"],
};

interface FilterOptions {
  search: string;
  category: InstitutionCategory;
  municipality: string;
  qualityFilter: string;
  sortKey: SortKey;
  ageGroup?: AgeGroup;
}

export function useFilteredInstitutions(
  institutions: UnifiedInstitution[],
  options: FilterOptions
): UnifiedInstitution[] {
  return useMemo(() => {
    let result = [...institutions];

    // Age group filter (takes precedence over category when set)
    if (options.ageGroup) {
      const allowedCategories = AGE_GROUP_CATEGORIES[options.ageGroup];
      result = result.filter((i) => allowedCategories.includes(i.category));
    } else if (options.category !== "alle") {
      // Category filter (only when no age group is active)
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

    // Text search — accent-tolerant (æøå ↔ ae/oe/aa)
    if (options.search.trim()) {
      const raw = options.search.toLowerCase().trim();
      const norm = normalizeSearch(raw);
      result = result.filter((i) => {
        // Try exact match first (fast path)
        const nameLower = i.name.toLowerCase();
        if (
          nameLower.includes(raw) ||
          i.address.toLowerCase().includes(raw) ||
          i.postalCode.includes(raw) ||
          i.city.toLowerCase().includes(raw) ||
          i.municipality.toLowerCase().includes(raw)
        ) return true;
        // Fallback: normalized match (handles Bornehuset → Børnehuset)
        if (
          normalizeSearch(nameLower).includes(norm) ||
          normalizeSearch(i.address).includes(norm) ||
          normalizeSearch(i.city).includes(norm) ||
          normalizeSearch(i.municipality).includes(norm)
        ) return true;
        // Efterskole profiles search (e.g. "sport", "musik")
        if (i.profiles?.some((p) => p.includes(raw) || normalizeSearch(p).includes(norm))) return true;
        return false;
      });
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
        case "distance":
          // Distance sorting is handled separately in page components
          return 0;
        default:
          return 0;
      }
    });

    return result;
  }, [institutions, options.search, options.category, options.municipality, options.qualityFilter, options.sortKey, options.ageGroup]);
}
