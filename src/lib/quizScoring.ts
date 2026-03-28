import type { UnifiedInstitution } from "./types";

export type AgeRange = "0-1" | "1-2" | "3-5" | "6-9" | "10-16";
export type Priority = "lowPrice" | "proximity" | "quality" | "smallGroups" | "flexibleHours";
export type TypePreference = "municipal" | "private" | "childminder" | "noPreference";

export interface QuizAnswers {
  ageRange: AgeRange | null;
  municipality: string;
  priorities: Priority[];
  budget: number; // monthly kr
  typePreference: TypePreference;
}

interface ScoredInstitution {
  institution: UnifiedInstitution;
  score: number;
  matchPercent: number;
}

/** Map age ranges to allowed institution categories */
const AGE_TO_CATEGORIES: Record<AgeRange, string[]> = {
  "0-1": ["vuggestue", "dagpleje"],
  "1-2": ["vuggestue", "dagpleje"],
  "3-5": ["boernehave"],
  "6-9": ["skole", "sfo"],
  "10-16": ["skole"],
};

/** Haversine distance in km */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Get approximate center coordinates for a municipality (use first institution found) */
function getMunicipalityCenter(
  municipality: string,
  institutions: UnifiedInstitution[]
): { lat: number; lng: number } | null {
  const inst = institutions.find(
    (i) => i.municipality.toLowerCase() === municipality.toLowerCase()
  );
  return inst ? { lat: inst.lat, lng: inst.lng } : null;
}

export function scoreInstitutions(
  answers: QuizAnswers,
  institutions: UnifiedInstitution[]
): ScoredInstitution[] {
  if (!answers.ageRange) return [];

  const allowedCategories = AGE_TO_CATEGORIES[answers.ageRange];

  // Filter by age (hard filter)
  let candidates = institutions.filter((inst) =>
    allowedCategories.includes(inst.category)
  );

  // Get municipality center for distance scoring
  const munCenter = answers.municipality
    ? getMunicipalityCenter(answers.municipality, institutions)
    : null;

  const scored: ScoredInstitution[] = [];

  for (const inst of candidates) {
    let score = 0;
    let maxScore = 0;

    // 1. Municipality match (30 points)
    maxScore += 30;
    if (answers.municipality) {
      if (inst.municipality.toLowerCase() === answers.municipality.toLowerCase()) {
        score += 30;
      } else {
        // Nearby municipalities get partial credit based on distance
        if (munCenter) {
          const dist = haversineKm(munCenter.lat, munCenter.lng, inst.lat, inst.lng);
          if (dist < 10) score += 20;
          else if (dist < 25) score += 10;
          else if (dist < 50) score += 5;
          // >50 km = 0 points
        }
      }
    } else {
      score += 15; // No municipality selected = neutral
    }

    // 2. Price within budget (25 points)
    maxScore += 25;
    if (inst.monthlyRate !== null && inst.monthlyRate > 0) {
      if (inst.monthlyRate <= answers.budget) {
        // Under budget = full points, scaled by how much under
        const ratio = inst.monthlyRate / answers.budget;
        score += 25; // Within budget = full score
        // Bonus: cheaper = slightly better if lowPrice is a priority
        if (answers.priorities.includes("lowPrice")) {
          score += Math.round((1 - ratio) * 10);
          maxScore += 10;
        }
      } else {
        // Over budget = partial points based on how close
        const overRatio = answers.budget / inst.monthlyRate;
        score += Math.max(0, Math.round(overRatio * 15));
      }
    } else {
      score += 12; // Unknown price = neutral
    }

    // 3. Type preference (20 points)
    maxScore += 20;
    if (answers.typePreference === "noPreference") {
      score += 20;
    } else if (answers.typePreference === "municipal") {
      if (inst.ownership === "kommunal" || inst.subtype === "folkeskole") score += 20;
      else if (inst.ownership === "selvejende") score += 12;
      else score += 5;
    } else if (answers.typePreference === "private") {
      if (inst.ownership === "privat" || inst.subtype === "friskole") score += 20;
      else if (inst.ownership === "selvejende") score += 12;
      else score += 5;
    } else if (answers.typePreference === "childminder") {
      if (inst.category === "dagpleje") score += 20;
      else score += 5;
    }

    // 4. Quality data bonus (15 points) — only for schools with quality data
    maxScore += 15;
    if (inst.quality) {
      const q = inst.quality;
      if (answers.priorities.includes("quality")) {
        // Weight quality higher
        let qualityScore = 0;
        let qualityMax = 0;

        if (q.ts !== undefined) {
          qualityMax += 5;
          qualityScore += Math.min(5, (q.ts / 5) * 5);
        }
        if (q.k !== undefined) {
          qualityMax += 5;
          qualityScore += Math.min(5, (q.k / 12) * 5);
        }
        if (q.o !== undefined) {
          qualityMax += 5;
          qualityScore += q.o === 1 ? 5 : q.o === 0 ? 3 : 1;
        }
        score += qualityMax > 0 ? Math.round((qualityScore / qualityMax) * 15) : 8;
      } else {
        // Still give some credit for having quality data
        score += 10;
      }
    } else {
      score += 8; // No quality data = neutral
    }

    // 5. Proximity bonus (10 points) — when proximity is a priority
    maxScore += 10;
    if (answers.priorities.includes("proximity") && munCenter) {
      const dist = haversineKm(munCenter.lat, munCenter.lng, inst.lat, inst.lng);
      if (dist < 2) score += 10;
      else if (dist < 5) score += 8;
      else if (dist < 10) score += 5;
      else if (dist < 20) score += 2;
    } else {
      score += 5; // Neutral
    }

    // Small groups priority bonus
    if (answers.priorities.includes("smallGroups")) {
      if (inst.category === "dagpleje") score += 8;
      else if (inst.quality?.kv !== undefined && inst.quality.kv < 22) score += 5;
      maxScore += 8;
    }

    const matchPercent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    scored.push({ institution: inst, score, matchPercent: Math.min(100, matchPercent) });
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored;
}

/** Get the category page path for a set of quiz answers */
export function getCategoryPath(answers: QuizAnswers): string {
  if (!answers.ageRange) return "/";
  const categories = AGE_TO_CATEGORIES[answers.ageRange];
  const primary = categories[0];
  const base = `/${primary}`;
  if (answers.municipality) {
    return `/${primary}/${encodeURIComponent(answers.municipality.toLowerCase())}`;
  }
  return base;
}
