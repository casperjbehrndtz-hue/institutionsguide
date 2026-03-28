import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, Mail, Phone, ExternalLink, ArrowLeft, ChevronRight, Heart, GitCompareArrows, ChevronDown } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDKK } from "@/lib/format";
import NormeringBadge from "@/components/charts/NormeringBadge";
import PriceHistoryChart from "@/components/charts/PriceHistoryChart";
import PriceAlertSignup from "@/components/alerts/PriceAlertSignup";
import FripladsCalculator from "@/components/detail/FripladsCalculator";
import InstitutionMap from "@/components/map/InstitutionMap";
import SEOHead from "@/components/shared/SEOHead";
import JsonLd from "@/components/shared/JsonLd";
import { institutionSchema, breadcrumbSchema } from "@/lib/schema";
import ShareButton from "@/components/shared/ShareButton";
import { useFavorites } from "@/hooks/useFavorites";
import { useCompare } from "@/contexts/CompareContext";
import CompareBar from "@/components/compare/CompareBar";
import ReviewSummaryV2 from "@/components/reviews/ReviewSummaryV2";
import ReviewListV2 from "@/components/reviews/ReviewListV2";
import ReviewFormV2 from "@/components/reviews/ReviewFormV2";
import TilsynSection from "@/components/tilsyn/TilsynSection";
import InstitutionReport from "@/components/report/InstitutionReport";
import { computeScore } from "@/lib/institutionScore";
import { useAssessment } from "@/hooks/useAssessment";
import StreetViewImage from "@/components/shared/StreetViewImage";

function categoryPath(cat: string): string {
  const paths: Record<string, string> = {
    vuggestue: "/vuggestue", boernehave: "/boernehave", dagpleje: "/dagpleje",
    skole: "/skole", sfo: "/sfo",
  };
  return paths[cat] || "/";
}

function PercentileBar({ label, percentile, value, lang = "da" }: {
  label: string;
  percentile: number;
  value: string;
  lang?: string;
}) {
  const color = percentile >= 75
    ? { dot: "#0F6E56", bg: "#E1F5EE", text: "#085041" }
    : percentile >= 40
    ? { dot: "#BA7517", bg: "#FAEEDA", text: "#633806" }
    : { dot: "#A32D2D", bg: "#FCEBEB", text: "#791F1F" };

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
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted w-36 text-right shrink-0">{label}</span>
      <div className="flex-1 relative h-1.5 bg-border/50 rounded-full">
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm"
          style={{ left: `${percentile}%`, backgroundColor: color.dot }}
        />
      </div>
      <span className="font-mono text-xs text-muted shrink-0 w-12 text-right">{value}</span>
      <span
        className="text-[10px] px-2 py-0.5 rounded-md shrink-0 min-w-[72px] text-center font-medium"
        style={{ backgroundColor: color.bg, color: color.text }}
      >
        {rankLabel}
      </span>
    </div>
  );
}

