import { lazy, useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, SlidersHorizontal, X, Loader2 } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFilteredInstitutions } from "@/hooks/useFilteredInstitutions";
import { useFilterParams } from "@/hooks/useFilterParams";
import { useMapParams } from "@/hooks/useMapParams";
import { useNormeringMap } from "@/hooks/useNormeringMap";
import SearchFilterBar from "@/components/filters/SearchFilterBar";
import ScrollReveal from "@/components/shared/ScrollReveal";
import AnimatedNumber from "@/components/shared/AnimatedNumber";
import ShareButton from "@/components/shared/ShareButton";

const InstitutionMap = lazy(() => import("@/components/map/InstitutionMap"));
import CompareBar from "@/components/compare/CompareBar";
import SEOHead from "@/components/shared/SEOHead";
import JsonLd from "@/components/shared/JsonLd";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { breadcrumbSchema, itemListSchema } from "@/lib/schema";
import { useFavorites } from "@/hooks/useFavorites";
import NoResults from "@/components/filters/NoResults";
import InstitutionListCard from "@/components/shared/InstitutionListCard";
import RelatedSearches from "@/components/shared/RelatedSearches";
import MunicipalityRanking from "@/components/category/MunicipalityRanking";
import FripladsCTA from "@/components/category/FripladsCTA";
import ViewToggle from "@/components/category/ViewToggle";
import { SkeletonHero, SkeletonCardGrid } from "@/components/shared/Skeletons";
import type { UnifiedInstitution } from "@/lib/types";
import { haversineKm } from "@/lib/geo";
import { useGeolocation } from "@/hooks/useGeolocation";
import GeoModals from "@/components/shared/GeoModals";
import DataFreshness from "@/components/shared/DataFreshness";
import { CATEGORY_PATHS, CATEGORY_TITLES, CATEGORY_SEO_DESCRIPTIONS, SUBTYPE_LABELS } from "@/lib/categoryConstants";

const EFTERSKOLE_PROFILES: { value: string; da: string; en: string }[] = [
  { value: "sport", da: "Sport", en: "Sports" },
  { value: "musik", da: "Musik", en: "Music" },
  { value: "kunst", da: "Kunst", en: "Art" },
  { value: "outdoor", da: "Outdoor", en: "Outdoor" },
  { value: "teater", da: "Teater", en: "Theatre" },
  { value: "international", da: "International", en: "International" },
  { value: "haandvaerk", da: "Håndværk", en: "Crafts" },
  { value: "it", da: "IT & Tech", en: "IT & Tech" },
];

interface Props {
  category: "vuggestue" | "boernehave" | "dagpleje" | "skole" | "sfo" | "fritidsklub" | "efterskole";
}

