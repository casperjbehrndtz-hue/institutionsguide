import { lazy, Suspense, useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SlidersHorizontal, X, Loader2 } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFilteredInstitutions } from "@/hooks/useFilteredInstitutions";
import { useFilterParams } from "@/hooks/useFilterParams";
import { useMapParams } from "@/hooks/useMapParams";
import { useGeolocation } from "@/hooks/useGeolocation";
import GeoModals from "@/components/shared/GeoModals";
import SearchFilterBar from "@/components/filters/SearchFilterBar";
import HomeDiscovery from "@/components/home/HomeDiscovery";

const InstitutionMap = lazy(() => import("@/components/map/InstitutionMap"));
import CompareBar from "@/components/compare/CompareBar";
import SEOHead from "@/components/shared/SEOHead";
import JsonLd from "@/components/shared/JsonLd";
import { websiteSchema, faqSchema } from "@/lib/schema";
import { SkeletonGrid, SkeletonList } from "@/components/shared/SkeletonCard";
import { useFavorites } from "@/hooks/useFavorites";
import NoResults from "@/components/filters/NoResults";
import InstitutionListCard from "@/components/shared/InstitutionListCard";
import type { UnifiedInstitution } from "@/lib/types";
import { haversineKm } from "@/lib/geo";
import { FAQ_ITEMS_DA, FAQ_ITEMS_EN } from "@/lib/faqData";
import CategoryCards from "@/components/home/CategoryCards";
import HeroSection from "@/components/home/HeroSection";
import { getCategoryCards } from "@/lib/homeCategoryCards";
import { useCategoryStats } from "@/hooks/useCategoryStats";
import { usePopularData } from "@/hooks/usePopularData";
import MobileViewToggle from "@/components/home/MobileViewToggle";
import FilterSummaryBar from "@/components/home/FilterSummaryBar";

