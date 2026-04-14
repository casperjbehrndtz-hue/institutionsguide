import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, SlidersHorizontal, Loader2 } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import SEOHead from "@/components/shared/SEOHead";
import JsonLd from "@/components/shared/JsonLd";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { breadcrumbSchema, itemListSchema } from "@/lib/schema";
import ScrollReveal from "@/components/shared/ScrollReveal";
import AnimatedNumber from "@/components/shared/AnimatedNumber";
import DataFreshness from "@/components/shared/DataFreshness";
import ShareButton from "@/components/shared/ShareButton";
import { SkeletonHero, SkeletonCardGrid } from "@/components/shared/Skeletons";
import type { UnifiedInstitution } from "@/lib/types";
import GymnasiumCard from "@/components/gymnasium/GymnasiumCard";
import MunicipalityBreakdown from "@/components/gymnasium/MunicipalityBreakdown";

const GYM_TYPES = ["stx", "hhx", "htx", "hf", "eux"] as const;

const TYPE_LABELS: Record<string, Record<string, string>> = {
  da: { stx: "STX", hhx: "HHX", htx: "HTX", hf: "HF", eux: "EUX", alle: "Alle typer" },
  en: { stx: "STX", hhx: "HHX", htx: "HTX", hf: "HF", eux: "EUX", alle: "All types" },
};

