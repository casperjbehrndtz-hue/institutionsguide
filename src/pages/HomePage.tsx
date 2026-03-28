import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Building2, GraduationCap, Users, Home, BookOpen, HelpCircle, Calculator, PiggyBank, Wallet, Heart, Search, MapPin, SlidersHorizontal, Loader2, ArrowRight, CheckCircle, BarChart3, Star, X, ShieldCheck } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompare } from "@/contexts/CompareContext";
import { useFilteredInstitutions } from "@/hooks/useFilteredInstitutions";
import { useFilterParams } from "@/hooks/useFilterParams";
import { useMapParams } from "@/hooks/useMapParams";
import ScrollReveal from "@/components/shared/ScrollReveal";
import SearchFilterBar from "@/components/filters/SearchFilterBar";
import InstitutionMap from "@/components/map/InstitutionMap";
import InstitutionDetail from "@/components/detail/InstitutionDetail";
import CompareBar from "@/components/compare/CompareBar";
import SEOHead from "@/components/shared/SEOHead";
import JsonLd from "@/components/shared/JsonLd";
import { websiteSchema, faqSchema } from "@/lib/schema";
import { SkeletonGrid, SkeletonList } from "@/components/shared/SkeletonCard";
import { useFavorites } from "@/hooks/useFavorites";
import { formatDKK } from "@/lib/format";
import NoResults from "@/components/filters/NoResults";
import EmailCapture from "@/components/shared/EmailCapture";
import type { UnifiedInstitution } from "@/lib/types";

/** Haversine distance in km between two lat/lng points */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Format distance: "1,2 km" for < 10 km, "12 km" for >= 10 km */
function formatDistance(km: number): string {
  if (km < 10) return km.toFixed(1).replace(".", ",") + " km";
  return Math.round(km) + " km";
}

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  vuggestue: "bg-green-100 text-green-700",
  boernehave: "bg-blue-100 text-blue-700",
  dagpleje: "bg-amber-100 text-amber-700",
  skole: "bg-indigo-100 text-indigo-700",
  sfo: "bg-purple-100 text-purple-700",
};

const FAQ_ITEMS_DA = [
  {
    q: "Hvad er fripladstilskud, og hvem kan få det?",
    a: "Fripladstilskud er en rabat på forældrebetalingen for dagtilbud. Tilskuddet afhænger af husstandsindkomsten. I 2026 kan familier med en indkomst under 677.500 kr. få delvist tilskud, og under 218.100 kr. får man fuld friplads.",
  },
  {
    q: "Hvad er forskellen på dagpleje og vuggestue?",
    a: "Dagpleje foregår i en dagplejers private hjem med maks 4-5 børn, mens en vuggestue er en institution med flere børn og personale. Dagpleje er ofte billigere, mens vuggestuer typisk har flere pædagoger og faciliteter.",
  },
  {
    q: "Hvordan beregnes kvalitetsscoren for skoler?",
    a: "Kvalitetsscoren er baseret på officielle data fra Undervisningsministeriet og inkluderer trivselsmålinger, karaktergennemsnit, fravær, kompetencedækning og undervisningseffekt (socioøkonomisk reference).",
  },
  {
    q: "Er priserne opdaterede?",
    a: "Priserne er baseret på data fra Danmarks Statistik (2025-tal) og Dagtilbudsregisteret. Kommunerne regulerer typisk taksterne årligt, så der kan forekomme mindre afvigelser.",
  },
  {
    q: "Hvornår skal jeg skrive mit barn op til vuggestue eller børnehave?",
    a: "Det varierer fra kommune til kommune, men som tommelfingerregel bør du skrive op så tidligt som muligt — gerne lige efter fødslen. I de store byer som København, Aarhus og Odense kan ventelisterne være lange, og mange kommuner bruger Digital Pladsanvisning.",
  },
  {
    q: "Kan jeg se normeringen for en institution?",
    a: "Vi viser ikke normering direkte, da kommunerne offentliggør det forskelligt. For skoler viser vi klassestørrelse. Kontakt den enkelte institution eller kommune for aktuel normering.",
  },
  {
    q: "Hvad er søskenderabat?",
    a: "Har du flere børn i dagtilbud, betaler du typisk kun 50% for barn nr. 2 og derefter. Rabatten gælder automatisk og er indregnet i vores fripladstilskudsberegner.",
  },
];

