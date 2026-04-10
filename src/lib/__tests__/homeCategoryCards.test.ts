import { describe, it, expect } from "vitest";
import { getCategoryCards } from "../homeCategoryCards";

// Minimal mock translations
const mockT = {
  categories: {
    skole: "Skoler", efterskole: "Efterskoler", vuggestue: "Vuggestuer",
    boernehave: "Børnehaver", dagpleje: "Dagplejere", sfo: "SFO",
    fritidsklub: "Fritidsklubber", gymnasium: "Gymnasier",
  },
  ageGroups: {
    skole: "6-16 år", efterskole: "14-18 år", vuggestue: "0-2 år",
    boernehave: "3-5 år", dagpleje: "0-2 år", sfo: "6-9 år",
    fritidsklub: "10-14 år", gymnasium: "16-19 år",
  },
} as never;

describe("getCategoryCards", () => {
  it("returns 4 featured cards (Skoler, Vuggestuer, Børnehaver, Efterskoler)", () => {
    const { featured } = getCategoryCards(mockT, "da");
    expect(featured).toHaveLength(4);
    expect(featured.map((c) => c.category)).toEqual(["skole", "vuggestue", "boernehave", "efterskole"]);
  });

  it("returns 3 other cards (no gymnasium — 0 data, efterskole promoted to featured)", () => {
    const { other } = getCategoryCards(mockT, "da");
    expect(other).toHaveLength(3);
    expect(other.map((c) => c.category)).toContain("dagpleje");
    expect(other.map((c) => c.category)).not.toContain("efterskole");
    expect(other.map((c) => c.category)).not.toContain("gymnasium");
  });

  it("all cards have required fields", () => {
    const { featured, other } = getCategoryCards(mockT, "da");
    for (const card of [...featured, ...other]) {
      expect(card.category).toBeTruthy();
      expect(card.label).toBeTruthy();
      expect(card.href).toMatch(/^\//);
      expect(card.icon).toBeDefined();
    }
  });

  it("featured cards have metric field", () => {
    const { featured } = getCategoryCards(mockT, "da");
    for (const card of featured) {
      expect((card as { metric?: string }).metric).toBeTruthy();
    }
  });
});
