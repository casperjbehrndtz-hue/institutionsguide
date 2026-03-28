import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { da } from "@/lib/translations/da";
import { en } from "@/lib/translations/en";
import type { Language, TranslationStrings } from "@/lib/translations/types";

const STORAGE_KEY = "institutionsguide_language";

const translations: Record<Language, TranslationStrings> = { da, en };

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationStrings;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "da") return stored;
  } catch { /* localStorage unavailable */ }
  return "da";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* private browsing */ }
    document.documentElement.lang = lang;
  }, []);

  const value: LanguageContextValue = {
    language,
    setLanguage,
    t: translations[language],
  };

  return <LanguageContext value={value}>{children}</LanguageContext>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
