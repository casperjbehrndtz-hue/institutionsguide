export const BEDSTE_CATEGORIES = ["vuggestue", "boernehave", "dagpleje", "sfo"] as const;
export type BedsteCategory = (typeof BEDSTE_CATEGORIES)[number];

export function isBedsteCategory(s: string): s is BedsteCategory {
  return (BEDSTE_CATEGORIES as readonly string[]).includes(s);
}

export const CATEGORY_LABELS_DA: Record<BedsteCategory, string> = {
  vuggestue: "Vuggestuer",
  boernehave: "Børnehaver",
  dagpleje: "Dagplejere",
  sfo: "SFO'er",
};

export const CATEGORY_SINGULAR_DA: Record<BedsteCategory, string> = {
  vuggestue: "vuggestue",
  boernehave: "børnehave",
  dagpleje: "dagpleje",
  sfo: "SFO",
};

export const CATEGORY_LABELS_EN: Record<BedsteCategory, string> = {
  vuggestue: "Nurseries",
  boernehave: "Kindergartens",
  dagpleje: "Childminders",
  sfo: "After-school care",
};

export const CATEGORY_SINGULAR_EN: Record<BedsteCategory, string> = {
  vuggestue: "nursery",
  boernehave: "kindergarten",
  dagpleje: "childminder",
  sfo: "after-school care",
};

export const CATEGORY_PLURAL_DA: Record<BedsteCategory, string> = {
  vuggestue: "vuggestuer",
  boernehave: "børnehaver",
  dagpleje: "dagplejere",
  sfo: "SFO'er",
};
