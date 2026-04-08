import { describe, it, expect } from "vitest";
import { getChildcareRates, getAllMunicipalities, CHILDCARE_RATES_2025 } from "../childcare/rates";

describe("CHILDCARE_RATES_2025", () => {
  it("contains 98 municipalities", () => {
    expect(CHILDCARE_RATES_2025.length).toBe(98);
  });

  it("has no duplicate municipalities", () => {
    const names = CHILDCARE_RATES_2025.map((r) => r.municipality);
    expect(new Set(names).size).toBe(names.length);
  });

  it("all rates are positive or null", () => {
    for (const r of CHILDCARE_RATES_2025) {
      for (const key of ["dagpleje", "vuggestue", "boernehave", "sfo"] as const) {
        const v = r[key];
        expect(v === null || v > 0, `${r.municipality}.${key} = ${v}`).toBe(true);
      }
    }
  });
});

describe("getChildcareRates", () => {
  it("returns rates for København", () => {
    const rates = getChildcareRates("København");
    expect(rates).toBeDefined();
    expect(rates!.municipality).toBe("København");
    expect(rates!.vuggestue).toBeGreaterThan(0);
  });

  it("returns undefined for unknown municipality", () => {
    expect(getChildcareRates("Nonexistent")).toBeUndefined();
  });
});

describe("getAllMunicipalities", () => {
  it("returns 98 municipality names", () => {
    const all = getAllMunicipalities();
    expect(all).toHaveLength(98);
    expect(all).toContain("København");
    expect(all).toContain("Aarhus");
  });
});
