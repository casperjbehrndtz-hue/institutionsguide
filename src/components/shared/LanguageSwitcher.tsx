import { useLanguage } from "@/contexts/LanguageContext";
import type { Language } from "@/lib/translations/types";

const LANGUAGES: { code: Language; flag: string }[] = [
  { code: "da", flag: "DA" },
  { code: "en", flag: "EN" },
];

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-0.5 text-[10px]">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          className={`px-1.5 py-0.5 rounded font-medium transition-all duration-300 ${
            language === lang.code
              ? "text-primary-foreground"
              : "text-primary-foreground/50 hover:text-primary-foreground"
          }`}
          aria-label={lang.code === "da" ? "Skift til dansk" : "Switch to English"}
          aria-pressed={language === lang.code}
        >
          {lang.flag}
        </button>
      ))}
    </div>
  );
}