const SORT_OPTIONS = [
  { key: "name", da: "Navn", en: "Name" },
  { key: "grades", da: "Karaktersnit", en: "Grade average" },
  { key: "dropout", da: "Laveste frafald", en: "Lowest dropout" },
  { key: "municipality", da: "Kommune", en: "Municipality" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["key"];

export default function GymnasiumPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { institutions, loading, error } = useData();
  const { language } = useLanguage();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("alle");
  const [municipalityFilter, setMunicipalityFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("grades");
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Infinite scroll: load more when sentinel enters viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((c) => c + 50);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const gymnasiums = useMemo(
    () => institutions.filter((i) => i.category === "gymnasium"),
    [institutions]
  );

  const municipalityNames = useMemo(() => {
    const names = new Set(gymnasiums.map((g) => g.municipality).filter(Boolean));
    return [...names].sort((a, b) => a.localeCompare(b, "da"));
  }, [gymnasiums]);

  const filtered = useMemo(() => {
    let result = [...gymnasiums];

    // Type filter
    if (typeFilter !== "alle") {
      result = result.filter((g) => g.subtype === typeFilter);
    }

    // Municipality filter
    if (municipalityFilter) {
      result = result.filter((g) => g.municipality === municipalityFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.municipality.toLowerCase().includes(q) ||
          g.city.toLowerCase().includes(q) ||
          g.subtype.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name, "da");
        case "grades": {
          const ag = a.quality?.k ?? -1;
          const bg = b.quality?.k ?? -1;
          return bg - ag;
        }
        case "dropout": {
          const ad = a.quality?.fp ?? Infinity;
          const bd = b.quality?.fp ?? Infinity;
          return ad - bd;
        }
        case "municipality":
          return a.municipality.localeCompare(b.municipality, "da");
        default:
          return 0;
      }
    });

    return result;
  }, [gymnasiums, typeFilter, municipalityFilter, search, sortKey]);

  const visibleList = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  function handleSelect(inst: UnifiedInstitution) {
    navigate(`/institution/${inst.id}`, { state: { from: location.pathname + location.search } });
  }

  const title = language === "en" ? "Gymnasiums in Denmark" : "Gymnasier i Danmark";
  const description =
    language === "en"
      ? "Compare upper secondary schools (STX, HHX, HTX, HF) across Denmark. See dropout rates, grade averages and transition to higher education."
      : "Sammenlign gymnasier i hele Danmark. Se frafald, karaktersnit og overgang til videregående uddannelse for STX, HHX, HTX og HF.";

  if (loading) {
    return (
      <div className="min-h-screen">
        <SkeletonHero />
        <SkeletonCardGrid count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 text-center max-w-md">
          <h1 className="font-display text-2xl font-bold mb-4">
            {language === "da" ? "Fejl ved indlæsning" : "Loading error"}
          </h1>
          <p className="text-muted">{error}</p>
        </div>
      </div>
    );
  }

  const activeFilterCount = [search, typeFilter !== "alle" ? typeFilter : "", municipalityFilter].filter(Boolean).length;

  return (
    <>
      <SEOHead title={title} description={description} path="/gymnasium" />
      <JsonLd
        data={breadcrumbSchema([
          { name: language === "da" ? "Forside" : "Home", url: "https://www.institutionsguiden.dk/" },
          { name: title, url: "https://www.institutionsguiden.dk/gymnasium" },
        ])}
      />
      <JsonLd
        data={itemListSchema(
          filtered.slice(0, 10).map((inst) => ({
            name: inst.name,
            url: `/institution/${inst.id}`,
          })),
          "https://www.institutionsguiden.dk",
          title
        )}
      />

      <Breadcrumbs items={[
        { label: language === "da" ? "Forside" : "Home", href: "/" },
        { label: language === "da" ? "Gymnasier" : "Gymnasiums" },
      ]} />

      {/* Hero */}
      <ScrollReveal>
        <section className="px-4 py-10 sm:py-14 text-center bg-gradient-to-b from-primary/5 to-transparent relative">
          <div className="absolute top-4 right-4">
            <ShareButton title={title} url="/gymnasium" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">{title}</h1>
          <p className="text-muted text-base max-w-2xl mx-auto mb-4">{description}</p>
          <p className="font-mono text-primary text-lg font-semibold">
            <AnimatedNumber value={filtered.length} /> {language === "da" ? "gymnasier" : "gymnasiums"}
          </p>
          <DataFreshness />
        </section>
      </ScrollReveal>

      {/* Filters */}
      <div className="sticky top-14 z-30 bg-bg-card border-b border-border" style={{ WebkitTransform: "translateZ(0)" }}>
        {/* Mobile: search + filter toggle */}
        <div className="sm:hidden px-4 py-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === "da" ? "Søg gymnasium..." : "Search gymnasium..."}
              className="w-full py-2.5 pl-10 pr-3 text-sm rounded-lg border border-border bg-bg-card text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="relative shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-primary/5 transition-colors min-h-[44px]"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {language === "da" ? "Filtre" : "Filters"}
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-accent text-white rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Full filter bar */}
        <div className={`${showFilters ? "block" : "hidden"} sm:block px-4 py-3`}>
          <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-3">
            {/* Search (desktop) */}
            <div className="relative hidden sm:block flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={language === "da" ? "Søg gymnasium..." : "Search gymnasium..."}
                className="w-full py-2 pl-10 pr-3 text-sm rounded-lg border border-border bg-bg-card text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Type pills */}
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setTypeFilter("alle")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  typeFilter === "alle"
                    ? "bg-primary text-primary-foreground"
                    : "bg-bg-card border border-border text-foreground hover:bg-primary/5"
                }`}
              >
                {TYPE_LABELS[language]?.alle ?? "All types"}
              </button>
              {GYM_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(typeFilter === t ? "alle" : t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    typeFilter === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-bg-card border border-border text-foreground hover:bg-primary/5"
                  }`}
                >
                  {TYPE_LABELS[language]?.[t] ?? t.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Municipality select */}
            <select
              value={municipalityFilter}
              onChange={(e) => setMunicipalityFilter(e.target.value)}
              className="py-2 px-3 text-sm rounded-lg border border-border bg-bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{language === "da" ? "Alle kommuner" : "All municipalities"}</option>
              {municipalityNames.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="py-2 px-3 text-sm rounded-lg border border-border bg-bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {language === "en" ? opt.en : opt.da}
                </option>
              ))}
            </select>

            {/* Result count */}
            <span className="text-sm text-muted ml-auto">
              <span className="font-mono font-medium text-foreground">{filtered.length.toLocaleString("da-DK")}</span>{" "}
              {language === "da" ? "resultater" : "results"}
            </span>
          </div>
        </div>
      </div>

      {/* Listing */}
      <section className="max-w-5xl mx-auto px-4 py-6">
        <div className="space-y-3">
          {visibleList.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted text-lg mb-4">
                {language === "da"
                  ? "Ingen gymnasier fundet med de valgte filtre."
                  : "No gymnasiums found with the selected filters."}
              </p>
              <button
                onClick={() => {
                  setSearch("");
                  setTypeFilter("alle");
                  setMunicipalityFilter("");
                }}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary-light transition-colors"
              >
                {language === "da" ? "Nulstil filtre" : "Reset filters"}
              </button>
            </div>
          )}

          {visibleList.map((inst) => (
            <GymnasiumCard key={inst.id} inst={inst} onSelect={handleSelect} language={language} />
          ))}

          {filtered.length > visibleCount && (
            <div ref={sentinelRef} className="text-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted mx-auto mb-1" />
              <p className="text-sm text-muted">
                {language === "da" ? "Viser" : "Showing"} {visibleCount} {language === "da" ? "af" : "of"}{" "}
                {filtered.length.toLocaleString("da-DK")}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Municipality breakdown */}
      <MunicipalityBreakdown municipalityNames={municipalityNames} gymnasiums={gymnasiums} language={language} />
    </>
  );
}
