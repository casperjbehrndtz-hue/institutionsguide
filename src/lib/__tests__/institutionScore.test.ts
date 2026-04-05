import { describe, it, expect } from "vitest";
import { computeScore } from "../institutionScore";
import type {
  UnifiedInstitution,
  NormeringEntry,
  SchoolQuality,
} from "../types";

function makeInst(overrides: Partial<UnifiedInstitution>): UnifiedInstitution {
  return {
    id: "test-1",
    name: "Test Institution",
    category: "skole",
    subtype: "folkeskole",
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

describe("computeScore", () => {
  describe("school with quality data", () => {
    const quality: SchoolQuality = {
      ts: 4.1,
      k: 8.5,
      fp: 5.0,
      kp: 92,
      kv: 20,
      sr: "Over niveau",
    };
    const inst = makeInst({ category: "skole", quality });

    it("returns overall score, grade, and hasData: true", () => {
      const result = computeScore(inst, [], [], null);
      expect(result.hasData).toBe(true);
      expect(result.overall).toBeTypeOf("number");
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      expect(result.grade).toBeTruthy();
      expect(["A", "B", "C", "D", "E"]).toContain(result.grade);
    });

    it("returns non-empty metrics", () => {
      const result = computeScore(inst, [], [], null);
      expect(result.metrics.length).toBeGreaterThan(0);
      // Check that expected metric keys are present
      const keys = result.metrics.map((m) => m.key);
      expect(keys).toContain("trivsel");
      expect(keys).toContain("karakterer");
      expect(keys).toContain("fravaer");
    });

    it("returns pros and cons arrays", () => {
      const result = computeScore(inst, [], [], null);
      expect(Array.isArray(result.pros)).toBe(true);
      expect(Array.isArray(result.cons)).toBe(true);
    });

    it("returns a recommendation with da/en text", () => {
      const result = computeScore(inst, [], [], null);
      expect(result.recommendation.da).toBeTruthy();
      expect(result.recommendation.en).toBeTruthy();
    });
  });

  describe("school without quality data", () => {
    it("returns null overall and hasData: false", () => {
      const inst = makeInst({ category: "skole" }); // no quality
      const result = computeScore(inst, [], [], null);
      expect(result.overall).toBeNull();
      expect(result.hasData).toBe(false);
      expect(result.grade).toBeNull();
      expect(result.metrics).toHaveLength(0);
    });
  });

  describe("school with empty quality data (all null)", () => {
    it("returns hasData: false when quality has no usable values", () => {
      const inst = makeInst({ category: "skole", quality: {} });
      const result = computeScore(inst, [], [], null);
      expect(result.overall).toBeNull();
      expect(result.hasData).toBe(false);
    });
  });

  describe("dagtilbud (vuggestue) with normering data", () => {
    const normering: NormeringEntry[] = [
      {
        municipality: "TestKommune",
        ageGroup: "0-2",
        year: 2024,
        ratio: 3.2,
      },
    ];

    it("returns a score when normering data is available", () => {
      const inst = makeInst({
        category: "vuggestue",
        monthlyRate: 3500,
        ownership: "kommunal",
      });
      const result = computeScore(inst, [], normering, 3200);
      expect(result.hasData).toBe(true);
      expect(result.overall).toBeTypeOf("number");
      expect(result.grade).toBeTruthy();
      expect(result.metrics.length).toBeGreaterThan(0);
    });

    it("uses municipalityAvgPrice for price scoring", () => {
      const inst = makeInst({
        category: "vuggestue",
        monthlyRate: 3500,
        ownership: "kommunal",
      });
      const result = computeScore(inst, [], normering, 3200);
      const priceMetric = result.metrics.find((m) => m.key === "pris");
      expect(priceMetric).toBeDefined();
    });
  });

  describe("dagtilbud without meaningful data", () => {
    it("returns hasData: false when only ownership is available", () => {
      const inst = makeInst({
        category: "boernehave",
        ownership: "kommunal",
      });
      const result = computeScore(inst, [], [], null);
      expect(result.hasData).toBe(false);
      expect(result.overall).toBeNull();
    });
  });

  describe("unknown/unsupported category", () => {
    it("returns hasData: false for fritidsklub", () => {
      const inst = makeInst({ category: "fritidsklub" });
      const result = computeScore(inst, [], [], null);
      expect(result.hasData).toBe(false);
      expect(result.overall).toBeNull();
      expect(result.grade).toBeNull();
    });
  });

  describe("grade boundaries", () => {
    it("assigns grade A for high-scoring school", () => {
      const quality: SchoolQuality = {
        ts: 4.3,
        k: 10.0,
        fp: 3.0,
        kp: 100,
        kv: 12,
        sr: "Over niveau",
      };
      const inst = makeInst({ category: "skole", quality });
      const result = computeScore(inst, [], [], null);
      expect(result.grade).toBe("A");
    });

    it("assigns lower grade for weaker school", () => {
      const quality: SchoolQuality = {
        ts: 3.5,
        k: 5.0,
        fp: 12.0,
        kp: 70,
        kv: 28,
        sr: "Under niveau",
      };
      const inst = makeInst({ category: "skole", quality });
      const result = computeScore(inst, [], [], null);
      expect(result.grade).toBe("E");
    });
  });
});
