import { describe, it, expect } from "vitest";
import { computePhases, computeAllMunicipalTotals, VUGGESTUE_MONTHS, BOERNEHAVE_MONTHS, SFO_MONTHS, TOTAL_MONTHS } from "../totalCostCalculator";

describe("constants", () => {
  it("phase months add up to total", () => {
    expect(VUGGESTUE_MONTHS + BOERNEHAVE_MONTHS + SFO_MONTHS).toBe(TOTAL_MONTHS);
  });
});

describe("computePhases", () => {
  it("returns 3 phases for a valid municipality", () => {
    const phases = computePhases("København", 500_000, false, 1);
    expect(phases).toHaveLength(3);
    expect(phases[0].label).toBe("Vuggestue");
    expect(phases[1].label).toBe("Børnehave");
    expect(phases[2].label).toBe("SFO");
  });

  it("returns empty array for unknown municipality", () => {
    const phases = computePhases("FakeVille", 500_000, false, 1);
    expect(phases).toHaveLength(0);
  });

  it("total = monthly * months for each phase", () => {
    const phases = computePhases("København", 500_000, false, 1);
    for (const p of phases) {
      if (p.available) {
        expect(p.totalFull).toBeCloseTo(p.monthlyFull * p.months, 0);
        expect(p.totalAfterFriplads).toBeCloseTo(p.monthlyAfterFriplads * p.months, 0);
      }
    }
  });

  it("after-friplads is <= full rate", () => {
    const phases = computePhases("København", 300_000, false, 1);
    for (const p of phases) {
      expect(p.monthlyAfterFriplads).toBeLessThanOrEqual(p.monthlyFull);
    }
  });

  it("high income means no subsidy (after equals full)", () => {
    const phases = computePhases("København", 1_000_000, false, 1);
    for (const p of phases) {
      if (p.available) {
        expect(p.monthlyAfterFriplads).toBe(p.monthlyFull);
      }
    }
  });
});

describe("computeAllMunicipalTotals", () => {
  it("returns sorted list of municipalities", () => {
    const totals = computeAllMunicipalTotals(500_000, false, 1);
    expect(totals.length).toBeGreaterThan(0);
    // Sorted ascending by grandTotal
    for (let i = 1; i < totals.length; i++) {
      expect(totals[i].grandTotal).toBeGreaterThanOrEqual(totals[i - 1].grandTotal);
    }
  });

  it("each municipality has grandTotal <= grandTotalFull", () => {
    const totals = computeAllMunicipalTotals(400_000, false, 1);
    for (const t of totals) {
      expect(t.grandTotal).toBeLessThanOrEqual(t.grandTotalFull);
    }
  });
});
