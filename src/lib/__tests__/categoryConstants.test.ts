import { describe, it, expect } from "vitest";
import {
  CATEGORY_PATHS,
  CATEGORY_TITLES,
  CATEGORY_SEO_DESCRIPTIONS,
  SUBTYPE_LABELS,
} from "../categoryConstants";

const ALL_CATEGORIES = [
  "vuggestue", "boernehave", "dagpleje", "skole", "sfo", "fritidsklub", "efterskole",
];

describe("CATEGORY_PATHS", () => {
  it("has a path for every category", () => {
    for (const cat of ALL_CATEGORIES) {
      expect(CATEGORY_PATHS[cat]).toMatch(/^\//);
    }
  });
});

describe("CATEGORY_TITLES", () => {
  it("has DA and EN titles for every category", () => {
    for (const cat of ALL_CATEGORIES) {
      expect(CATEGORY_TITLES.da[cat]).toBeTruthy();
      expect(CATEGORY_TITLES.en[cat]).toBeTruthy();
    }
  });
});

describe("CATEGORY_SEO_DESCRIPTIONS", () => {
  it("has DA and EN descriptions for every category", () => {
    for (const cat of ALL_CATEGORIES) {
      expect(CATEGORY_SEO_DESCRIPTIONS.da[cat]).toBeTruthy();
      expect(CATEGORY_SEO_DESCRIPTIONS.en[cat]).toBeTruthy();
    }
  });
});

describe("SUBTYPE_LABELS", () => {
  it("has labels for common subtypes", () => {
    expect(SUBTYPE_LABELS.folkeskole).toBe("Folkeskole");
    expect(SUBTYPE_LABELS.privat).toBe("Privat");
  });
});
