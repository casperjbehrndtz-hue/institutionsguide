import { useMemo } from "react";
import { haversineKm } from "@/lib/geo";
import type { UnifiedInstitution } from "@/lib/types";

/**
 * Compute geographically nearby municipalities based on institution centroid distance.
 * Optionally filter to municipalities that have institutions in a given category.
 */
export function useNearbyMunicipalities(
  institutions: UnifiedInstitution[],
  munName: string,
  category?: string,
  limit = 6,
): string[] {
  return useMemo(() => {
    if (!munName) return [];

    // Compute centroid (average lat/lng) for each municipality
    const centroids = new Map<string, { lat: number; lng: number; count: number }>();
    for (const inst of institutions) {
      if (!inst.lat || !inst.lng) continue;
      const existing = centroids.get(inst.municipality);
      if (existing) {
        existing.lat += inst.lat;
        existing.lng += inst.lng;
        existing.count++;
      } else {
        centroids.set(inst.municipality, { lat: inst.lat, lng: inst.lng, count: 1 });
      }
    }

    const origin = centroids.get(munName);
    if (!origin) return [];
    const oLat = origin.lat / origin.count;
    const oLng = origin.lng / origin.count;

    // Filter municipalities that have institutions in the given category
    const candidates: { name: string; dist: number }[] = [];
    for (const [name, c] of centroids) {
      if (name === munName) continue;
      if (category && !institutions.some((i) => i.category === category && i.municipality === name)) continue;
      const lat = c.lat / c.count;
      const lng = c.lng / c.count;
      candidates.push({ name, dist: haversineKm(oLat, oLng, lat, lng) });
    }

    candidates.sort((a, b) => a.dist - b.dist);
    return candidates.slice(0, limit).map((c) => c.name);
  }, [institutions, munName, category, limit]);
}
