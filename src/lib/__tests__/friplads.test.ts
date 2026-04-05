import { describe, it, expect } from "vitest";
import {
  getParentPaymentPercent,
  getSiblingDiscount,
  calculateFriplads,
  getRateForAge,
} from "../childcare/friplads";
import type { MunicipalChildcareRates } from "../childcare/types";

// ── getParentPaymentPercent ─────────────────────────────────────────────

describe("getParentPaymentPercent", () => {
  it("returns 0% (full friplads) for income below lower threshold", () => {
    expect(getParentPaymentPercent(200_000, false, 1)).toBe(0);
    expect(getParentPaymentPercent(218_100, false, 1)).toBe(0);
  });

  it("returns 100% (no friplads) for income above upper threshold", () => {
    expect(getParentPaymentPercent(700_000, false, 1)).toBe(100);
    expect(getParentPaymentPercent(677_500, false, 1)).toBe(100);
  });

  it("returns value between 5 and 100 for middle income", () => {
    const pct = getParentPaymentPercent(450_000, false, 1);
    expect(pct).toBeGreaterThanOrEqual(5);
    expect(pct).toBeLessThanOrEqual(100);
  });

  it("single parent gets +76,317 threshold adjustment", () => {
    // Income just above base lower threshold but below single-parent adjusted threshold
    const income = 250_000;
    const couple = getParentPaymentPercent(income, false, 1);
    const single = getParentPaymentPercent(income, true, 1);
    // Single parent threshold is higher, so they should pay less
    expect(single).toBeLessThan(couple);
  });

  it("single parent below adjusted threshold gets 0%", () => {
    // Base lower = 218,100, single adjustment = +76,317 → 294,417
    expect(getParentPaymentPercent(290_000, true, 1)).toBe(0);
  });

  it("extra children get +7,000 each beyond the first", () => {
    const income = 220_000; // just above base lower threshold
    const oneChild = getParentPaymentPercent(income, false, 1);
    const threeChildren = getParentPaymentPercent(income, false, 3);
    // 3 children: +2*7000 = +14,000 raises threshold → lower payment
    expect(threeChildren).toBeLessThan(oneChild);
  });

  it("extra children shift threshold so low income stays at 0%", () => {
    // lower = 218,100 + 2*7000 = 232,100 for 3 children
    expect(getParentPaymentPercent(230_000, false, 3)).toBe(0);
  });
});

// ── getSiblingDiscount ──────────────────────────────────────────────────

describe("getSiblingDiscount", () => {
  it("returns 0 discount for first child (index 0)", () => {
    expect(getSiblingDiscount(3000, 0)).toBe(0);
  });

  it("returns 50% discount for sibling (index 1+)", () => {
    expect(getSiblingDiscount(3000, 1)).toBe(1500);
    expect(getSiblingDiscount(3000, 2)).toBe(1500);
  });

  it("rounds the discount", () => {
    expect(getSiblingDiscount(3001, 1)).toBe(1501);
  });
});

// ── calculateFriplads ───────────────────────────────────────────────────

describe("calculateFriplads", () => {
  const annualRate = 36_000; // 3,000 kr/month

  it("returns monthlyPayment=0 and subsidyPercent=100 below threshold", () => {
    const result = calculateFriplads(annualRate, 200_000, false, 1, 0);
    expect(result.monthlyPayment).toBe(0);
    expect(result.subsidyPercent).toBe(100);
    expect(result.fullMonthlyRate).toBe(3000);
    expect(result.annualPayment).toBe(0);
  });

  it("returns full payment and subsidyPercent=0 above threshold", () => {
    const result = calculateFriplads(annualRate, 700_000, false, 1, 0);
    expect(result.monthlyPayment).toBe(3000);
    expect(result.subsidyPercent).toBe(0);
    expect(result.fullMonthlyRate).toBe(3000);
    expect(result.annualPayment).toBe(36_000);
  });

  it("sibling (index 1) gets 50% off the post-friplads amount", () => {
    // Above threshold → full payment 3000, then 50% sibling discount = 1500
    const result = calculateFriplads(annualRate, 700_000, false, 1, 1);
    expect(result.siblingDiscount).toBe(1500);
    expect(result.monthlyPayment).toBe(1500);
  });

  it("sibling discount applies after friplads reduction", () => {
    // Middle income: partial friplads, then 50% sibling discount on remainder
    const resultFirst = calculateFriplads(annualRate, 450_000, false, 1, 0);
    const resultSibling = calculateFriplads(annualRate, 450_000, false, 1, 1);

    // Sibling discount = 50% of afterFriplads amount
    expect(resultSibling.siblingDiscount).toBe(
      Math.round(resultFirst.monthlyPayment * 0.5),
    );
    expect(resultSibling.monthlyPayment).toBe(
      resultFirst.monthlyPayment - resultSibling.siblingDiscount,
    );
  });

  it("annualSavings equals 12 * (fullMonthlyRate - monthlyPayment)", () => {
    const result = calculateFriplads(annualRate, 450_000, false, 1, 0);
    expect(result.annualSavings).toBe(
      (result.fullMonthlyRate - result.monthlyPayment) * 12,
    );
  });
});

// ── getRateForAge ───────────────────────────────────────────────────────

describe("getRateForAge", () => {
  const rates: MunicipalChildcareRates = {
    municipality: "Test",
    dagpleje: 40_000,
    vuggestue: 45_000,
    boernehave: 30_000,
    sfo: 25_000,
    fritidshjem: null,
  };

  it("returns vuggestue for age < 3", () => {
    expect(getRateForAge(rates, 0)).toEqual({ rate: 45_000, type: "vuggestue" });
    expect(getRateForAge(rates, 2)).toEqual({ rate: 45_000, type: "vuggestue" });
  });

  it("returns boernehave for age 3-5", () => {
    expect(getRateForAge(rates, 3)).toEqual({ rate: 30_000, type: "boernehave" });
    expect(getRateForAge(rates, 5)).toEqual({ rate: 30_000, type: "boernehave" });
  });

  it("returns sfo for age 6+", () => {
    expect(getRateForAge(rates, 6)).toEqual({ rate: 25_000, type: "sfo" });
    expect(getRateForAge(rates, 10)).toEqual({ rate: 25_000, type: "sfo" });
  });

  it("returns null rate when rates are missing", () => {
    const emptyRates: MunicipalChildcareRates = {
      municipality: "Test",
      dagpleje: null,
      vuggestue: null,
      boernehave: null,
      sfo: null,
      fritidshjem: null,
    };
    expect(getRateForAge(emptyRates, 1).rate).toBeNull();
    expect(getRateForAge(emptyRates, 4).rate).toBeNull();
  });
});
