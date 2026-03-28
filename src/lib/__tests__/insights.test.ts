import { describe, it, expect } from "vitest";
import {
  getPercentileTier,
  generateFlags,
  generatePercentileProfile,
  generateNearbyComparison,
} from "../insights";
import type { SchoolQuality, UnifiedInstitution } from "../types";

// ── getPercentileTier ────────────────────────────────────────────────────

describe("getPercentileTier", () => {
  describe("higher-is-better metrics", () => {
    it("returns top10 for values at or above p90", () => {
      // trivsel p90 = 4.1
      expect(getPercentileTier(4.1, "trivsel", true)).toBe("top10");
      expect(getPercentileTier(4.5, "trivsel", true)).toBe("top10");
    });

    it("returns top25 for values between p75 and p90", () => {
      // trivsel p75 = 4.0, p90 = 4.1
      expect(getPercentileTier(4.0, "trivsel", true)).toBe("top25");
    });

    it("returns average for values between p25 and p50", () => {
      // trivsel p25 = 3.8, p50 = 3.9
      expect(getPercentileTier(3.8, "trivsel", true)).toBe("average");
    });

    it("returns bottom10 for values below p10", () => {
      // trivsel p10 = 3.8
      expect(getPercentileTier(3.5, "trivsel", true)).toBe("bottom10");
    });

    it("returns average for unknown metrics", () => {
      expect(getPercentileTier(50, "unknown_metric", true)).toBe("average");
    });
  });

  describe("lower-is-better metrics", () => {
    it("returns top10 for values at or below p10 (fravaer)", () => {
      // fravaer p10 = 5.4
      expect(getPercentileTier(5.0, "fravaer", false)).toBe("top10");
      expect(getPercentileTier(5.4, "fravaer", false)).toBe("top10");
    });

    it("returns bottom10 for values above p90 (fravaer)", () => {
      // fravaer p90 = 9.3
      expect(getPercentileTier(10.0, "fravaer", false)).toBe("bottom10");
    });

    it("returns above_avg for values between p25 and p50 (klassekv)", () => {
      // klassekv p25 = 18.2, p50 = 20.4
      expect(getPercentileTier(19.0, "klassekv", false)).toBe("above_avg");
    });
  });

  describe("edge cases at exact thresholds", () => {
    it("values exactly on boundary go to the better tier (higher-is-better)", () => {
      // karakterer p50 = 7.4 → should be above_avg
      expect(getPercentileTier(7.4, "karakterer", true)).toBe("above_avg");
    });

    it("values exactly on boundary go to the better tier (lower-is-better)", () => {
      // fravaer p25 = 6.3 → should be top25
      expect(getPercentileTier(6.3, "fravaer", false)).toBe("top25");
    });
  });
});

// ── generateFlags ────────────────────────────────────────────────────────

describe("generateFlags", () => {
  it("generates red flag for high absence (bottom10)", () => {
    const q: SchoolQuality = { fp: 10.0 }; // above p90=9.3 → bottom10 (lower is better)
    const flags = generateFlags(q);
    expect(flags).toHaveLength(1);
    expect(flags[0].severity).toBe("red");
    expect(flags[0].metric).toBe("fravaer");
  });

  it("generates green flag for low absence (top tier)", () => {
    const q: SchoolQuality = { fp: 5.0 }; // below p10=5.4 → top10
    const flags = generateFlags(q);
    expect(flags).toHaveLength(1);
    expect(flags[0].severity).toBe("green");
    expect(flags[0].metric).toBe("fravaer");
  });

  it("generates yellow flag for average absence", () => {
    const q: SchoolQuality = { fp: 7.5 }; // between p50 and p75 → average
    const flags = generateFlags(q);
    expect(flags).toHaveLength(1);
    expect(flags[0].severity).toBe("yellow");
  });

  it("generates red flag for low inklusion", () => {
    const q: SchoolQuality = { tsi: 2.8 }; // below p10=2.9 → bottom10
    const flags = generateFlags(q);
    expect(flags).toHaveLength(1);
    expect(flags[0].severity).toBe("red");
    expect(flags[0].metric).toBe("inklusion");
  });

  it("generates green flag for high inklusion", () => {
    const q: SchoolQuality = { tsi: 3.3 }; // at p90=3.3 → top10
    const flags = generateFlags(q);
    expect(flags).toHaveLength(1);
    expect(flags[0].severity).toBe("green");
  });

  it("generates red flag for socref Under niveau", () => {
    const q: SchoolQuality = { sr: "Under niveau" };
    const flags = generateFlags(q);
    expect(flags).toHaveLength(1);
    expect(flags[0].severity).toBe("red");
    expect(flags[0].metric).toBe("socref");
  });

  it("generates green flag for socref Over niveau", () => {
    const q: SchoolQuality = { sr: "Over niveau" };
    const flags = generateFlags(q);
    expect(flags).toHaveLength(1);
    expect(flags[0].severity).toBe("green");
  });

  it("sorts red flags before yellow before green", () => {
    const q: SchoolQuality = {
      fp: 10.0,  // red (high absence)
      tsi: 3.3,  // green (high inklusion)
      kv: 8.0,   // not flagged or yellow (depends on tier)
    };
    const flags = generateFlags(q);
    const severities = flags.map((f) => f.severity);
    const order = { red: 0, yellow: 1, green: 2 };
    for (let i = 1; i < severities.length; i++) {
      expect(order[severities[i]]).toBeGreaterThanOrEqual(order[severities[i - 1]]);
    }
  });

  it("returns empty array when no quality data", () => {
    const flags = generateFlags({});
    expect(flags).toHaveLength(0);
  });
});

