import { describe, it, expect } from "vitest";
import {
  BEDSTE_CATEGORIES,
  isBedsteCategory,
  CATEGORY_LABELS_DA,
  CATEGORY_SINGULAR_DA,
  CATEGORY_LABELS_EN,
  CATEGORY_SINGULAR_EN,
  CATEGORY_PLURAL_DA,
} from "../bedsteCategories";

describe("BEDSTE_CATEGORIES", () => {
  it("contains expected categories", () => {
    expect(BEDSTE_CATEGORIES).toEqual(["vuggestue", "boernehave", "dagpleje", "sfo"]);
  });
});

describe("isBedsteCategory", () => {
  it.each(["vuggestue", "boernehave", "dagpleje", "sfo"])("returns true for %s", (cat) => {
    expect(isBedsteCategory(cat)).toBe(true);
  });

  it.each(["skole", "gymnasium", "", "Vuggestue", "SFO"])("returns false for %s", (val) => {
    expect(isBedsteCategory(val)).toBe(false);
  });
});

describe("label records", () => {
  it("has DA labels for all categories", () => {
    for (const cat of BEDSTE_CATEGORIES) {
      expect(CATEGORY_LABELS_DA[cat]).toBeTruthy();
      expect(CATEGORY_SINGULAR_DA[cat]).toBeTruthy();
      expect(CATEGORY_PLURAL_DA[cat]).toBeTruthy();
    }
  });

  it("has EN labels for all categories", () => {
    for (const cat of BEDSTE_CATEGORIES) {
      expect(CATEGORY_LABELS_EN[cat]).toBeTruthy();
      expect(CATEGORY_SINGULAR_EN[cat]).toBeTruthy();
    }
  });
});
