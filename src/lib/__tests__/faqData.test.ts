import { describe, it, expect } from "vitest";
import { FAQ_ITEMS_DA, FAQ_ITEMS_EN } from "../faqData";

describe("FAQ_ITEMS_DA", () => {
  it("has at least 5 items", () => {
    expect(FAQ_ITEMS_DA.length).toBeGreaterThanOrEqual(5);
  });

  it("each item has q and a strings", () => {
    for (const item of FAQ_ITEMS_DA) {
      expect(item.q).toBeTruthy();
      expect(item.a).toBeTruthy();
      expect(typeof item.q).toBe("string");
      expect(typeof item.a).toBe("string");
    }
  });
});

describe("FAQ_ITEMS_EN", () => {
  it("has the same number of items as DA", () => {
    expect(FAQ_ITEMS_EN.length).toBe(FAQ_ITEMS_DA.length);
  });

  it("each item has q and a strings", () => {
    for (const item of FAQ_ITEMS_EN) {
      expect(item.q).toBeTruthy();
      expect(item.a).toBeTruthy();
    }
  });
});
