import { lazy, Suspense, useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { Lock } from "lucide-react";
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
import { institutionSchema, breadcrumbSchema, faqSchema } from "@/lib/schema";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import CompareBar from "@/components/compare/CompareBar";
import { SkeletonDetail } from "@/components/shared/Skeletons";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { useReviews } from "@/hooks/useReviews";
import InstitutionReport from "@/components/report/InstitutionReport";
import InstitutionSidebar from "@/components/report/InstitutionSidebar";
import ComparisonTable from "@/components/report/ComparisonTable";
import InstitutionQualitySection from "@/components/detail/InstitutionQualitySection";
import { computeScore } from "@/lib/institutionScore";
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
import { usePercentiles } from "@/hooks/usePercentiles";
import { useComparisonRows } from "@/hooks/useComparisonRows";
import { useScrollDepth } from "@/hooks/useScrollDepth";
import { useFeatureView } from "@/hooks/useFeatureView";
import { categoryPath, buildChatContext, buildInstitutionFaqs } from "@/lib/institutionPageHelpers";
import { toSlug } from "@/lib/slugs";
import ComparisonCard from "@/components/mi/ComparisonCard";
import { isInTrack } from "@/lib/mi/metrics";


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
    const ph = window.posthog;
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

  // Tilsyn data
  const tilsynReports = useMemo(() => tilsynRapporter[inst?.id ?? ""] ?? [], [inst, tilsynRapporter]);
  const hasTilsynData = tilsynReports.length > 0;
  const tilsynCount = useMemo(() => tilsynReports.filter((r) => r.followUpRequired || r.skaerpetTilsyn).length, [tilsynReports]);

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
    defs.push({ id: "section-anmeldelser", labelDA: "Anmeldelser", labelEN: "Reviews" });
    return defs;
  }, [inst, scoreResult, percentiles, hasInstitutionQuality]);

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
          ? `${inst.name} er en ${(categoryLabels[inst.category] || "").toLowerCase()} i ${inst.municipality}. ${inst.category === "efterskole" && inst.yearlyPrice ? `Årspris: ${formatDKK(inst.yearlyPrice)}.` : inst.monthlyRate ? `Månedspris: ${formatDKK(inst.monthlyRate)}.` : ""} ${inst.category === "skole" ? "Se trivsel, karaktersnit, fravær og kvalitetsvurdering." : inst.category === "efterskole" ? "Se profiler, kvalitetsdata og sammenlign med andre efterskoler." : "Se vurdering, kvalitetsdata og beregn fripladstilskud."}`
          : `${inst.name} is a ${(categoryLabels[inst.category] || "").toLowerCase()} in ${inst.municipality}. ${inst.category === "efterskole" && inst.yearlyPrice ? `Yearly price: ${formatDKK(inst.yearlyPrice)}.` : inst.monthlyRate ? `Monthly rate: ${formatDKK(inst.monthlyRate)}.` : ""} ${inst.category === "skole" ? "See well-being, grades, absence and quality assessment." : inst.category === "efterskole" ? "See profiles, quality data and compare with other boarding schools." : "See assessment, quality data and calculate subsidy."}`}
        path={`/institution/${inst.id}`}
      />

      <JsonLd data={institutionSchema(inst, "https://www.institutionsguiden.dk", reviewSummary)} />
      <JsonLd data={breadcrumbSchema([
        { name: language === "da" ? "Forside" : "Home", url: "https://www.institutionsguiden.dk/" },
        { name: categoryLabels[inst.category], url: `https://www.institutionsguiden.dk${categoryPath(inst.category)}` },
        { name: inst.municipality, url: `https://www.institutionsguiden.dk${categoryPath(inst.category)}/${toSlug(inst.municipality)}` },
        { name: inst.name, url: `https://www.institutionsguiden.dk/institution/${inst.id}` },
      ])} />

      {/* FAQ structured data for Google rich snippets */}
      {(() => {
        const faqs = buildInstitutionFaqs(inst, categoryLabels[inst.category] || inst.category, nearby, institutionStats);
        return faqs.length > 0 ? <JsonLd data={faqSchema(faqs)} /> : null;
      })()}

      <StickyHeader shrunk={shrunk} instName={inst.name} scoreResult={scoreResult} />

      <Breadcrumbs items={[
        { label: language === "da" ? "Forside" : "Home", href: "/" },
        { label: categoryLabels[inst.category], href: categoryPath(inst.category) },
        { label: `${inst.municipality}`, href: `${categoryPath(inst.category)}/${toSlug(inst.municipality)}` },
        { label: inst.name },
      ]} />

      <div className="max-w-[1020px] mx-auto px-4 space-y-2">
        <DataFreshness />
        <DataSourceBadges
          category={inst.category}
          hasPrice={inst.monthlyRate != null || (inst.category === "efterskole" && inst.yearlyPrice != null)}
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
          {/* AI-rapport (gated — premium value-add) */}
          <div ref={reportRef}>
            <GatedSection unlocked={unlocked} onRequestUnlock={openGate}>
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
            </GatedSection>
          </div>

          {/* 2-column: metrics left, sidebar right — all free */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 mt-6">
            <div className="space-y-6">
              {/* AI Chat (gated — expensive premium feature) */}
              <div ref={aiChatRef}>
                <GatedSection unlocked={unlocked} onRequestUnlock={openGate}>
                  <Suspense fallback={null}>
                    <InstitutionChat
                      institutionId={inst.id}
                      category={inst.category}
                      language={language}
                      context={buildChatContext(inst, instStats, municipalityAvgPrice, scoreResult, percentiles)}
                    />
                  </Suspense>
                </GatedSection>
              </div>

              {/* Quality data — free */}
              {percentiles && percentiles.length > 0 && inst.quality && (
                <QualityDataSection percentiles={percentiles} quality={inst.quality} language={language} t={t} />
              )}

              {/* Dagtilbud quality — free (moat: normering + staff) */}
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

              {/* Comparison table — free */}
              {comparisonRows.length > 0 && (
                <ComparisonTable
                  current={inst}
                  currentScore={scoreResult}
                  nearby={comparisonRows}
                  language={language}
                />
              )}

              {/* MIL: Direction-corrected comparison vs Kommune + Landsmedian */}
              {(isInTrack("daycare", inst) || isInTrack("school", inst)) && (
                <ComparisonCard institutionId={inst.id} />
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

          {/* CTA: unlock AI-vurdering (no longer gates moat data) */}
          {!unlocked && (
            <button
              onClick={openGate}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-light transition-colors min-h-[48px] shadow-md"
            >
              <Lock className="w-4 h-4" />
              {language === "da" ? "Få AI-vurdering + chat — gratis" : "Get AI assessment + chat — free"}
            </button>
          )}
        </section>
      )}

      {/* Efterskole details card */}
      <EfterskoleDetails inst={inst} language={language} />

      <DetailsSection
        inst={inst} nearby={nearby} municipalityAvgPrice={municipalityAvgPrice}
        normering={normering} tilsynRapporter={tilsynRapporter}
        language={language} t={t}
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
