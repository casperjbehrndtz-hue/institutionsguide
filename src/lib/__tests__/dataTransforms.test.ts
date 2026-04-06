import { describe, it, expect } from "vitest";
import { formatDKK, formatNumber, formatDecimal, formatPercent } from "../format";
import { haversineKm, formatDistance } from "../geo";
import {
  schoolToUnified,
  compactDagtilbudToUnified,
  dagtilbudCategory,
} from "../dataTransform";
import type { CompactSchool } from "../types";
import type { CompactDagtilbud } from "../dataTransform";

// ── format.ts ──────────────────────────────────────────────────────────

describe("formatDKK", () => {
  it("formats a positive integer with Danish locale and kr. suffix", () => {
    expect(formatDKK(3500)).toBe("3.500 kr.");
  });

  it("formats zero", () => {
    expect(formatDKK(0)).toBe("0 kr.");
  });

  it("rounds decimals and uses dot as thousands separator", () => {
    expect(formatDKK(12345.7)).toBe("12.346 kr.");
  });

  it("returns – for null", () => {
    expect(formatDKK(null)).toBe("–");
  });

  it("returns – for undefined", () => {
    expect(formatDKK(undefined)).toBe("–");
  });
});

describe("formatNumber", () => {
  it("formats with Danish thousands separator", () => {
    expect(formatNumber(1000)).toBe("1.000");
  });

  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("rounds decimals", () => {
    expect(formatNumber(999.9)).toBe("1.000");
  });
});

describe("formatDecimal", () => {
  it("formats with one decimal using comma", () => {
    expect(formatDecimal(3.14)).toBe("3,1");
  });

  it("pads to one decimal", () => {
    expect(formatDecimal(5)).toBe("5,0");
  });
});

describe("formatPercent", () => {
  it("formats with one decimal and % suffix", () => {
    expect(formatPercent(87.654)).toBe("87,7%");
  });

  it("pads integer to one decimal", () => {
    expect(formatPercent(100)).toBe("100,0%");
  });
});

// ── geo.ts ─────────────────────────────────────────────────────────────

describe("haversineKm", () => {
  it("returns 0 for same point", () => {
    expect(haversineKm(55.68, 12.57, 55.68, 12.57)).toBe(0);
  });

  it("computes correct distance between Copenhagen and Aarhus (~157 km)", () => {
    const dist = haversineKm(55.6761, 12.5683, 56.1629, 10.2039);
    expect(dist).toBeGreaterThan(150);
    expect(dist).toBeLessThan(165);
  });

  it("computes correct short distance (~2 km)", () => {
    // Nørreport to Kongens Nytorv (approx 1.2 km)
    const dist = haversineKm(55.6839, 12.5717, 55.6812, 12.5858);
    expect(dist).toBeGreaterThan(0.5);
    expect(dist).toBeLessThan(2);
  });

  it("is symmetric", () => {
    const a = haversineKm(55.68, 12.57, 56.16, 10.20);
    const b = haversineKm(56.16, 10.20, 55.68, 12.57);
    expect(a).toBeCloseTo(b, 10);
  });
});

describe("formatDistance", () => {
  it("formats short distances with one decimal and comma", () => {
    expect(formatDistance(1.234)).toBe("1,2 km");
  });

  it("formats distances >= 10 km as rounded integers", () => {
    expect(formatDistance(12.7)).toBe("13 km");
  });

  it("formats exactly 10 km as integer", () => {
    expect(formatDistance(10)).toBe("10 km");
  });

  it("formats very short distance", () => {
    expect(formatDistance(0.3)).toBe("0,3 km");
  });
});

// ── dataTransform.ts ───────────────────────────────────────────────────

const makeSchool = (overrides: Partial<CompactSchool> = {}): CompactSchool => ({
  id: "123",
  n: "Test Skole",
  t: "f",
  m: "København Kommune",
  a: "Testvej 1",
  z: "2100",
  c: "København Ø",
  la: 55.7,
  lo: 12.56,
  ...overrides,
});

const makeDagtilbud = (overrides: Partial<CompactDagtilbud> = {}): CompactDagtilbud => ({
  id: "456",
  n: "Test Vuggestue",
  tp: "vuggestue",
  ow: "Kommunal",
  m: "Frederiksberg",
  la: 55.68,
  lo: 12.53,
  ...overrides,
});

describe("dagtilbudCategory", () => {
  it("maps dagpleje to dagpleje", () => {
    expect(dagtilbudCategory("dagpleje")).toBe("dagpleje");
  });

  it("maps sfo to sfo", () => {
    expect(dagtilbudCategory("sfo")).toBe("sfo");
  });

  it("maps klub to fritidsklub", () => {
    expect(dagtilbudCategory("klub")).toBe("fritidsklub");
  });

  it("maps boernehave to boernehave", () => {
    expect(dagtilbudCategory("boernehave")).toBe("boernehave");
  });

  it("defaults unknown types to vuggestue", () => {
    expect(dagtilbudCategory("unknown")).toBe("vuggestue");
    expect(dagtilbudCategory("")).toBe("vuggestue");
  });
});

