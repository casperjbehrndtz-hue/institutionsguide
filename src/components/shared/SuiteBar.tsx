import { useState, useEffect, useMemo } from "react";
import { Sun, Moon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFamily } from "@/contexts/FamilyContext";
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

interface SuiteLink {
  label: string;
  href: string;
  current?: boolean;
}

/**
 * Build outbound suite links with cross-product URL params.
 * - NemtBudget: append family profile so their budget tool can include childcare costs
 * - ParFinans: append income/children for financial planning context
 * - Børneskat: append family profile for savings calculations
 */
function useSuiteLinks(): SuiteLink[] {
  const { profile } = useFamily();

  return useMemo(() => {
    /** Append params to a base URL, skipping null/undefined values. */
    function withParams(base: string, params: Record<string, string | number | boolean | null | undefined>): string {
      const url = new URL(base);
      for (const [key, value] of Object.entries(params)) {
        if (value != null && value !== "") {
          url.searchParams.set(key, String(value));
        }
      }
      return url.toString();
    }

    // Shared family params for outbound links
    const familyParams = profile
      ? {
          income: profile.income,
          children: profile.childCount,
          single: profile.singleParent ? "true" : undefined,
        }
      : {};

    return [
      {
        label: "NemtBudget",
        href: withParams("https://nemtbudget.nu", {
          ...familyParams,
          source: "institutionsguide",
        }),
      },
      {
        label: "ParFinans",
        href: withParams("https://parfinans.dk", {
          ...familyParams,
          source: "institutionsguide",
        }),
      },
      {
        label: "Børneskat",
        href: withParams("https://xn--brneskat-54a.dk", {
          ...familyParams,
          source: "institutionsguide",
        }),
      },
      { label: "Institutionsguiden", href: "/", current: true },
    ];
  }, [profile]);
}

export default function SuiteBar() {
  const { t } = useLanguage();
  const { dark, toggle: toggleTheme } = useTheme();
  const suiteLinks = useSuiteLinks();

  return (
    <div data-suite-bar className="bg-primary/90 text-primary-foreground text-[11px] sm:text-xs">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-6 flex items-center justify-end gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
        <span className="text-primary-foreground/70 hidden sm:inline shrink-0">
          {t.common.partOfFamily}
        </span>
        {suiteLinks.map((link, i) => (
          <span key={link.label} className="inline-flex items-center gap-2 sm:gap-3 shrink-0">
            {i > 0 && <span className="text-primary-foreground/40 hidden sm:inline">·</span>}
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
          className="text-primary-foreground/50 hover:text-primary-foreground transition-all duration-300 shrink-0"
          aria-label={dark ? "Light mode" : "Dark mode"}
        >
          {dark ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}
