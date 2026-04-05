import { lazy, Suspense, useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ChevronRight, Heart, GitCompareArrows, Lock, ExternalLink } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDKK } from "@/lib/format";
import PriceAlertSignup from "@/components/alerts/PriceAlertSignup";
import FripladsCalculator from "@/components/detail/FripladsCalculator";
import { dataVersions } from "@/lib/dataVersions";
import { isInstitutionUnlocked } from "@/lib/institutionGate";
import InstitutionGateModal from "@/components/shared/InstitutionGateModal";
import GatedSection from "@/components/shared/GatedSection";
import { useGoogleRating } from "@/hooks/useGoogleRating";

const InstitutionChat = lazy(() => import("@/components/chat/InstitutionChat"));
const NormeringBadge = lazy(() => import("@/components/charts/NormeringBadge"));
const PriceHistoryChart = lazy(() => import("@/components/charts/PriceHistoryChart"));
const InstitutionMap = lazy(() => import("@/components/map/InstitutionMap"));
import SEOHead from "@/components/shared/SEOHead";
import JsonLd from "@/components/shared/JsonLd";
import { institutionSchema, breadcrumbSchema } from "@/lib/schema";
import ShareButton from "@/components/shared/ShareButton";
import { useFavorites } from "@/hooks/useFavorites";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useCompare } from "@/contexts/CompareContext";
import CompareBar from "@/components/compare/CompareBar";
import ReviewSummaryV2 from "@/components/reviews/ReviewSummaryV2";
import { SkeletonDetail } from "@/components/shared/Skeletons";
import ReviewListV2 from "@/components/reviews/ReviewListV2";
import ReviewFormV2 from "@/components/reviews/ReviewFormV2";
import { useReviews } from "@/hooks/useReviews";
import { useReviewAnalysis } from "@/hooks/useReviewAnalysis";
import ReviewThemes from "@/components/reviews/ReviewThemes";
import TilsynRapportSection from "@/components/tilsyn/TilsynRapportSection";
import InstitutionReport from "@/components/report/InstitutionReport";
import InstitutionSidebar from "@/components/report/InstitutionSidebar";
import ComparisonTable from "@/components/report/ComparisonTable";
import InstitutionQualitySection from "@/components/detail/InstitutionQualitySection";
import ArbejdstilsynSection from "@/components/detail/ArbejdstilsynSection";
import { computeScore } from "@/lib/institutionScore";
import { useAssessment } from "@/hooks/useAssessment";
import StreetViewImage from "@/components/shared/StreetViewImage";
import DataFreshness from "@/components/shared/DataFreshness";
import DataSourceBadges from "@/components/shared/DataSourceBadges";
import SectionNav, { type SectionDef } from "@/components/detail/SectionNav";

function categoryPath(cat: string): string {
  const paths: Record<string, string> = {
    vuggestue: "/vuggestue", boernehave: "/boernehave", dagpleje: "/dagpleje",
    skole: "/skole", sfo: "/sfo", fritidsklub: "/fritidsklub", efterskole: "/efterskole", gymnasium: "/gymnasium",
  };
  return paths[cat] || "/";
}

function HeroImage({ inst }: { inst: { imageUrl?: string; lat: number; lng: number; name: string } }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showExternal = inst.imageUrl && !imgFailed;
  return (
    <div className="max-w-[1020px] mx-auto px-4 pb-4">
      {showExternal ? (
        <img
          src={inst.imageUrl}
          alt={inst.name}
          className="w-full h-[200px] sm:h-[260px] rounded-xl object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <StreetViewImage
          lat={inst.lat}
          lng={inst.lng}
          alt={inst.name}
          className="w-full h-[200px] sm:h-[260px] rounded-xl"
        />
      )}
    </div>
  );
}

