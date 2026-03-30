/**
 * Slug utilities for programmatic SEO pages.
 * Converts Danish municipality names to URL-safe slugs and back.
 */

const DANISH_MAP: Record<string, string> = {
  "æ": "ae", "ø": "oe", "å": "aa",
  "Æ": "Ae", "Ø": "Oe", "Å": "Aa",
};

export function toSlug(name: string): string {
  return name
    .replace(/[æøåÆØÅ]/g, (ch) => DANISH_MAP[ch] || ch)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Build a reverse-lookup map from slug -> original municipality name */
export function buildSlugMap(municipalityNames: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const name of municipalityNames) {
    map.set(toSlug(name), name);
  }
  return map;
}

export const CATEGORY_SLUGS = ["vuggestue", "boernehave", "dagpleje", "skole", "sfo", "fritidsklub", "efterskole"] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export const DAYCARE_CATEGORY_SLUGS = ["vuggestue", "boernehave", "dagpleje"] as const;
export type DaycareCategorySlug = (typeof DAYCARE_CATEGORY_SLUGS)[number];

export const CATEGORY_LABELS_DA: Record<CategorySlug, string> = {
  vuggestue: "Vuggestuer",
  boernehave: "Børnehaver",
  dagpleje: "Dagplejere",
  skole: "Skoler",
  sfo: "SFO",
  fritidsklub: "Fritidsklubber",
  efterskole: "Efterskoler",
};

export const CATEGORY_SINGULAR_DA: Record<CategorySlug, string> = {
  vuggestue: "vuggestue",
  boernehave: "børnehave",
  dagpleje: "dagpleje",
  skole: "skole",
  sfo: "SFO",
  fritidsklub: "fritidsklub",
  efterskole: "efterskole",
};

export const VS_PAIRS: [CategorySlug, CategorySlug][] = [
  ["vuggestue", "dagpleje"],
  ["vuggestue", "boernehave"],
  ["boernehave", "sfo"],
];

export function vsSlug(a: CategorySlug, b: CategorySlug): string {
  return `${a}-vs-${b}`;
}
