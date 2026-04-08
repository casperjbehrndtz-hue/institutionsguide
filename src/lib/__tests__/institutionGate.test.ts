import { describe, it, expect, beforeEach } from "vitest";
import { isInstitutionUnlocked, setInstitutionUnlocked, getSuiteEmail, setSuiteEmail } from "../institutionGate";

describe("institutionGate", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("isInstitutionUnlocked", () => {
    it("returns false when nothing is stored", () => {
      expect(isInstitutionUnlocked()).toBe(false);
    });

    it("returns true after setInstitutionUnlocked", () => {
      setInstitutionUnlocked();
      expect(isInstitutionUnlocked()).toBe(true);
    });

    it("returns false for expired timestamp", () => {
      const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
      localStorage.setItem(
        "suite_gate_institutionsguide_institution_profile",
        JSON.stringify({ timestamp: eightDaysAgo })
      );
      expect(isInstitutionUnlocked()).toBe(false);
    });

    it("returns false for invalid JSON", () => {
      localStorage.setItem(
        "suite_gate_institutionsguide_institution_profile",
        "not-json"
      );
      expect(isInstitutionUnlocked()).toBe(false);
    });
  });

  describe("getSuiteEmail / setSuiteEmail", () => {
    it("returns null when no email stored", () => {
      expect(getSuiteEmail()).toBeNull();
    });

    it("round-trips email", () => {
      setSuiteEmail("test@example.com");
      expect(getSuiteEmail()).toBe("test@example.com");
    });
  });
});