const FAQ_ITEMS_EN = [
  {
    q: "What is childcare subsidy, and who can get it?",
    a: "Childcare subsidy (fripladstilskud) is a discount on parental fees for daycare. The subsidy depends on household income. In 2026, families with an income below DKK 677,500 can receive partial subsidy, and below DKK 218,100 full subsidy.",
  },
  {
    q: "What is the difference between childminder and nursery?",
    a: "Childminders (dagpleje) care for children in their private home with max 4-5 children, while nurseries (vuggestue) are institutions with more children and staff. Childminders are often cheaper, while nurseries typically have more pedagogues and facilities.",
  },
  {
    q: "How is the quality score for schools calculated?",
    a: "The quality score is based on official data from the Danish Ministry of Education and includes well-being surveys, grade averages, absence, competence coverage and teaching effectiveness (socio-economic reference).",
  },
  {
    q: "Are the prices up to date?",
    a: "Prices are based on data from Statistics Denmark (2025 figures) and the Daycare Registry. Municipalities typically adjust rates annually, so minor deviations may occur.",
  },
  {
    q: "When should I sign up my child for daycare?",
    a: "It varies by municipality, but as a rule of thumb, sign up as early as possible — ideally right after birth. Waiting lists can be long in larger cities like Copenhagen, Aarhus and Odense.",
  },
  {
    q: "Can I see the staff-to-child ratio?",
    a: "We don't currently display staff ratios directly as municipalities publish this differently. For schools, we show class size. Contact the individual institution for current ratios.",
  },
  {
    q: "What is sibling discount?",
    a: "If you have multiple children in daycare, you typically pay only 50% for the second child onwards. The discount applies automatically and is included in our subsidy calculator.",
  },
];

const HERO_VIDEOS = [
  "/hero-1.mp4",
  "/hero-2.mp4",
];