export default function InstitutionPage() {
  const { id } = useParams<{ id: string }>();
  const { institutions, normering, loading, nationalAverages } = useData();
  const { t, language } = useLanguage();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { addToCompare, removeFromCompare, isInCompare } = useCompare();
  const [compareToast, setCompareToast] = useState<string | false>(false);

  useEffect(() => {
    if (!compareToast) return;
    const timer = setTimeout(() => setCompareToast(false), 2500);
    return () => clearTimeout(timer);
  }, [compareToast]);

  const categoryLabels: Record<string, string> = {
    vuggestue: t.categories.vuggestue, boernehave: t.categories.boernehave,
    dagpleje: t.categories.dagpleje, skole: t.categories.skole, sfo: t.categories.sfo,
  };

  const subtypeLabels: Record<string, string> = {
    folkeskole: "Folkeskole", friskole: "Friskole", efterskole: "Efterskole",
    kommunal: "Kommunal", selvejende: "Selvejende", privat: "Privat",
  };

  function overallLabel(o: number | undefined): string {
    if (o === 1) return t.detail.aboveAvg;
    if (o === 0) return t.detail.average;
    if (o === -1) return t.detail.belowAvg;
    return "";
  }

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

  const scoreResult = useMemo(() => {
    if (!inst) return null;
    return computeScore(inst, nearby, normering, municipalityAvgPrice);
  }, [inst, nearby, normering, municipalityAvgPrice]);

  const { assessment: aiAssessment, state: aiState } = useAssessment(
    inst, scoreResult, nearby, normering, municipalityAvgPrice,
  );

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
    const kVals = schools.map((s) => s.quality!.k).filter((v): v is number => v != null);
    if (q.k != null && kVals.length > 0) result.push({ label: t.detail.grades, percentile: pctRank(kVals, q.k), value: q.k.toLocaleString("da-DK") });
    const fpVals = schools.map((s) => s.quality!.fp).filter((v): v is number => v != null);
    if (q.fp != null && fpVals.length > 0) result.push({ label: t.detail.absence, percentile: pctRankInverse(fpVals, q.fp), value: `${q.fp.toLocaleString("da-DK")}%` });
    const kpVals = schools.map((s) => s.quality!.kp).filter((v): v is number => v != null);
    if (q.kp != null && kpVals.length > 0) result.push({ label: t.detail.competenceCoverage, percentile: pctRank(kpVals, q.kp), value: `${q.kp.toLocaleString("da-DK")}%` });
    const kvVals = schools.map((s) => s.quality!.kv).filter((v): v is number => v != null);
    if (q.kv != null && kvVals.length > 0) result.push({ label: t.detail.classSize, percentile: pctRankInverse(kvVals, q.kv), value: q.kv.toLocaleString("da-DK") });
    return result;
  }, [inst, institutions, t]);

  const nearbyScores = useMemo(() => {
    if (!inst) return [];
    return nearby.slice(0, 5).map((n) => {
      const sameCategory = institutions.filter((i) => i.municipality === n.municipality && i.category === n.category && i.id !== n.id);
      const prices = sameCategory.map((i) => i.monthlyRate).filter((p): p is number => p != null && p > 0);
      const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
      const s = computeScore(n, [], normering, avgPrice);
      return { id: n.id, overall: s.overall };
    });
  }, [inst, nearby, institutions, normering]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
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
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      <SEOHead
        title={`${inst.name} — ${categoryLabels[inst.category]} i ${inst.municipality}`}
        description={`${inst.name} er en ${(categoryLabels[inst.category] || "").toLowerCase()} i ${inst.municipality}. ${inst.monthlyRate ? `Månedspris: ${formatDKK(inst.monthlyRate)}.` : ""} Se vurdering, kvalitetsdata og beregn fripladstilskud.`}
        path={`/institution/${inst.id}`}
      />

      <JsonLd data={institutionSchema(inst, "https://institutionsguide.dk")} />
      <JsonLd data={breadcrumbSchema([
        { name: language === "da" ? "Forside" : "Home", url: "https://institutionsguide.dk/" },
        { name: categoryLabels[inst.category], url: `https://institutionsguide.dk${categoryPath(inst.category)}` },
        { name: inst.municipality, url: `https://institutionsguide.dk/kommune/${encodeURIComponent(inst.municipality)}` },
        { name: inst.name, url: `https://institutionsguide.dk/institution/${inst.id}` },
      ])} />

      {/* Breadcrumb */}
      <nav className="max-w-[640px] mx-auto px-4 pt-6 text-sm text-muted" aria-label="Breadcrumb">
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

      {/* Compact action bar */}
      <div className="max-w-[640px] mx-auto px-4 pt-4 pb-2 flex items-center justify-between">
        <Link to={categoryPath(inst.category)} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="w-4 h-4" />
          {language === "da" ? `Alle ${(categoryLabels[inst.category] || "").toLowerCase()}` : `All ${(categoryLabels[inst.category] || "").toLowerCase()}`}
        </Link>
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

      {/* Street View hero image */}
      <div className="max-w-[640px] mx-auto px-4 pb-4">
        <StreetViewImage
          lat={inst.lat}
          lng={inst.lng}
          alt={inst.name}
          className="w-full h-[200px] sm:h-[260px] rounded-xl"
        />
      </div>

      {/* Compare toast */}
      {compareToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-4">
          {compareToast}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          THE REPORT — this IS the page content
          Matches the HTML mockup exactly
          ═══════════════════════════════════════════ */}
      {scoreResult && (
        <section className="px-4 pb-6">
          <InstitutionReport
            score={scoreResult}
            institutionName={inst.name}
            category={inst.category}
            municipality={inst.municipality}
            language={language}
            nearby={nearby}
            nearbyScores={nearbyScores}
            aiAssessment={aiAssessment}
            aiLoading={aiState === "loading"}
          />
        </section>
      )}

      {/* Compact contact strip */}
      <section className="max-w-[640px] mx-auto px-4 pb-4">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            <span>{inst.address}, {inst.postalCode} {inst.city}</span>
          </div>
          {inst.phone && (
            <a href={`tel:${inst.phone}`} className="flex items-center gap-1.5 text-primary hover:underline">
              <Phone className="w-3.5 h-3.5" /> {inst.phone}
            </a>
          )}
          {inst.email && (
            <a href={`mailto:${inst.email}`} className="flex items-center gap-1.5 text-primary hover:underline">
              <Mail className="w-3.5 h-3.5" /> {inst.email}
            </a>
          )}
          {inst.web && (
            <a href={inst.web.startsWith("http") ? inst.web : `https://${inst.web}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline">
              <ExternalLink className="w-3.5 h-3.5" /> {language === "da" ? "Hjemmeside" : "Website"}
            </a>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          PREVIEW + EXPANDABLE: More details
          ═══════════════════════════════════════════ */}
      <section className="max-w-[640px] mx-auto px-4 pb-12">
        {/* Quick info preview cards */}
        {!showMore && (
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            {inst.monthlyRate != null && inst.monthlyRate > 0 && (
              <button onClick={() => setShowMore(true)} className="rounded-lg bg-bg-card p-3 text-left hover:bg-border/20 transition-colors">
                <p className="text-[11px] text-muted uppercase tracking-wide">{language === "da" ? "Pris" : "Price"}</p>
                <p className="font-mono text-base font-medium text-primary mt-0.5">{formatDKK(inst.monthlyRate)}</p>
                <p className="text-[11px] text-muted">{t.common.perMonth}</p>
              </button>
            )}
            {inst.quality?.ts != null && (
              <button onClick={() => setShowMore(true)} className="rounded-lg bg-bg-card p-3 text-left hover:bg-border/20 transition-colors">
                <p className="text-[11px] text-muted uppercase tracking-wide">{t.detail.wellbeing}</p>
                <p className="font-mono text-base font-medium text-foreground mt-0.5">{inst.quality.ts.toLocaleString("da-DK")}</p>
                <p className="text-[11px] text-muted">{t.detail.nationalAvg} {nationalAverages.trivsel.toLocaleString("da-DK")}</p>
              </button>
            )}
            {inst.quality?.k != null && (
              <button onClick={() => setShowMore(true)} className="rounded-lg bg-bg-card p-3 text-left hover:bg-border/20 transition-colors">
                <p className="text-[11px] text-muted uppercase tracking-wide">{t.detail.grades}</p>
                <p className="font-mono text-base font-medium text-foreground mt-0.5">{inst.quality.k.toLocaleString("da-DK")}</p>
                <p className="text-[11px] text-muted">{t.detail.nationalAvg} {nationalAverages.karakterer.toLocaleString("da-DK")}</p>
              </button>
            )}
          </div>
        )}

        <button
          onClick={() => setShowMore(!showMore)}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg border border-border/50 transition-colors"
        >
          {showMore
            ? (language === "da" ? "Skjul detaljer" : "Hide details")
            : (language === "da" ? "Priser, kvalitetsdata og mere" : "Prices, quality data and more")}
          <ChevronDown className={`w-4 h-4 transition-transform ${showMore ? "rotate-180" : ""}`} />
        </button>

        {showMore && (
          <div className="mt-6 space-y-6">
            {/* Prices */}
            {inst.monthlyRate != null && (
              <div className="card p-5">
                <h2 className="font-display text-lg font-semibold mb-4">{t.detail.prices}</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-bg-card border border-border rounded-lg p-4 text-center">
                    <p className="text-xs text-muted mb-1">{t.detail.monthlyRate}</p>
                    <p className="font-mono text-2xl font-bold text-primary">{formatDKK(inst.monthlyRate)}</p>
                    <p className="text-[10px] text-muted mt-1">{t.common.advisory}</p>
                  </div>
                  <div className="bg-bg-card border border-border rounded-lg p-4 text-center">
                    <p className="text-xs text-muted mb-1">{t.detail.annualRate}</p>
                    <p className="font-mono text-2xl font-bold text-foreground">{formatDKK(inst.annualRate)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Friplads calculator */}
            {inst.annualRate && inst.annualRate > 0 && (
              <FripladsCalculator annualRate={inst.annualRate} label={`${t.friplads.title} — ${inst.name}`} />
            )}

            {/* Quality data — percentile bars (schools only) */}
            {percentiles && percentiles.length > 0 && (
              <div className="card p-5">
                <h2 className="font-display text-lg font-semibold mb-4">{t.detail.qualityData}</h2>
                <div className="space-y-3">
                  {percentiles.map((p) => (
                    <PercentileBar key={p.label} label={p.label} percentile={p.percentile} value={p.value} lang={language} />
                  ))}
                </div>
                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/40 text-[10px] text-muted">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#0F6E56]" /> Top 25%</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#BA7517]" /> {language === "da" ? "Middel" : "Average"}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#A32D2D]" /> {language === "da" ? "Bund 25%" : "Bottom 25%"}</span>
                </div>
                {q?.sr && (
                  <div className="mt-3 text-xs text-muted">
                    {t.detail.teachingEffect}: <strong className="text-foreground">{q.sr}</strong>
                  </div>
                )}
                {q?.el != null && (
                  <div className="text-xs text-muted mt-1">
                    {t.detail.studentCount}: <strong className="text-foreground font-mono">{q.el.toLocaleString("da-DK")}</strong>
                  </div>
                )}
                <p className="text-[10px] text-muted mt-3">{t.detail.dataSource}</p>
              </div>
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
                <NormeringBadge
                  municipality={inst.municipality}
                  ageGroup={current.ageGroup}
                  ratio={current.ratio}
                  year={current.year}
                  previousRatio={prev?.ratio}
                />
              );
            })()}

            {/* Price history chart */}
            <PriceHistoryChart institutionId={inst.id} institutionName={inst.name} />

            {/* Price alert */}
            <PriceAlertSignup municipality={inst.municipality} category={inst.category} compact />

            {/* Map */}
            <div className="h-[250px] rounded-xl overflow-hidden border border-border">
              <InstitutionMap
                institutions={[inst, ...nearby]}
                onSelect={() => {}}
                flyTo={{ lat: inst.lat, lng: inst.lng, zoom: 14 }}
              />
            </div>

            {/* Tilsyn */}
            <TilsynSection institutionId={inst.id} institutionName={inst.name} />

            {/* Reviews */}
            <div className="space-y-6">
              <ReviewSummaryV2 institutionId={inst.id} />
              <ReviewListV2 institutionId={inst.id} />
              <ReviewFormV2 institutionId={inst.id} />
            </div>
          </div>
        )}
      </section>

      <CompareBar />
    </>
  );
}