export default function CategoryPage({ category }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { institutions, municipalities, loading, error } = useData();
  const { t, language } = useLanguage();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { getInstNormering, getInstQualityBadge } = useNormeringMap();
  const {
    search, searchInput, setSearch,
    category: catFilter, setCategory: setCatFilter,
    municipality: municipalityFilter, setMunicipality,
    ageGroup, setAgeGroup,
    qualityFilter, setQualityFilter,
    sortKey, setSortKey,
  } = useFilterParams({
    defaultCategory: category,
    defaultSortKey: category === "skole" || category === "efterskole" ? "rating" : "name",
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
  const [profileFilter, setProfileFilter] = useState<string>("");
  const [spotsOnly, setSpotsOnly] = useState(false);

  const geo = useGeolocation(useCallback((loc) => {
    setFlyTo({ ...loc, zoom: 14 });
    setRadiusKm(3);
  }, [setRadiusKm]));

  const categoryTitle = (CATEGORY_TITLES[language] ?? CATEGORY_TITLES.da)[category];
  const seoDescription = (CATEGORY_SEO_DESCRIPTIONS[language] ?? CATEGORY_SEO_DESCRIPTIONS.da)[category];
  const filtered = useFilteredInstitutions(institutions, {
    search, category: catFilter, municipality: municipalityFilter, qualityFilter, sortKey, ageGroup,
  });

  // Efterskole profile + available spots filtering
  const profileFiltered = useMemo(() => {
    if (category !== "efterskole") return filtered;
    let result = filtered;
    if (profileFilter) {
      result = result.filter((inst) => inst.profiles?.includes(profileFilter));
    }
    if (spotsOnly) {
      result = result.filter((inst) => inst.availableSpots != null && inst.availableSpots > 0);
    }
    return result;
  }, [filtered, profileFilter, spotsOnly, category]);

  const municipalityNames = useMemo(() => municipalities.map((m) => m.municipality), [municipalities]);
  const [visibleCount, setVisibleCount] = useState(50);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const distanceSorted = useMemo(() => {
    if (!geo.userLocation) return profileFiltered;
    const loc = geo.userLocation;
    const cosLat = Math.cos(loc.lat * Math.PI / 180);
    return [...profileFiltered].sort((a, b) => {
      const distA = Math.hypot(a.lat - loc.lat, (a.lng - loc.lng) * cosLat);
      const distB = Math.hypot(b.lat - loc.lat, (b.lng - loc.lng) * cosLat);
      return distA - distB;
    });
  }, [profileFiltered, geo.userLocation]);

  // Filter by radius when active
  const radiusFiltered = useMemo(() => {
    if (!radiusKm || !geo.userLocation) return distanceSorted;
    return distanceSorted.filter((inst) =>
      haversineKm(geo.userLocation!.lat, geo.userLocation!.lng, inst.lat, inst.lng) <= radiusKm
    );
  }, [distanceSorted, radiusKm, geo.userLocation]);

  useEffect(() => { queueMicrotask(() => { setVisibleCount(50); setMapBounds(null); }); }, [profileFiltered]);

  // Infinite scroll
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
  // Scroll highlighted card into view
  useEffect(() => {
    if (!hoveredId || !listContainerRef.current) return;
    const el = listContainerRef.current.querySelector(`[data-inst-id="${hoveredId}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [hoveredId]);

  function handleSelect(inst: UnifiedInstitution) {
    navigate(`/institution/${inst.id}`, { state: { from: location.pathname + location.search } });
  }

  const mapProps = {
    institutions: radiusFiltered,
    onSelect: handleSelect,
    flyTo,
    highlightedId: hoveredId,
    onMarkerHover: handleMarkerHover,
    isFullscreen: mapFullscreen,
    onToggleFullscreen: () => setMapFullscreen((f: boolean) => !f),
    onBoundsChange: (bounds: { north: number; south: number; east: number; west: number }) => setMapBounds(bounds),
    initialCenter: { lat, lng },
    initialZoom: mapZoom,
    onViewChange: setMapView,
    radiusCenter: geo.userLocation,
    radiusKm,
    onRadiusChange: setRadiusKm,
  };

  const activeFilterCount = useMemo(() =>
    [search, municipalityFilter, ageGroup, qualityFilter, sortKey !== (category === "skole" ? "rating" : "price") ? "x" : ""].filter(Boolean).length,
    [search, municipalityFilter, ageGroup, qualityFilter, sortKey, category],
  );

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

  // Determine if we should show category badges (when catFilter is "alle")
  const showCategoryBadge = catFilter === "alle";

  return (
    <>
      <SEOHead
        title={categoryTitle}
        description={seoDescription}
        path={CATEGORY_PATHS[category]}
      />
      <JsonLd data={breadcrumbSchema([
        { name: language === "da" ? "Forside" : "Home", url: "https://www.institutionsguiden.dk/" },
        { name: categoryTitle, url: `https://www.institutionsguiden.dk${CATEGORY_PATHS[category]}` },
      ])} />
      <JsonLd data={itemListSchema(
        profileFiltered.slice(0, 10).map((inst) => ({
          name: inst.name,
          url: `/institution/${inst.id}`,
        })),
        "https://www.institutionsguiden.dk",
        categoryTitle,
      )} />

      <Breadcrumbs items={[
        { label: language === "da" ? "Forside" : "Home", href: "/" },
        { label: categoryTitle },
      ]} />

      {/* Category header */}
      <ScrollReveal><section className="px-4 py-10 sm:py-14 text-center bg-gradient-to-b from-primary/5 to-transparent relative">
        <div className="absolute top-4 right-4">
          <ShareButton title={categoryTitle} url={`/${category}`} />
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
          {categoryTitle}
        </h1>
        <p className="text-muted text-base max-w-2xl mx-auto mb-4">
          {t.categoryDescriptions[category]}
        </p>
        <p className="font-mono text-primary text-lg font-semibold">
          <AnimatedNumber value={profileFiltered.length} /> {t.common.institutions}
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
              type="search"
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
              <span className="font-mono font-medium text-foreground">{boundsFiltered.length.toLocaleString("da-DK")}</span> {t.common.institutions}
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

      {/* Efterskole profile filter chips */}
      {category === "efterskole" && (
        <div className="max-w-7xl mx-auto px-4 pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted font-medium mr-1">
              {language === "da" ? "Profil:" : "Profile:"}
            </span>
            <button
              onClick={() => setProfileFilter("")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !profileFilter
                  ? "bg-primary text-white"
                  : "bg-border/40 text-muted hover:bg-border/70"
              }`}
            >
              {language === "da" ? "Alle" : "All"}
            </button>
            <button
              onClick={() => setSpotsOnly(!spotsOnly)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                spotsOnly
                  ? "bg-green-600 text-white"
                  : "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950/30 dark:text-green-400 dark:hover:bg-green-950/50"
              }`}
            >
              {language === "da" ? "Ledige pladser" : "Available spots"}
            </button>
            <span className="text-border">|</span>
            {EFTERSKOLE_PROFILES.map((p) => (
              <button
                key={p.value}
                onClick={() => setProfileFilter(profileFilter === p.value ? "" : p.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  profileFilter === p.value
                    ? "bg-primary text-white"
                    : "bg-border/40 text-muted hover:bg-border/70"
                }`}
              >
                {language === "da" ? p.da : p.en}
              </button>
            ))}
          </div>
        </div>
      )}

      <ViewToggle
        mobileView={mobileView}
        onListView={() => {
          if (mobileView !== "list") {
            setView("liste");
            requestAnimationFrame(() => window.scrollTo(0, savedScrollY.current));
          }
        }}
        onMapView={() => {
          if (mobileView !== "map") {
            savedScrollY.current = window.scrollY;
            setView("kort");
          }
        }}
      />

      {mapFullscreen && (
        <div className="fixed inset-0 z-50">
          <InstitutionMap {...mapProps} />
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
              onClearAll={() => { setSearch(""); setCatFilter(category); setMunicipality(""); setAgeGroup(""); setQualityFilter(""); setProfileFilter(""); setSpotsOnly(false); }}
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
                subtypeLabel={SUBTYPE_LABELS[inst.subtype] || inst.subtype}
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
          <InstitutionMap {...mapProps} />
        </div>
      </section>

      <FripladsCTA category={category} />

      {/* Municipality ranking for this category */}
      <MunicipalityRanking category={category} categoryTitle={categoryTitle} />

      {/* Related searches */}
      <RelatedSearches category={category} />

      <GeoModals
        showGeoModal={geo.showGeoModal}
        geoError={geo.geoError}
        onAccept={geo.acceptConsent}
        onDismiss={geo.dismissModal}
        onDismissError={geo.dismissError}
        onRetry={geo.retryGeolocation}
      />

      <CompareBar />
    </>
  );
}