function QualityMetricRow({ label, percentile, value, delay = 0, lang = "da" }: {
  label: string;
  percentile: number;
  value: string;
  delay?: number;
  lang?: string;
}) {
  const [barWidth, setBarWidth] = useState(0);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setTimeout(() => setBarWidth(percentile), delay);
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [percentile, delay]);

  const color = percentile >= 75 ? "#0d7c5f" : percentile >= 40 ? "#b8860b" : "#c0392b";
  const bg = percentile >= 75 ? "rgba(13,124,95,0.07)" : percentile >= 40 ? "rgba(184,134,11,0.07)" : "rgba(192,57,43,0.07)";

  const rankLabel = percentile >= 90
    ? "Top 10%"
    : percentile >= 75
    ? "Top 25%"
    : percentile >= 60
    ? (lang === "da" ? "Over middel" : "Above avg")
    : percentile >= 40
    ? (lang === "da" ? "Middel" : "Average")
    : percentile >= 25
    ? (lang === "da" ? "Under middel" : "Below avg")
    : percentile >= 10
    ? (lang === "da" ? "Bund 25%" : "Bottom 25%")
    : (lang === "da" ? "Bund 10%" : "Bottom 10%");

  return (
    <div
      ref={rowRef}
      className="grid items-center gap-1.5 sm:gap-3 py-3 border-b border-border/20"
      style={{ gridTemplateColumns: "minmax(70px, 140px) 1fr auto auto" }}
    >
      <span className="text-xs sm:text-[13px] text-muted font-medium truncate">{label}</span>
      <div className="h-1 bg-border/30 rounded-full overflow-hidden min-w-[40px]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${barWidth}%`,
            backgroundColor: color,
            transition: "width 0.9s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>
      <span className="font-mono text-xs sm:text-sm font-medium text-foreground text-right">{value}</span>
      <span
        className="text-[9px] sm:text-[10px] font-bold text-center px-1.5 sm:px-2 py-0.5 rounded-full tracking-wide whitespace-nowrap"
        style={{ color, backgroundColor: bg }}
      >
        {rankLabel}
      </span>
    </div>
  );
}

