import { describe, it, expect } from "vitest";
import { formatDKK, formatNumber, formatDecimal, formatPercent } from "../format";

describe("formatDKK", () => {
  it("formats a positive number", () => {
    expect(formatDKK(3500)).toMatch(/3\.?500 kr\./);
  });

  it("returns dash for null", () => {
    expect(formatDKK(null)).toBe("–");
  });

  it("returns dash for undefined", () => {
    expect(formatDKK(undefined)).toBe("–");
  });

  it("formats zero", () => {
    expect(formatDKK(0)).toMatch(/0 kr\./);
  });
});

describe("formatNumber", () => {
  it("formats large numbers with grouping", () => {
    const result = formatNumber(12345);
    expect(result).toMatch(/12\.?345/);
  });
});

describe("formatDecimal", () => {
  it("formats with one decimal", () => {
    const result = formatDecimal(3.14);
    expect(result).toMatch(/3,1/);
  });
});

describe("formatPercent", () => {
  it("formats with percent sign", () => {
    const result = formatPercent(85.6);
    expect(result).toMatch(/85,6%/);
  });
});
