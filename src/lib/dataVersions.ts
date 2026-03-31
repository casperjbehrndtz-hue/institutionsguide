/**
 * Central config for data freshness dates.
 * Update these values whenever underlying data sources are refreshed.
 */

/** Danish month names (0-indexed) */
const DA_MONTHS = [
  "januar", "februar", "marts", "april", "maj", "juni",
  "juli", "august", "september", "oktober", "november", "december",
] as const;

const EN_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export const dataVersions = {
  /** Childcare price data from Danmarks Statistik (StatBank RES88) */
  prices: {
    year: 2025,
    lastUpdated: new Date("2026-03-31"),
  },
  /** School quality data from Undervisningsministeriet */
  schoolQuality: {
    schoolYear: "2024/2025",
    lastUpdated: new Date("2026-03-31"),
  },
  /** Friplads subsidy thresholds */
  friplads: {
    year: 2026,
    lastUpdated: new Date("2026-03-31"),
  },
  /** Normering (staff ratio) data */
  normering: {
    lastUpdated: new Date("2026-03-31"),
  },
  /** Overall site data freshness (latest of all sources) */
  overall: {
    lastUpdated: new Date("2026-03-31"),
  },
  /** Privacy policy / terms page date */
  legal: {
    lastUpdated: new Date("2026-03-01"),
  },
} as const;

/** Format a data version date as "marts 2026" (Danish) or "March 2026" (English) */
export function formatDataDate(date: Date, lang: "da" | "en" = "da"): string {
  const months = lang === "da" ? DA_MONTHS : EN_MONTHS;
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

/** Format as "2025/2026" style string from a school year config */
export function formatSchoolYear(): string {
  return dataVersions.schoolQuality.schoolYear;
}

/** Get the price year as a string, e.g. "2025" */
export function getPriceYear(): number {
  return dataVersions.prices.year;
}

/** Get the friplads year */
export function getFripladsYear(): number {
  return dataVersions.friplads.year;
}
