import { lazy, useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, SlidersHorizontal, X, Calculator, Loader2, ChevronRight } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFilteredInstitutions } from "@/hooks/useFilteredInstitutions";
import { useFilterParams } from "@/hooks/useFilterParams";
import { useMapParams } from "@/hooks/useMapParams";
import SearchFilterBar from "@/components/filters/SearchFilterBar";
import ScrollReveal from "@/components/shared/ScrollReveal";

const InstitutionMap = lazy(() => import("@/components/map/InstitutionMap"));
import CompareBar from "@/components/compare/CompareBar";
import SEOHead from "@/components/shared/SEOHead";
import JsonLd from "@/components/shared/JsonLd";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { breadcrumbSchema, itemListSchema } from "@/lib/schema";
import { formatDKK } from "@/lib/format";
import { useFavorites } from "@/hooks/useFavorites";
import NoResults from "@/components/filters/NoResults";
import InstitutionListCard from "@/components/shared/InstitutionListCard";
import RelatedSearches from "@/components/shared/RelatedSearches";
import { SkeletonHero, SkeletonCardGrid } from "@/components/shared/Skeletons";
import type { UnifiedInstitution } from "@/lib/types";
import { haversineKm } from "@/lib/geo";
import { useGeolocation } from "@/hooks/useGeolocation";
import { GeoModal, GeoErrorToast } from "@/components/shared/GeoUI";
import DataFreshness from "@/components/shared/DataFreshness";
import { qualityLevelBadge } from "@/lib/badges";

interface Props {
  category: "vuggestue" | "boernehave" | "dagpleje" | "skole" | "sfo" | "fritidsklub" | "efterskole";
}

