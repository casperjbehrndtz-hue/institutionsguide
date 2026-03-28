import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface FamilyProfile {
  income: number | null;
  singleParent: boolean;
  childCount: number;
}

interface FamilyContextValue {
  profile: FamilyProfile | null;
  setProfile: (profile: FamilyProfile) => void;
  clearProfile: () => void;
  hasProfile: boolean;
}

const STORAGE_KEY = "family-profile";

const FamilyContext = createContext<FamilyContextValue | null>(null);

function loadProfile(): FamilyProfile | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      (parsed.income === null || typeof parsed.income === "number") &&
      typeof parsed.singleParent === "boolean" &&
      typeof parsed.childCount === "number"
    ) {
      return parsed as FamilyProfile;
    }
  } catch {
    /* localStorage unavailable or corrupted */
  }
  return null;
}

export function FamilyProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<FamilyProfile | null>(loadProfile);

  const setProfile = useCallback((p: FamilyProfile) => {
    setProfileState(p);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  const clearProfile = useCallback(() => {
    setProfileState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  const value: FamilyContextValue = {
    profile,
    setProfile,
    clearProfile,
    hasProfile: profile !== null,
  };

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

export function useFamily(): FamilyContextValue {
  const ctx = useContext(FamilyContext);
  if (!ctx) {
    throw new Error("useFamily must be used within a <FamilyProvider>");
  }
  return ctx;
}
