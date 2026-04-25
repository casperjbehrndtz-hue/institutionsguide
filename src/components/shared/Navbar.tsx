import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown, Heart, Search as SearchIcon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import InstitutionSearch from "./InstitutionSearch";

const CATEGORY_LINKS: { href: string; key: string; labelOverride?: Record<string, string> }[] = [
  { href: "/vuggestue", key: "vuggestue", labelOverride: { da: "Vuggestuer", en: "Nurseries" } },
  { href: "/boernehave", key: "boernehave", labelOverride: { da: "Børnehaver", en: "Kindergartens" } },
  { href: "/dagpleje", key: "dagpleje", labelOverride: { da: "Dagplejere", en: "Childminders" } },
  { href: "/skole", key: "skole", labelOverride: { da: "Skoler", en: "Schools" } },
  { href: "/sfo", key: "sfo", labelOverride: { da: "SFO", en: "After-school" } },
  { href: "/fritidsklub", key: "fritidsklub", labelOverride: { da: "Fritidsklubber", en: "Youth clubs" } },
  { href: "/efterskole", key: "efterskole", labelOverride: { da: "Efterskoler", en: "Boarding schools" } },
  { href: "/gymnasium", key: "gymnasium", labelOverride: { da: "Gymnasier", en: "Gymnasiums" } },
];

interface ToolGroup {
  headingDa: string;
  headingEn: string;
  links: { href: string; labelOverride: Record<string, string> }[];
}

const TOOL_GROUPS: ToolGroup[] = [
  {
    headingDa: "Rangeringer",
    headingEn: "Rankings",
    links: [
      { href: "/kommune-intelligens", labelOverride: { da: "Kommune-intelligens", en: "Municipality intelligence" } },
      { href: "/bedste-vaerdi", labelOverride: { da: "Bedste værdi for pengene", en: "Best value" } },
      { href: "/find", labelOverride: { da: "Find efter præferencer", en: "Find by preferences" } },
    ],
  },
  {
    headingDa: "Kalkulatorer",
    headingEn: "Calculators",
    links: [
      { href: "/friplads", labelOverride: { da: "Fripladsberegner", en: "Subsidy calculator" } },
      { href: "/samlet-pris", labelOverride: { da: "Samlet pris for et børneliv", en: "Total cost" } },
    ],
  },
  {
    headingDa: "Data",
    headingEn: "Data",
    links: [
      { href: "/normering", labelOverride: { da: "Normering pr. kommune", en: "Children per adult" } },
      { href: "/prissammenligning", labelOverride: { da: "Prissammenligning", en: "Price comparison" } },
      { href: "/guide", labelOverride: { da: "Pasningsguide", en: "Childcare guide" } },
    ],
  },
];

