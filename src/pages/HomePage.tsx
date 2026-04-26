import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowRight, Baby, GraduationCap, MapPin, Maximize2, Sparkles } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import InstantAnswer from "@/components/home/InstantAnswer";
import SEOHead from "@/components/shared/SEOHead";
import JsonLd from "@/components/shared/JsonLd";
import { websiteSchema, faqSchema } from "@/lib/schema";
import FAQAccordion from "@/components/shared/FAQAccordion";
import CompareBar from "@/components/compare/CompareBar";
import GeoModals from "@/components/shared/GeoModals";
import { dataVersions, formatDataDate } from "@/lib/dataVersions";
import type { UnifiedInstitution } from "@/lib/types";

const InstitutionMap = lazy(() => import("@/components/map/InstitutionMap"));
const KommuneQualityMap = lazy(() => import("@/components/home/KommuneQualityMap"));
import MapSkeleton from "@/components/shared/MapSkeleton";

type MapMode = "institutions" | "kommune-quality";
type QualityTrack = "daycare" | "school";


const FAQ: { q: string; a: string }[] = [
  {
    q: "Hvordan ved jeg om en institution er god?",
    a: "Vi samler officielle data fra Børne- og Undervisningsministeriet, Danmarks Statistik og Den Nationale Trivselsmåling og viser hvordan hver institution rangerer nationalt. For dagtilbud er de vigtigste mål normering (børn pr. voksen), andel uddannede pædagoger og forældretilfredshed. For skoler er det trivsel, karaktergennemsnit, undervisningseffekt (socioøkonomisk løft) og kompetencedækning.",
  },
  {
    q: "Er data pålidelige og opdaterede?",
    a: `Alle tal kommer fra officielle danske kilder og opdateres automatisk når nye datasæt frigives. Senest opdateret ${formatDataDate(dataVersions.overall.lastUpdated, "da")}.`,
  },
  {
    q: "Hvad koster det at bruge Institutionsguiden?",
    a: "Gratis. Vi får ingen penge fra institutioner eller kommuner, og vi sælger ikke dine data. Uafhængighed er hele pointen — ellers kunne du ikke stole på rangeringerne.",
  },
  {
    q: "Kan jeg sammenligne flere institutioner?",
    a: "Ja. Klik 'Sammenlign' på et institution-kort for at tilføje til sammenligningskurven nederst i skærmen — så kan du vælge op til 4 institutioner og se dem side om side. Vil du sammenligne hele kommuner, så brug Kommune-intelligens.",
  },
  {
    q: "Hvorfor er normering så vigtig for dagtilbud?",
    a: "Normeringen (antal børn pr. voksen) er det mest robuste kvalitetsmål for dagtilbud, fordi den direkte styrer hvor meget voksenkontakt hvert barn får. Børne- og Undervisningsministeriet har fastsat minimumsnormering på 3 børn pr. voksen i vuggestuer og 6 børn pr. voksen i børnehaver, men mange kommuner ligger bedre end det.",
  },
  {
    q: "Hvad er forskellen på folkeskole og privatskole i rangeringen?",
    a: "Begge indgår i samme spor fordi forældre reelt vælger mellem dem. På institutionssiden kan du se skoletype. Vær opmærksom på at privatskoler selv udvælger elever, hvilket kan påvirke trivsels- og karaktermål.",
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { institutions, loading, error } = useData();
  const { language } = useLanguage();
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>("institutions");
  const [qualityTrack, setQualityTrack] = useState<QualityTrack>("school");
  // Filter applied to the institution map after a location is selected
  const [mapFilter, setMapFilter] = useState<{ kommune: string; postnummer?: string; category: string } | null>(null);

  const geo = useGeolocation(useCallback((loc) => {
    setFlyTo({ ...loc, zoom: 13 });
  }, []));

  const institutionCount = institutions.length;

  const handleMapSelect = useCallback((inst: UnifiedInstitution) => {
    navigate(`/institution/${inst.id}`, { state: { from: location.pathname + location.search } });
  }, [navigate, location]);

  const handleLocationSelected = useCallback((kommune: string, postnummer: string | undefined, intent: "user" | "auto", cat: string) => {
    // Center map. Filter to selected location + category so the map context
    // matches the result list above.
    let instsInScope = institutions.filter((i) => i.category === cat);
    if (postnummer) {
      instsInScope = instsInScope.filter((i) => i.postalCode === postnummer);
      // Fallback to kommune if postnummer has 0 institutions in this category
      if (instsInScope.length === 0) instsInScope = institutions.filter((i) => i.municipality === kommune && i.category === cat);
    } else {
      instsInScope = instsInScope.filter((i) => i.municipality === kommune);
    }
    if (instsInScope.length === 0) instsInScope = institutions.filter((i) => i.municipality === kommune);
    if (instsInScope.length === 0) return;

    const avgLat = instsInScope.reduce((s, i) => s + i.lat, 0) / instsInScope.length;
    const avgLng = instsInScope.reduce((s, i) => s + i.lng, 0) / instsInScope.length;
    setFlyTo({ lat: avgLat, lng: avgLng, zoom: postnummer ? 13 : 11 });
    setMapFilter({ kommune, postnummer, category: cat });

    // Smooth-scroll only on explicit user intent, never on URL hydration or
    // welcome-back. requestAnimationFrame defers until the results panel
    // has rendered.
    if (intent === "user") {
      requestAnimationFrame(() => {
        const el = document.getElementById("homepage-map");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [institutions]);

  // Filter institutions for map when a search location is active
  const mapInstitutions = useMemo(() => {
    if (!mapFilter) return institutions;
    return institutions.filter((i) => {
      if (mapFilter.category && i.category !== mapFilter.category) return false;
      if (mapFilter.postnummer) return i.postalCode === mapFilter.postnummer;
      return i.municipality === mapFilter.kommune;
    });
  }, [institutions, mapFilter]);

  const mapProps = useMemo(() => ({
    institutions: mapInstitutions,
    onSelect: handleMapSelect,
    flyTo,
    highlightedId: hoveredId,
    onMarkerHover: setHoveredId,
    isFullscreen: mapFullscreen,
    onToggleFullscreen: () => setMapFullscreen((f) => !f),
    radiusCenter: geo.userLocation,
  }), [mapInstitutions, handleMapSelect, flyTo, hoveredId, mapFullscreen, geo.userLocation]);

  return (
    <>
      <SEOHead
        title="Institutionsguiden — Find den bedste skole, børnehave eller vuggestue i Danmark"
        description="Se top-rangerede folkeskoler, vuggestuer, børnehaver og dagplejere i dit område. Uafhængig kvalitetsdata fra Undervisningsministeriet og Danmarks Statistik. Gratis."
        path="/"
      />
      <JsonLd data={websiteSchema("https://www.institutionsguiden.dk")} />
      <JsonLd data={faqSchema(FAQ)} />

      <main>

      {/* 1. Hero — Instant Answer Engine with video backdrop */}
      <InstantAnswer onLocationSelected={handleLocationSelected} geo={geo} />

      {/* 2. Trust bar — collapsible on mobile so per-source dates are accessible without hover */}
      <section className="border-b border-border/70 bg-bg">
        <details className="max-w-5xl mx-auto px-4 py-3 group">
          <summary className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[13px] cursor-pointer list-none">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted/70">Officiel data fra</span>
            <span className="text-foreground/75">Børne- og Undervisningsministeriet</span>
            <span className="hidden sm:inline text-muted/30" aria-hidden="true">·</span>
            <span className="text-foreground/75">Danmarks Statistik</span>
            <span className="hidden sm:inline text-muted/30" aria-hidden="true">·</span>
            <span className="text-foreground/75">Den Nationale Trivselsmåling</span>
            <span className="hidden md:inline text-muted/30" aria-hidden="true">·</span>
            <span className="hidden md:inline text-foreground/75">Kommunale tilsynsrapporter</span>
            <span className="text-muted/30" aria-hidden="true">·</span>
            <span className="text-muted">Opdateret {formatDataDate(dataVersions.overall.lastUpdated, language === "da" ? "da" : "en")}</span>
            <span className="text-[11px] text-primary font-medium ml-1 group-open:hidden">vis kilder</span>
            <span className="text-[11px] text-primary font-medium ml-1 hidden group-open:inline">skjul kilder</span>
          </summary>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] text-muted">
            <div>
              <strong className="text-foreground/90 font-semibold">Børne- og Undervisningsministeriet</strong> · skolekvalitet (FP9 + trivsel), skoleår {dataVersions.schoolQuality.schoolYear} — opdateret {formatDataDate(dataVersions.schoolQuality.lastUpdated, "da")}
            </div>
            <div>
              <strong className="text-foreground/90 font-semibold">Danmarks Statistik</strong> · priser og takster {dataVersions.prices.year} — opdateret {formatDataDate(dataVersions.prices.lastUpdated, "da")}
            </div>
            <div>
              <strong className="text-foreground/90 font-semibold">Den Nationale Trivselsmåling</strong> · trivsel skoleår {dataVersions.schoolQuality.schoolYear}
            </div>
            <div>
              <strong className="text-foreground/90 font-semibold">Kommunale tilsynsrapporter</strong> · normering — opdateret {formatDataDate(dataVersions.normering.lastUpdated, "da")}
            </div>
          </div>
        </details>
      </section>

      {/* 3. Map — the core visual feature, always visible */}
      <section id="homepage-map" aria-label="Udforsk institutioner på kort" className="border-b border-border/70">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-4 py-8 sm:py-12">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground tracking-tight">
                {mapMode === "kommune-quality"
                  ? "Se Danmarks kommuner farvet efter kvalitet"
                  : mapFilter
                    ? `Kort over ${mapFilter.category} ${mapFilter.postnummer ? `i ${mapFilter.postnummer}` : `i ${mapFilter.kommune}`}`
                    : "Udforsk alle institutioner på kort"}
              </h2>
              <p className="text-muted text-sm mt-1 max-w-2xl">
                {mapMode === "kommune-quality" ? (
                  <>Hver kommune har én cirkel — farve viser samlet kvalitet i det valgte spor, størrelse viser antal institutioner. Klik eller tryk for at se kommunen.</>
                ) : mapFilter ? (
                  <><span className="font-mono tabular-nums text-foreground font-semibold">{mapInstitutions.length.toLocaleString("da-DK")}</span> {mapFilter.category} vist på kortet. <button onClick={() => setMapFilter(null)} className="text-primary hover:underline font-medium">Vis hele Danmark →</button></>
                ) : (
                  <><span className="font-mono tabular-nums text-foreground font-semibold">{institutionCount.toLocaleString("da-DK")}</span> institutioner i hele Danmark. Klik en markør for at se institutionen.</>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={geo.handleNearMe}
                disabled={geo.nearMeLoading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-bg-card text-sm font-medium text-foreground hover:bg-primary/5 transition-colors min-h-[40px] disabled:opacity-50"
              >
                <MapPin className="w-4 h-4" />
                {geo.nearMeLoading ? "Henter…" : "Find i nærheden"}
              </button>
              <button
                onClick={() => setMapFullscreen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-bg-card text-sm font-medium text-foreground hover:bg-primary/5 transition-colors min-h-[40px]"
              >
                <Maximize2 className="w-4 h-4" />
                Fuldskærm
              </button>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div role="tablist" aria-label="Kort-visning" className="inline-flex p-1 rounded-lg bg-bg-card border border-border">
              <button
                role="tab"
                aria-selected={mapMode === "institutions"}
                onClick={() => setMapMode("institutions")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors min-h-[36px] ${
                  mapMode === "institutions" ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                Alle institutioner
              </button>
              <button
                role="tab"
                aria-selected={mapMode === "kommune-quality"}
                onClick={() => setMapMode("kommune-quality")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors min-h-[36px] ${
                  mapMode === "kommune-quality" ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                Kort efter kvalitet
              </button>
            </div>
            {mapMode === "kommune-quality" && (
              <div role="tablist" aria-label="Vælg spor" className="inline-flex p-1 rounded-lg bg-bg-card border border-border">
                <button
                  role="tab"
                  aria-selected={qualityTrack === "school"}
                  onClick={() => setQualityTrack("school")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors min-h-[32px] ${
                    qualityTrack === "school" ? "bg-foreground/10 text-foreground" : "text-muted hover:text-foreground"
                  }`}
                >
                  Folkeskole
                </button>
                <button
                  role="tab"
                  aria-selected={qualityTrack === "daycare"}
                  onClick={() => setQualityTrack("daycare")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors min-h-[32px] ${
                    qualityTrack === "daycare" ? "bg-foreground/10 text-foreground" : "text-muted hover:text-foreground"
                  }`}
                >
                  Dagtilbud
                </button>
              </div>
            )}
            {mapMode === "kommune-quality" && (
              <div className="flex items-center gap-2 ml-auto text-[11px] text-muted flex-wrap">
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-600" />Top 10%</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500" />Top 25%</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-primary" />Over middel</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500" />Under middel</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-600" />Bund 25%</span>
              </div>
            )}
          </div>

          <div className="h-[320px] sm:h-[520px] lg:h-[600px] rounded-2xl overflow-hidden border border-border shadow-sm">
            <Suspense fallback={<MapSkeleton />}>
              {mapMode === "institutions"
                ? <InstitutionMap {...mapProps} />
                : <KommuneQualityMap track={qualityTrack} flyTo={flyTo} isFullscreen={mapFullscreen} onToggleFullscreen={() => setMapFullscreen((f) => !f)} />}
            </Suspense>
          </div>

          {mapFullscreen && (
            <div className="fixed inset-0 z-50">
              <Suspense fallback={<MapSkeleton />}>
                {mapMode === "institutions"
                  ? <InstitutionMap {...mapProps} isFullscreen />
                  : <KommuneQualityMap track={qualityTrack} flyTo={flyTo} isFullscreen onToggleFullscreen={() => setMapFullscreen(false)} />}
              </Suspense>
            </div>
          )}
        </div>
      </section>

      {/* 4. Kommune-intelligens preview */}
      <section className="border-b border-border/70">
        <div className="max-w-5xl mx-auto px-4 py-14 sm:py-20">
          <div className="flex items-start gap-3 mb-6 max-w-2xl">
            <Sparkles className="w-5 h-5 text-primary mt-1.5 shrink-0" />
            <div>
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground tracking-tight mb-2">
                Er jeres kommune bedst?
              </h2>
              <p className="text-muted text-base leading-relaxed">
                Et volumen-vægtet kvalitetsindeks for alle 98 kommuner. Vælg om
                du vil vægte normering, trivsel, karakter eller pris — og se
                leaderboardet opdatere sig øjeblikkeligt.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Card 1: Open the leaderboard */}
            <Link
              to="/kommune-intelligens"
              className="lg:col-span-2 group flex flex-col justify-between p-6 sm:p-8 rounded-2xl border border-border hover:border-primary/50 bg-bg-card hover:bg-primary/5 transition-colors min-h-[200px]"
            >
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="font-display text-xl sm:text-2xl font-semibold text-foreground">Åbn rangeringen</h3>
                </div>
                <p className="text-sm text-muted leading-relaxed max-w-prose">
                  Justér selv hvor meget normering, trivsel, karakter og pris skal tælle —
                  leaderboardet over alle 98 kommuner genberegnes med det samme.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  <GraduationCap className="w-3.5 h-3.5" /> Folkeskole
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  <Baby className="w-3.5 h-3.5" /> Dagtilbud
                </span>
                <span className="ml-auto inline-flex items-center gap-1 text-sm text-primary font-semibold">
                  Åbn værktøj <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>

            {/* Card 2: Side-by-side compare */}
            <Link
              to="/kommune-intelligens/sammenlign"
              className="group flex flex-col justify-between p-6 sm:p-8 rounded-2xl border border-border hover:border-primary/50 bg-bg-card hover:bg-primary/5 transition-colors min-h-[200px]"
            >
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="font-display text-xl sm:text-2xl font-semibold text-foreground">Side om side</h3>
                </div>
                <p className="text-sm text-muted leading-relaxed">
                  Pin 2-3 kommuner og se dem i kolonner med "avisoverskrifter" — hvem vinder hvilken metrik.
                </p>
              </div>
              <span className="mt-5 inline-flex items-center gap-1 text-sm text-primary font-semibold">
                Sammenlign <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>
        </div>
      </section>


      {/* 6. FAQ */}
      <section aria-label="Ofte stillede spørgsmål" className="border-b border-border/70">
        <div className="max-w-3xl mx-auto px-4 py-14 sm:py-20">
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground tracking-tight mb-6">
            Ofte stillede spørgsmål
          </h2>
          <FAQAccordion items={FAQ} />
        </div>
      </section>

      </main>

      {/* Geolocation consent — only via explicit "Find i nærheden" click */}
      <GeoModals
        showGeoModal={geo.showGeoModal}
        geoError={geo.geoError}
        onAccept={geo.acceptConsent}
        onDismiss={geo.dismissModal}
        onDismissError={geo.dismissError}
        onRetry={geo.retryGeolocation}
      />

      <CompareBar />

      {loading && <div className="sr-only" aria-live="polite">Indlæser data…</div>}
      {error && (
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="card p-4 text-sm text-muted">Data kunne ikke indlæses fuldt ud — prøv at genopfriske siden.</div>
        </div>
      )}
    </>
  );
}
