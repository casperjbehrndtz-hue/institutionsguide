import { describe, it, expect } from "vitest";
import { categoryHasFinder, DIMENSIONS_BY_CATEGORY } from "../preferenceConfig";

describe("categoryHasFinder", () => {
  it("returns true for skole", () => {
    expect(categoryHasFinder("skole")).toBe(true);
  });

  it("returns true for vuggestue", () => {
    expect(categoryHasFinder("vuggestue")).toBe(true);
  });

  it("returns true for boernehave", () => {
    expect(categoryHasFinder("boernehave")).toBe(true);
  });

  it("returns false for categories without enough dimensions", () => {
    // fritidsklub has no finder dimensions
    expect(categoryHasFinder("fritidsklub")).toBe(false);
  });
});

describe("DIMENSIONS_BY_CATEGORY", () => {
  it("has dimensions for skole", () => {
    expect(DIMENSIONS_BY_CATEGORY.skole.length).toBeGreaterThan(0);
  });

  it("each dimension has required fields", () => {
    for (const [, dims] of Object.entries(DIMENSIONS_BY_CATEGORY)) {
      for (const dim of dims) {
        expect(dim.key).toBeTruthy();
        expect(dim.label.da).toBeTruthy();
        expect(dim.label.en).toBeTruthy();
        expect(typeof dim.extract).toBe("function");
        expect(typeof dim.format).toBe("function");
      }
    }
  });
});
