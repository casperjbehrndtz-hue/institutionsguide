import { lazy, Suspense, useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { ChevronRight, Lock } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDKK } from "@/lib/format";
import { isInstitutionUnlocked } from "@/lib/institutionGate";
import InstitutionGateModal from "@/components/shared/InstitutionGateModal";
import GatedSection from "@/components/shared/GatedSection";
import { useGoogleRating } from "@/hooks/useGoogleRating";

const InstitutionChat = lazy(() => import("@/components/chat/InstitutionChat"));
import SEOHead from "@/components/shared/SEOHead";
import JsonLd from "@/components/shared/JsonLd";
import { institutionSchema, breadcrumbSchema } from "@/lib/schema";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import CompareBar from "@/components/compare/CompareBar";
import { SkeletonDetail } from "@/components/shared/Skeletons";
import { useReviews } from "@/hooks/useReviews";
import InstitutionReport from "@/components/report/InstitutionReport";
import InstitutionSidebar from "@/components/report/InstitutionSidebar";
import ComparisonTable from "@/components/report/ComparisonTable";
import InstitutionQualitySection from "@/components/detail/InstitutionQualitySection";
import { computeScore, type ScoreResult } from "@/lib/institutionScore";
import type { UnifiedInstitution, InstitutionStats } from "@/lib/types";
import { useAssessment } from "@/hooks/useAssessment";
import DataFreshness from "@/components/shared/DataFreshness";
import DataSourceBadges from "@/components/shared/DataSourceBadges";
import SectionNav, { type SectionDef } from "@/components/detail/SectionNav";
import HeroImage from "@/components/detail/HeroImage";
import SimilarInstitutions from "@/components/detail/SimilarInstitutions";
import CrossSellNudges from "@/components/detail/CrossSellNudges";
import EfterskoleDetails from "@/components/detail/EfterskoleDetails";
import StickyHeader from "@/components/detail/StickyHeader";
import ActionBar from "@/components/detail/ActionBar";
import DetailsSection from "@/components/detail/DetailsSection";
import QualityDataSection from "@/components/detail/QualityDataSection";
import { usePercentiles, type PercentileEntry } from "@/hooks/usePercentiles";
import { useComparisonRows } from "@/hooks/useComparisonRows";
import { useScrollDepth } from "@/hooks/useScrollDepth";
import { useFeatureView } from "@/hooks/useFeatureView";

function buildChatContext(
  inst: UnifiedInstitution, instStats: InstitutionStats | undefined, municipalityAvgPrice: number | null,
  scoreResult: ScoreResult, percentiles: PercentileEntry[] | null,
) {
  return {
    name: inst.name, category: inst.category, municipality: inst.municipality,
    monthly_rate: inst.monthlyRate ?? null, municipality_avg_price: municipalityAvgPrice,
    yearly_price: inst.yearlyPrice ?? null, ownership: inst.ownership ?? null,
    normering_ratio: instStats?.normering02 ?? instStats?.normering35 ?? null,
    normering_age_group: instStats?.normering02 != null ? "0-2" : instStats?.normering35 != null ? "3-5" : null,
    pct_paedagoger: instStats?.pctPaedagoger ?? null,
    pct_uden_paed_udd: instStats?.pctUdenPaedUdd ?? null,
    parent_satisfaction: instStats?.parentSatisfaction ?? null,
    antal_boern: instStats?.antalBoern ?? null,
    trivsel: inst.quality?.ts ?? null, trivsel_social: inst.quality?.tsi ?? null,
    karakterer: inst.quality?.k ?? null, fravaer_pct: inst.quality?.fp ?? null,
    kompetencedaekning_pct: inst.quality?.kp ?? null, klassestorrelse: inst.quality?.kv ?? null,
    undervisningseffekt: inst.quality?.sr ?? null, elever_pr_laerer: inst.quality?.epl ?? null,
    undervisningstid_pr_elev: inst.quality?.upe ?? null,
    score: scoreResult.overall, grade: scoreResult.grade,
    address: `${inst.address}, ${inst.postalCode} ${inst.city}`,
    percentile_rankings: percentiles?.map((p) => `${p.label}: ${p.value} (${p.percentile}. percentil)`) ?? [],
  };
}

function categoryPath(cat: string): string {
  const paths: Record<string, string> = {
    vuggestue: "/vuggestue", boernehave: "/boernehave", dagpleje: "/dagpleje",
    skole: "/skole", sfo: "/sfo", fritidsklub: "/fritidsklub", efterskole: "/efterskole", gymnasium: "/gymnasium",
  };
  return paths[cat] || "/";
}