export default function InstitutionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const cameFrom = (location.state as { from?: string })?.from;
  const { institutions, normering, institutionStats, kommuneStats, schoolExtraStats, sfoStats, tilsynRapporter, nationalAverages, loading } = useData();
  const { t, language } = useLanguage();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { addViewed } = useRecentlyViewed();
  const { addToCompare, removeFromCompare, isInCompare } = useCompare();
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

  // Comparison rows for nearby institutions
  const comparisonRows = useMemo(() => {
    if (!inst || !scoreResult) return [];
    return nearby.slice(0, 4).map((n) => {
      const nStats = institutionStats[n.id.replace(/^(vug|bh|dag|sfo)-/, "")];
      const nSchoolExtra = schoolExtraStats[n.municipality];
      const nSfoStats = sfoStats[n.municipality];
      const nNearby = institutions.filter((i) => i.id !== n.id && i.category === n.category).slice(0, 3);
      const nMuniAvg = (() => {
        const same = institutions.filter((i) => i.municipality === n.municipality && i.category === n.category && i.id !== n.id);
        const prices = same.map((i) => i.monthlyRate).filter((p): p is number => p != null && p > 0);
        return prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
      })();
      const nScore = computeScore(n, nNearby, normering, nMuniAvg, nStats, institutions, institutionStats, nSchoolExtra, nSfoStats);
      return {
        inst: n,
        score: nScore.overall != null ? Math.round(nScore.overall / 10 * 10) / 10 : null,
        trivsel: n.quality?.ts ?? null,
        fravaer: n.quality?.fp ?? null,
        karakter: n.quality?.k ?? null,
        dist: n.dist,
      };
    });
  }, [inst, scoreResult, nearby, normering, institutions, institutionStats, schoolExtraStats, sfoStats]);

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

  // Compute percentiles for school quality metrics across all schools
  const percentiles = useMemo(() => {
    if (!inst || inst.category !== "skole" || !inst.quality) return null;
    const schools = institutions.filter((i) => i.category === "skole" && i.quality);
    function pctRank(values: number[], val: number): number {
      const sorted = [...values].sort((a, b) => a - b);
      const below = sorted.filter((v) => v < val).length;
      return Math.round((below / sorted.length) * 100);
    }
    function pctRankInverse(values: number[], val: number): number {
      // For metrics where lower is better (absence, class size)
      const sorted = [...values].sort((a, b) => a - b);
      const above = sorted.filter((v) => v > val).length;
      return Math.round((above / sorted.length) * 100);
    }
    const q = inst.quality;
    const result: { label: string; percentile: number; value: string }[] = [];
    const tsVals = schools.map((s) => s.quality!.ts).filter((v): v is number => v != null);
    if (q.ts != null && tsVals.length > 0) result.push({ label: t.detail.wellbeing, percentile: pctRank(tsVals, q.ts), value: q.ts.toLocaleString("da-DK") });
    // Trivsel dimensions
    const tfVals = schools.map((s) => s.quality!.tf).filter((v): v is number => v != null);
    if (q.tf != null && tfVals.length > 0) result.push({ label: t.detail.wellbeingAcademic, percentile: pctRank(tfVals, q.tf), value: q.tf.toLocaleString("da-DK") });
    const tgVals = schools.map((s) => s.quality!.tg).filter((v): v is number => v != null);
    if (q.tg != null && tgVals.length > 0) result.push({ label: t.detail.wellbeingGeneral, percentile: pctRank(tgVals, q.tg), value: q.tg.toLocaleString("da-DK") });
    const troVals = schools.map((s) => s.quality!.tro).filter((v): v is number => v != null);
    if (q.tro != null && troVals.length > 0) result.push({ label: t.detail.wellbeingClassroom, percentile: pctRank(troVals, q.tro), value: q.tro.toLocaleString("da-DK") });
    const tsiVals = schools.map((s) => s.quality!.tsi).filter((v): v is number => v != null);
    if (q.tsi != null && tsiVals.length > 0) result.push({ label: t.detail.wellbeingSocialIsolation, percentile: pctRankInverse(tsiVals, q.tsi), value: q.tsi.toLocaleString("da-DK") });
    const kVals = schools.map((s) => s.quality!.k).filter((v): v is number => v != null);
    if (q.k != null && kVals.length > 0) result.push({ label: t.detail.grades, percentile: pctRank(kVals, q.k), value: q.k.toLocaleString("da-DK") });
    const fpVals = schools.map((s) => s.quality!.fp).filter((v): v is number => v != null);
    if (q.fp != null && fpVals.length > 0) result.push({ label: t.detail.absence, percentile: pctRankInverse(fpVals, q.fp), value: `${q.fp.toLocaleString("da-DK")}%` });
    const kpVals = schools.map((s) => s.quality!.kp).filter((v): v is number => v != null);
    if (q.kp != null && kpVals.length > 0) result.push({ label: t.detail.competenceCoverage, percentile: pctRank(kpVals, q.kp), value: `${q.kp.toLocaleString("da-DK")}%` });
    const kvVals = schools.map((s) => s.quality!.kv).filter((v): v is number => v != null);
    if (q.kv != null && kvVals.length > 0) result.push({ label: t.detail.classSize, percentile: pctRankInverse(kvVals, q.kv), value: q.kv.toLocaleString("da-DK") });
    const eplVals = schools.map((s) => s.quality!.epl).filter((v): v is number => v != null);
    if (q.epl != null && eplVals.length > 0) result.push({ label: t.detail.studentsPerTeacher, percentile: pctRankInverse(eplVals, q.epl), value: q.epl.toLocaleString("da-DK") });
    const upeVals = schools.map((s) => s.quality!.upe).filter((v): v is number => v != null);
    if (q.upe != null && upeVals.length > 0) result.push({ label: t.detail.teachingTimePerStudent, percentile: pctRank(upeVals, q.upe), value: `${q.upe.toLocaleString("da-DK")} t` });
    return result;
  }, [inst, institutions, t]);

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

  const q = inst.quality;

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

      {/* Sticky micro-header */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          shrunk
            ? "bg-background/95 backdrop-blur-xl border-b border-border/40 py-2.5"
            : "bg-transparent py-4 pointer-events-none"
        }`}
      >
        <div className="max-w-[1020px] mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display text-sm font-semibold text-foreground/80">Institutionsguide</span>
            {shrunk && scoreResult && (
              <>
                <span className="text-border">·</span>
                <span className="text-sm text-muted font-medium">{inst.name}</span>
                {scoreResult.overall != null && (
                  <span className="font-mono text-sm font-medium text-[#0d7c5f]">
                    {(Math.round(scoreResult.overall / 10 * 10) / 10).toLocaleString("da-DK")}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

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

      {/* Compact action bar */}
      <div className="max-w-[1020px] mx-auto px-4 pt-4 pb-2 flex items-center justify-between">
        <button
          onClick={() => {
            if (cameFrom) {
              // We know exactly where the user came from — go there.
              navigate(cameFrom);
            } else {
              // Fallback: go to category listing.
              navigate(categoryPath(inst.category));
            }
          }}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline cursor-pointer bg-transparent border-none p-0"
        >
          <ArrowLeft className="w-4 h-4" />
          {language === "da" ? "Tilbage" : "Back"}
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (isInCompare(inst.id)) {
                removeFromCompare(inst.id);
                const msg = language === "da" ? "Fjernet fra sammenligning" : "Removed from comparison";
                setCompareToast(msg);
              } else {
                addToCompare(inst);
                const msg = language === "da" ? "Tilføjet til sammenligning" : "Added to comparison";
                setCompareToast(msg);
              }
            }}
            className={`p-2 rounded-lg hover:bg-primary/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${isInCompare(inst.id) ? "bg-primary/10" : ""}`}
            aria-label={language === "da" ? "Sammenlign" : "Compare"}
          >
            <GitCompareArrows className={`w-5 h-5 transition-colors ${isInCompare(inst.id) ? "text-primary" : "text-muted hover:text-primary"}`} />
          </button>
          <ShareButton title={inst.name} url={`/institution/${inst.id}`} />
          <button
            onClick={() => toggleFavorite(inst.id)}
            className="p-2 rounded-lg hover:bg-red-50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={isFavorite(inst.id) ? t.favorites.removeFavorite : t.favorites.addFavorite}
          >
            <Heart className={`w-6 h-6 transition-colors ${isFavorite(inst.id) ? "text-red-500 fill-red-500" : "text-muted hover:text-red-400"}`} />
          </button>
        </div>
      </div>

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

            {/* 2-column: metrics left, sidebar right */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 mt-6">
              <div className="space-y-6">
                {/* AI Chat */}
                <Suspense fallback={null}>
                  <InstitutionChat
                    institutionId={inst.id}
                    category={inst.category}
                    language={language}
                    context={{
                      name: inst.name,
                      category: inst.category,
                      municipality: inst.municipality,
                      monthly_rate: inst.monthlyRate ?? null,
                      municipality_avg_price: municipalityAvgPrice,
                      yearly_price: inst.yearlyPrice ?? null,
                      ownership: inst.ownership ?? null,
                      normering_ratio: instStats?.normering02 ?? instStats?.normering35 ?? null,
                      normering_age_group: instStats?.normering02 != null ? "0-2" : instStats?.normering35 != null ? "3-5" : null,
                      pct_paedagoger: instStats?.pctPaedagoger ?? null,
                      pct_uden_paed_udd: instStats?.pctUdenPaedUdd ?? null,
                      parent_satisfaction: instStats?.parentSatisfaction ?? null,
                      antal_boern: instStats?.antalBoern ?? null,
                      trivsel: inst.quality?.ts ?? null,
                      trivsel_social: inst.quality?.tsi ?? null,
                      karakterer: inst.quality?.k ?? null,
                      fravaer_pct: inst.quality?.fp ?? null,
                      kompetencedaekning_pct: inst.quality?.kp ?? null,
                      klassestorrelse: inst.quality?.kv ?? null,
                      undervisningseffekt: inst.quality?.sr ?? null,
                      elever_pr_laerer: inst.quality?.epl ?? null,
                      undervisningstid_pr_elev: inst.quality?.upe ?? null,
                      score: scoreResult.overall,
                      grade: scoreResult.grade,
                      address: `${inst.address}, ${inst.postalCode} ${inst.city}`,
                      // Percentile rankings so AI chat is consistent with displayed data
                      percentile_rankings: percentiles?.map(p => `${p.label}: ${p.value} (${p.percentile}. percentil)`) ?? [],
                    }}
                  />
                </Suspense>

                {/* Quality data — v3 animated bar grid */}
                {percentiles && percentiles.length > 0 && (
                  <div className="bg-bg-card rounded-2xl border border-border/50 p-6 sm:p-9 shadow-sm">
                    <div className="flex justify-between items-baseline mb-1">
                      <h2 className="font-display text-xl font-medium">{t.detail.qualityData}</h2>
                      <span className="text-[11px] text-muted/50 tracking-wide">UVM {dataVersions.schoolQuality.schoolYear}</span>
                    </div>
                    <div className="text-[11px] text-muted/50 mb-4">{percentiles.length} {language === "da" ? "metrikker" : "metrics"}</div>

                    {/* Header row */}
                    <div
                      className="hidden sm:grid gap-3 pb-2 border-b border-border/40"
                      style={{ gridTemplateColumns: "minmax(70px, 140px) 1fr auto auto" }}
                    >
                      <span className="text-[10px] text-muted/50 uppercase tracking-widest font-semibold" />
                      <span className="text-[10px] text-muted/50 uppercase tracking-widest font-semibold" />
                      <span className="text-[10px] text-muted/50 uppercase tracking-widest font-semibold text-right">{language === "da" ? "Værdi" : "Value"}</span>
                      <span className="text-[10px] text-muted/50 uppercase tracking-widest font-semibold text-center" />
                    </div>

                    {/* Metric rows */}
                    <div>
                      {percentiles.map((p, i) => (
                        <QualityMetricRow key={p.label} label={p.label} percentile={p.percentile} value={p.value} delay={i * 80} lang={language} />
                      ))}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/30 text-[10px] text-muted/60">
                      <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#0d7c5f]" /> Top 25%</span>
                      <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#b8860b]" /> {language === "da" ? "Middel" : "Average"}</span>
                      <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#c0392b]" /> {language === "da" ? "Bund 25%" : "Bottom 25%"}</span>
                    </div>
                    {q?.sr && (
                      <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/15">
                        <p className="text-xs text-muted mb-0.5">{t.detail.socioEconomicRef}</p>
                        <p className="text-sm font-semibold text-foreground">{q.sr}</p>
                        <p className="text-[10px] text-muted mt-1">
                          {language === "da"
                            ? "Sammenligner skolens resultater med forventede resultater baseret på elevernes socioøkonomiske baggrund"
                            : "Compares the school's results with expected results based on students' socioeconomic background"}
                        </p>
                      </div>
                    )}
                    {q?.el != null && (
                      <div className="text-xs text-muted mt-3">
                        {t.detail.studentCount}: <strong className="text-foreground font-mono">{q.el.toLocaleString("da-DK")}</strong>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3 gap-2">
                      <p className="text-[10px] text-muted">{t.detail.dataSource}</p>
                      <Link to="/metode" className="text-[10px] text-primary hover:underline shrink-0">
                        {language === "da" ? "Se metode" : "See method"} &rarr;
                      </Link>
                    </div>
                  </div>
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
      {inst.category === "efterskole" && (inst.profiles?.length || inst.availableSpots != null || inst.classLevels?.length || inst.edkUrl) && (
        <section className="max-w-[1020px] mx-auto px-4 pb-4">
          <div className="card p-5 space-y-4">
            {inst.schoolType && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">{language === "da" ? "Type" : "Type"}:</span>
                <span className="text-sm font-medium text-foreground">{inst.schoolType}</span>
              </div>
            )}
            {inst.classLevels && inst.classLevels.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">{language === "da" ? "Klassetrin" : "Grades"}:</span>
                <span className="text-sm font-medium text-foreground">{inst.classLevels.join(". + ")}. klasse</span>
              </div>
            )}
            {inst.availableSpots != null && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">{language === "da" ? "Ledige pladser" : "Available spots"}:</span>
                <span className={`text-sm font-medium ${inst.availableSpots > 0 ? "text-green-600" : "text-red-500"}`}>
                  {inst.availableSpots > 0
                    ? `${inst.availableSpots} ${language === "da" ? "ledige linjer" : "available lines"}`
                    : (language === "da" ? "Ingen ledige" : "No availability")}
                </span>
              </div>
            )}
            {inst.profiles && inst.profiles.length > 0 && (
              <div>
                <span className="text-xs text-muted block mb-2">{language === "da" ? "Profiler" : "Profiles"}:</span>
                <div className="flex flex-wrap gap-1.5">
                  {inst.profiles.map((p) => (
                    <span key={p} className="text-xs px-2.5 py-1 rounded-full bg-pink-50 text-pink-700 dark:bg-pink-950/30 dark:text-pink-400 font-medium">
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {inst.edkUrl && (
              <a
                href={inst.edkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium min-h-[44px]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {language === "da" ? "Se på efterskolerne.dk" : "View on efterskolerne.dk"}
              </a>
            )}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          FULL DETAILS — always visible
          ═══════════════════════════════════════════ */}
      <section className="max-w-[1020px] mx-auto px-4 pb-12 space-y-6">
        {/* Prices */}
        {(inst.monthlyRate != null || inst.yearlyPrice != null) && (
          <div id="section-data" className="card p-5">
            <h2 className="font-display text-lg font-semibold mb-4">{t.detail.prices}</h2>
            {/* The over/under average indicator is always visible */}
            {municipalityAvgPrice != null && inst.monthlyRate != null && (
              <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/15 text-center">
                {(() => {
                  const diff = inst.monthlyRate! - municipalityAvgPrice;
                  const pct = Math.round((diff / municipalityAvgPrice) * 100);
                  if (Math.abs(pct) < 2) return <p className="text-sm font-medium text-muted">{language === "da" ? "Tæt på gennemsnittet for kommunen" : "Close to municipality average"}</p>;
                  return (
                    <p className={`text-sm font-medium ${diff < 0 ? "text-green-600" : "text-red-500"}`}>
                      {diff < 0
                        ? (language === "da" ? `${Math.abs(pct)}% billigere end gennemsnittet i ${inst.municipality}` : `${Math.abs(pct)}% cheaper than average in ${inst.municipality}`)
                        : (language === "da" ? `${pct}% dyrere end gennemsnittet i ${inst.municipality}` : `${pct}% more expensive than average in ${inst.municipality}`)}
                    </p>
                  );
                })()}
              </div>
            )}
            <GatedSection unlocked={unlocked} onRequestUnlock={openGate}>
              {inst.category === "efterskole" && inst.yearlyPrice ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-bg-card border border-border rounded-lg p-4 text-center">
                    <p className="text-xs text-muted mb-1">{language === "da" ? "Ugepris" : "Weekly rate"}</p>
                    <p className="font-mono text-2xl font-bold text-primary">{formatDKK(inst.weeklyPrice)}</p>
                    <p className="text-[10px] text-muted mt-1">{language === "da" ? "~42 uger" : "~42 weeks"}</p>
                  </div>
                  <div className="bg-bg-card border border-border rounded-lg p-4 text-center">
                    <p className="text-xs text-muted mb-1">{language === "da" ? "Årspris" : "Yearly rate"}</p>
                    <p className="font-mono text-2xl font-bold text-foreground">{formatDKK(inst.yearlyPrice)}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-bg-card border border-border rounded-lg p-4 text-center">
                    <p className="text-xs text-muted mb-1">{t.detail.monthlyRate}</p>
                    <p className="font-mono text-2xl font-bold text-primary">{formatDKK(inst.monthlyRate)}</p>
                    <p className="text-[10px] text-muted mt-1">{language === "da" ? "Før evt. fripladstilskud" : "Before subsidy"}</p>
                  </div>
                  <div className="bg-bg-card border border-border rounded-lg p-4 text-center">
                    <p className="text-xs text-muted mb-1">{t.detail.annualRate}</p>
                    <p className="font-mono text-2xl font-bold text-foreground">{formatDKK(inst.annualRate)}</p>
                  </div>
                </div>
              )}
              {/* Municipality average comparison */}
              {municipalityAvgPrice != null && inst.monthlyRate != null && (
                <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/15 text-center">
                  <p className="text-xs text-muted mb-0.5">
                    {language === "da" ? `Gennemsnit i ${inst.municipality}` : `Average in ${inst.municipality}`}
                  </p>
                  <p className="font-mono text-lg font-bold text-foreground">{formatDKK(municipalityAvgPrice)}<span className="text-xs font-normal text-muted">{t.common.perMonth}</span></p>
                </div>
              )}
            </GatedSection>
            <p className="text-[10px] text-muted mt-3 text-center">
              {language === "da" ? `Priser fra ${dataVersions.prices.year} \u2014 kan afvige fra aktuelle takster` : `Prices from ${dataVersions.prices.year} \u2014 may differ from current rates`}
            </p>
          </div>
        )}

        {/* Friplads calculator — only for daycare categories */}
        {inst.annualRate && inst.annualRate > 0 && !["skole", "efterskole", "fritidsklub"].includes(inst.category) && (
          <FripladsCalculator annualRate={inst.annualRate} label={`${t.friplads.title} — ${inst.name}`} />
        )}


        {/* Normering badge (dagtilbud only) */}
        {inst.category !== "skole" && (() => {
          const ageGroupMap: Record<string, string> = { vuggestue: "0-2", boernehave: "3-5", dagpleje: "dagpleje", sfo: "3-5" };
          const ag = ageGroupMap[inst.category];
          const latest = normering
            .filter((n) => n.municipality === inst.municipality && n.ageGroup === ag)
            .sort((a, b) => b.year - a.year);
          if (latest.length === 0) return null;
          const current = latest[0];
          const prev = latest.length > 1 ? latest[1] : undefined;
          return (
            <GatedSection unlocked={unlocked} onRequestUnlock={openGate}>
              <Suspense fallback={<div className="h-[250px] bg-border/20 rounded-xl animate-pulse" />}>
                <NormeringBadge
                  municipality={inst.municipality}
                  ageGroup={current.ageGroup}
                  ratio={current.ratio}
                  year={current.year}
                  previousRatio={prev?.ratio}
                />
              </Suspense>
            </GatedSection>
          );
        })()}


        {/* Arbejdstilsyn — work environment inspections */}
        <GatedSection unlocked={unlocked} onRequestUnlock={openGate}>
          <ArbejdstilsynSection institutionId={inst.id} institutionName={inst.name} />
        </GatedSection>

        {/* Price history chart */}
        <GatedSection unlocked={unlocked} onRequestUnlock={openGate}>
          <Suspense fallback={<div className="h-[250px] bg-border/20 rounded-xl animate-pulse" />}>
            <PriceHistoryChart institutionId={inst.id} institutionName={inst.name} />
          </Suspense>
        </GatedSection>

        {/* Price alert */}
        {/* Price alert — only for categories with price tracking */}
        {!["skole", "efterskole", "gymnasium"].includes(inst.category) && (
          <PriceAlertSignup municipality={inst.municipality} category={inst.category} compact />
        )}

        {/* Map */}
        <Suspense fallback={<div className="h-[250px] bg-border/20 rounded-xl animate-pulse" />}>
          <div className="h-[250px] rounded-xl overflow-hidden border border-border">
            <InstitutionMap
              institutions={[inst, ...nearby]}
              onSelect={() => {}}
              flyTo={{ lat: inst.lat, lng: inst.lng, zoom: 14 }}
            />
          </div>
        </Suspense>


        {/* Tilsynsrapporter (from JSON) */}
        {tilsynRapporter[inst.id]?.length > 0 && (
          <GatedSection unlocked={unlocked} onRequestUnlock={openGate}>
            <TilsynRapportSection reports={tilsynRapporter[inst.id]} institutionName={inst.name} />
          </GatedSection>
        )}

        {/* Reviews — only show if there are actual reviews */}
        {reviews.length > 0 && (
          <div id="section-anmeldelser">
            <ReviewSection institutionId={inst.id} />
          </div>
        )}
      </section>

      {/* Cross-sell nudges — only after gate unlock */}
      {unlocked && (
        <section className="max-w-4xl mx-auto px-4 py-6">
          <p className="text-xs text-muted mb-3 text-center">
            {language === "da" ? "Nyttige værktøjer til din familieøkonomi" : "Useful tools for your family finances"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href="https://nemtbudget.nu?source=institutionsguide"
              target="_blank"
              rel="noopener noreferrer"
              className="card p-4 text-center hover:bg-primary/5 transition-colors"
            >
              <p className="font-semibold text-sm text-foreground">NemtBudget</p>
              <p className="text-xs text-muted mt-1">
                {language === "da" ? "Lav et familiebudget med pasningsudgifter" : "Create a family budget with childcare costs"}
              </p>
            </a>
            <a
              href="https://parfinans.dk?source=institutionsguide"
              target="_blank"
              rel="noopener noreferrer"
              className="card p-4 text-center hover:bg-primary/5 transition-colors"
            >
              <p className="font-semibold text-sm text-foreground">ParFinans</p>
              <p className="text-xs text-muted mt-1">
                {language === "da" ? "Privatøkonomi for forældre" : "Personal finance for parents"}
              </p>
            </a>
            <a
              href={"https://xn--brneskat-54a.dk?source=institutionsguide"}
              target="_blank"
              rel="noopener noreferrer"
              className="card p-4 text-center hover:bg-primary/5 transition-colors"
            >
              <p className="font-semibold text-sm text-foreground">Børneskat</p>
              <p className="text-xs text-muted mt-1">
                {language === "da" ? "Spar på skat med børnefradrag" : "Save on taxes with child deductions"}
              </p>
            </a>
          </div>
        </section>
      )}

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

function ReviewSection({ institutionId }: { institutionId: string }) {
  const [showForm, setShowForm] = useState(false);
  const { reviews } = useReviews(institutionId);
  const { analysis } = useReviewAnalysis(institutionId, reviews);

  return (
    <div className="space-y-6">
      <ReviewSummaryV2
        institutionId={institutionId}
        onWriteReview={() => setShowForm((v) => !v)}
      />
      {analysis && <ReviewThemes analysis={analysis} />}
      {showForm && (
        <ReviewFormV2
          institutionId={institutionId}
          onClose={() => setShowForm(false)}
        />
      )}
      <ReviewListV2 institutionId={institutionId} />
    </div>
  );
}
