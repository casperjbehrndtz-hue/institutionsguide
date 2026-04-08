import { describe, it, expect } from "vitest";
import { getRecommendation, computeTypeScore, type WizardState } from "../guideEngine";

describe("computeTypeScore", () => {
  it("dagpleje scores high for lille-gruppe", () => {
    const score = computeTypeScore("dagpleje", new Set(["lille-gruppe"]));
    expect(score).toBe(3);
  });

  it("vuggestue scores high for uddannet-personale", () => {
    const score = computeTypeScore("vuggestue", new Set(["uddannet-personale"]));
    expect(score).toBe(3);
  });

  it("dagpleje penalized for uddannet-personale", () => {
    const score = computeTypeScore("dagpleje", new Set(["uddannet-personale"]));
    expect(score).toBeLessThan(0);
  });

  it("vuggestue penalized for lav-pris", () => {
    const score = computeTypeScore("vuggestue", new Set(["lav-pris"]));
    expect(score).toBeLessThan(0);
  });
});

describe("getRecommendation", () => {
  it("recommends sfo for age 6+", () => {
    const state: WizardState = { age: "6+", priorities: [], municipality: "", income: null };
    const rec = getRecommendation(state);
    expect(rec.primary).toBe("sfo");
    expect(rec.alternatives).toHaveLength(0);
  });

  it("recommends boernehave for age 3-5", () => {
    const state: WizardState = { age: "3-5", priorities: [], municipality: "", income: null };
    const rec = getRecommendation(state);
    expect(rec.primary).toBe("boernehave");
  });

  it("recommends dagpleje when lille-gruppe + lav-pris selected", () => {
    const state: WizardState = {
      age: "0-1", priorities: ["lille-gruppe", "lav-pris"], municipality: "", income: null,
    };
    const rec = getRecommendation(state);
    expect(rec.primary).toBe("dagpleje");
    expect(rec.alternatives).toContain("vuggestue");
  });

  it("recommends vuggestue when uddannet-personale selected", () => {
    const state: WizardState = {
      age: "1-2", priorities: ["uddannet-personale"], municipality: "", income: null,
    };
    const rec = getRecommendation(state);
    expect(rec.primary).toBe("vuggestue");
    expect(rec.alternatives).toContain("dagpleje");
  });

  it("defaults to vuggestue on tie", () => {
    const state: WizardState = { age: "0-1", priorities: [], municipality: "", income: null };
    const rec = getRecommendation(state);
    expect(rec.primary).toBe("vuggestue");
  });

  it("always returns at least one reason", () => {
    const states: WizardState[] = [
      { age: "0-1", priorities: ["lav-pris"], municipality: "", income: null },
      { age: "3-5", priorities: ["naturoplevelser"], municipality: "", income: null },
      { age: "6+", priorities: [], municipality: "", income: null },
    ];
    for (const state of states) {
      const rec = getRecommendation(state);
      expect(rec.reasons.length).toBeGreaterThan(0);
      expect(rec.reasons[0].da).toBeTruthy();
      expect(rec.reasons[0].en).toBeTruthy();
    }
  });
});
