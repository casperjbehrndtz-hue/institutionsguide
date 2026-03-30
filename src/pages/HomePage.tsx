import { lazy, Suspense, useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Building2, GraduationCap, Users, Home, BookOpen, HelpCircle, Calculator, PiggyBank, Wallet, Search, MapPin, SlidersHorizontal, Loader2, ArrowRight, BarChart3, X, Gamepad2, School } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFilteredInstitutions } from "@/hooks/useFilteredInstitutions";
import { useFilterParams } from "@/hooks/useFilterParams";
import { useMapParams } from "@/hooks/useMapParams";
import { useGeolocation } from "@/hooks/useGeolocation";
import { GeoModal, GeoErrorToast } from "@/components/shared/GeoUI";
import { dataVersions } from "@/lib/dataVersions";
import ScrollReveal from "@/components/shared/ScrollReveal";
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
import InstitutionListCard from "@/components/shared/InstitutionListCard";
import { toSlug } from "@/lib/slugs";
import type { UnifiedInstitution } from "@/lib/types";
import { haversineKm } from "@/lib/geo";

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
    a: `Priserne er baseret på data fra Danmarks Statistik (${dataVersions.prices.year}-tal) og Dagtilbudsregisteret. Kommunerne regulerer typisk taksterne årligt, så der kan forekomme mindre afvigelser.`,
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
    a: `Prices are based on data from Statistics Denmark (${dataVersions.prices.year} figures) and the Daycare Registry. Municipalities typically adjust rates annually, so minor deviations may occur.`,
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

  const geo = useGeolocation(useCallback((loc) => {
    setFlyTo({ ...loc, zoom: 13 });
    setRadiusKm(5);
  }, []));

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
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
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

  const CATEGORY_CARDS = [
    { category: "vuggestue" as const, label: t.categories.vuggestue, icon: Home, iconColor: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30", href: "/vuggestue", desc: t.ageGroups.vuggestue, cta: language === "da" ? "Se priser" : "See prices" },
    { category: "boernehave" as const, label: t.categories.boernehave, icon: Building2, iconColor: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30", href: "/boernehave", desc: t.ageGroups.boernehave, cta: language === "da" ? "Se priser" : "See prices" },
    { category: "dagpleje" as const, label: t.categories.dagpleje, icon: Users, iconColor: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30", href: "/dagpleje", desc: t.ageGroups.dagpleje, cta: language === "da" ? "Sammenlign" : "Compare" },
    { category: "skole" as const, label: t.categories.skole, icon: GraduationCap, iconColor: "text-indigo-600", bgColor: "bg-indigo-100 dark:bg-indigo-900/30", href: "/skole", desc: t.ageGroups.skole, cta: language === "da" ? "Se kvalitetsdata" : "See quality data" },
    { category: "sfo" as const, label: t.categories.sfo, icon: BookOpen, iconColor: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30", href: "/sfo", desc: t.ageGroups.sfo, cta: language === "da" ? "Se priser" : "See prices" },
    { category: "fritidsklub" as const, label: t.categories.fritidsklub, icon: Gamepad2, iconColor: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30", href: "/fritidsklub", desc: t.ageGroups.fritidsklub, cta: language === "da" ? "Se alle" : "See all" },
    { category: "efterskole" as const, label: t.categories.efterskole, icon: School, iconColor: "text-pink-600", bgColor: "bg-pink-100 dark:bg-pink-900/30", href: "/efterskole", desc: t.ageGroups.efterskole, cta: language === "da" ? "Se priser og profiler" : "See prices & profiles" },
  ];

  const FAQ_ITEMS = language === "en" ? FAQ_ITEMS_EN : FAQ_ITEMS_DA;

  // Show filter bar + list/map when user has actively filtered
  const hasActiveFilter = !!(searchInput || municipality || geo.userLocation || category !== "alle");

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

    // Cheapest municipalities for vuggestue
    const vugByMun = new Map<string, number>();
    for (const inst of institutions) {
      if (inst.category === "vuggestue" && inst.monthlyRate && inst.monthlyRate > 0) {
        const existing = vugByMun.get(inst.municipality);
        if (!existing || inst.monthlyRate < existing) {
          vugByMun.set(inst.municipality, inst.monthlyRate);
        }
      }
    }
    const cheapestVug = [...vugByMun.entries()]
      .sort((a, b) => a[1] - b[1])
      .slice(0, 4)
      .map(([kommune, pris]) => ({ kommune, pris }));

    // Best schools by grade average
    const bestSchools = institutions
      .filter((i) => i.category === "skole" && i.quality?.k != null && i.quality.k > 0)
      .sort((a, b) => (b.quality!.k! - a.quality!.k!))
      .slice(0, 4)
      .map((s) => ({ navn: s.name, score: s.quality!.k! }));

    return { cheapestVug, bestSchools };
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
            poster="/og-image.png"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          >
            <source src={heroVideo} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-primary/50" />
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

          {/* Near me — text link, not button */}
          <button
            onClick={geo.handleNearMe}
            disabled={geo.nearMeLoading}
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors disabled:opacity-60"
          >
            {geo.nearMeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
            {language === "da" ? "Find tæt på mig" : "Find near me"}
          </button>

          {/* Data dimensions — what you can compare */}
          <p className="text-[12px] sm:text-[13px] text-white/60 mt-5 font-medium tracking-wide">
            {language === "da"
              ? "Trivsel · Karakterer · Normering · Priser · Fravær · Kompetencedækning"
              : "Well-being · Grades · Staff ratios · Prices · Absence · Competence"}
          </p>
        </div>
      </section>

      {/* Category cards — data preview grid */}
      <section className="max-w-5xl mx-auto px-3 sm:px-4 -mt-5 relative z-20 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {CATEGORY_CARDS.map((card) => {
            const stats = categoryStats[card.category];
            const count = stats?.count ?? 0;
            const minPrice = stats?.minPrice;
            return (
              <Link
                key={card.category}
                to={card.href}
                className="group rounded-xl bg-[var(--color-bg-card)] border border-border/50 shadow-sm px-3 py-3 sm:px-4 sm:py-4 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all"
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
                  {card.category === "efterskole" && stats?.minYearlyPrice ? (
                    <p className="font-mono text-foreground font-medium">{language === "da" ? "fra" : "from"} {formatDKK(stats.minYearlyPrice)}{language === "da" ? "/år" : "/year"}</p>
                  ) : minPrice ? (
                    <p className="font-mono text-foreground font-medium">{language === "da" ? "fra" : "from"} {formatDKK(minPrice)}{t.common.perMonth}</p>
                  ) : card.category === "skole" ? (
                    <p className="text-muted">{language === "da" ? "Trivsel · Karakterer · Fravær" : "Well-being · Grades · Absence"}</p>
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
            resultCount={filtered.length}
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
          </Suspense>
        </div>
      </section>

      </>}


      {/* Populære søgninger — dynamic data cards */}
      {popularData && (
        <ScrollReveal><section className="max-w-4xl mx-auto px-4 py-8 sm:py-10">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-1 text-center">
            {language === "da" ? "Populære søgninger" : "Popular searches"}
          </h2>
          <p className="text-muted text-sm text-center mb-5">
            {language === "da" ? "Baseret på officielle data" : "Based on official data"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Billigste vuggestuer */}
            <Link to={`/billigste-vuggestue/${toSlug("København")}`} className="card p-4 sm:p-5 hover:border-primary/30 transition-all group">
              <h3 className="font-semibold text-foreground text-sm mb-3">{language === "da" ? "Billigste vuggestuer" : "Cheapest nurseries"}</h3>
              <div className="space-y-1.5">
                {popularData.cheapestVug.map((item) => (
                  <div key={item.kommune} className="flex justify-between text-xs">
                    <span className="text-muted">{item.kommune}</span>
                    <span className="font-mono font-medium text-foreground">{formatDKK(item.pris)}{t.common.perMonth}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-primary font-medium mt-3 flex items-center gap-0.5">
                {language === "da" ? "Se alle kommuner" : "See all municipalities"} <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>

            {/* Bedste skoler */}
            <Link to={`/bedste-skole/${toSlug("København")}`} className="card p-4 sm:p-5 hover:border-primary/30 transition-all group">
              <h3 className="font-semibold text-foreground text-sm mb-3">{language === "da" ? "Højeste karaktersnit" : "Highest grade average"}</h3>
              <div className="space-y-1.5">
                {popularData.bestSchools.map((item) => (
                  <div key={item.navn} className="flex justify-between text-xs">
                    <span className="text-muted truncate mr-2">{item.navn}</span>
                    <span className="font-mono font-medium text-foreground shrink-0">{item.score.toFixed(1).replace(".", ",")}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-primary font-medium mt-3 flex items-center gap-0.5">
                {language === "da" ? "Se alle skoler" : "See all schools"} <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>

            {/* Normering */}
            <Link to="/normering" className="card p-4 sm:p-5 hover:border-primary/30 transition-all group">
              <h3 className="font-semibold text-foreground text-sm mb-1">{language === "da" ? "Børn pr. voksen" : "Children per adult"}</h3>
              <p className="text-xs text-muted mb-3">{language === "da" ? "Sammenlign normering i alle kommuner" : "Compare staff ratios in all municipalities"}</p>
              <p className="text-[11px] text-primary font-medium flex items-center gap-0.5">
                {language === "da" ? "Se normering" : "See ratios"} <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>

            {/* Prissammenligning */}
            <Link to="/prissammenligning" className="card p-4 sm:p-5 hover:border-primary/30 transition-all group">
              <h3 className="font-semibold text-foreground text-sm mb-1">{language === "da" ? "Prissammenligning" : "Price comparison"}</h3>
              <p className="text-xs text-muted mb-3">{language === "da" ? "Sammenlign takster på tværs af alle 98 kommuner" : "Compare rates across all 98 municipalities"}</p>
              <p className="text-[11px] text-primary font-medium flex items-center gap-0.5">
                {language === "da" ? "Sammenlign priser" : "Compare prices"} <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>
          </div>
        </section></ScrollReveal>
      )}

      {/* Use cases — what parents can do */}
      <ScrollReveal><section className="max-w-4xl mx-auto px-4 py-8 sm:py-10">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-5 text-center">
          {language === "da" ? "Sådan bruger forældre Institutionsguide" : "How parents use Institutionsguide"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Link to="/prissammenligning" className="card p-5 hover:bg-primary/5 transition-colors group">
            <h3 className="font-semibold text-foreground text-sm mb-1">{language === "da" ? "Sammenlign priser" : "Compare prices"}</h3>
            <p className="text-xs text-muted mb-3">{language === "da" ? "Find den billigste vuggestue eller børnehave i din kommune" : "Find the cheapest nursery or kindergarten in your municipality"}</p>
            <span className="text-[11px] text-primary font-medium">{language === "da" ? "Prøv prissammenligning" : "Try price comparison"} →</span>
          </Link>
          <Link to="/skole" className="card p-5 hover:bg-primary/5 transition-colors group">
            <h3 className="font-semibold text-foreground text-sm mb-1">{language === "da" ? "Se kvalitetsdata for skoler" : "See school quality data"}</h3>
            <p className="text-xs text-muted mb-3">{language === "da" ? `Trivsel, karakterer, fravær og normering for alle ${categoryStats.skole?.count.toLocaleString("da-DK") ?? ""} skoler` : `Well-being, grades, absence and ratios for all ${categoryStats.skole?.count.toLocaleString("da-DK") ?? ""} schools`}</p>
            <span className="text-[11px] text-primary font-medium">{language === "da" ? "Se skoledata" : "See school data"} →</span>
          </Link>
          <Link to="/friplads" className="card p-5 hover:bg-primary/5 transition-colors group">
            <h3 className="font-semibold text-foreground text-sm mb-1">{language === "da" ? "Beregn fripladstilskud" : "Calculate subsidy"}</h3>
            <p className="text-xs text-muted mb-3">{language === "da" ? "Tjek om du har ret til tilskud baseret på din husstandsindkomst" : "Check if you qualify for a subsidy based on household income"}</p>
            <span className="text-[11px] text-primary font-medium">{language === "da" ? "Beregn nu" : "Calculate now"} →</span>
          </Link>
        </div>
      </section></ScrollReveal>

      {/* Cross-sell: Suite products */}
      <ScrollReveal><section className="max-w-4xl mx-auto px-4 py-8 sm:py-10">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-1 text-center">
          {t.home.moreTools}
        </h2>
        <p className="text-muted text-sm text-center mb-5">
          {t.home.moreToolsSubtitle}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a
            href="https://nemtbudget.nu"
            target="_blank"
            rel="noopener noreferrer"
            className="card p-5 transition-transform group"
          >
            <Wallet className="w-8 h-8 text-blue-500 mb-3" />
            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">NemtBudget</p>
            <p className="text-sm text-muted mt-1">{t.suiteProducts.nemtbudget}</p>
          </a>
          <a
            href="https://parfinans.dk"
            target="_blank"
            rel="noopener noreferrer"
            className="card p-5 transition-transform group"
          >
            <Calculator className="w-8 h-8 text-amber-600 mb-3" />
            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">ParFinans</p>
            <p className="text-sm text-muted mt-1">{t.suiteProducts.parfinans}</p>
          </a>
          <a
            href="https://boerneskat.dk"
            target="_blank"
            rel="noopener noreferrer"
            className="card p-5 transition-transform group"
          >
            <PiggyBank className="w-8 h-8 text-success mb-3" />
            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">Børneskat</p>
            <p className="text-sm text-muted mt-1">{t.suiteProducts.boerneskat}</p>
          </a>
        </div>
      </section></ScrollReveal>

      {/* FAQ — moved down */}
      <ScrollReveal><section className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          {t.home.faq}
        </h2>
        <div className="space-y-4">
          {FAQ_ITEMS.map((faq) => (
            <details key={faq.q} className="card card-static p-4 group">
              <summary className="font-semibold text-foreground cursor-pointer list-none flex justify-between items-center min-h-[44px]">
                {faq.q}
                <span className="text-muted group-open:rotate-180 transition-transform ml-2 shrink-0">&#x25BC;</span>
              </summary>
              <p className="text-muted text-sm mt-3 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section></ScrollReveal>

      {/* Populære sider / SEO links */}
      <section className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { label: language === "da" ? "Billigste vuggestue i København" : "Cheapest nursery in Copenhagen", to: `/billigste-vuggestue/${toSlug("København")}` },
            { label: language === "da" ? "Billigste vuggestue i Aarhus" : "Cheapest nursery in Aarhus", to: `/billigste-vuggestue/${toSlug("Aarhus")}` },
            { label: language === "da" ? "Bedste skoler i København" : "Best schools in Copenhagen", to: `/bedste-skole/${toSlug("København")}` },
            { label: language === "da" ? "Bedste skoler i Aarhus" : "Best schools in Aarhus", to: `/bedste-skole/${toSlug("Aarhus")}` },
            { label: language === "da" ? "Bedste skoler i Odense" : "Best schools in Odense", to: `/bedste-skole/${toSlug("Odense")}` },
            { label: language === "da" ? "Normering i hele Danmark" : "Staff ratios in Denmark", to: "/normering" },
            { label: language === "da" ? "Beregn samlet udgift 0-14 år" : "Calculate total cost 0-14 years", to: "/samlet-pris" },
            { label: language === "da" ? "Vuggestue vs dagpleje" : "Nursery vs childminder", to: `/sammenlign/vuggestue-vs-dagpleje/${toSlug("København")}` },
          ].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="card px-4 py-2 text-sm text-primary hover:bg-primary/5 transition-colors min-h-[44px] flex items-center"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>

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
