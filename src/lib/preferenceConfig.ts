import type { UnifiedInstitution, InstitutionStats, NormeringEntry } from "@/lib/types";

export type InstitutionCategory = UnifiedInstitution["category"];

export interface DimensionConfig {
  key: string;
  label: { da: string; en: string };
  icon: string;
  /** Extract a raw numeric value from an institution (lower/higher depends on `invert`) */
  extract: (
    inst: UnifiedInstitution,
    ctx: ScoringContext,
  ) => number | null;
  /** linearMap input range: [worst, best]. If worst > best, lower raw = better.
   *  Can be null to signal "compute dynamically from data" (used for price). */
  range: [number, number] | null;
  /** Format raw value for display */
  format: (v: number) => string;
  /** Short explanation of what "good" means */
  goodLabel: { da: string; en: string };
}

export interface ScoringContext {
  userLocation: { lat: number; lng: number } | null;
  institutionStats: Record<string, InstitutionStats>;
  normering: NormeringEntry[];
  /** Dynamic price range [p90, p10] computed from the filtered set */
  priceRange: [number, number] | null;
}

// ── Shared helpers ──────────────────────────────────────────────

function getNormeringRatio(
  inst: UnifiedInstitution,
  ctx: ScoringContext,
): number | null {
  const rawId = inst.id.replace(/^(vug|bh|dag|sfo)-/, "");
  const stats = ctx.institutionStats[rawId];
  const ageGroup =
    inst.category === "vuggestue" || inst.category === "dagpleje" ? "0-2" : "3-5";
  const instVal = stats
    ? (ageGroup === "0-2" ? stats.normering02 : stats.normering35)
    : null;
  if (instVal != null) return instVal;

  const entries = ctx.normering.filter(
    (n) =>
      n.municipality.toLowerCase() === inst.municipality.toLowerCase() &&
      n.ageGroup === ageGroup,
  );
  const latest = entries.sort((a, b) => b.year - a.year)[0];
  return latest?.ratio ?? null;
}