const TOOL_LINKS: { href: string; labelOverride: Record<string, string> }[] = TOOL_GROUPS.flatMap((g) => g.links);

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { t, language, setLanguage } = useLanguage();
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open && !toolsOpen && !searchOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMenu();
        setToolsOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, toolsOpen, searchOpen, closeMenu]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close tools dropdown when clicking outside
  useEffect(() => {
    if (!toolsOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [toolsOpen]);

  // Close dropdown on route change
  useEffect(() => {
    queueMicrotask(() => {
      setToolsOpen(false);
      setSearchOpen(false);
    });
  }, [location.pathname]);

  const toolPaths = TOOL_LINKS.map((l) => l.href);
  const toolsActive = toolPaths.includes(location.pathname);

  return (
    <nav className="sticky top-0 z-40 glass-subtle border-b border-border/50" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        <Link to="/" className="font-display font-bold text-base sm:text-lg text-foreground hover:text-primary transition-colors">
          Institutionsguiden
        </Link>

        {/* Desktop nav — strict hierarchy: primary (categories) | meta (tools, search, favorites, lang) */}
        <div className="hidden md:flex items-center">
          {/* Primary: institution categories — strongest weight */}
          <div className="flex items-center gap-0.5">
            {CATEGORY_LINKS.map((link) => {
              const active = location.pathname === link.href;
              return (
                <Link
                  key={link.key}
                  to={link.href}
                  className={`px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/80 hover:text-foreground hover:bg-foreground/[0.04]"
                  }`}
                >
                  {link.labelOverride?.[language] ?? (t.categories as Record<string, string>)[link.key] ?? link.key}
                </Link>
              );
            })}
          </div>

          {/* Visual separator between primary and meta */}
          <div className="h-5 w-px bg-border/70 mx-3" aria-hidden="true" />

          {/* Meta cluster — utilities, lower contrast, smaller hit area */}
          <div className="flex items-center gap-0.5">
            {/* Tools dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setToolsOpen(!toolsOpen)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                  toolsActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:text-foreground/85 hover:bg-foreground/[0.04]"
                }`}
                aria-expanded={toolsOpen}
                aria-haspopup="true"
              >
                {t.nav.tools}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${toolsOpen ? "rotate-180" : ""}`} />
              </button>
              {toolsOpen && (
                <div className="absolute right-0 mt-1 w-64 rounded-xl border border-border bg-bg shadow-lg py-2 animate-fade-in z-50">
                  {TOOL_GROUPS.map((group, gi) => (
                    <div key={group.headingDa} className={gi > 0 ? "mt-1 pt-1 border-t border-border/50" : ""}>
                      <p className="px-4 pt-1 pb-1 text-[10px] font-semibold tracking-widest uppercase text-muted">
                        {language === "da" ? group.headingDa : group.headingEn}
                      </p>
                      {group.links.map((link) => {
                        const active = location.pathname === link.href;
                        return (
                          <Link
                            key={link.href}
                            to={link.href}
                            className={`block px-4 py-2 text-sm transition-colors ${
                              active
                                ? "bg-primary/10 text-primary"
                                : "text-foreground/85 hover:text-foreground hover:bg-foreground/[0.04]"
                            }`}
                          >
                            {link.labelOverride[language]}
                          </Link>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setSearchOpen((s) => !s)}
              className={`p-1.5 rounded-md transition-colors ${
                searchOpen
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:text-foreground/85 hover:bg-foreground/[0.04]"
              }`}
              aria-label={language === "da" ? "Søg institution" : "Search institution"}
              aria-expanded={searchOpen}
            >
              <SearchIcon className="w-4 h-4" />
            </button>

            <Link
              to="/favoritter"
              className={`p-1.5 rounded-md transition-colors ${
                location.pathname === "/favoritter"
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:text-foreground/85 hover:bg-foreground/[0.04]"
              }`}
              aria-label={language === "da" ? "Mine favoritter" : "My favorites"}
            >
              <Heart className="w-4 h-4" />
            </Link>

            <button
              onClick={() => setLanguage(language === "da" ? "en" : "da")}
              className="px-2 py-1 rounded-md text-[11px] font-semibold tracking-wide text-muted hover:text-foreground/85 hover:bg-foreground/[0.04] transition-colors"
              aria-label={language === "da" ? "Switch to English" : "Skift til dansk"}
            >
              {language === "da" ? "EN" : "DA"}
            </button>
          </div>
        </div>

        {/* Mobile: search + hamburger */}
        <div className="md:hidden flex items-center gap-1">
          <button
            onClick={() => setSearchOpen((s) => !s)}
            className={`p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
              searchOpen ? "bg-primary/10 text-primary" : "hover:bg-border/30"
            }`}
            aria-label={language === "da" ? "Søg institution" : "Search institution"}
            aria-expanded={searchOpen}
          >
            <SearchIcon className="w-5 h-5" />
          </button>
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

      {/* Global search panel */}
      {searchOpen && (
        <div className="border-t border-border bg-bg px-4 sm:px-6 py-3 animate-fade-in">
          <div className="max-w-2xl mx-auto">
            <InstitutionSearch
              variant="inline"
              autoFocus
              onSelect={() => setSearchOpen(false)}
            />
          </div>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {open && (
        <div className="md:hidden border-t border-border bg-bg animate-fade-in relative z-40">
          <div className="px-4 py-2 flex flex-wrap gap-1">
            {CATEGORY_LINKS.map((link) => {
              const active = location.pathname === link.href;
              return (
                <Link
                  key={link.key}
                  to={link.href}
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted hover:text-foreground hover:bg-border/30"
                  }`}
                >
                  {link.labelOverride?.[language] ?? (t.categories as Record<string, string>)[link.key] ?? link.key}
                </Link>
              );
            })}
          </div>
          <div className="px-4 pb-2">
            {TOOL_GROUPS.map((group) => (
              <div key={group.headingDa} className="mb-3">
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-muted uppercase tracking-widest">
                  {language === "da" ? group.headingDa : group.headingEn}
                </p>
                <div className="flex flex-wrap gap-1">
                  {group.links.map((link) => {
                    const active = location.pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        to={link.href}
                        onClick={() => setOpen(false)}
                        className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted hover:text-foreground hover:bg-border/30"
                        }`}
                      >
                        {link.labelOverride[language]}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 pb-2 flex items-center gap-2">
            <Link
              to="/favoritter"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === "/favoritter"
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:text-foreground hover:bg-border/30"
              }`}
            >
              <Heart className="w-4 h-4" />
              {language === "da" ? "Favoritter" : "Favorites"}
            </Link>
            <button
              onClick={() => { setLanguage(language === "da" ? "en" : "da"); setOpen(false); }}
              className="block text-left px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-foreground hover:bg-border/30 transition-colors"
            >
              {language === "da" ? "English" : "Dansk"}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
