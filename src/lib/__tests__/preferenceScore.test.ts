import { describe, it, expect } from "vitest";
import { rankInstitutions } from "../preferenceScore";
import type { DimensionConfig, ScoringContext } from "../preferenceConfig";
import type { UnifiedInstitution } from "../types";

function makeInst(overrides: Partial<UnifiedInstitution>): UnifiedInstitution {
  return {
    id: "test-1",
    name: "Test Institution",
    category: "vuggestue",
    subtype: "kommunal",
    municipality: "TestKommune",
    address: "Testvej 1",
    postalCode: "1000",
    city: "TestBy",
    lat: 55.6,
    lng: 12.5,
    monthlyRate: null,
    annualRate: null,
    ...overrides,
  };
}

const defaultCtx: ScoringContext = {
  userLocation: null,
  institutionStats: {},
  normering: [],
  priceRange: null,
};

// Simple dimension for testing: uses monthlyRate, lower = better
const priceDimension: DimensionConfig = {
  key: "price",
  label: { da: "Pris", en: "Price" },
  icon: "coins",
  extract: (inst) => inst.monthlyRate,
  range: [5000, 1000], // 5000 = worst (0), 1000 = best (100)
  format: (v) => `${v} kr`,
  goodLabel: { da: "Lav pris", en: "Low price" },
};

