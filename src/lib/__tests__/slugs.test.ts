import { describe, it, expect } from "vitest";
import { toSlug, buildSlugMap, vsSlug } from "../slugs";

describe("toSlug", () => {
  it("converts Danish characters", () => {
    expect(toSlug("København")).toBe("koebenhavn");
  });

  it("replaces spaces with hyphens", () => {
    expect(toSlug("Brøndby Strand")).toBe("broendby-strand");
  });

  it("removes non-alphanumeric characters", () => {
    expect(toSlug("Aabenraa (Sønderjylland)")).toBe("aabenraa-soenderjylland");
  });

  it("collapses multiple hyphens", () => {
    expect(toSlug("A - B")).toBe("a-b");
  });

  it("trims leading/trailing hyphens", () => {
    expect(toSlug(" Test ")).toBe("test");
  });

  it("handles Ærø", () => {
    expect(toSlug("Ærø")).toBe("aeroe");
  });
});

describe("buildSlugMap", () => {
  it("creates reverse lookup from slug to original name", () => {
    const map = buildSlugMap(["København", "Ærø", "Aabenraa"]);
    expect(map.get("koebenhavn")).toBe("København");
    expect(map.get("aeroe")).toBe("Ærø");
    expect(map.get("aabenraa")).toBe("Aabenraa");
  });
});

describe("vsSlug", () => {
  it("joins two category slugs", () => {
    expect(vsSlug("vuggestue", "dagpleje")).toBe("vuggestue-vs-dagpleje");
  });
});
