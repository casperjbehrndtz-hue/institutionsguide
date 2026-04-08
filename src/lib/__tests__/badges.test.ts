import { describe, it, expect } from "vitest";
import { qualityBadge, qualityLevelBadge, qualityBadgeInlineColors, scoreBadgeInlineColors } from "../badges";

describe("qualityBadge", () => {
  it("returns null for undefined", () => {
    expect(qualityBadge(undefined)).toBeNull();
  });

  it("returns Fremragende for score >= 4", () => {
    expect(qualityBadge(4.5)?.label).toBe("Fremragende");
  });

  it("returns God for score >= 3", () => {
    expect(qualityBadge(3.2)?.label).toBe("God");
  });

  it("returns Middel for score >= 2", () => {
    expect(qualityBadge(2.5)?.label).toBe("Middel");
  });

  it("returns Under middel for low score", () => {
    expect(qualityBadge(1)?.label).toBe("Under middel");
  });
});

describe("qualityLevelBadge", () => {
  it("returns null for undefined", () => {
    expect(qualityLevelBadge(undefined)).toBeNull();
  });

  it("returns Over middel for o=1 in Danish", () => {
    expect(qualityLevelBadge(1, "da")?.label).toBe("Over middel");
  });

  it("returns Above avg for o=1 in English", () => {
    expect(qualityLevelBadge(1, "en")?.label).toBe("Above avg");
  });

  it("returns Middel for o=0", () => {
    expect(qualityLevelBadge(0)?.label).toBe("Middel");
  });

  it("returns Under middel for o=-1", () => {
    expect(qualityLevelBadge(-1)?.label).toBe("Under middel");
  });
});

describe("qualityBadgeInlineColors", () => {
  it("returns null for undefined", () => {
    expect(qualityBadgeInlineColors(undefined)).toBeNull();
  });

  it("returns green for o=1", () => {
    expect(qualityBadgeInlineColors(1)?.bg).toBe("#E1F5EE");
  });

  it("returns red for negative", () => {
    expect(qualityBadgeInlineColors(-1)?.bg).toBe("#FCEBEB");
  });
});

describe("scoreBadgeInlineColors", () => {
  it("returns null for null", () => {
    expect(scoreBadgeInlineColors(null)).toBeNull();
  });

  it("returns green for high score", () => {
    expect(scoreBadgeInlineColors(70)?.bg).toBe("#E1F5EE");
  });

  it("returns amber for mid score", () => {
    expect(scoreBadgeInlineColors(50)?.bg).toBe("#FAEEDA");
  });

  it("returns red for low score", () => {
    expect(scoreBadgeInlineColors(30)?.bg).toBe("#FCEBEB");
  });
});