export default function InstitutionPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const cameFrom = (location.state as { from?: string })?.from;
  const { institutions, normering, institutionStats, kommuneStats, schoolExtraStats, sfoStats, tilsynRapporter, nationalAverages, loading } = useData();
  const { t, language } = useLanguage();
  const { addViewed } = useRecentlyViewed();
  const { reviews } = useReviews(id || "");
  const [compareToast, setCompareToast] = useState<string | false>(false);
  const [unlocked, setUnlocked] = useState(() => isInstitutionUnlocked());
  const [gateOpen, setGateOpen] = useState(false);
  const [shrunk, setShrunk] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const openGate = useCallback(() => setGateOpen(true), []);
  const handleUnlocked = useCallback(() => {
    setUnlocked(true);
    const ph = (window as any).posthog;
    if (ph?.capture) ph.capture("gated_content_viewed", { institutionId: id });
  }, [id]);

  const reviewSummary = useMemo(() => {
    if (reviews.length === 0) return undefined;
    const sum = reviews.reduce((s, r) => s + r.rating, 0);
    return {
      averageRating: Math.round((sum / reviews.length) * 10) / 10,
      totalReviews: reviews.length,
    };
  }, [reviews]);

  // Track recently viewed
  useEffect(() => {
    if (id) addViewed(id);
  }, [id, addViewed]);

  // Sticky header on scroll past hero
  useEffect(() => {
    const h = () => setShrunk(window.scrollY > 340);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  // Track scroll depth for conversion funnel
  const scrollMeta = useMemo(() => ({ institution: id ?? "", page: "institution" }), [id]);
  useScrollDepth(scrollMeta);

  // Per-feature gated content tracking
  const featureMeta = useMemo(() => ({ institution: id ?? null }), [id]);
  const reportRef = useFeatureView("full_report", unlocked, featureMeta);
  const aiChatRef = useFeatureView("ai_chat", unlocked, featureMeta);

  useEffect(() => {
    if (!compareToast) return;
    const timer = setTimeout(() => setCompareToast(false), 2500);
    return () => clearTimeout(timer);
  }, [compareToast]);

  const categoryLabels: Record<string, string> = {
    vuggestue: t.categories.vuggestue, boernehave: t.categories.boernehave,
    dagpleje: t.categories.dagpleje, skole: t.categories.skole, sfo: t.categories.sfo,
    fritidsklub: t.categories.fritidsklub,
    efterskole: t.categories.efterskole,
    gymnasium: t.categories.gymnasium,
  };

  const inst = useMemo(
    () => institutions.find((i) => i.id === id),
    [institutions, id]
  );

  const nearby = useMemo(() => {
    if (!inst) return [];
    return institutions
      .filter((i) => i.id !== inst.id && i.category === inst.category)
      .map((i) => ({
        ...i,
        dist: Math.hypot(i.lat - inst.lat, i.lng - inst.lng) * 111,
      }))
      .filter((i) => i.dist < 5)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 6);
  }, [institutions, inst]);

  const municipalityAvgPrice = useMemo(() => {
    if (!inst) return null;
    const sameCategory = institutions.filter((i) => i.municipality === inst.municipality && i.category === inst.category && i.id !== inst.id);
    const prices = sameCategory.map((i) => i.monthlyRate).filter((p): p is number => p != null && p > 0);
    return prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
  }, [inst, institutions]);

  // Look up extended quality data for this institution
  const instStats = inst ? institutionStats[inst.id.replace(/^(vug|bh|dag|sfo)-/, "")] : undefined;
  const komStats = inst ? kommuneStats[inst.municipality] : undefined;

  const instSchoolExtra = inst ? schoolExtraStats[inst.municipality] : undefined;
  const instSfoStats = inst ? sfoStats[inst.municipality] : undefined;

  const scoreResult = useMemo(() => {
    if (!inst) return null;
    return computeScore(inst, nearby, normering, municipalityAvgPrice, instStats, institutions, institutionStats, instSchoolExtra, instSfoStats);
  }, [inst, nearby, normering, municipalityAvgPrice, instStats, institutions, institutionStats, instSchoolExtra, instSfoStats]);

  const { assessment: aiAssessment, state: aiState } = useAssessment(
    inst, scoreResult, nearby, normering, municipalityAvgPrice,
    institutions, institutionStats, nationalAverages,
  );

  // Google rating
  const googleAddr = inst ? `${inst.address}, ${inst.postalCode} ${inst.city}` : undefined;
  const { rating: googleRating } = useGoogleRating(inst?.id, inst?.name, googleAddr);

  // Determine which quality section has data
  const hasInstStats = !!(instStats && (instStats.normering02 != null || instStats.pctPaedagoger != null || instStats.parentSatisfaction != null));
  const hasKomStats = !!(komStats && (komStats.avgSygefravaerDage != null || komStats.udgiftPrBarn != null));
  const hasInstitutionQuality = hasInstStats || hasKomStats;

  const comparisonRows = useComparisonRows(inst, !!scoreResult, nearby, normering, institutions, institutionStats, schoolExtraStats, sfoStats);

  // Tilsyn: count active påbud and check if we have real data
  const hasTilsynData = useMemo(() => {
    if (!inst) return false;
    return (tilsynRapporter[inst.id] ?? []).length > 0;
  }, [inst, tilsynRapporter]);

  const tilsynCount = useMemo(() => {
    if (!inst) return 0;
    const reports = tilsynRapporter[inst.id] ?? [];
    return reports.filter((r) => r.followUpRequired || r.skaerpetTilsyn).length;
  }, [inst, tilsynRapporter]);

  const percentiles = usePercentiles(inst, institutions, t);

  // Build section nav — 3 tabs: Overblik, Data (pris+kvalitet+kort), Anmeldelser
  const sectionDefs = useMemo<SectionDef[]>(() => {
    if (!inst) return [];
    const defs: SectionDef[] = [];

    if (scoreResult) {
      defs.push({ id: "section-overblik", labelDA: "Overblik", labelEN: "Overview" });
    }
    // "Data" covers pris, kvalitet, kort — anchor to whichever comes first
    const hasPrice = inst.monthlyRate != null || inst.yearlyPrice != null;
    const hasQuality = (percentiles && percentiles.length > 0) || hasInstitutionQuality || inst.category !== "skole";
    if (hasPrice || hasQuality) {
      defs.push({ id: "section-data", labelDA: "Data", labelEN: "Data" });
    }
    if (reviews.length > 0) {
      defs.push({ id: "section-anmeldelser", labelDA: "Anmeldelser", labelEN: "Reviews" });
    }
    return defs;
  }, [inst, scoreResult, percentiles, hasInstitutionQuality, reviews.length]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <SkeletonDetail />
      </div>
    );
  }

  if (!inst) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 text-center max-w-md">
          <h1 className="font-display text-2xl font-bold mb-4">{t.errors.notFound}</h1>
          <p className="text-muted mb-4">{t.errors.notFoundMessage}</p>
          <Link to="/" className="text-primary hover:underline">{t.errors.goHome}</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title={`${inst.name} — ${categoryLabels[inst.category]} i ${inst.municipality}`}
        description={language === "da"
          ? `${inst.name} er en ${(categoryLabels[inst.category] || "").toLowerCase()} i ${inst.municipality}. ${inst.monthlyRate ? `Månedspris: ${formatDKK(inst.monthlyRate)}.` : ""} Se vurdering, kvalitetsdata og beregn fripladstilskud.`
          : `${inst.name} is a ${(categoryLabels[inst.category] || "").toLowerCase()} in ${inst.municipality}. ${inst.monthlyRate ? `Monthly rate: ${formatDKK(inst.monthlyRate)}.` : ""} See assessment, quality data and calculate subsidy.`}
        path={`/institution/${inst.id}`}
      />

      <JsonLd data={institutionSchema(inst, "https://institutionsguiden.dk", reviewSummary)} />
      <JsonLd data={breadcrumbSchema([
        { name: language === "da" ? "Forside" : "Home", url: "https://institutionsguiden.dk/" },
        { name: categoryLabels[inst.category], url: `https://institutionsguiden.dk${categoryPath(inst.category)}` },
        { name: inst.municipality, url: `https://institutionsguiden.dk/kommune/${encodeURIComponent(inst.municipality)}` },
        { name: inst.name, url: `https://institutionsguiden.dk/institution/${inst.id}` },
      ])} />

      <StickyHeader shrunk={shrunk} instName={inst.name} scoreResult={scoreResult} />

      {/* Breadcrumb */}
      <nav className="max-w-[1020px] mx-auto px-4 pt-6 text-sm text-muted" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1 flex-wrap">
          <li><Link to="/" className="hover:text-primary transition-colors">{language === "da" ? "Forside" : "Home"}</Link></li>
          <li><ChevronRight className="w-3.5 h-3.5" /></li>
          <li><Link to={categoryPath(inst.category)} className="hover:text-primary transition-colors">{categoryLabels[inst.category]}</Link></li>
          <li><ChevronRight className="w-3.5 h-3.5" /></li>
          <li><Link to={`/kommune/${encodeURIComponent(inst.municipality)}`} className="hover:text-primary transition-colors">{inst.municipality}</Link></li>
          <li><ChevronRight className="w-3.5 h-3.5" /></li>
          <li className="text-foreground font-medium truncate max-w-[200px]">{inst.name}</li>
        </ol>
      </nav>

      <div className="max-w-[1020px] mx-auto px-4 space-y-2">
        <DataFreshness />
        <DataSourceBadges
          category={inst.category}
          hasPrice={inst.monthlyRate != null}
          hasQuality={inst.quality?.r !== undefined}
          hasNormering={!!instStats?.normering02 || !!instStats?.normering35}
        />
      </div>

      <ActionBar inst={inst} cameFrom={cameFrom} categoryPath={categoryPath(inst.category)} language={language} t={t} onCompareToast={setCompareToast} />

      {/* Hero image — efterskole photo or Street View */}
      <HeroImage inst={inst} />

      {/* Section navigation */}
      <SectionNav sections={sectionDefs} />

      {/* Compare toast */}
      {compareToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-4">
          {compareToast}
        </div>
      )}

      {/* ═══════════════ REPORT + SIDEBAR (2-col) ═══════════════ */}
      {scoreResult && (
        <section id="section-overblik" className="max-w-[1020px] mx-auto px-4 pb-6" ref={heroRef}>
          <GatedSection unlocked={unlocked} onRequestUnlock={openGate}>
            {/* Hero card spans full width */}
            <div ref={reportRef}>
            <InstitutionReport
              score={scoreResult}
              institutionName={inst.name}
              category={inst.category}
              municipality={inst.municipality}
              language={language}
              aiAssessment={aiAssessment}
              aiLoading={aiState === "loading"}
              googleRating={googleRating}
            />
            </div>

            {/* 2-column: metrics left, sidebar right */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 mt-6">
              <div className="space-y-6">
                {/* AI Chat */}
                <div ref={aiChatRef}>
                <Suspense fallback={null}>
                  <InstitutionChat
                    institutionId={inst.id}
                    category={inst.category}
                    language={language}
                    context={buildChatContext(inst, instStats, municipalityAvgPrice, scoreResult, percentiles)}
                  />
                </Suspense>
                </div>

                {/* Quality data — v3 animated bar grid */}
                {percentiles && percentiles.length > 0 && inst.quality && (
                  <QualityDataSection percentiles={percentiles} quality={inst.quality} language={language} t={t} />
                )}

                {/* Dagtilbud quality — institution-level normering, staff, satisfaction */}
                {inst.category !== "skole" && hasInstitutionQuality && (
                  <div className="bg-bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                    <InstitutionQualitySection
                      stats={instStats}
                      kommuneStats={komStats}
                      municipality={inst.municipality}
                      category={inst.category}
                    />
                  </div>
                )}

                {/* Comparison table */}
                {comparisonRows.length > 0 && (
                  <ComparisonTable
                    current={inst}
                    currentScore={scoreResult}
                    nearby={comparisonRows}
                    language={language}
                  />
                )}
              </div>

              {/* Sidebar — desktop: sticky column */}
              <div className="hidden lg:block">
                <div className="sticky top-16">
                  <InstitutionSidebar
                    inst={inst}
                    language={language}
                    kommuneStats={komStats}
                    instStats={instStats}
                    tilsynCount={tilsynCount}
                    tilsynClear={hasTilsynData && tilsynCount === 0}
                    hasTilsynData={hasTilsynData}
                    googleRating={googleRating}
                  />
                </div>
              </div>
            </div>

            {/* Sidebar — mobile: stacked below content */}
            <div className="lg:hidden mt-6">
              <InstitutionSidebar
                inst={inst}
                language={language}
                kommuneStats={komStats}
                instStats={instStats}
                tilsynCount={tilsynCount}
                tilsynClear={hasTilsynData && tilsynCount === 0}
                hasTilsynData={hasTilsynData}
              />
            </div>
          </GatedSection>

          {/* Prominent CTA to unlock full profile */}
          {!unlocked && (
            <button
              onClick={openGate}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-light transition-colors min-h-[48px] shadow-md"
            >
              <Lock className="w-4 h-4" />
              {language === "da" ? "Se fuld profil — gratis" : "See full profile — free"}
            </button>
          )}
        </section>
      )}

      {/* Efterskole details card */}
      <EfterskoleDetails inst={inst} language={language} />

      <DetailsSection
        inst={inst} nearby={nearby} municipalityAvgPrice={municipalityAvgPrice}
        normering={normering} tilsynRapporter={tilsynRapporter} reviews={reviews}
        unlocked={unlocked} onRequestUnlock={openGate} language={language} t={t}
      />

      {/* Similar institutions — internal linking for SEO */}
      <SimilarInstitutions inst={inst} nearby={nearby} categoryLabels={categoryLabels} language={language} />

      {/* Cross-sell nudges — only after gate unlock */}
      {unlocked && <CrossSellNudges language={language} />}

      <CompareBar />

      {/* Gate modal */}
      <InstitutionGateModal
        institutionName={inst.name}
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        onUnlocked={handleUnlocked}
      />
    </>
  );
}
