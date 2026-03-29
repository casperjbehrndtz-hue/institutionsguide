import { lazy, Suspense, useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Search, SlidersHorizontal, MapPin, X } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompare } from "@/contexts/CompareContext";
import { useFilteredInstitutions } from "@/hooks/useFilteredInstitutions";
import { useFilterParams } from "@/hooks/useFilterParams";
import { useMapParams } from "@/hooks/useMapParams";
import SearchFilterBar from "@/components/filters/SearchFilterBar";
import ScrollReveal from "@/components/shared/ScrollReveal";

const InstitutionMap = lazy(() => import("@/components/map/InstitutionMap"));
import CompareBar from "@/components/compare/CompareBar";
import SEOHead from "@/components/shared/SEOHead";
import JsonLd from "@/components/shared/JsonLd";
import { breadcrumbSchema, itemListSchema } from "@/lib/schema";
import { formatDKK } from "@/lib/format";
import { useFavorites } from "@/hooks/useFavorites";
import NoResults from "@/components/filters/NoResults";
import RelatedSearches from "@/components/shared/RelatedSearches";
import { SkeletonHero, SkeletonCardGrid } from "@/components/shared/Skeletons";
import type { UnifiedInstitution } from "@/lib/types";
import { haversineKm, formatDistance } from "@/lib/geo";
import { useGeolocation } from "@/hooks/useGeolocation";
import { GeoModal, GeoErrorToast } from "@/components/shared/GeoUI";
import DataFreshness from "@/components/shared/DataFreshness";
import { qualityLevelBadge, CATEGORY_BADGE_COLORS } from "@/lib/badges";

interface Props {
  category: "vuggestue" | "boernehave" | "dagpleje" | "skole" | "sfo";
}

