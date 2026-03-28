import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { UnifiedInstitution } from "@/lib/types";

const STORAGE_KEY = "institutionsguide_compare";
const MAX_COMPARE = 4;

interface CompareContextValue {
  compareList: UnifiedInstitution[];
  addToCompare: (inst: UnifiedInstitution) => void;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;
  isInCompare: (id: string) => boolean;
}

const CompareContext = createContext<CompareContextValue | null>(null);

function loadFromStorage(): UnifiedInstitution[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as UnifiedInstitution[];
  } catch { /* ignore */ }
  return [];
}

function saveToStorage(list: UnifiedInstitution[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compareList, setCompareList] = useState<UnifiedInstitution[]>(loadFromStorage);

  useEffect(() => {
    saveToStorage(compareList);
  }, [compareList]);

  const addToCompare = useCallback((inst: UnifiedInstitution) => {
    setCompareList((prev) => {
      if (prev.length >= MAX_COMPARE) return prev;
      if (prev.some((i) => i.id === inst.id)) return prev;
      return [...prev, inst];
    });
  }, []);

  const removeFromCompare = useCallback((id: string) => {
    setCompareList((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearCompare = useCallback(() => {
    setCompareList([]);
  }, []);

  const isInCompare = useCallback(
    (id: string) => compareList.some((i) => i.id === id),
    [compareList]
  );

  return (
    <CompareContext value={{
      compareList,
      addToCompare,
      removeFromCompare,
      clearCompare,
      isInCompare,
    }}>
      {children}
    </CompareContext>
  );
}

export function useCompare(): CompareContextValue {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
