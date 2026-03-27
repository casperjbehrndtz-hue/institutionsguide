import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";

const SUITE_LINKS = [
  { label: "NemtBudget", href: "https://nemtbudget.nu" },
  { label: "ParFinans", href: "https://parfinans.dk" },
  { label: "Børneskat", href: "https://børneskat.dk" },
  { label: "Institutionsguide", href: "/", current: true },
];

export default function SuiteBar() {
  const { t } = useLanguage();

  return (
    <div className="border-b border-border/50 text-[10px]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-7 flex items-center justify-end gap-3">
        <span className="text-muted/60 hidden sm:inline">
          {t.common.partOfFamily}
        </span>
        {SUITE_LINKS.map((link, i) => (
          <span key={link.label} className="inline-flex items-center gap-3">
            {i > 0 && <span className="text-border">·</span>}
            {link.current ? (
              <span className="text-primary font-semibold">{link.label}</span>
            ) : (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted hover:text-primary transition-colors font-medium"
              >
                {link.label}
              </a>
            )}
          </span>
        ))}
        <span className="text-border">|</span>
        <LanguageSwitcher />
      </div>
    </div>
  );
}