export default function HomePage() {
  const [heroVideo] = useState(() => HERO_VIDEOS[Math.floor(Math.random() * HERO_VIDEOS.length)]);
  const { institutions, municipalities, loading, error } = useData();
  const { t, language } = useLanguage();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { addToCompare, removeFromCompare, isInCompare } = useCompare();
  const {
    search, setSearch,
    category, setCategory,
    municipality, setMunicipality,
    ageGroup, setAgeGroup,
    qualityFilter, setQualityFilter,
    sortKey, setSortKey,
  } = useFilterParams();
  const { lat, lng, zoom: mapZoom, view, setMapView, setView } = useMapParams();
  const [selected, setSelected] = useState<UnifiedInstitution | null>(null);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Force video play — some browsers block autoPlay even with muted
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {});
  }, []);
  const mobileView = view === "kort" ? "map" : "list";
  const [showFilters, setShowFilters] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mapBounds, setMapBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const filtered = useFilteredInstitutions(institutions, { search, category, municipality, qualityFilter, sortKey, ageGroup });
  const municipalityNames = useMemo(() => municipalities.map((m) => m.municipality), [municipalities]);

  const [visibleCount, setVisibleCount] = useState(50);

  const distanceSorted = useMemo(() => {
    if (!userLocation) return filtered;
    const loc = userLocation;
    const cosLat = Math.cos(loc.lat * Math.PI / 180);
    return [...filtered].sort((a, b) => {
      const distA = Math.hypot(a.lat - loc.lat, (a.lng - loc.lng) * cosLat);
      const distB = Math.hypot(b.lat - loc.lat, (b.lng - loc.lng) * cosLat);
      return distA - distB;
    });
  }, [filtered, userLocation]);

  // Filter by radius when active
  const radiusFiltered = useMemo(() => {
    if (!radiusKm || !userLocation) return distanceSorted;
    return distanceSorted.filter((inst) =>
      haversineKm(userLocation.lat, userLocation.lng, inst.lat, inst.lng) <= radiusKm
    );
  }, [distanceSorted, radiusKm, userLocation]);

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

  const [geoConsented, setGeoConsented] = useState(false);
  const [showGeoModal, setShowGeoModal] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const requestGeolocation = useCallback(() => {
    setNearMeLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setFlyTo({ ...loc, zoom: 13 });
        setRadiusKm(5); // Auto-set 5km radius for useful results
        setNearMeLoading(false);
      },
      () => {
        setNearMeLoading(false);
        setGeoError(
          language === "da"
            ? "Kunne ikke hente din placering. Tjek din browsers tilladelser."
            : "Could not get your location. Check your browser permissions."
        );
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, [language]);

  const handleNearMe = useCallback(() => {
    if (!navigator.geolocation) return;
    if (!geoConsented) {
      setShowGeoModal(true);
      return;
    }
    requestGeolocation();
  }, [geoConsented, requestGeolocation]);

  function handleSelect(inst: UnifiedInstitution) {
    setSelected(inst);
    setFlyTo({ lat: inst.lat, lng: inst.lng, zoom: 14 });
  }

  function handleCompare(inst: UnifiedInstitution) {
    if (isInCompare(inst.id)) {
      removeFromCompare(inst.id);
    } else {
      addToCompare(inst);
    }
  }

  const CATEGORY_CARDS = [
    { category: "vuggestue" as const, label: t.categories.vuggestue, icon: Home, iconColor: "text-green-600", bgColor: "bg-green-100", href: "/vuggestue", desc: t.ageGroups.vuggestue },
    { category: "boernehave" as const, label: t.categories.boernehave, icon: Building2, iconColor: "text-blue-600", bgColor: "bg-blue-100", href: "/boernehave", desc: t.ageGroups.boernehave },
    { category: "dagpleje" as const, label: t.categories.dagpleje, icon: Users, iconColor: "text-amber-600", bgColor: "bg-amber-100", href: "/dagpleje", desc: t.ageGroups.dagpleje },
    { category: "skole" as const, label: t.categories.skole, icon: GraduationCap, iconColor: "text-indigo-600", bgColor: "bg-indigo-100", href: "/skole", desc: t.ageGroups.skole },
    { category: "sfo" as const, label: t.categories.sfo, icon: BookOpen, iconColor: "text-purple-600", bgColor: "bg-purple-100", href: "/sfo", desc: t.ageGroups.sfo },
  ];

  const FAQ_ITEMS = language === "en" ? FAQ_ITEMS_EN : FAQ_ITEMS_DA;

  // Location gate: only show list+map when user has actively filtered
  const hasActiveFilter = !!(search || municipality || userLocation || category !== "alle");

  // Summary stats for the active filter
  const summaryStats = useMemo(() => {
    if (!hasActiveFilter) return null;
    const list = radiusFiltered;
    const count = list.length;
    const prices = list.map((i) => i.monthlyRate).filter((p): p is number => p != null && p > 0);
    const cheapest = prices.length > 0 ? Math.min(...prices) : null;
    return { count, cheapest };
  }, [hasActiveFilter, radiusFiltered]);

  // Municipality search for explore section
  const [municipalitySearch, setMunicipalitySearch] = useState("");
  const filteredMunicipalities = useMemo(() => {
    if (!municipalitySearch.trim()) return municipalities.slice(0, 12);
    const q = municipalitySearch.toLowerCase();
    return municipalities.filter((m) => m.municipality.toLowerCase().includes(q));
  }, [municipalities, municipalitySearch]);

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
      <JsonLd data={websiteSchema("https://institutionsguide.dk")} />
      <JsonLd data={faqSchema(FAQ_ITEMS)} />

      {/* Hero — video + search */}
      <section className="relative overflow-hidden bg-primary">
        {/* Background video */}
        <div className="absolute inset-0 z-0">
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          >
            <source src={heroVideo} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-primary/50" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 pt-14 pb-10 sm:pt-20 sm:pb-14 text-center">
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight mb-2">
            {t.home.heroTitle}
          </h1>
          <p className="text-white/80 text-sm sm:text-base max-w-lg mx-auto mb-6">
            {institutions.length.toLocaleString("da-DK")}+ {language === "da" ? "institutioner i alle 98 kommuner" : "institutions across all 98 municipalities"}
          </p>

          {/* Search bar */}
          <div className="max-w-lg mx-auto mb-4">
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/50 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={language === "da" ? "Skriv postnummer, bydel eller institution..." : "Type postal code, area or institution..."}
                className="w-full py-4 pl-14 pr-4 text-base sm:text-lg rounded-xl bg-white text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent shadow-xl transition-shadow"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Near me */}
          <button
            onClick={handleNearMe}
            disabled={nearMeLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white font-medium text-sm hover:bg-white/30 transition-all disabled:opacity-60"
          >
            {nearMeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            {t.home.heroCta}
          </button>

          {/* Trust signal */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <ShieldCheck className="w-4 h-4 text-white/70" />
            <p className="text-xs sm:text-sm text-white/70 font-medium">
              {language === "da" ? "Officielle data fra Undervisningsministeriet · Altid gratis" : "Official data from the Danish Ministry of Education · Always free"}
            </p>
          </div>
        </div>
      </section>

      {/* Category cards — solid white, below hero */}
      <section className="max-w-4xl mx-auto px-4 -mt-6 relative z-20 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {CATEGORY_CARDS.map((card) => {
            const count = institutions.filter((i) => i.category === card.category).length;
            return (
              <Link
                key={card.category}
                to={card.href}
                className="group rounded-xl bg-white border border-border/50 shadow-sm p-4 text-center hover:shadow-md hover:border-primary/20 transition-all min-h-[44px]"
                aria-label={`${t.common.show} ${card.label}`}
              >
                <div className={`w-12 h-12 mx-auto mb-2 rounded-xl flex items-center justify-center ${card.bgColor}`}>
                  <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
                <p className="font-semibold text-foreground text-sm">{card.label}</p>
                <p className="text-[11px] text-muted">{card.desc}</p>
                <p className="font-mono text-xs text-muted mt-1.5 flex items-center justify-center gap-1">
                  {count.toLocaleString("da-DK")} <ArrowRight className="w-3 h-3 text-primary group-hover:translate-x-0.5 transition-transform" />
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Location prompt removed — hero search + near-me button covers this */}

      {/* Filter bar — only when user has actively filtered */}
      {hasActiveFilter && <div className="sticky top-14 z-30 bg-bg-card border-b border-border">
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
            search={search}
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
            resultCount={filtered.length}
            municipalities={municipalityNames}
            onNearMe={handleNearMe}
            nearMeLoading={nearMeLoading}
          />
        </div>
      </div>}

      {/* Everything below only shows when a filter is active */}
      {hasActiveFilter && <>

      {/* Summary bar */}
      {summaryStats && (
        <div className="max-w-[1440px] mx-auto px-4 pt-4">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/20 text-sm">
            <BarChart3 className="w-4 h-4 text-primary shrink-0" />
            <span className="text-foreground font-medium">
              {summaryStats.count.toLocaleString("da-DK")} {t.home.summaryInstitutions}
              {userLocation && radiusKm ? ` ${t.home.summaryWithin} ${radiusKm} km` : ""}
              {summaryStats.cheapest ? ` — ${t.home.summaryCheapest}: ${formatDKK(summaryStats.cheapest)}${t.common.perMonth}` : ""}
            </span>
          </div>
        </div>
      )}

      {/* Mobile list/map toggle */}
      <div className="lg:hidden flex justify-center py-3 px-4">
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
          <InstitutionMap
            institutions={boundsFiltered}
            onSelect={handleSelect}
            flyTo={flyTo}
            highlightedId={hoveredId}
            onMarkerHover={(id: string | null) => setHoveredId(id)}
            isFullscreen={mapFullscreen}
            onToggleFullscreen={() => setMapFullscreen((f) => !f)}
            onBoundsChange={(bounds: { north: number; south: number; east: number; west: number }) => setMapBounds(bounds)}
            initialCenter={{ lat, lng }}
            initialZoom={mapZoom}
            onViewChange={setMapView}
            radiusCenter={userLocation}
            radiusKm={radiusKm}
            onRadiusChange={setRadiusKm}
          />
        </div>
      )}

      {/* Split layout: List + Map */}
      <section className={`max-w-[1440px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-6 ${mapFullscreen ? "hidden" : ""}`}>
        {/* Sidebar list */}
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
          {visibleList.map((inst) => {
            // Quick score for list display (0-10 scale)
            const q = inst.quality;
            let listScore: number | null = null;
            if (inst.category === "skole" && q) {
              const parts: { w: number; s: number }[] = [];
              if (q.ts != null) parts.push({ w: 0.2, s: Math.max(0, Math.min(100, (q.ts - 3.5) / 0.8 * 100)) });
              if (q.k != null) parts.push({ w: 0.2, s: Math.max(0, Math.min(100, (q.k - 5) / 5 * 100)) });
              if (q.fp != null) parts.push({ w: 0.15, s: Math.max(0, Math.min(100, (12 - q.fp) / 9 * 100)) });
              if (q.kp != null) parts.push({ w: 0.15, s: Math.max(0, Math.min(100, (q.kp - 70) / 30 * 100)) });
              if (parts.length > 0) {
                const tw = parts.reduce((s, p) => s + p.w, 0);
                listScore = Math.round(parts.reduce((s, p) => s + p.s * p.w / tw, 0)) / 10;
              }
            } else if (inst.monthlyRate) {
              // Simple heuristic for dagtilbud: cheaper = higher score
              listScore = inst.monthlyRate < 2000 ? 7.5 : inst.monthlyRate < 3000 ? 6.5 : inst.monthlyRate < 4000 ? 5.5 : 4.5;
            }
            const scoreColor = listScore != null ? (listScore >= 7 ? "text-[#0F6E56] border-[#1D9E75]" : listScore >= 5 ? "text-[#8A5A12] border-[#BA7517]" : "text-[#A32D2D] border-[#A32D2D]") : "";

            return (
              <Link
                key={inst.id}
                to={`/institution/${inst.id}`}
                data-inst-id={inst.id}
                className={`card hover:scale-[1.01] transition-all block ${
                  hoveredId === inst.id ? "ring-2 ring-primary/50 bg-primary/5" : ""
                }`}
                onMouseEnter={() => setHoveredId(inst.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">{inst.name}</p>
                        {category === "alle" && (
                          <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full ${CATEGORY_BADGE_COLORS[inst.category] || ""}`}>
                            {t.categories[inst.category]}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-muted">{inst.address}, {inst.postalCode} {inst.city}</p>
                        {userLocation && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-primary/70">
                            <MapPin className="w-3 h-3" />
                            {formatDistance(haversineKm(userLocation.lat, userLocation.lng, inst.lat, inst.lng))}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted">{inst.municipality}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      {inst.monthlyRate ? (
                        <div className="text-right">
                          <p className="font-mono text-sm font-medium text-primary">
                            {formatDKK(inst.monthlyRate)}
                          </p>
                          <span className="text-xs text-muted">{t.common.perMonth}</span>
                        </div>
                      ) : inst.category === "skole" ? (
                        <span className="text-xs text-muted">{language === "da" ? "Folkeskole" : "Public school"}</span>
                      ) : (
                        <span className="text-xs text-muted">{language === "da" ? "Se pris" : "See price"}</span>
                      )}
                      {listScore != null && (
                        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 ${scoreColor}`}>
                          <span className="font-mono text-sm font-medium">{listScore.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 pb-3 pt-0">
                  <span className="text-xs text-primary font-medium">
                    {t.common.seeFullProfile} &rarr;
                  </span>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(inst.id); }}
                    className="p-2 rounded-lg hover:bg-red-50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
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

        {/* Map or Detail */}
        <div className={`h-[70vh] lg:h-[calc(100vh-180px)] lg:sticky lg:top-[60px] ${mobileView !== "map" ? "hidden lg:block" : ""}`}>
          {selected ? (
            <InstitutionDetail
              institution={selected}
              onClose={() => setSelected(null)}
              onCompare={handleCompare}
            />
          ) : (
            <InstitutionMap
              institutions={boundsFiltered}
              onSelect={handleSelect}
              flyTo={flyTo}
              highlightedId={hoveredId}
              onMarkerHover={(id: string | null) => setHoveredId(id)}
              isFullscreen={mapFullscreen}
              onToggleFullscreen={() => setMapFullscreen((f) => !f)}
              onBoundsChange={(bounds: { north: number; south: number; east: number; west: number }) => setMapBounds(bounds)}
              initialCenter={{ lat, lng }}
              initialZoom={mapZoom}
              onViewChange={setMapView}
              radiusCenter={userLocation}
              radiusKm={radiusKm}
              onRadiusChange={setRadiusKm}
            />
          )}
        </div>
      </section>

      </>}

      {/* Popular municipalities */}
      <ScrollReveal><section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-foreground mb-2 text-center">
          {language === "da" ? "Udforsk din kommune" : "Explore your municipality"}
        </h2>
        <p className="text-sm text-muted text-center mb-6">
          {language === "da" ? "Se priser og institutioner i de største kommuner" : "See prices and institutions in the largest municipalities"}
        </p>
        {/* Municipality search */}
        <div className="max-w-sm mx-auto mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            <input
              type="text"
              value={municipalitySearch}
              onChange={(e) => setMunicipalitySearch(e.target.value)}
              placeholder={language === "da" ? "Søg kommune..." : "Search municipality..."}
              className="w-full py-2.5 pl-10 pr-4 text-sm rounded-lg border border-border bg-bg-card text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredMunicipalities.map((m) => {
            const total = m.vuggestueCount + m.boernehaveCount + m.dagplejeCount + m.folkeskoleCount + m.friskoleCount + m.sfoCount;
            const cheapest = Math.min(
              ...[m.rates.dagpleje, m.rates.vuggestue, m.rates.boernehave, m.rates.sfo].filter((r): r is number => r !== null)
            );
            const priceColor = cheapest <= 2000 ? "text-success" : cheapest <= 3500 ? "text-warning" : "text-destructive";
            return (
              <Link
                key={m.municipality}
                to={`/kommune/${encodeURIComponent(m.municipality)}`}
                className="group card p-4 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">{m.municipality}</p>
                <p className="text-xs text-muted mt-1">{total} {total === 1 ? (language === "da" ? "institution" : "institution") : t.common.institutions}</p>
                {cheapest !== Infinity && (
                  <p className={`font-mono text-sm font-medium mt-2 ${priceColor}`}>
                    {language === "da" ? "fra" : "from"} {formatDKK(cheapest)}{t.common.perMonth}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
        {filteredMunicipalities.length === 0 && (
          <p className="text-center text-sm text-muted py-6">
            {language === "da" ? "Ingen kommuner matcher din søgning" : "No municipalities match your search"}
          </p>
        )}
        {!municipalitySearch && municipalities.length > 12 && (
          <div className="text-center mt-6">
            <p className="text-sm text-muted">
              {language === "da"
                ? `+ ${municipalities.length - 12} andre kommuner — søg ovenfor for at finde din`
                : `+ ${municipalities.length - 12} other municipalities — search above to find yours`}
            </p>
          </div>
        )}
      </section></ScrollReveal>

      {/* FAQ */}
      <ScrollReveal><section className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-primary" />
          {t.home.faq}
        </h2>
        <div className="space-y-4">
          {FAQ_ITEMS.map((faq) => (
            <details key={faq.q} className="card p-4 group">
              <summary className="font-semibold text-foreground cursor-pointer list-none flex justify-between items-center min-h-[44px]">
                {faq.q}
                <span className="text-muted group-open:rotate-180 transition-transform ml-2 shrink-0">&#x25BC;</span>
              </summary>
              <p className="text-muted text-sm mt-3 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section></ScrollReveal>

      {/* Cross-sell: Suite products */}
      <ScrollReveal><section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-foreground mb-2 text-center">
          {t.home.moreTools}
        </h2>
        <p className="text-muted text-center mb-8">
          {t.home.moreToolsSubtitle}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a
            href="https://nemtbudget.nu"
            target="_blank"
            rel="noopener noreferrer"
            className="card p-5 hover:scale-[1.02] transition-transform group"
          >
            <Wallet className="w-8 h-8 text-blue-500 mb-3" />
            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">NemtBudget</p>
            <p className="text-sm text-muted mt-1">{t.suiteProducts.nemtbudget}</p>
          </a>
          <a
            href="https://parfinans.dk"
            target="_blank"
            rel="noopener noreferrer"
            className="card p-5 hover:scale-[1.02] transition-transform group"
          >
            <Calculator className="w-8 h-8 text-amber-600 mb-3" />
            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">ParFinans</p>
            <p className="text-sm text-muted mt-1">{t.suiteProducts.parfinans}</p>
          </a>
          <a
            href="https://børneskat.dk"
            target="_blank"
            rel="noopener noreferrer"
            className="card p-5 hover:scale-[1.02] transition-transform group"
          >
            <PiggyBank className="w-8 h-8 text-success mb-3" />
            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">Børneskat</p>
            <p className="text-sm text-muted mt-1">{t.suiteProducts.boerneskat}</p>
          </a>
        </div>
      </section></ScrollReveal>

      {/* Email capture */}
      <section className="max-w-xl mx-auto px-4 py-12">
        <EmailCapture />
      </section>

      {/* Geolocation consent modal */}
      {showGeoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowGeoModal(false)}>
          <div className="bg-bg-card rounded-xl shadow-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <p className="text-foreground font-medium">
                {language === "da" ? "Find institutioner nær dig" : "Find institutions near you"}
              </p>
            </div>
            <p className="text-sm text-muted mb-5 leading-relaxed">
              {language === "da"
                ? "Din placering behandles kun lokalt i din browser og sendes ikke til vores servere. Vi bruger den udelukkende til at vise afstand til institutioner."
                : "Your location is processed locally in your browser only and is not sent to our servers. We use it solely to show distance to institutions."}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowGeoModal(false)}
                className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-border/30 transition-colors min-h-[44px]"
              >
                {language === "da" ? "Nej tak" : "No thanks"}
              </button>
              <button
                onClick={() => { setGeoConsented(true); setShowGeoModal(false); requestGeolocation(); }}
                className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary-light transition-colors min-h-[44px]"
              >
                {language === "da" ? "Tillad placering" : "Allow location"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Geolocation error toast */}
      {geoError && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-destructive text-white px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-4">
          {geoError}
          <button onClick={() => setGeoError(null)} className="ml-3 underline">OK</button>
        </div>
      )}

      {/* Compare bar */}
      <CompareBar />
    </>
  );
}
