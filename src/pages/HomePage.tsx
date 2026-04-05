import { lazy, Suspense, useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Building2, GraduationCap, Users, Home, BookOpen, Search, MapPin, SlidersHorizontal, Loader2, ArrowRight, BarChart3, X, Gamepad2, School, Landmark } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFilteredInstitutions } from "@/hooks/useFilteredInstitutions";
import { useFilterParams } from "@/hooks/useFilterParams";
import { useMapParams } from "@/hooks/useMapParams";
import { useGeolocation } from "@/hooks/useGeolocation";
import { GeoModal, GeoErrorToast } from "@/components/shared/GeoUI";
import { dataVersions, formatDataDate } from "@/lib/dataVersions";
import SearchFilterBar from "@/components/filters/SearchFilterBar";

const InstitutionMap = lazy(() => import("@/components/map/InstitutionMap"));
import CompareBar from "@/components/compare/CompareBar";
import SEOHead from "@/components/shared/SEOHead";
import JsonLd from "@/components/shared/JsonLd";
import { websiteSchema, faqSchema } from "@/lib/schema";
import { SkeletonGrid, SkeletonList } from "@/components/shared/SkeletonCard";
import { useFavorites } from "@/hooks/useFavorites";
import { formatDKK } from "@/lib/format";
import NoResults from "@/components/filters/NoResults";
import EmailCapture from "@/components/shared/EmailCapture";
import RecentlyViewed from "@/components/shared/RecentlyViewed";
import InstitutionListCard from "@/components/shared/InstitutionListCard";
import type { UnifiedInstitution } from "@/lib/types";
import { haversineKm } from "@/lib/geo";
import { FAQ_ITEMS_DA, FAQ_ITEMS_EN } from "@/lib/faqData";
import PopularSearches from "@/components/home/PopularSearches";
import UseCases from "@/components/home/UseCases";
import HomeToolsSection from "@/components/home/HomeToolsSection";
import HomeFAQ from "@/components/home/HomeFAQ";
import SEOLinks from "@/components/home/SEOLinks";

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);

  const geo = useGeolocation(useCallback((loc) => {
    setFlyTo({ ...loc, zoom: 14 });
    setRadiusKm(3);
  }, [setRadiusKm]));

  // Force video play — some browsers block autoPlay even with muted
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {});
  }, []);
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

  function handleSelect(inst: UnifiedInstitution) {
    navigate(`/institution/${inst.id}`, { state: { from: location.pathname + location.search } });
  }


  // Compute category stats from real data
  const categoryStats = useMemo(() => {
    const stats: Record<string, { count: number; minPrice: number | null; minYearlyPrice: number | null }> = {};
    for (const inst of institutions) {
      const cat = inst.category;
      if (!stats[cat]) stats[cat] = { count: 0, minPrice: null, minYearlyPrice: null };
      stats[cat].count++;
      if (inst.monthlyRate && inst.monthlyRate > 0) {
        if (stats[cat].minPrice === null || inst.monthlyRate < stats[cat].minPrice!) {
          stats[cat].minPrice = inst.monthlyRate;
        }
      }
      if (inst.yearlyPrice && inst.yearlyPrice > 0) {
        if (stats[cat].minYearlyPrice === null || inst.yearlyPrice < stats[cat].minYearlyPrice!) {
          stats[cat].minYearlyPrice = inst.yearlyPrice;
        }
      }
    }
    return stats;
  }, [institutions]);

  // Featured categories first (most searched), then the rest
  const FEATURED_CARDS = [
    { category: "skole" as const, label: t.categories.skole, icon: GraduationCap, iconColor: "text-indigo-600", bgColor: "bg-indigo-100 dark:bg-indigo-900/30", href: "/skole", desc: t.ageGroups.skole, cta: language === "da" ? "Se skoler" : "See schools", featured: true },
    { category: "efterskole" as const, label: t.categories.efterskole, icon: School, iconColor: "text-pink-600", bgColor: "bg-pink-100 dark:bg-pink-900/30", href: "/efterskole", desc: t.ageGroups.efterskole, cta: language === "da" ? "Se efterskoler" : "See boarding schools", featured: true },
  ];
  const OTHER_CARDS = [
    { category: "vuggestue" as const, label: t.categories.vuggestue, icon: Home, iconColor: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30", href: "/vuggestue", desc: t.ageGroups.vuggestue, cta: language === "da" ? "Udforsk" : "Explore", featured: false },
    { category: "boernehave" as const, label: t.categories.boernehave, icon: Building2, iconColor: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30", href: "/boernehave", desc: t.ageGroups.boernehave, cta: language === "da" ? "Udforsk" : "Explore", featured: false },
    { category: "dagpleje" as const, label: t.categories.dagpleje, icon: Users, iconColor: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30", href: "/dagpleje", desc: t.ageGroups.dagpleje, cta: language === "da" ? "Udforsk" : "Explore", featured: false },
    { category: "sfo" as const, label: t.categories.sfo, icon: BookOpen, iconColor: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30", href: "/sfo", desc: t.ageGroups.sfo, cta: language === "da" ? "Udforsk" : "Explore", featured: false },
    { category: "fritidsklub" as const, label: t.categories.fritidsklub, icon: Gamepad2, iconColor: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30", href: "/fritidsklub", desc: t.ageGroups.fritidsklub, cta: language === "da" ? "Udforsk" : "Explore", featured: false },
    { category: "gymnasium" as const, label: t.categories.gymnasium, icon: Landmark, iconColor: "text-teal-600", bgColor: "bg-teal-100 dark:bg-teal-900/30", href: "/gymnasium", desc: t.ageGroups.gymnasium, cta: language === "da" ? "Udforsk" : "Explore", featured: false },
  ];
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


  // Compute popular searches data from real institutions
  const popularData = useMemo(() => {
    if (!institutions.length) return null;

    // Best schools by trivsel (well-being)
    const bestTrivsel = institutions
      .filter((i) => i.category === "skole" && i.quality?.ts != null && i.quality.ts > 0)
      .sort((a, b) => (b.quality!.ts! - a.quality!.ts!))
      .slice(0, 4)
      .map((s) => ({ id: s.id, navn: s.name, score: s.quality!.ts! }));

    // Best schools by grade average
    const bestSchools = institutions
      .filter((i) => i.category === "skole" && i.quality?.k != null && i.quality.k > 0)
      .sort((a, b) => (b.quality!.k! - a.quality!.k!))
      .slice(0, 4)
      .map((s) => ({ id: s.id, navn: s.name, score: s.quality!.k! }));

    return { bestTrivsel, bestSchools };
  }, [institutions]);

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
        description={language === "da" ? "Sammenlign 5.000+ vuggestuer, børnehaver, dagplejere, skoler og SFO'er i alle 98 kommuner. Se priser, kvalitetsdata og beregn fripladstilskud." : "Compare 5,000+ nurseries, kindergartens, childminders, schools and after-school care across all 98 municipalities."}
        path="/"
      />
      <JsonLd data={websiteSchema("https://institutionsguiden.dk")} />
      <JsonLd data={faqSchema(FAQ_ITEMS)} />

      {/* Hero — video + search */}
      <section className="relative overflow-hidden bg-primary">
        {/* Background video */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
            poster="/og-image.png"
            className="absolute left-0 w-full min-h-full object-cover pointer-events-none"
            style={{ top: heroVideo.focus, transform: `translateY(-${heroVideo.focus})` }}
          >
            <source src={heroVideo.src} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-primary/60 via-primary/50 to-primary/70" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 py-10 sm:py-14 text-center">
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight mb-1.5">
            {t.home.heroTitle}
          </h1>
          <p className="text-white/80 text-sm sm:text-base max-w-lg mx-auto mb-5">
            {t.home.heroSubtitle.replace("{count}", institutions.length.toLocaleString("da-DK"))}
          </p>

          {/* Search bar */}
          <div className="max-w-lg mx-auto mb-3">
            <div className="relative">
              <label htmlFor="hero-search" className="sr-only">{language === "da" ? "Søg institution" : "Search institution"}</label>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/50 pointer-events-none" />
              <input
                id="hero-search"
                type="text"
                value={searchInput}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={language === "da" ? "Søg postnummer, by eller institution..." : "Search postal code, city or institution..."}
                className="w-full py-3.5 pl-12 pr-4 text-base rounded-xl bg-[var(--color-bg-card)] text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent shadow-xl transition-shadow"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Action row */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={geo.handleNearMe}
              disabled={geo.nearMeLoading}
              className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors disabled:opacity-60"
            >
              {geo.nearMeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
              {language === "da" ? "Find tæt på mig" : "Find near me"}
            </button>
            <span className="text-white/30">|</span>
            <Link
              to="/find"
              className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {language === "da" ? "Find den rette for jer" : "Find your perfect match"}
            </Link>
          </div>

          {/* Social proof — trust line */}
          <p className="text-[12px] sm:text-[13px] text-white/50 mt-5 font-medium tracking-wide">
            {language === "da"
              ? `${institutions.length.toLocaleString("da-DK")} institutioner · ${municipalities.length} kommuner · Opdateret ${formatDataDate(dataVersions.overall.lastUpdated, "da")}`
              : `${institutions.length.toLocaleString("da-DK")} institutions · ${municipalities.length} municipalities · Updated ${formatDataDate(dataVersions.overall.lastUpdated, "en")}`}
          </p>
        </div>
      </section>

      {/* Category cards — featured + grid */}
      <section className="max-w-5xl mx-auto px-3 sm:px-4 -mt-5 relative z-20 mb-6">
        {/* Featured: Skoler + Efterskoler — wide cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-2 sm:mb-3">
          {FEATURED_CARDS.map((card) => {
            const stats = categoryStats[card.category];
            const count = stats?.count ?? 0;
            return (
              <Link
                key={card.category}
                to={card.href}
                className="group rounded-xl bg-[var(--color-bg-card)] border-2 border-primary/20 shadow-sm px-4 py-4 sm:px-5 sm:py-5 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all"
                aria-label={`${t.common.show} ${card.label}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${card.bgColor}`}>
                    <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-foreground text-base leading-tight">{card.label}</p>
                    <p className="text-xs text-muted leading-tight">{card.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted">
                  {count > 0 && (
                    <span>{count.toLocaleString("da-DK")} {language === "da" ? "steder" : "places"}</span>
                  )}
                  {card.category === "skole" && (
                    <span className="text-muted">{language === "da" ? "Trivsel · Karakterer · Fravær" : "Well-being · Grades · Absence"}</span>
                  )}
                  {card.category === "efterskole" && stats?.minYearlyPrice && (
                    <span className="font-mono text-foreground font-medium">{language === "da" ? "fra" : "from"} {formatDKK(stats.minYearlyPrice)}{language === "da" ? "/år" : "/year"}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
        {/* Other categories — compact row */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {OTHER_CARDS.map((card) => {
            const stats = categoryStats[card.category];
            const count = stats?.count ?? 0;
            const minPrice = stats?.minPrice;
            return (
              <Link
                key={card.category}
                to={card.href}
                className="group rounded-xl bg-[var(--color-bg-card)] border border-border/50 shadow-sm px-3 py-3 sm:px-4 sm:py-4 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all w-[calc(50%-4px)] sm:w-[calc(20%-8px)]"
                aria-label={`${t.common.show} ${card.label}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${card.bgColor}`}>
                    <card.icon className={`w-4 h-4 ${card.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm leading-tight">{card.label}</p>
                    <p className="text-[10px] text-muted leading-tight">{card.desc}</p>
                  </div>
                </div>
                <div className="text-xs text-muted space-y-0.5">
                  {count > 0 && (
                    <p>{count.toLocaleString("da-DK")} {language === "da" ? "steder" : "places"}</p>
                  )}
                  {minPrice ? (
                    <p className="font-mono text-foreground font-medium">{language === "da" ? "fra" : "from"} {formatDKK(minPrice)}{t.common.perMonth}</p>
                  ) : null}
                </div>
                <p className="text-[11px] text-primary font-medium mt-2 flex items-center gap-0.5">
                  {card.cta} <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </p>
              </Link>
            );
          })}
        </div>
      </section>

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

      {/* Summary bar */}
      {summaryStats && (
        <div className="max-w-[1440px] mx-auto px-3 sm:px-4 pt-2 sm:pt-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-sm">
            <BarChart3 className="w-4 h-4 text-primary shrink-0" />
            <span className="text-foreground font-medium">
              {summaryStats.count.toLocaleString("da-DK")} {t.home.summaryInstitutions}
              {geo.userLocation && radiusKm ? ` ${t.home.summaryWithin} ${radiusKm} km` : ""}
              {summaryStats.cheapest ? ` — ${t.home.summaryCheapest}: ${formatDKK(summaryStats.cheapest)}${t.common.perMonth}` : ""}
            </span>
          </div>
        </div>
      )}

      {/* Mobile list/map toggle */}
      <div className="lg:hidden flex justify-center py-2 px-4">
        <div className="inline-flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setView("liste")}
            className={`px-5 py-2 text-sm font-medium transition-colors min-h-[44px] ${
              mobileView === "list" ? "bg-primary text-primary-foreground" : "bg-bg-card text-foreground hover:bg-primary/5"
            }`}
          >
            {t.home.listView}
          </button>
          <button
            onClick={() => setView("kort")}
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
          <Suspense fallback={<div className="h-full bg-border/20 animate-pulse" />}>
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

        {/* Map */}
        <div className={`h-[calc(100dvh-140px)] lg:h-[calc(100vh-180px)] lg:sticky lg:top-[60px] ${mobileView !== "map" ? "hidden lg:block" : ""}`}>
          <Suspense fallback={<div className="h-[250px] bg-border/20 rounded-xl animate-pulse" />}>
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
          </Suspense>
        </div>
      </section>

      </>}


      {/* Populære søgninger — dynamic data cards */}
      {popularData && <PopularSearches data={popularData} language={language} />}

      {/* Use cases — what parents can do */}
      <UseCases language={language} schoolCount={categoryStats.skole?.count.toLocaleString("da-DK") ?? ""} />

      {/* Cross-sell: Suite products */}
      <HomeToolsSection />

      {/* Recently viewed */}
      <RecentlyViewed />

      {/* FAQ */}
      <HomeFAQ items={FAQ_ITEMS} title={t.home.faq} />

      {/* SEO links */}
      <SEOLinks language={language} />

      {/* Email capture */}
      <section className="max-w-xl mx-auto px-4 py-8">
        <EmailCapture />
      </section>

      {/* Geolocation consent modal */}
      {geo.showGeoModal && (
        <GeoModal onAccept={geo.acceptConsent} onDismiss={geo.dismissModal} />
      )}

      {/* Geolocation error toast */}
      {geo.geoError && (
        <GeoErrorToast message={geo.geoError} onDismiss={geo.dismissError} onRetry={geo.retryGeolocation} />
      )}

      {/* Compare bar */}
      <CompareBar />
    </>
  );
}