function haversineKm(
  lat1: number, lng1: number, lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmt(n: number, d = 1): string {
  return n.toFixed(d).replace(".", ",");
}

// ── Dimension definitions ───────────────────────────────────────

const DISTANCE: DimensionConfig = {
  key: "distance",
  label: { da: "Afstand", en: "Distance" },
  icon: "📍",
  extract: (inst, ctx) => {
    if (!ctx.userLocation) return null;
    return haversineKm(ctx.userLocation.lat, ctx.userLocation.lng, inst.lat, inst.lng);
  },
  range: [10, 0], // 10km = worst, 0km = best — most parents search within 0-5km
  format: (v) => v < 1 ? `${Math.round(v * 1000)} m` : `${fmt(v)} km`,
  goodLabel: { da: "Tæt på dig", en: "Close to you" },
};

const PRICE: DimensionConfig = {
  key: "price",
  label: { da: "Pris", en: "Price" },
  icon: "💰",
  extract: (inst) => inst.monthlyRate,
  range: null, // dynamic — computed from data (p90 → p10)
  format: (v) => `${Math.round(v).toLocaleString("da-DK")} kr/md`,
  goodLabel: { da: "Lav pris", en: "Low price" },
};

const EFTERSKOLE_PRICE: DimensionConfig = {
  key: "price",
  label: { da: "Årspris", en: "Yearly price" },
  icon: "💰",
  extract: (inst) => inst.yearlyPrice ?? null,
  range: null, // dynamic
  format: (v) => `${Math.round(v).toLocaleString("da-DK")} kr/år`,
  goodLabel: { da: "Lav pris", en: "Low price" },
};

const TRIVSEL: DimensionConfig = {
  key: "trivsel",
  label: { da: "Trivsel", en: "Well-being" },
  icon: "😊",
  extract: (inst) => inst.quality?.ts ?? null,
  range: [3.5, 4.3],
  format: (v) => fmt(v),
  goodLabel: { da: "Høj trivsel", en: "High well-being" },
};

const KARAKTERER: DimensionConfig = {
  key: "karakterer",
  label: { da: "Karakterer", en: "Grades" },
  icon: "📝",
  extract: (inst) => inst.quality?.k ?? null,
  range: [5.0, 10.0],
  format: (v) => fmt(v),
  goodLabel: { da: "Højt snit", en: "High average" },
};

const FRAVAER: DimensionConfig = {
  key: "fravaer",
  label: { da: "Fravær", en: "Absence" },
  icon: "📅",
  extract: (inst) => inst.quality?.fp ?? null,
  range: [12, 3], // 12% worst, 3% best
  format: (v) => `${fmt(v)}%`,
  goodLabel: { da: "Lavt fravær", en: "Low absence" },
};

const KOMPETENCE: DimensionConfig = {
  key: "kompetence",
  label: { da: "Kompetencedækning", en: "Teacher qualifications" },
  icon: "🎓",
  extract: (inst) => inst.quality?.kp ?? null,
  range: [70, 100],
  format: (v) => `${fmt(v, 0)}%`,
  goodLabel: { da: "Høj dækning", en: "High coverage" },
};

const KLASSESTORRELSE: DimensionConfig = {
  key: "klassestorrelse",
  label: { da: "Klassestørrelse", en: "Class size" },
  icon: "👥",
  extract: (inst) => inst.quality?.kv ?? null,
  range: [28, 12], // 28 worst, 12 best
  format: (v) => `${fmt(v, 1)} elever`,
  goodLabel: { da: "Små klasser", en: "Small classes" },
};

const ELEV_PR_LAERER: DimensionConfig = {
  key: "elevPrLaerer",
  label: { da: "Elever pr. lærer", en: "Students per teacher" },
  icon: "🧑‍🏫",
  extract: (inst) => inst.quality?.epl ?? null,
  range: [18, 6], // 18 worst, 6 best
  format: (v) => `${fmt(v, 1)} elever/lærer`,
  goodLabel: { da: "Få elever pr. lærer", en: "Few students per teacher" },
};

const UNDERVISNINGSTID: DimensionConfig = {
  key: "undervisningstid",
  label: { da: "Undervisningstid", en: "Teaching time" },
  icon: "⏱️",
  extract: (inst) => inst.quality?.upe ?? null,
  range: [40, 90], // 40h worst, 90h best
  format: (v) => `${fmt(v, 0)} timer/elev`,
  goodLabel: { da: "Mere undervisning pr. elev", en: "More teaching per student" },
};

const NORMERING: DimensionConfig = {
  key: "normering",
  label: { da: "Normering", en: "Staff ratio" },
  icon: "👶",
  extract: (inst, ctx) => getNormeringRatio(inst, ctx),
  range: [5, 2.5], // 5 worst, 2.5 best (children per adult)
  format: (v) => `${fmt(v)} børn/voksen`,
  goodLabel: { da: "God normering", en: "Good staff ratio" },
};

const UDDANNELSE: DimensionConfig = {
  key: "uddannelse",
  label: { da: "Personaleuddannelse", en: "Staff education" },
  icon: "🎓",
  extract: (inst, ctx) => {
    const rawId = inst.id.replace(/^(vug|bh|dag|sfo)-/, "");
    return ctx.institutionStats[rawId]?.pctPaedagoger ?? null;
  },
  range: [35, 80],
  format: (v) => `${fmt(v, 0)}% pæd.`,
  goodLabel: { da: "Høj uddannelsesandel", en: "Highly qualified staff" },
};

const TILFREDSHED: DimensionConfig = {
  key: "tilfredshed",
  label: { da: "Forældretilfredshed", en: "Parent satisfaction" },
  icon: "❤️",
  extract: (inst, ctx) => {
    const rawId = inst.id.replace(/^(vug|bh|dag|sfo)-/, "");
    return ctx.institutionStats[rawId]?.parentSatisfaction ?? null;
  },
  range: [3.0, 5.0],
  format: (v) => `${fmt(v)} / 5`,
  goodLabel: { da: "Tilfredse forældre", en: "Happy parents" },
};

// ── Category → dimension map ────────────────────────────────────

export const DIMENSIONS_BY_CATEGORY: Record<InstitutionCategory, DimensionConfig[]> = {
  vuggestue: [DISTANCE, PRICE, NORMERING, UDDANNELSE, TILFREDSHED],
  boernehave: [DISTANCE, PRICE, NORMERING, UDDANNELSE, TILFREDSHED],
  dagpleje: [DISTANCE, PRICE, NORMERING, TILFREDSHED],
  skole: [DISTANCE, TRIVSEL, KARAKTERER, FRAVAER, KOMPETENCE, KLASSESTORRELSE, ELEV_PR_LAERER, UNDERVISNINGSTID],
  sfo: [DISTANCE, PRICE, NORMERING, UDDANNELSE, TILFREDSHED],
  fritidsklub: [], // Not enough quality data for meaningful ranking
  efterskole: [DISTANCE, EFTERSKOLE_PRICE, TRIVSEL, KARAKTERER],
};

/** Whether a category has enough dimensions for the finder to be useful */
export function categoryHasFinder(cat: InstitutionCategory): boolean {
  return (DIMENSIONS_BY_CATEGORY[cat]?.length ?? 0) >= 2;
}