describe("rankInstitutions", () => {
  it("returns empty arrays for empty institutions", () => {
    const result = rankInstitutions([], [priceDimension], { price: 50 }, defaultCtx);
    expect(result.ranked).toHaveLength(0);
    expect(result.excluded).toHaveLength(0);
    expect(result.totalInArea).toBe(0);
  });

  it("returns empty when no dimensions have weight", () => {
    const insts = [makeInst({ id: "a", monthlyRate: 3000 })];
    const result = rankInstitutions(insts, [priceDimension], { price: 0 }, defaultCtx);
    expect(result.ranked).toHaveLength(0);
  });

  it("ranks institutions by weighted score (cheaper = higher score)", () => {
    const insts = [
      makeInst({ id: "expensive", name: "Expensive", monthlyRate: 4500 }),
      makeInst({ id: "cheap", name: "Cheap", monthlyRate: 1500 }),
      makeInst({ id: "mid", name: "Mid", monthlyRate: 3000 }),
    ];

    const result = rankInstitutions(
      insts,
      [priceDimension],
      { price: 80 },
      defaultCtx,
    );

    expect(result.ranked.length).toBeGreaterThan(0);
    // Cheapest should rank first (lower price = higher score with inverted range)
    expect(result.ranked[0].institution.id).toBe("cheap");
    expect(result.ranked[result.ranked.length - 1].institution.id).toBe("expensive");
  });

  it("assigns matchPct equal to totalScore", () => {
    const insts = [makeInst({ id: "a", monthlyRate: 2000 })];
    const result = rankInstitutions(insts, [priceDimension], { price: 50 }, defaultCtx);
    expect(result.ranked[0].matchPct).toBe(result.ranked[0].totalScore);
  });

  it("calculates dataCompleteness correctly", () => {
    // Institution without monthlyRate gets no data for price dimension
    const insts = [
      makeInst({ id: "nodata", monthlyRate: null }),
      makeInst({ id: "hasdata", monthlyRate: 3000 }),
    ];

    const result = rankInstitutions(
      insts,
      [priceDimension],
      { price: 50 },
      defaultCtx,
    );

    // hasdata should be in ranked, nodata in excluded (dataCompleteness < 0.3 with 1 dim)
    const hasDataEntry =
      result.ranked.find((r) => r.institution.id === "hasdata") ??
      result.excluded.find((r) => r.institution.id === "hasdata");
    const noDataEntry =
      result.ranked.find((r) => r.institution.id === "nodata") ??
      result.excluded.find((r) => r.institution.id === "nodata");

    expect(hasDataEntry?.dataCompleteness).toBe(1);
    expect(noDataEntry?.dataCompleteness).toBe(0);
  });

  it("filters by distance when maxDistanceKm and userLocation are set", () => {
    const ctx: ScoringContext = {
      ...defaultCtx,
      userLocation: { lat: 55.6, lng: 12.5 },
    };

    const insts = [
      makeInst({ id: "close", lat: 55.601, lng: 12.501, monthlyRate: 3000 }),
      makeInst({ id: "far", lat: 56.5, lng: 13.0, monthlyRate: 2000 }),
    ];

    const result = rankInstitutions(
      insts,
      [priceDimension],
      { price: 50 },
      ctx,
      5, // 5km max
    );

    // Only close one should be included
    expect(result.totalInArea).toBe(1);
    const allIds = [
      ...result.ranked.map((r) => r.institution.id),
      ...result.excluded.map((r) => r.institution.id),
    ];
    expect(allIds).toContain("close");
    expect(allIds).not.toContain("far");
  });

  it("includes distanceKm when userLocation is set", () => {
    const ctx: ScoringContext = {
      ...defaultCtx,
      userLocation: { lat: 55.6, lng: 12.5 },
    };

    const insts = [makeInst({ id: "a", lat: 55.61, lng: 12.51, monthlyRate: 3000 })];
    const result = rankInstitutions(insts, [priceDimension], { price: 50 }, ctx);
    expect(result.ranked[0].distanceKm).toBeTypeOf("number");
    expect(result.ranked[0].distanceKm).toBeGreaterThan(0);
  });

  it("skips the distance dimension for scoring", () => {
    const distanceDim: DimensionConfig = {
      key: "distance",
      label: { da: "Afstand", en: "Distance" },
      icon: "map-pin",
      extract: () => 5,
      range: [10, 0],
      format: (v) => `${v} km`,
      goodLabel: { da: "Tæt", en: "Close" },
    };

    const insts = [makeInst({ id: "a", monthlyRate: 3000 })];
    const result = rankInstitutions(
      insts,
      [distanceDim, priceDimension],
      { distance: 80, price: 50 },
      defaultCtx,
    );

    // Distance should not appear in dimension scores
    const dimKeys = result.ranked[0]?.dimensions.map((d) => d.key) ?? [];
    expect(dimKeys).not.toContain("distance");
    expect(dimKeys).toContain("price");
  });

  it("handles multiple dimensions with different weights", () => {
    // Add a second dimension: satisfaction from institutionStats
    const satisfactionDim: DimensionConfig = {
      key: "satisfaction",
      label: { da: "Tilfredshed", en: "Satisfaction" },
      icon: "heart",
      extract: (inst, ctx) => {
        const rawId = inst.id.replace(/^(vug|bh|dag|sfo)-/, "");
        return ctx.institutionStats[rawId]?.parentSatisfaction ?? null;
      },
      range: [3.0, 5.0],
      format: (v) => `${v}`,
      goodLabel: { da: "Tilfreds", en: "Satisfied" },
    };

    const ctx: ScoringContext = {
      ...defaultCtx,
      institutionStats: {
        a: { normering02: null, normering35: null, pctPaedagoger: null, pctPaedAssistenter: null, pctUdenPaedUdd: null, antalBoern: null, parentSatisfaction: 4.8, parentSatisfactionYear: null },
        b: { normering02: null, normering35: null, pctPaedagoger: null, pctPaedAssistenter: null, pctUdenPaedUdd: null, antalBoern: null, parentSatisfaction: 3.2, parentSatisfactionYear: null },
      },
    };

    const insts = [
      makeInst({ id: "a", monthlyRate: 4000 }), // expensive, high satisfaction
      makeInst({ id: "b", monthlyRate: 1500 }), // cheap, low satisfaction
    ];

    // Heavy weight on satisfaction → a should win
    const result = rankInstitutions(
      insts,
      [priceDimension, satisfactionDim],
      { price: 10, satisfaction: 90 },
      ctx,
    );

    expect(result.ranked[0].institution.id).toBe("a");
  });
});