// ── generatePercentileProfile ────────────────────────────────────────────

describe("generatePercentileProfile", () => {
  it("returns bars for each provided metric", () => {
    const q: SchoolQuality = {
      ts: 4.0,
      tsi: 3.1,
      k: 7.4,
      fp: 7.0,
      kp: 90.0,
      kv: 20.0,
    };
    const bars = generatePercentileProfile(q);
    expect(bars).toHaveLength(6);
    const metrics = bars.map((b) => b.metric);
    expect(metrics).toContain("trivsel");
    expect(metrics).toContain("fravaer");
    expect(metrics).toContain("kompetence");
  });

  it("filledBars is 10 for top10 tier", () => {
    const q: SchoolQuality = { ts: 4.5 }; // well above p90=4.1
    const bars = generatePercentileProfile(q);
    expect(bars).toHaveLength(1);
    expect(bars[0].tier).toBe("top10");
    expect(bars[0].filledBars).toBe(10);
  });

  it("filledBars is 1 for bottom10 tier", () => {
    const q: SchoolQuality = { k: 5.0 }; // well below p10=6.3
    const bars = generatePercentileProfile(q);
    expect(bars).toHaveLength(1);
    expect(bars[0].tier).toBe("bottom10");
    expect(bars[0].filledBars).toBe(1);
  });

  it("returns empty array for empty quality", () => {
    const bars = generatePercentileProfile({});
    expect(bars).toHaveLength(0);
  });

  it("marks warning for bottom tiers", () => {
    const q: SchoolQuality = { tsi: 2.8 }; // bottom10
    const bars = generatePercentileProfile(q);
    expect(bars[0].isWarning).toBe(true);
  });
});

// ── generateNearbyComparison ─────────────────────────────────────────────

describe("generateNearbyComparison", () => {
  function makeInst(overrides: Partial<UnifiedInstitution>): UnifiedInstitution {
    return {
      id: "1",
      name: "Test",
      category: "skole",
      subtype: "folkeskole",
      municipality: "Test",
      address: "Test 1",
      postalCode: "1000",
      city: "TestBy",
      lat: 55.6,
      lng: 12.5,
      monthlyRate: null,
      annualRate: null,
      ...overrides,
    };
  }

  it("returns comparisons when enough nearby schools exist", () => {
    const inst = makeInst({ id: "target", quality: { k: 8.0, fp: 5.0 } });
    const nearby = [
      makeInst({ id: "a", quality: { k: 7.0, fp: 6.0 } }),
      makeInst({ id: "b", quality: { k: 7.5, fp: 7.0 } }),
      makeInst({ id: "c", quality: { k: 6.5, fp: 8.0 } }),
    ];

    const comparisons = generateNearbyComparison(inst, nearby);
    expect(comparisons.length).toBeGreaterThanOrEqual(2);

    const gradeComp = comparisons.find((c) => c.metric === "karakterer");
    expect(gradeComp).toBeDefined();
    expect(gradeComp!.thisValue).toBe(8.0);
    expect(gradeComp!.isBetter).toBe(true); // 8.0 > avg of 7.0
    expect(gradeComp!.diffPct).toBeGreaterThan(0);

    const absComp = comparisons.find((c) => c.metric === "fravaer");
    expect(absComp).toBeDefined();
    expect(absComp!.isBetter).toBe(true); // 5.0 < avg of 7.0 → better
    expect(absComp!.diffPct).toBeGreaterThan(0); // inverted: less absence = positive
  });

  it("returns empty when no quality data on target", () => {
    const inst = makeInst({ id: "target" }); // no quality
    const nearby = [
      makeInst({ id: "a", quality: { k: 7.0 } }),
      makeInst({ id: "b", quality: { k: 7.5 } }),
    ];
    expect(generateNearbyComparison(inst, nearby)).toHaveLength(0);
  });

  it("returns empty when fewer than 2 nearby with quality", () => {
    const inst = makeInst({ id: "target", quality: { k: 8.0 } });
    const nearby = [makeInst({ id: "a", quality: { k: 7.0 } })];
    expect(generateNearbyComparison(inst, nearby)).toHaveLength(0);
  });

  it("calculates correct diff percentages for class size (lower is better)", () => {
    const inst = makeInst({ id: "target", quality: { kv: 18 } });
    const nearby = [
      makeInst({ id: "a", quality: { kv: 22 } }),
      makeInst({ id: "b", quality: { kv: 24 } }),
    ];
    const comparisons = generateNearbyComparison(inst, nearby);
    const kvComp = comparisons.find((c) => c.metric === "klassekv");
    expect(kvComp).toBeDefined();
    expect(kvComp!.isBetter).toBe(true); // 18 < 23 avg → better
    expect(kvComp!.diffPct).toBeGreaterThan(0); // inverted
  });
});
