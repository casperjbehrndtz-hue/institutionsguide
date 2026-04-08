import { describe, it, expect } from "vitest";
import { normalizeSearch } from "../normalizeSearch";

describe("normalizeSearch", () => {
  it("lowercases input", () => {
    expect(normalizeSearch("København")).toBe("koebenhavn");
  });

  it("replaces æ with ae", () => {
    expect(normalizeSearch("æble")).toBe("aeble");
  });

  it("replaces ø with oe", () => {
    expect(normalizeSearch("ørsted")).toBe("oersted");
  });

  it("replaces å with aa", () => {
    expect(normalizeSearch("århus")).toBe("aarhus");
  });

  it("replaces accented characters", () => {
    expect(normalizeSearch("café über öl äpple")).toBe("cafe uber ol apple");
  });

  it("handles empty string", () => {
    expect(normalizeSearch("")).toBe("");
  });

  it("handles string with no special chars", () => {
    expect(normalizeSearch("test")).toBe("test");
  });
});
