import { describe, it, expect } from "vitest";
import { calculatePersonalizedPrice } from "../personalizedPrice";

describe("calculatePersonalizedPrice", () => {
  it("returns original rate when income is null", () => {
    const result = calculatePersonalizedPrice(3500, {
      income: null,
      singleParent: false,
      childCount: 1,
    });
    expect(result).toBe(3500);
  });

  it("returns reduced price for low income", () => {
    const result = calculatePersonalizedPrice(3500, {
      income: 200_000,
      singleParent: false,
      childCount: 1,
    });
    expect(result).toBeLessThan(3500);
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("returns full price for high income", () => {
    const result = calculatePersonalizedPrice(3500, {
      income: 1_000_000,
      singleParent: false,
      childCount: 1,
    });
    expect(result).toBe(3500);
  });

  it("single parent gets higher threshold (lower payment)", () => {
    const twoParents = calculatePersonalizedPrice(3500, {
      income: 400_000,
      singleParent: false,
      childCount: 1,
    });
    const singleParent = calculatePersonalizedPrice(3500, {
      income: 400_000,
      singleParent: true,
      childCount: 1,
    });
    expect(singleParent).toBeLessThanOrEqual(twoParents);
  });
});
