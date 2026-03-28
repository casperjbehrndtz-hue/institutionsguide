import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";

function useTheme() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return { dark, toggle: () => setDark((d) => !d) };
}

const SUITE_LINKS = [
  { label: "NemtBudget", href: "https://nemtbudget.nu" },
  { label: "ParFinans", href: "https://parfinans.dk" },
  { label: "Børneskat", href: "https://børneskat.dk" },
  { label: "Institutionsguide", href: "/", current: true },
];

export default function SuiteBar() {
  const { t } = useLanguage();
  const { dark, toggle: toggleTheme } = useTheme();

  return (
    <div data-suite-bar className="bg-primary/90 text-primary-foreground text-[10px]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-6 flex items-center justify-end gap-3">
        <span className="text-primary-foreground/70 hidden sm:inline">
          {t.common.partOfFamily}
        </span>
        {SUITE_LINKS.map((link, i) => (
          <span key={link.label} className="inline-flex items-center gap-3">
            {i > 0 && <span className="text-primary-foreground/40">·</span>}
            {link.current ? (
              <span className="text-primary-foreground font-semibold">{link.label}</span>
            ) : (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-foreground/70 hover:text-primary-foreground no-underline transition-all duration-300 font-medium"
              >
                {link.label}
              </a>
            )}
          </span>
        ))}
        <span className="text-primary-foreground/40">|</span>
        <LanguageSwitcher />
        <button
          onClick={toggleTheme}
          className="text-primary-foreground/50 hover:text-primary-foreground transition-all duration-300"
          aria-label={dark ? "Light mode" : "Dark mode"}
        >
          {dark ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}
