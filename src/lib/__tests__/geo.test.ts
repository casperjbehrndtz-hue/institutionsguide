import { describe, it, expect } from "vitest";
import { haversineKm, formatDistance } from "../geo";

describe("haversineKm", () => {
  it("returns 0 for same point", () => {
    expect(haversineKm(55.67, 12.56, 55.67, 12.56)).toBe(0);
  });

  it("calculates ~28 km from Copenhagen to Roskilde", () => {
    const dist = haversineKm(55.6761, 12.5683, 55.6416, 12.0800);
    expect(dist).toBeGreaterThan(25);
    expect(dist).toBeLessThan(35);
  });

  it("calculates roughly correct distance for known cities", () => {
    // Copenhagen to Odense ~145 km
    const dist = haversineKm(55.6761, 12.5683, 55.3959, 10.3883);
    expect(dist).toBeGreaterThan(130);
    expect(dist).toBeLessThan(160);
  });
});

describe("formatDistance", () => {
  it("formats short distance with one decimal", () => {
    expect(formatDistance(1.234)).toBe("1,2 km");
  });

  it("formats distance >= 10 km as integer", () => {
    expect(formatDistance(12.7)).toBe("13 km");
  });

  it("formats exactly 10 km as integer", () => {
    expect(formatDistance(10)).toBe("10 km");
  });

  it("formats very small distance", () => {
    expect(formatDistance(0.3)).toBe("0,3 km");
  });
});
