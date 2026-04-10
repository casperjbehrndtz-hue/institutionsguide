import { describe, it, expect } from "vitest";
import { schoolToUnified, dagtilbudCategory, compactDagtilbudToUnified } from "../dataTransform";
import type { CompactSchool } from "../types";
import type { CompactDagtilbud } from "../dataTransform";

const baseSchool: CompactSchool = {
  id: "1", n: "Test Skole", t: "f", m: "København Kommune",
  a: "Testvej 1", z: "2100", c: "København", la: 55.7, lo: 12.5,
};

const baseDagtilbud: CompactDagtilbud = {
  id: "d1", n: "Test Vuggestue", tp: "vuggestue", ow: "kommunal",
  m: "Odense", la: 55.4, lo: 10.4,
};

describe("schoolToUnified", () => {
  it("converts folkeskole to unified format", () => {
    const result = schoolToUnified(baseSchool);
    expect(result).not.toBeNull();
    expect(result!.category).toBe("skole");
    expect(result!.subtype).toBe("folkeskole");
    expect(result!.municipality).toBe("København");
  });

  it("converts efterskole with correct category and pricing", () => {
    const ef: CompactSchool = { ...baseSchool, t: "e", yp: 72000, wp: 1800 };
    const result = schoolToUnified(ef);
    expect(result!.category).toBe("efterskole");
    expect(result!.monthlyRate).toBeNull();
    expect(result!.weeklyPrice).toBe(1800);
    expect(result!.yearlyPrice).toBe(72000);
    expect(result!.annualRate).toBe(72000);
  });

  it("returns null for ungdomsskole", () => {
    expect(schoolToUnified({ ...baseSchool, t: "u" })).toBeNull();
  });

  it("returns null if missing coordinates", () => {
    expect(schoolToUnified({ ...baseSchool, la: 0, lo: 0 })).toBeNull();
  });

  it("strips 'Kommune' from municipality name", () => {
    const result = schoolToUnified(baseSchool);
    expect(result!.municipality).toBe("København");
  });

  it("normalizes genitive municipality names", () => {
    expect(schoolToUnified({ ...baseSchool, m: "Københavns Kommune" })!.municipality).toBe("København");
    expect(schoolToUnified({ ...baseSchool, m: "Vesthimmerlands Kommune" })!.municipality).toBe("Vesthimmerland");
    expect(schoolToUnified({ ...baseSchool, m: "Bornholms Regionskommune" })!.municipality).toBe("Bornholm");
    expect(schoolToUnified({ ...baseSchool, m: "Aalborg Kommune" })!.municipality).toBe("Aalborg");
  });
});

describe("dagtilbudCategory", () => {
  it("maps known types correctly", () => {
    expect(dagtilbudCategory("dagpleje")).toBe("dagpleje");
    expect(dagtilbudCategory("sfo")).toBe("sfo");
    expect(dagtilbudCategory("klub")).toBe("fritidsklub");
    expect(dagtilbudCategory("boernehave")).toBe("boernehave");
  });

  it("defaults unknown types to vuggestue", () => {
    expect(dagtilbudCategory("unknown")).toBe("vuggestue");
    expect(dagtilbudCategory("aldersintegreret")).toBe("vuggestue");
  });
});

describe("compactDagtilbudToUnified", () => {
  it("converts compact dagtilbud to unified format", () => {
    const result = compactDagtilbudToUnified(baseDagtilbud, "vug");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("vug-d1");
    expect(result!.category).toBe("vuggestue");
    expect(result!.municipality).toBe("Odense");
  });

  it("returns null if missing coordinates", () => {
    expect(compactDagtilbudToUnified({ ...baseDagtilbud, la: undefined as never, lo: undefined as never }, "vug")).toBeNull();
  });

  it("includes rates when present", () => {
    const d = { ...baseDagtilbud, mr: 3500, ar: 42000 };
    const result = compactDagtilbudToUnified(d, "vug");
    expect(result!.monthlyRate).toBe(3500);
    expect(result!.annualRate).toBe(42000);
  });
});
