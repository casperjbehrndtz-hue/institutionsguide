import { describe, it, expect } from "vitest";
import { dataVersions, formatDataDate, formatSchoolYear, getPriceYear, getFripladsYear } from "../dataVersions";

describe("dataVersions", () => {
  it("has valid dates for all sources", () => {
    expect(dataVersions.prices.lastUpdated).toBeInstanceOf(Date);
    expect(dataVersions.schoolQuality.lastUpdated).toBeInstanceOf(Date);
    expect(dataVersions.normering.lastUpdated).toBeInstanceOf(Date);
    expect(dataVersions.overall.lastUpdated).toBeInstanceOf(Date);
  });

  it("has positive years", () => {
    expect(dataVersions.prices.year).toBeGreaterThan(2020);
    expect(dataVersions.friplads.year).toBeGreaterThan(2020);
  });
});

describe("formatDataDate", () => {
  it("formats in Danish by default", () => {
    const result = formatDataDate(new Date("2026-04-01"));
    expect(result).toBe("april 2026");
  });

  it("formats in English when requested", () => {
    const result = formatDataDate(new Date("2026-04-01"), "en");
    expect(result).toBe("April 2026");
  });

  it("handles January correctly", () => {
    expect(formatDataDate(new Date("2026-01-15"), "da")).toBe("januar 2026");
  });
});

describe("formatSchoolYear", () => {
  it("returns a year/year string", () => {
    expect(formatSchoolYear()).toMatch(/^\d{4}\/\d{4}$/);
  });
});

describe("getPriceYear", () => {
  it("returns a number", () => {
    expect(typeof getPriceYear()).toBe("number");
  });
});

describe("getFripladsYear", () => {
  it("returns a number", () => {
    expect(typeof getFripladsYear()).toBe("number");
  });
});
