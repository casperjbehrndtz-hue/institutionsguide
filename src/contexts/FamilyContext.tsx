import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";

export interface FamilyProfile {
  income: number | null;
  singleParent: boolean;
  childCount: number;
}

/** Data extracted from cross-product deep link URL params. */
export interface DeepLinkData {
  category?: string;
  municipality?: string;
}

interface FamilyContextValue {
  profile: FamilyProfile | null;
  setProfile: (profile: FamilyProfile) => void;
  clearProfile: () => void;
  hasProfile: boolean;
  /** Deep link data from inbound URL params (category, municipality). */
  deepLink: DeepLinkData;
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

/**
 * Read cross-product deep link params from the URL.
 * Supported: ?income=450000&children=2&single=true&category=vuggestue&municipality=København
 * Returns a FamilyProfile (if any family params present) and DeepLinkData.
 * Cleans params from URL via replaceState to avoid polluting browser history.
 */
function readAndCleanUrlParams(): {
  profile: FamilyProfile | null;
  deepLink: DeepLinkData;
} {
  let profile: FamilyProfile | null = null;
  const deepLink: DeepLinkData = {};

  try {
    const params = new URLSearchParams(window.location.search);

    // Check if any cross-product params are present
    const hasIncome = params.has("income");
    const hasChildren = params.has("children");
    const hasSingle = params.has("single");
    const hasCategory = params.has("category");
    const hasMunicipality = params.has("municipality");

    const hasFamilyParams = hasIncome || hasChildren || hasSingle;

    if (hasFamilyParams) {
      // Build profile from URL params, falling back to defaults
      const incomeRaw = params.get("income");
      const childrenRaw = params.get("children");
      const singleRaw = params.get("single");

      const income = incomeRaw ? Number(incomeRaw) : null;
      const childCount = childrenRaw ? Math.max(1, Math.min(10, Number(childrenRaw))) : 1;
      const singleParent = singleRaw === "true";

      profile = {
        income: income !== null && !Number.isNaN(income) ? income : null,
        singleParent,
        childCount: Number.isNaN(childCount) ? 1 : childCount,
      };
    }

    if (hasCategory) {
      deepLink.category = params.get("category") ?? undefined;
    }
    if (hasMunicipality) {
      deepLink.municipality = params.get("municipality") ?? undefined;
    }

    // Clean cross-product params from URL
    const crossProductParams = ["income", "children", "single", "category", "municipality"];
    const hadAny = crossProductParams.some((p) => params.has(p));
    if (hadAny) {
      crossProductParams.forEach((p) => params.delete(p));
      const remaining = params.toString();
      const newUrl =
        window.location.pathname + (remaining ? `?${remaining}` : "") + window.location.hash;
      window.history.replaceState(null, "", newUrl);
    }
  } catch {
    /* SSR or URL API unavailable */
  }

  return { profile, deepLink };
}

export function FamilyProvider({ children }: { children: ReactNode }) {
  // Read URL params once on mount. URL params override localStorage.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const urlData = useMemo(() => readAndCleanUrlParams(), []);
  const [deepLink] = useState<DeepLinkData>(() => urlData.deepLink);

  const [profile, setProfileState] = useState<FamilyProfile | null>(() => {
    const fromUrl = urlData.profile;
    if (fromUrl) {
      // Persist URL-provided profile to localStorage immediately
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fromUrl));
      } catch {
        /* localStorage unavailable */
      }
      return fromUrl;
    }
    return loadProfile();
  });

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
    deepLink,
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