export default function CategoryPage({ category }: Props) {
  const navigate = useNavigate();
  const { institutions, municipalities, normering, loading, error } = useData();
  const { t, language } = useLanguage();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { addToCompare, removeFromCompare, isInCompare } = useCompare();
  const {
    search, setSearch,
    category: catFilter, setCategory: setCatFilter,
    municipality: municipalityFilter, setMunicipality,
    ageGroup, setAgeGroup,
    qualityFilter, setQualityFilter,
    sortKey, setSortKey,
  } = useFilterParams({
    defaultCategory: category,
    defaultSortKey: category === "skole" ? "rating" : "price",
  });
  const { lat, lng, zoom: mapZoom, view, setMapView, setView } = useMapParams();
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const mobileView = view === "kort" ? "map" : "list";
  const [showFilters, setShowFilters] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const savedScrollY = useRef(0);
  const handleMarkerHover = useCallback((id: string | null) => setHoveredId(id), []);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mapBounds, setMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const geo = useGeolocation(useCallback((loc) => {
    setFlyTo({ ...loc, zoom: 13 });
    setRadiusKm(5);
  }, []));

  const categoryTitles: Record<string, string> = {
    vuggestue: language === "en" ? "Nurseries in Denmark" : "Vuggestuer i Danmark",
    boernehave: language === "en" ? "Kindergartens in Denmark" : "Børnehaver i Danmark",
    dagpleje: language === "en" ? "Childminders in Denmark" : "Dagplejere i Danmark",
    skole: language === "en" ? "Schools in Denmark" : "Skoler i Danmark",
    sfo: language === "en" ? "After-school care in Denmark" : "SFO og fritidsordninger",
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
        const rateKey = category === "skole" ? null : category;
        return {
          ...m,
          catRate: rateKey ? m.rates[rateKey as keyof typeof m.rates] : null,
          catCount:
            category === "vuggestue" ? m.vuggestueCount :
            category === "boernehave" ? m.boernehaveCount :
            category === "dagpleje" ? m.dagplejeCount :
            category === "skole" ? m.folkeskoleCount + m.friskoleCount :
            m.sfoCount,
        };
      })
      .filter((m) => m.catCount > 0)
      .sort((a, b) => (a.catRate ?? Infinity) - (b.catRate ?? Infinity));
  }, [municipalities, category]);

  function handleSelect(inst: UnifiedInstitution) {
    navigate(`/institution/${inst.id}`);
  }

  function handleCompare(inst: UnifiedInstitution) {
    if (isInCompare(inst.id)) {
      removeFromCompare(inst.id);
    } else {
      addToCompare(inst);
    }
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
    skole: "/skole", sfo: "/sfo",
  };

  const seoDescriptions: Record<string, Record<string, string>> = {
    da: {
      vuggestue: "Find og sammenlign vuggestuer i alle 98 kommuner. Se priser, adresser og kontaktinfo.",
      boernehave: "Find og sammenlign børnehaver i alle 98 kommuner. Se priser, adresser og kontaktinfo.",
      dagpleje: "Find og sammenlign dagplejere i alle 98 kommuner. Se priser, adresser og kontaktinfo.",
      skole: "Find og sammenlign skoler i Danmark. Se kvalitetsdata, karakterer, trivsel og fravær.",
      sfo: "Find og sammenlign SFO og fritidsordninger i alle 98 kommuner.",
    },
    en: {
      vuggestue: "Find and compare nurseries in all 98 municipalities. See prices, addresses and contact info.",
      boernehave: "Find and compare kindergartens in all 98 municipalities.",
      dagpleje: "Find and compare childminders in all 98 municipalities.",
      skole: "Find and compare schools in Denmark. See quality data, grades, well-being and absence.",
      sfo: "Find and compare after-school care in all 98 municipalities.",
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
        { name: language === "da" ? "Forside" : "Home", url: "https://institutionsguide.dk/" },
        { name: categoryTitles[category], url: `https://institutionsguide.dk${categoryPaths[category]}` },
      ])} />
      <JsonLd data={itemListSchema(
        filtered.slice(0, 10).map((inst) => ({
          name: inst.name,
          url: `/institution/${inst.id}`,
        })),
        "https://institutionsguide.dk",
        categoryTitles[category],
      )} />

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
        <Link to="/metode" className="inline-block mt-2 text-xs text-muted hover:text-primary hover:underline transition-colors">
          {language === "da" ? "Hvordan beregnes dette?" : "How is this calculated?"}
        </Link>
      </section></ScrollReveal>

      {/* Dagpleje info box */}
      {category === "dagpleje" && (
        <section className="max-w-3xl mx-auto px-4 py-6">
          <div className="card p-6">
            <h2 className="font-display text-xl font-bold mb-4">{t.dagplejeInfo.title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="font-semibold text-success mb-2">{t.dagplejeInfo.pros}</h3>
                <ul className="space-y-1 text-muted">
                  {t.dagplejeInfo.prosList.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-destructive mb-2">{t.dagplejeInfo.cons}</h3>
                <ul className="space-y-1 text-muted">
                  {t.dagplejeInfo.consList.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* School quality note */}
      {category === "skole" && (
        <section className="max-w-3xl mx-auto px-4 py-6">
          <div className="card p-6">
            <h2 className="font-display text-xl font-bold mb-3">{t.schoolInfo.title}</h2>
            <p className="text-sm text-muted leading-relaxed">{t.schoolInfo.description}</p>
            <Link to="/metode" className="inline-block mt-3 text-sm text-primary hover:underline">
              {language === "da" ? "Hvordan beregnes dette?" : "How is this calculated?"} &rarr;
            </Link>
          </div>
        </section>
      )}

      {/* Filter bar with mobile collapse */}
      <div className="sticky top-0 z-30 bg-bg-card border-b border-border">
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
            search={search}
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
            resultCount={filtered.length}
            municipalities={municipalityNames}
            institutions={institutions}
            onNearMe={geo.handleNearMe}
            nearMeLoading={geo.nearMeLoading}
            hideCategoryPills
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
            institutions={boundsFiltered}
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
            <Link
              key={inst.id}
              to={`/institution/${inst.id}`}
              data-inst-id={inst.id}
              className={`card transition-all block ${
                hoveredId === inst.id ? "ring-2 ring-primary/50 bg-primary/5" : ""
              }`}
              onMouseEnter={() => { if (window.matchMedia("(hover: hover)").matches) setHoveredId(inst.id); }}
              onMouseLeave={() => { if (window.matchMedia("(hover: hover)").matches) setHoveredId(null); }}
            >
              <div className="p-3 sm:p-4">
                {/* Row 1: Name + badge + price */}
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground text-sm sm:text-base truncate">{inst.name}</p>
                      {badge && (
                        <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-md ${badge.className}`}>
                          {badge.label}
                        </span>
                      )}
                      {showCategoryBadge && (
                        <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full ${CATEGORY_BADGE_COLORS[inst.category] || ""}`}>
                          {t.categories[inst.category]}
                        </span>
                      )}
                    </div>
                    {/* Row 2: Address + distance + municipality */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs text-muted truncate">{inst.address}, {inst.postalCode} {inst.city} — {inst.municipality}</p>
                      {geo.userLocation && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-primary/70 shrink-0">
                          <MapPin className="w-3 h-3" />
                          {formatDistance(haversineKm(geo.userLocation.lat, geo.userLocation.lng, inst.lat, inst.lng))}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-xs sm:text-sm font-bold tabular-nums text-primary">{formatDKK(inst.monthlyRate)}</p>
                    <span className="text-[10px] text-muted">{t.common.perMonth}</span>
                  </div>
                </div>
                {/* Row 3: Key metrics strip */}
                <div className="flex items-center gap-2 sm:gap-3 mt-2 pt-2 border-t border-border/40 text-[11px] text-muted overflow-x-auto no-scrollbar">
                  {norm != null && (
                    <span className="shrink-0">{language === "da" ? "Normering" : "Ratio"} <strong className="text-foreground font-mono">{norm.toFixed(1).replace(".", ",")}</strong></span>
                  )}
                  {inst.quality?.el != null && (
                    <span className="shrink-0">{inst.quality.el.toLocaleString("da-DK")} {language === "da" ? "elever" : "students"}</span>
                  )}
                  {inst.quality?.kv != null && (
                    <span className="shrink-0">{language === "da" ? "Klasse" : "Class"} <strong className="text-foreground font-mono">{inst.quality.kv.toLocaleString("da-DK")}</strong></span>
                  )}
                  <span className="shrink-0">{subtypeLabels[inst.subtype] || inst.subtype}</span>
                </div>
              </div>
              <div className="flex items-center justify-between px-3 sm:px-4 pb-2.5 sm:pb-3 pt-0">
                <span className="text-xs text-primary font-medium">
                  {t.common.seeFullProfile} &rarr;
                </span>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(inst.id); }}
                  className="p-1.5 sm:p-2 rounded-lg hover:bg-red-50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label={isFavorite(inst.id) ? t.favorites.removeFavorite : t.favorites.addFavorite}
                >
                  <Heart className={`w-5 h-5 transition-colors ${isFavorite(inst.id) ? "text-red-500 fill-red-500" : "text-muted hover:text-red-400"}`} />
                </button>
              </div>
            </Link>
            );
          })}
          {boundsFiltered.length > visibleCount && (
            <div className="text-center py-4 space-y-2">
              <p className="text-sm text-muted">
                {t.common.showing} {visibleCount} {t.common.of} {boundsFiltered.length.toLocaleString("da-DK")} {t.common.results}
              </p>
              <button
                onClick={() => setVisibleCount((c) => c + 50)}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary-light transition-colors min-h-[44px]"
              >
                {t.common.showMore}
              </button>
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
            institutions={boundsFiltered}
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
                {category !== "skole" && (
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
                  {category !== "skole" && (
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