const HERO_VIDEOS: { src: string; focus: string }[] = [
  { src: "/hero-1.mp4", focus: "90%" },
];

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [heroVideo] = useState(() => HERO_VIDEOS[Math.floor(Math.random() * HERO_VIDEOS.length)]);
  const { institutions, municipalities, loading, error } = useData();
  const { t, language } = useLanguage();
  const { toggleFavorite, isFavorite } = useFavorites();
  const {
    search, searchInput, setSearch,
    category, setCategory,
    municipality, setMunicipality,
    ageGroup, setAgeGroup,
    qualityFilter, setQualityFilter,
    sortKey, setSortKey,
  } = useFilterParams();
  const { lat, lng, zoom: mapZoom, view, setMapView, setView } = useMapParams();
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);

  const geo = useGeolocation(useCallback((loc) => {
    setFlyTo({ ...loc, zoom: 14 });
    setRadiusKm(3);
  }, [setRadiusKm]));
  const mobileView = view === "kort" ? "map" : "list";
  const [showFilters, setShowFilters] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const handleMarkerHover = useCallback((id: string | null) => setHoveredId(id), []);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mapBounds, setMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const filtered = useFilteredInstitutions(institutions, { search, category, municipality, qualityFilter, sortKey, ageGroup });
  const municipalityNames = useMemo(() => municipalities.map((m) => m.municipality), [municipalities]);

  const [visibleCount, setVisibleCount] = useState(50);
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
  useEffect(() => { queueMicrotask(() => { setVisibleCount(50); setMapBounds(null); }); }, [filtered]);

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


  const categoryStats = useCategoryStats(institutions);

  const { featured: FEATURED_CARDS, other: OTHER_CARDS } = getCategoryCards(t, language);
  const FAQ_ITEMS = language === "en" ? FAQ_ITEMS_EN : FAQ_ITEMS_DA;

  // Show filter bar + list/map when user has actively filtered
  const hasActiveFilter = !!(searchInput || municipality || geo.userLocation || category !== "alle" || ageGroup);

  // Summary stats for the active filter
  const summaryStats = useMemo(() => {
    if (!hasActiveFilter) return null;
    const list = radiusFiltered;
    const count = list.length;
    const prices = list.map((i) => i.monthlyRate).filter((p): p is number => p != null && p > 0);
    const cheapest = prices.length > 0 ? Math.min(...prices) : null;
    return { count, cheapest };
  }, [hasActiveFilter, radiusFiltered]);


  const popularData = usePopularData(institutions);

  if (loading) {
    return (
      <>
        <SEOHead
          title={language === "da" ? "Institutionsguide — Find og sammenlign børnepasning og skoler" : "Institutionsguide — Find and compare childcare and schools"}
          description={language === "da" ? "Sammenlign vuggestuer, børnehaver, dagplejere, skoler og SFO i alle 98 kommuner." : "Compare nurseries, kindergartens, childminders, schools and after-school care in all 98 municipalities."}
          path="/"
        />
        <section className="px-4 py-12 sm:py-16 text-center bg-gradient-to-b from-primary/5 to-transparent">
          <div className="skeleton h-10 w-2/3 mx-auto mb-4" />
          <div className="skeleton h-5 w-1/2 mx-auto mb-8" />
          <SkeletonGrid count={5} />
        </section>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <SkeletonList count={4} />
        </div>
      </>
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

  return (
    <>
      <SEOHead
        title={language === "da" ? "Institutionsguide — Find og sammenlign børnepasning og skoler i Danmark" : "Institutionsguide — Find and compare childcare and schools in Denmark"}
        description={language === "da" ? "Sammenlign 5.000+ vuggestuer, børnehaver, dagplejere, skoler og SFO'er i alle 98 kommuner. Se normering, kvalitetsdata, priser og beregn fripladstilskud." : "Compare 5,000+ nurseries, kindergartens, childminders, schools and after-school care across all 98 municipalities. See staff ratios, quality data and prices."}
        path="/"
      />
      <JsonLd data={websiteSchema("https://institutionsguiden.dk")} />
      <JsonLd data={faqSchema(FAQ_ITEMS)} />

      <HeroSection
        heroVideo={heroVideo}
        searchInput={searchInput}
        setSearch={setSearch}
        onNearMe={geo.handleNearMe}
        nearMeLoading={geo.nearMeLoading}
        language={language}
        heroTitle={t.home.heroTitle}
        heroSubtitle={t.home.heroSubtitle.replace("{count}", institutions.length.toLocaleString("da-DK"))}
        institutionCount={institutions.length}
        municipalityCount={98}
      />

      <CategoryCards
        featured={FEATURED_CARDS}
        other={OTHER_CARDS}
        categoryStats={categoryStats}
        language={language}
        showLabel={t.common.show}
      />

      {/* Filter bar — only when user has actively filtered */}
      {hasActiveFilter && <div className="sticky top-14 z-30 bg-bg-card border-b border-border" style={{ WebkitTransform: "translateZ(0)" }}>
        {/* Mobile: filter toggle */}
        <div className="sm:hidden px-4 py-3 flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-primary/5 transition-colors min-h-[44px]"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {showFilters ? t.home.hideFilters : t.home.showFilters}
          </button>
        </div>
        {/* Full filter bar: always visible on sm+, toggle on mobile */}
        <div className={`${showFilters ? "block" : "hidden"} sm:block`}>
          <SearchFilterBar
            search={searchInput}
            onSearchChange={setSearch}
            category={category}
            onCategoryChange={setCategory}
            ageGroup={ageGroup}
            onAgeGroupChange={setAgeGroup}
            municipality={municipality}
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
            hasGeolocation={!!geo.userLocation}
          />
        </div>
      </div>}

      {/* Everything below only shows when a filter is active */}
      {hasActiveFilter && <>

      {summaryStats && (
        <FilterSummaryBar
          count={summaryStats.count}
          cheapest={summaryStats.cheapest}
          hasGeolocation={!!geo.userLocation}
          radiusKm={radiusKm}
          t={t}
        />
      )}

      <MobileViewToggle
        mobileView={mobileView}
        onListView={() => setView("liste")}
        onMapView={() => setView("kort")}
        listLabel={t.home.listView}
        mapLabel={t.home.mapView}
      />

      {/* Fullscreen map overlay */}
      {mapFullscreen && (
        <div className="fixed inset-0 z-50">
          <Suspense fallback={<div className="h-full bg-border/20 animate-pulse" />}>
            <InstitutionMap {...mapProps} />
          </Suspense>
        </div>
      )}

      {/* Split layout: List + Map */}
      <section className={`max-w-[1440px] mx-auto px-3 sm:px-4 py-3 sm:py-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3 sm:gap-4 ${mapFullscreen ? "hidden" : ""}`}>
        {/* Sidebar list */}
        <div ref={listContainerRef} className={`space-y-2 overflow-y-auto max-h-[calc(100dvh-200px)] lg:max-h-[calc(100vh-180px)] ${mobileView !== "list" ? "hidden lg:block" : ""}`}>
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
              category={category}
              onCategoryChange={setCategory}
              municipality={municipality}
              onMunicipalityChange={setMunicipality}
              ageGroup={ageGroup}
              onAgeGroupChange={setAgeGroup}
              qualityFilter={qualityFilter}
              onQualityFilterChange={setQualityFilter}
              onClearAll={() => { setSearch(""); setCategory("alle"); setMunicipality(""); setAgeGroup(""); setQualityFilter(""); }}
            />
          )}
          {visibleList.map((inst) => (
            <InstitutionListCard
              key={inst.id}
              inst={inst}
              hoveredId={hoveredId}
              onHover={setHoveredId}
              userLocation={geo.userLocation}
              isFavorite={isFavorite(inst.id)}
              onToggleFavorite={toggleFavorite}
              showCategoryBadge={category === "alle"}
            />
          ))}
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

        {/* Map */}
        <div className={`h-[calc(100dvh-140px)] lg:h-[calc(100vh-180px)] lg:sticky lg:top-[60px] ${mobileView !== "map" ? "hidden lg:block" : ""}`}>
          <Suspense fallback={<div className="h-[250px] bg-border/20 rounded-xl animate-pulse" />}>
            <InstitutionMap {...mapProps} />
          </Suspense>
        </div>
      </section>

      </>}


      <HomeDiscovery
        popularData={popularData}
        language={language}
        schoolCount={categoryStats.skole?.count.toLocaleString("da-DK") ?? ""}
        faqItems={FAQ_ITEMS}
        faqTitle={t.home.faq}
      />

      <GeoModals
        showGeoModal={geo.showGeoModal}
        geoError={geo.geoError}
        onAccept={geo.acceptConsent}
        onDismiss={geo.dismissModal}
        onDismissError={geo.dismissError}
        onRetry={geo.retryGeolocation}
      />

      {/* Compare bar */}
      <CompareBar />
    </>
  );
}
