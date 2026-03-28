import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const NAV_LINKS: { href: string; key: "vuggestue" | "boernehave" | "dagpleje" | "skole" | "sfo" | "normering"; labelOverride?: Record<string, string> }[] = [
  { href: "/vuggestue", key: "vuggestue" },
  { href: "/boernehave", key: "boernehave" },
  { href: "/dagpleje", key: "dagpleje" },
  { href: "/skole", key: "skole" },
  { href: "/sfo", key: "sfo" },
  { href: "/normering", key: "normering", labelOverride: { da: "Børn pr. voksen", en: "Children per adult" } },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { t, language } = useLanguage();
  const location = useLocation();

  const closeMenu = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, closeMenu]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <nav className="sticky top-0 z-40 glass-subtle border-b border-border/50" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        <Link to="/" className="font-display font-bold text-lg text-foreground hover:text-primary transition-colors">
          Institutionsguide
        </Link>

        {/* Desktop nav — just categories */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active = location.pathname === link.href;
            return (
              <Link
                key={link.key}
                to={link.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:text-foreground hover:bg-border/30"
                }`}
              >
                {link.labelOverride?.[language] ?? t.categories[link.key]}
              </Link>
            );
          })}
        </div>

        {/* Mobile hamburger */}
        <div className="md:hidden">
          <button
            onClick={() => setOpen(!open)}
            className="p-2 rounded-lg hover:bg-border/30 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {open && (
        <div className="md:hidden border-t border-border bg-bg animate-fade-in relative z-40">
          <div className="px-4 py-3 space-y-1">
            {NAV_LINKS.map((link) => {
              const active = location.pathname === link.href;
              return (
                <Link
                  key={link.key}
                  to={link.href}
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted hover:text-foreground hover:bg-border/30"
                  }`}
                >
                  {link.labelOverride?.[language] ?? t.categories[link.key]}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