export default function CategoryPage({ category }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { institutions, municipalities, normering, loading, error } = useData();
  const { t, language } = useLanguage();
  const { toggleFavorite, isFavorite } = useFavorites();
  const {
    search, searchInput, setSearch,
    category: catFilter, setCategory: setCatFilter,
    municipality: municipalityFilter, setMunicipality,
    ageGroup, setAgeGroup,
    qualityFilter, setQualityFilter,
    sortKey, setSortKey,
  } = useFilterParams({
    defaultCategory: category,
    defaultSortKey: category === "skole" ? "rating" : category === "efterskole" ? "name" : "price",
  });
  const { lat, lng, zoom: mapZoom, view, setMapView, setView, radius: radiusKm, setRadius: setRadiusKm } = useMapParams();
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const mobileView = view === "kort" ? "map" : "list";
  const [showFilters, setShowFilters] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const savedScrollY = useRef(0);
  const handleMarkerHover = useCallback((id: string | null) => setHoveredId(id), []);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mapBounds, setMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const geo = useGeolocation(useCallback((loc) => {
    setFlyTo({ ...loc, zoom: 14 });
    setRadiusKm(3);
  }, [setRadiusKm]));

  const categoryTitles: Record<string, string> = {
    vuggestue: language === "en" ? "Nurseries in Denmark" : "Vuggestuer i Danmark",
    boernehave: language === "en" ? "Kindergartens in Denmark" : "Børnehaver i Danmark",
    dagpleje: language === "en" ? "Childminders in Denmark" : "Dagplejere i Danmark",
    skole: language === "en" ? "Schools in Denmark" : "Skoler i Danmark",
    sfo: language === "en" ? "After-school care in Denmark" : "SFO og fritidsordninger",
    fritidsklub: language === "en" ? "Youth clubs in Denmark" : "Fritidsklubber i Danmark",
    efterskole: language === "en" ? "Boarding schools in Denmark" : "Efterskoler i Danmark",
  };

  const filtered = useFilteredInstitutions(institutions, {
    search, category: catFilter, municipality: municipalityFilter, qualityFilter, sortKey, ageGroup,
  });

  const municipalityNames = useMemo(() => municipalities.map((m) => m.municipality), [municipalities]);

  // Pre-compute normering lookups for list cards
  const normeringMap = useMemo(() => {
    const map = new Map<string, number>(); // key: "municipality|ageGroup" → latest ratio
    const nationalSums = new Map<string, { sum: number; count: number }>();
    for (const n of normering) {
      const key = `${n.municipality}|${n.ageGroup}`;
      const existing = map.get(key);
      if (!existing) map.set(key, n.ratio);
      // normering is not pre-sorted, keep latest year
      const yearKey = `${key}|year`;
      const existingYear = map.get(yearKey);
      if (!existingYear || n.year > existingYear) {
        map.set(yearKey, n.year);
        map.set(key, n.ratio);
      }
      // National averages
      const nat = nationalSums.get(n.ageGroup) ?? { sum: 0, count: 0 };
      nat.sum += n.ratio;
      nat.count++;
      nationalSums.set(n.ageGroup, nat);
    }
    // Add national averages
    for (const [ag, { sum, count }] of nationalSums) {
      map.set(`__national__|${ag}`, sum / count);
    }
    return map;
  }, [normering]);

  function getInstNormering(inst: UnifiedInstitution): number | null {
    const agMap: Record<string, string> = { vuggestue: "0-2", boernehave: "3-5", dagpleje: "dagpleje", sfo: "3-5" };
    const ag = agMap[inst.category];
    if (!ag) return null;
    return normeringMap.get(`${inst.municipality}|${ag}`) ?? null;
  }

  function getInstQualityBadge(inst: UnifiedInstitution): { label: string; className: string } | null {
    const lang = language as "da" | "en";
    // Schools: use existing overall quality
    if (inst.category === "skole" && inst.quality?.o !== undefined) {
      return qualityLevelBadge(inst.quality.o, lang);
    }
    // Dagtilbud: compare normering to national average
    const agMap: Record<string, string> = { vuggestue: "0-2", boernehave: "3-5", dagpleje: "dagpleje", sfo: "3-5" };
    const ag = agMap[inst.category];
    if (!ag) return null;
    const ratio = normeringMap.get(`${inst.municipality}|${ag}`);
    const natAvg = normeringMap.get(`__national__|${ag}`);
    if (ratio == null || natAvg == null) return null;
    // Lower ratio = better (fewer children per adult)
    if (ratio < natAvg - 0.2) return qualityLevelBadge(1, lang);
    if (ratio > natAvg + 0.3) return qualityLevelBadge(-1, lang);
    return qualityLevelBadge(0, lang);
  }

  const subtypeLabels: Record<string, string> = {
    folkeskole: "Folkeskole", friskole: "Friskole", efterskole: "Efterskole",
    kommunal: "Kommunal", selvejende: "Selvejende", privat: "Privat", udliciteret: "Udliciteret",
  };

  const [visibleCount, setVisibleCount] = useState(50);
  const [showAllMunicipalities, setShowAllMunicipalities] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const distanceSorted = useMemo(() => {
    if (!geo.userLocation) return filtered;
    const loc = geo.userLocation;
    const cosLat = Math.cos(loc.lat * Math.PI / 180);
    return [...filtered].sort((a, b) => {
      const distA = Math.hypot(a.lat - loc.lat, (a.lng - loc.lng) * cosLat);
      const distB = Math.hypot(b.lat - loc.lat, (b.lng - loc.lng) * cosLat);
      return distA - distB;
    });
  }, [filtered, geo.userLocation]);

  // Filter by radius when active
  const radiusFiltered = useMemo(() => {
    if (!radiusKm || !geo.userLocation) return distanceSorted;
    return distanceSorted.filter((inst) =>
      haversineKm(geo.userLocation!.lat, geo.userLocation!.lng, inst.lat, inst.lng) <= radiusKm
    );
  }, [distanceSorted, radiusKm, geo.userLocation]);

  // Reset visible count and clear map bounds when filters change
  useEffect(() => { setVisibleCount(50); setMapBounds(null); }, [filtered]);

  // Infinite scroll: load more when sentinel enters viewport within the list container
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = listContainerRef.current;
    if (!sentinel || !root) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((c) => c + 50);
        }
      },
      { root, rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Filter by map bounds when active
  const boundsFiltered = useMemo(() => {
    if (!mapBounds) return radiusFiltered;
    return radiusFiltered.filter((inst) =>
      inst.lat >= mapBounds.south && inst.lat <= mapBounds.north &&
      inst.lng >= mapBounds.west && inst.lng <= mapBounds.east
    );
  }, [radiusFiltered, mapBounds]);

  const visibleList = useMemo(() => boundsFiltered.slice(0, visibleCount), [boundsFiltered, visibleCount]);

  // Scroll highlighted card into view when hovering a map marker
  useEffect(() => {
    if (!hoveredId || !listContainerRef.current) return;
    const el = listContainerRef.current.querySelector(`[data-inst-id="${hoveredId}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [hoveredId]);

  // Geolocation handled by useGeolocation hook (geo.*)

  const catMunicipalities = useMemo(() => {
    return municipalities
      .map((m) => {
        const rateKey = category === "skole" || category === "efterskole" ? null : category;
        return {
          ...m,
          catRate: rateKey ? m.rates[rateKey as keyof typeof m.rates] : null,
          catCount:
            category === "vuggestue" ? m.vuggestueCount :
            category === "boernehave" ? m.boernehaveCount :
            category === "dagpleje" ? m.dagplejeCount :
            category === "skole" ? m.folkeskoleCount + m.friskoleCount :
            category === "fritidsklub" ? m.fritidsklubCount :
            category === "efterskole" ? m.efterskoleCount :
            m.sfoCount,
        };
      })
      .filter((m) => m.catCount > 0)
      .sort((a, b) => (a.catRate ?? Infinity) - (b.catRate ?? Infinity));
  }, [municipalities, category]);

  function handleSelect(inst: UnifiedInstitution) {
    navigate(`/institution/${inst.id}`, { state: { from: location.pathname + location.search } });
  }


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
          <h1 className="font-display text-2xl font-bold mb-4">{t.errors.loadFailed}</h1>
          <p className="text-muted">{error}</p>
        </div>
      </div>
    );
  }

  const categoryPaths: Record<string, string> = {
    vuggestue: "/vuggestue", boernehave: "/boernehave", dagpleje: "/dagpleje",
    skole: "/skole", sfo: "/sfo", fritidsklub: "/fritidsklub", efterskole: "/efterskole",
  };

  const seoDescriptions: Record<string, Record<string, string>> = {
    da: {
      vuggestue: "Find og sammenlign vuggestuer i alle 98 kommuner. Se priser, adresser og kontaktinfo.",
      boernehave: "Find og sammenlign børnehaver i alle 98 kommuner. Se priser, adresser og kontaktinfo.",
      dagpleje: "Find og sammenlign dagplejere i alle 98 kommuner. Se priser, adresser og kontaktinfo.",
      skole: "Find og sammenlign skoler i Danmark. Se kvalitetsdata, karakterer, trivsel og fravær.",
      sfo: "Find og sammenlign SFO og fritidsordninger i alle 98 kommuner.",
      fritidsklub: "Find og sammenlign fritidsklubber for 4.-7. klasse i alle kommuner. Se priser og kontaktinfo.",
      efterskole: "Sammenlign efterskoler i hele Danmark. Se profiler, priser og kontaktinfo.",
    },
    en: {
      vuggestue: "Find and compare nurseries in all 98 municipalities. See prices, addresses and contact info.",
      boernehave: "Find and compare kindergartens in all 98 municipalities.",
      dagpleje: "Find and compare childminders in all 98 municipalities.",
      skole: "Find and compare schools in Denmark. See quality data, grades, well-being and absence.",
      sfo: "Find and compare after-school care in all 98 municipalities.",
      fritidsklub: "Find and compare youth clubs for ages 10-14 in all municipalities.",
      efterskole: "Compare boarding schools across Denmark. See profiles, prices and contact info.",
    },
  };

  // Determine if we should show category badges (when catFilter is "alle")
  const showCategoryBadge = catFilter === "alle";

  // Count active filters for mobile badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search) count++;
    if (municipalityFilter) count++;
    if (ageGroup) count++;
    if (qualityFilter) count++;
    if (sortKey !== (category === "skole" ? "rating" : "price")) count++;
    return count;
  }, [search, municipalityFilter, ageGroup, qualityFilter, sortKey, category]);

  return (
    <>
      <SEOHead
        title={categoryTitles[category]}
        description={seoDescriptions[language]?.[category] || seoDescriptions.da[category]}
        path={categoryPaths[category]}
      />
      <JsonLd data={breadcrumbSchema([
        { name: language === "da" ? "Forside" : "Home", url: "https://institutionsguiden.dk/" },
        { name: categoryTitles[category], url: `https://institutionsguiden.dk${categoryPaths[category]}` },
      ])} />
      <JsonLd data={itemListSchema(
        filtered.slice(0, 10).map((inst) => ({
          name: inst.name,
          url: `/institution/${inst.id}`,
        })),
        "https://institutionsguiden.dk",
        categoryTitles[category],
      )} />

      <Breadcrumbs items={[
        { label: language === "da" ? "Forside" : "Home", href: "/" },
        { label: categoryTitles[category] },
      ]} />

      {/* Category header */}
      <ScrollReveal><section className="px-4 py-10 sm:py-14 text-center bg-gradient-to-b from-primary/5 to-transparent">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
          {categoryTitles[category]}
        </h1>
        <p className="text-muted text-base max-w-2xl mx-auto mb-4">
          {t.categoryDescriptions[category]}
        </p>
        <p className="font-mono text-primary text-lg font-semibold">
          {filtered.length.toLocaleString("da-DK")} {t.common.institutions}
        </p>
        <DataFreshness />
      </section></ScrollReveal>

      {/* Filter bar with mobile collapse */}
      <div className="sticky top-14 z-30 bg-bg-card border-b border-border" style={{ WebkitTransform: "translateZ(0)" }}>
        {/* Mobile: search + filter toggle */}
        <div className="sm:hidden px-4 py-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.common.search}
              className="w-full py-2.5 pl-10 pr-3 text-sm rounded-lg border border-border bg-bg-card text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="relative shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-primary/5 transition-colors min-h-[44px]"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {showFilters ? t.home.hideFilters : t.home.showFilters}
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-accent text-white rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
          {/* Persistent result count when filters collapsed */}
          {!showFilters && (
            <span className="text-xs text-muted whitespace-nowrap">
              <span className="font-mono font-medium text-foreground">{boundsFiltered.length.toLocaleString("da-DK")}</span> institutioner
            </span>
          )}
        </div>
        {/* Full filter bar: always visible on sm+, toggle on mobile */}
        <div className={`${showFilters ? "block" : "hidden"} sm:block`}>
          <SearchFilterBar
            search={searchInput}
            onSearchChange={setSearch}
            category={catFilter}
            onCategoryChange={setCatFilter}
            ageGroup={ageGroup}
            onAgeGroupChange={setAgeGroup}
            municipality={municipalityFilter}
            onMunicipalityChange={setMunicipality}
            qualityFilter={qualityFilter}
            onQualityFilterChange={setQualityFilter}
            sortKey={sortKey}
            onSortChange={setSortKey}
            resultCount={boundsFiltered.length}
            municipalities={municipalityNames}
            institutions={institutions}
            onNearMe={geo.handleNearMe}
            nearMeLoading={geo.nearMeLoading}
            hideCategoryPills
            hasGeolocation={!!geo.userLocation}
          />
        </div>
      </div>

      {/* Mobile list/map toggle */}
      <div className="lg:hidden flex justify-center py-3 px-4">
        <div className="inline-flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => {
              if (mobileView !== "list") {
                setView("liste");
                // Restore scroll position after switching back to list
                requestAnimationFrame(() => window.scrollTo(0, savedScrollY.current));
              }
            }}
            className={`px-5 py-2 text-sm font-medium transition-colors min-h-[44px] ${
              mobileView === "list" ? "bg-primary text-primary-foreground" : "bg-bg-card text-foreground hover:bg-primary/5"
            }`}
          >
            {t.home.listView}
          </button>
          <button
            onClick={() => {
              if (mobileView !== "map") {
                savedScrollY.current = window.scrollY;
                setView("kort");
              }
            }}
            className={`px-5 py-2 text-sm font-medium transition-colors min-h-[44px] ${
              mobileView === "map" ? "bg-primary text-primary-foreground" : "bg-bg-card text-foreground hover:bg-primary/5"
            }`}
          >
            {t.home.mapView}
          </button>
        </div>
      </div>

      {/* Fullscreen map overlay */}
      {mapFullscreen && (
        <div className="fixed inset-0 z-50">
          <InstitutionMap
            institutions={radiusFiltered}
            onSelect={handleSelect}
            flyTo={flyTo}
            highlightedId={hoveredId}
            onMarkerHover={handleMarkerHover}
            isFullscreen={mapFullscreen}
            onToggleFullscreen={() => setMapFullscreen((f) => !f)}
            onBoundsChange={(bounds: { north: number; south: number; east: number; west: number }) => setMapBounds(bounds)}
            initialCenter={{ lat, lng }}
            initialZoom={mapZoom}
            onViewChange={setMapView}
            radiusCenter={geo.userLocation}
            radiusKm={radiusKm}
            onRadiusChange={setRadiusKm}
          />
        </div>
      )}

      {/* Split layout */}
      <section className={`max-w-[1440px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-6 ${mapFullscreen ? "hidden" : ""}`}>
        <div ref={listContainerRef} className={`space-y-3 overflow-y-auto max-h-[600px] lg:max-h-[calc(100vh-180px)] ${mobileView !== "list" ? "hidden lg:block" : ""}`}>
          {/* Map bounds indicator */}
          {mapBounds && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-sm text-primary">
              <span>{language === "da" ? "Viser kort-omr\u00e5de" : "Showing map area"}</span>
              <button onClick={() => setMapBounds(null)} className="p-1 hover:bg-primary/10 rounded" aria-label="Clear bounds filter">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {visibleList.length === 0 && (
            <NoResults
              search={search}
              onSearchChange={setSearch}
              category={catFilter}
              onCategoryChange={setCatFilter}
              municipality={municipalityFilter}
              onMunicipalityChange={setMunicipality}
              ageGroup={ageGroup}
              onAgeGroupChange={setAgeGroup}
              qualityFilter={qualityFilter}
              onQualityFilterChange={setQualityFilter}
              defaultCategory={category}
              onClearAll={() => { setSearch(""); setCatFilter(category); setMunicipality(""); setAgeGroup(""); setQualityFilter(""); }}
            />
          )}
          {visibleList.map((inst) => {
            const badge = getInstQualityBadge(inst);
            const norm = getInstNormering(inst);
            return (
              <InstitutionListCard
                key={inst.id}
                inst={inst}
                hoveredId={hoveredId}
                onHover={setHoveredId}
                userLocation={geo.userLocation}
                isFavorite={isFavorite(inst.id)}
                onToggleFavorite={toggleFavorite}
                showCategoryBadge={showCategoryBadge}
                badge={badge}
                normering={norm}
                subtypeLabel={subtypeLabels[inst.subtype] || inst.subtype}
              />
            );
          })}
          {boundsFiltered.length > visibleCount && (
            <div ref={sentinelRef} className="text-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted mx-auto mb-1" />
              <p className="text-sm text-muted">
                {t.common.showing} {visibleCount} {t.common.of} {boundsFiltered.length.toLocaleString("da-DK")} {t.common.results}
              </p>
            </div>
          )}
          {boundsFiltered.length > 0 && boundsFiltered.length <= visibleCount && boundsFiltered.length > 50 && (
            <p className="text-center text-sm text-muted py-4">
              {t.common.showing} {boundsFiltered.length} {t.common.of} {boundsFiltered.length.toLocaleString("da-DK")} {t.common.results}
            </p>
          )}
        </div>

        <div className={`h-[calc(100vh-200px)] sm:h-[70vh] lg:h-[calc(100vh-180px)] lg:sticky lg:top-[60px] ${mobileView !== "map" ? "hidden lg:block" : ""}`}>
          <InstitutionMap
            institutions={radiusFiltered}
            onSelect={handleSelect}
            flyTo={flyTo}
            highlightedId={hoveredId}
            onMarkerHover={handleMarkerHover}
            isFullscreen={mapFullscreen}
            onToggleFullscreen={() => setMapFullscreen((f) => !f)}
            onBoundsChange={(bounds: { north: number; south: number; east: number; west: number }) => setMapBounds(bounds)}
            initialCenter={{ lat, lng }}
            initialZoom={mapZoom}
            onViewChange={setMapView}
            radiusCenter={geo.userLocation}
            radiusKm={radiusKm}
            onRadiusChange={setRadiusKm}
          />
        </div>
      </section>

      {/* Friplads CTA — only for daycare categories */}
      {!["skole", "efterskole", "fritidsklub"].includes(category) && (
        <section className="max-w-5xl mx-auto px-4 pt-8">
          <Link
            to="/friplads"
            className="flex items-center gap-3 p-4 rounded-xl bg-accent/10 border border-accent/20 hover:bg-accent/15 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
              <Calculator className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm">
                {language === "da" ? "Beregn dit fripladstilskud" : "Calculate your subsidy"}
              </p>
              <p className="text-xs text-muted">
                {language === "da"
                  ? "Se hvor meget du kan spare på børnepasning baseret på din indkomst"
                  : "See how much you can save on childcare based on your income"}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-accent shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </section>
      )}

      {/* Municipality ranking for this category */}
      <ScrollReveal><section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          {language === "da" ? "Kommuner" : "Municipalities"} — {categoryTitles[category]?.split(" ")[0]}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-3 text-muted font-medium" scope="col">{t.sort.municipality}</th>
                {!["skole", "efterskole"].includes(category) && (
                  <th className="text-right py-3 px-3 text-muted font-medium" scope="col">
                    {language === "da" ? "Takst/md." : "Rate/mo."}
                  </th>
                )}
                <th className="text-right py-3 px-3 text-muted font-medium" scope="col">
                  {language === "da" ? "Antal" : "Count"}
                </th>
              </tr>
            </thead>
            <tbody>
              {(showAllMunicipalities ? catMunicipalities : catMunicipalities.slice(0, 30)).map((m) => (
                <tr key={m.municipality} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                  <td className="py-2 px-3">
                    <Link to={`/kommune/${encodeURIComponent(m.municipality)}`} className="text-primary hover:underline font-medium">
                      {m.municipality}
                    </Link>
                  </td>
                  {!["skole", "efterskole"].includes(category) && (
                    <td className="py-2 px-3 text-right font-mono">{formatDKK(m.catRate)}</td>
                  )}
                  <td className="py-2 px-3 text-right font-mono">{m.catCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!showAllMunicipalities && catMunicipalities.length > 30 && (
          <div className="text-center mt-4">
            <button
              onClick={() => setShowAllMunicipalities(true)}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary-light transition-colors min-h-[44px]"
            >
              {language === "da" ? `Vis alle ${catMunicipalities.length} kommuner` : `Show all ${catMunicipalities.length} municipalities`}
            </button>
          </div>
        )}
      </section></ScrollReveal>

      {/* Related searches */}
      <RelatedSearches category={category} />

      {/* Geolocation consent modal */}
      {geo.showGeoModal && (
        <GeoModal onAccept={geo.acceptConsent} onDismiss={geo.dismissModal} />
      )}

      {/* Geolocation error toast */}
      {geo.geoError && (
        <GeoErrorToast message={geo.geoError} onDismiss={geo.dismissError} onRetry={geo.retryGeolocation} />
      )}

      <CompareBar />
    </>
  );
}