describe("schoolToUnified", () => {
  it("converts folkeskole to unified with correct fields", () => {
    const result = schoolToUnified(makeSchool());
    expect(result).not.toBeNull();
    expect(result!.id).toBe("school-123");
    expect(result!.name).toBe("Test Skole");
    expect(result!.category).toBe("skole");
    expect(result!.subtype).toBe("folkeskole");
    expect(result!.municipality).toBe("København");
  });

  it("strips ' Kommune' from municipality name", () => {
    const result = schoolToUnified(makeSchool({ m: "Gentofte Kommune" }));
    expect(result!.municipality).toBe("Gentofte");
  });

  it("converts friskole with correct subtype", () => {
    const result = schoolToUnified(makeSchool({ t: "p" }));
    expect(result!.subtype).toBe("friskole");
    expect(result!.category).toBe("skole");
  });

  it("converts efterskole with category 'efterskole'", () => {
    const result = schoolToUnified(makeSchool({ t: "e", wp: 2500, yp: 65000 }));
    expect(result!.category).toBe("efterskole");
    expect(result!.subtype).toBe("efterskole");
    expect(result!.monthlyRate).toBe(2500);
    expect(result!.annualRate).toBe(65000);
  });

  it("uses SFO rate as monthlyRate for non-efterskole", () => {
    const result = schoolToUnified(makeSchool({ sfo: 1800 }));
    expect(result!.monthlyRate).toBe(1800);
    expect(result!.annualRate).toBe(21600);
  });

  it("returns null for missing lat", () => {
    expect(schoolToUnified(makeSchool({ la: undefined as unknown as number }))).toBeNull();
  });

  it("returns null for missing lng", () => {
    expect(schoolToUnified(makeSchool({ lo: undefined as unknown as number }))).toBeNull();
  });

  it("returns null for ungdomsskole type", () => {
    expect(schoolToUnified(makeSchool({ t: "u" }))).toBeNull();
  });

  it("includes efterskole image and edk URLs", () => {
    const result = schoolToUnified(makeSchool({ t: "e", img: "/img/test.jpg", url: "/skole/test" }));
    expect(result!.imageUrl).toBe("https://www.efterskolerne.dk/img/test.jpg");
    expect(result!.edkUrl).toBe("https://www.efterskolerne.dk/skole/test");
  });

  it("omits imageUrl and edkUrl when not provided", () => {
    const result = schoolToUnified(makeSchool());
    expect(result!.imageUrl).toBeUndefined();
    expect(result!.edkUrl).toBeUndefined();
  });
});

describe("compactDagtilbudToUnified", () => {
  it("converts to unified with correct fields", () => {
    const result = compactDagtilbudToUnified(makeDagtilbud(), "dt");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("dt-456");
    expect(result!.name).toBe("Test Vuggestue");
    expect(result!.category).toBe("vuggestue");
    expect(result!.municipality).toBe("Frederiksberg");
  });

  it("maps category correctly via dagtilbudCategory", () => {
    const result = compactDagtilbudToUnified(makeDagtilbud({ tp: "boernehave" }), "dt");
    expect(result!.category).toBe("boernehave");
  });

  it("includes monthly and annual rates when present", () => {
    const result = compactDagtilbudToUnified(makeDagtilbud({ mr: 3200, ar: 38400 }), "dt");
    expect(result!.monthlyRate).toBe(3200);
    expect(result!.annualRate).toBe(38400);
  });

  it("returns null rates when not provided", () => {
    const result = compactDagtilbudToUnified(makeDagtilbud(), "dt");
    expect(result!.monthlyRate).toBeNull();
    expect(result!.annualRate).toBeNull();
  });

  it("returns null for missing lat", () => {
    expect(compactDagtilbudToUnified(makeDagtilbud({ la: undefined }), "dt")).toBeNull();
  });

  it("returns null for missing lng", () => {
    expect(compactDagtilbudToUnified(makeDagtilbud({ lo: undefined }), "dt")).toBeNull();
  });

  it("uses prefix in id", () => {
    const result = compactDagtilbudToUnified(makeDagtilbud({ id: "789" }), "vug");
    expect(result!.id).toBe("vug-789");
  });

  it("defaults missing address fields to empty string", () => {
    const result = compactDagtilbudToUnified(makeDagtilbud({ a: undefined, z: undefined, c: undefined }), "dt");
    expect(result!.address).toBe("");
    expect(result!.postalCode).toBe("");
    expect(result!.city).toBe("");
  });
});
