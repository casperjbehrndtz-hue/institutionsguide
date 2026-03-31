import { useMemo } from "react";
import type { UnifiedInstitution, NormeringEntry, InstitutionStats } from "@/lib/types";
import { DIMENSIONS_BY_CATEGORY, type InstitutionCategory, type ScoringContext } from "@/lib/preferenceConfig";
import { rankInstitutions, type ScoredInstitution } from "@/lib/preferenceScore";

interface Params {
  institutions: UnifiedInstitution[];
  category: InstitutionCategory;
  weights: Record<string, number>;
  userLocation: { lat: number; lng: number } | null;
  institutionStats: Record<string, InstitutionStats>;
  normering: NormeringEntry[];
  municipality?: string;
}

export interface ScoringResult {
  ranked: ScoredInstitution[];
  excluded: ScoredInstitution[];
}

export function usePreferenceScoring({
  institutions,
  category,
  weights,
  userLocation,
  institutionStats,
  normering,
  municipality,
}: Params): ScoringResult {
  return useMemo(() => {
    // Filter to category (and optionally municipality)
    let filtered = institutions.filter((i) => i.category === category);
    if (municipality) {
      filtered = filtered.filter((i) => i.municipality === municipality);
    }

    const dimensions = DIMENSIONS_BY_CATEGORY[category];
    if (!dimensions || dimensions.length === 0) return { ranked: [], excluded: [] };

    const ctx: ScoringContext = {
      userLocation,
      institutionStats,
      normering,
      priceRange: null, // computed inside rankInstitutions dynamically
    };

    return rankInstitutions(filtered, dimensions, weights, ctx);
  }, [institutions, category, weights, userLocation, institutionStats, normering, municipality]);
}
