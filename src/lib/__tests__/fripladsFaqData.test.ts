import { describe, it, expect } from "vitest";
import { FAQ_DA, FAQ_EN } from "../fripladsFaqData";

describe("Friplads FAQ data", () => {
  it("DA has at least 5 items", () => {
    expect(FAQ_DA.length).toBeGreaterThanOrEqual(5);
  });

  it("EN has at least 5 items", () => {
    expect(FAQ_EN.length).toBeGreaterThanOrEqual(5);
  });

  it("all items have non-empty q and a", () => {
    for (const item of [...FAQ_DA, ...FAQ_EN]) {
      expect(item.q.length).toBeGreaterThan(0);
      expect(item.a.length).toBeGreaterThan(0);
    }
  });
});
