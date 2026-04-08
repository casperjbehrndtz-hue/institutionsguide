import { describe, it, expect } from "vitest";
import { PRESETS } from "../finderPresets";

describe("PRESETS", () => {
  it("has at least 5 presets", () => {
    expect(PRESETS.length).toBeGreaterThanOrEqual(5);
  });

  it("each preset has required fields", () => {
    for (const p of PRESETS) {
      expect(p.id).toBeTruthy();
      expect(p.label.da).toBeTruthy();
      expect(p.label.en).toBeTruthy();
      expect(p.icon).toBeDefined();
      expect(Object.keys(p.weights).length).toBeGreaterThan(0);
      expect(p.categories.length).toBeGreaterThan(0);
    }
  });

  it("has unique preset IDs", () => {
    const ids = PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all weights are positive numbers", () => {
    for (const p of PRESETS) {
      for (const [key, val] of Object.entries(p.weights)) {
        expect(val, `${p.id}.weights.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it("includes school and daycare presets", () => {
    const schoolPresets = PRESETS.filter((p) => p.categories.includes("skole"));
    const daycarePresets = PRESETS.filter((p) => p.categories.includes("vuggestue"));
    expect(schoolPresets.length).toBeGreaterThanOrEqual(2);
    expect(daycarePresets.length).toBeGreaterThanOrEqual(2);
  });
});
