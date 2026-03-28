import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, Mail, Phone, ExternalLink, Star, ArrowLeft, ChevronRight, Heart, CheckCircle, AlertTriangle, GitCompareArrows } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDKK } from "@/lib/format";
import FripladsCalculator from "@/components/detail/FripladsCalculator";
import InstitutionMap from "@/components/map/InstitutionMap";
import StaticMapThumb from "@/components/shared/StaticMapThumb";
import SEOHead from "@/components/shared/SEOHead";
import JsonLd from "@/components/shared/JsonLd";
import { institutionSchema, breadcrumbSchema } from "@/lib/schema";
import ShareButton from "@/components/shared/ShareButton";
import InsightFlags from "@/components/insights/InsightFlags";
import PercentileProfile from "@/components/insights/PercentileProfile";
import NearbyComparison from "@/components/insights/NearbyComparison";
import { generateFlags, generatePercentileProfile, generateNearbyComparison } from "@/lib/insights";
import { useFavorites } from "@/hooks/useFavorites";
import { useCompare } from "@/contexts/CompareContext";
import CompareBar from "@/components/compare/CompareBar";
import ReviewSummaryComponent from "@/components/reviews/ReviewSummary";

function categoryPath(cat: string): string {
  const paths: Record<string, string> = {
    vuggestue: "/vuggestue", boernehave: "/boernehave", dagpleje: "/dagpleje",
    skole: "/skole", sfo: "/sfo",
  };
  return paths[cat] || "/";
}

function QualityDot({ value, max = 5 }: { value: number | undefined; max?: number }) {
  if (value === undefined) return <span className="text-xs text-muted">-</span>;
  const pct = (value / max) * 100;
  const color = pct >= 70 ? "bg-success" : pct >= 40 ? "bg-warning" : "bg-destructive";
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="font-mono text-sm">{value.toLocaleString("da-DK")}</span>
    </div>
  );
}

export default function InstitutionPage() {
  const { id } = useParams<{ id: string }>();
  const { institutions, loading, nationalAverages } = useData();
  const { t, language } = useLanguage();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { addToCompare, removeFromCompare, isInCompare } = useCompare();
  const [compareToast, setCompareToast] = useState<string | false>(false);

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

  return (
    <>
      <SEOHead
        title={`${inst.name} — ${categoryLabels[inst.category]} i ${inst.municipality}`}
        description={`${inst.name} er en ${(categoryLabels[inst.category] || "").toLowerCase()} i ${inst.municipality}. ${inst.monthlyRate ? `Månedspris: ${formatDKK(inst.monthlyRate)}.` : ""} Se kontaktinfo, kvalitetsdata og beregn fripladstilskud.`}
        path={`/institution/${inst.id}`}
      />

      {/* Structured data for SEO */}
      <JsonLd data={institutionSchema(inst, "https://institutionsguide.dk")} />
      <JsonLd data={breadcrumbSchema([
        { name: language === "da" ? "Forside" : "Home", url: "https://institutionsguide.dk/" },
        { name: categoryLabels[inst.category], url: `https://institutionsguide.dk${categoryPath(inst.category)}` },
        { name: inst.municipality, url: `https://institutionsguide.dk/kommune/${encodeURIComponent(inst.municipality)}` },
        { name: inst.name, url: `https://institutionsguide.dk/institution/${inst.id}` },
      ])} />

      {/* Breadcrumb */}
      <nav className="max-w-5xl mx-auto px-4 pt-6 text-sm text-muted" aria-label="Breadcrumb">
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

      {/* Header */}
      <section className="max-w-5xl mx-auto px-4 pt-4 pb-8">
        <Link to={categoryPath(inst.category)} className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-4">
          <ArrowLeft className="w-4 h-4" />
          {language === "da" ? `Alle ${(categoryLabels[inst.category] || "").toLowerCase()}` : `All ${(categoryLabels[inst.category] || "").toLowerCase()}`}
        </Link>

        <div className="flex items-start justify-between gap-3 mb-3">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            {inst.name}
          </h1>
          <div className="flex items-center gap-1 shrink-0">
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
                setTimeout(() => setCompareToast(false), 2500);
              }}
              className={`p-2 rounded-lg hover:bg-primary/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${isInCompare(inst.id) ? "bg-primary/10" : ""}`}
              aria-label={language === "da" ? "Sammenlign med andre" : "Compare with others"}
              title={language === "da" ? "Sammenlign med andre" : "Compare with others"}
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

        {/* Prominent overall quality badge */}
        {q?.o !== undefined && (
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold mb-4 ${
            q.o === 1 ? "bg-success/10 text-success border border-success/20" :
            q.o === 0 ? "bg-warning/10 text-warning border border-warning/20" :
            "bg-destructive/10 text-destructive border border-destructive/20"
          }`}>
            {q.o >= 0 ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            {overallLabel(q.o)}
          </div>
        )}

        {/* Compare toast notification */}
        {compareToast && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-4">
            {compareToast}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
            {categoryLabels[inst.category]}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-border text-muted">
            {subtypeLabels[inst.subtype] || inst.subtype}
          </span>
        </div>

        <div className="flex items-start gap-3 text-muted">
          <StaticMapThumb lat={inst.lat} lng={inst.lng} name={inst.name} />
          <div className="flex items-start gap-2 pt-1">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{inst.address}, {inst.postalCode} {inst.city} — {inst.municipality}</span>
          </div>
        </div>
      </section>

      {/* Main content grid */}
      <section className="max-w-5xl mx-auto px-4 pb-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: details */}
        <div className="lg:col-span-2 space-y-6">
          {/* ── Insight Engine: Premium data layer (quality first) ── */}
          {q && (() => {
            const flags = generateFlags(q);
            const profile = generatePercentileProfile(q);
            const nearbyComp = generateNearbyComparison(inst, nearby);
            const greenCount = flags.filter((f) => f.severity === "green").length;
            const redCount = flags.filter((f) => f.severity === "red").length;
            const yellowCount = flags.filter((f) => f.severity === "yellow").length;
            const hasInsights = flags.length > 0 || profile.length > 0;

            if (!hasInsights) return null;

            return (
              <>
                {/* 1. Insight flags with executive summary */}
                {flags.length > 0 && (
                  <div className="card p-5">
                    <h2 className="font-display text-lg font-semibold mb-2">
                      {language === "da" ? "Skoleindsigt" : "School Insights"}
                    </h2>
                    {/* Executive summary sentence */}
                    <p className="text-sm text-muted mb-4">
                      {language === "da"
                        ? `Denne skole har ${greenCount} styrke${greenCount !== 1 ? "r" : ""} og ${redCount + yellowCount} opmærksomhedspunkt${(redCount + yellowCount) !== 1 ? "er" : ""}`
                        : `This school has ${greenCount} strength${greenCount !== 1 ? "s" : ""} and ${redCount + yellowCount} point${(redCount + yellowCount) !== 1 ? "s" : ""} of attention`}
                    </p>
                    <InsightFlags flags={flags} />
                  </div>
                )}

                {/* 2. Percentile profile */}
                {profile.length > 0 && (
                  <div className="card p-5">
                    <h2 className="font-display text-lg font-semibold mb-1">
                      {language === "da" ? "Skolens profil" : "School Profile"}
                    </h2>
                    <p className="text-xs text-muted mb-4">
                      {language === "da" ? "Placering blandt alle danske skoler" : "Ranking among all Danish schools"}
                    </p>
                    <PercentileProfile bars={profile} />
                  </div>
                )}

                {/* 3. Nearby comparison */}
                {nearbyComp.length > 0 && (
                  <div className="card p-5">
                    <h2 className="font-display text-lg font-semibold mb-3">
                      {language === "da" ? "Sammenligning med nærområdet" : "Local area comparison"}
                    </h2>
                    <NearbyComparison comparisons={nearbyComp} neighborCount={nearby.length} />
                  </div>
                )}
              </>
            );
          })()}

          {/* 4. Quality data grid (schools only) */}
          {q && (
            <div className="card p-5">
              <h2 className="font-display text-lg font-semibold mb-4">{t.detail.qualityData}</h2>
              {q.r !== undefined && (
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 text-warning fill-warning" />
                  <span className="font-mono text-xl font-bold">{q.r}/5</span>
                  <span className="text-sm text-muted">{t.detail.overallRating}</span>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-xs text-muted block mb-1">{t.detail.wellbeing}</span>
                  <QualityDot value={q.ts} />
                  <span className="text-[10px] text-muted">{t.detail.nationalAvg}: {nationalAverages.trivsel.toLocaleString("da-DK")}</span>
                </div>
                <div>
                  <span className="text-xs text-muted block mb-1">{t.detail.grades}</span>
                  <QualityDot value={q.k} max={12} />
                  <span className="text-[10px] text-muted">{t.detail.nationalAvg}: {nationalAverages.karakterer.toLocaleString("da-DK")}</span>
                </div>
                <div>
                  <span className="text-xs text-muted block mb-1">{t.detail.absence}</span>
                  {q.fp !== undefined ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${q.fp < 6 ? "bg-success" : q.fp < 9 ? "bg-warning" : "bg-destructive"}`} />
                        <span className="font-mono text-sm">{q.fp.toLocaleString("da-DK")}%</span>
                      </div>
                      <span className="text-[10px] text-muted">{t.detail.nationalAvg}: {nationalAverages.fravaer.toLocaleString("da-DK")}%</span>
                    </>
                  ) : <span className="text-xs text-muted">-</span>}
                </div>
                <div>
                  <span className="text-xs text-muted block mb-1">{t.detail.competenceCoverage}</span>
                  {q.kp !== undefined ? (
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${q.kp >= 80 ? "bg-success" : q.kp >= 60 ? "bg-warning" : "bg-destructive"}`} />
                      <span className="font-mono text-sm">{q.kp.toLocaleString("da-DK")}%</span>
                    </div>
                  ) : <span className="text-xs text-muted">-</span>}
                </div>
                <div>
                  <span className="text-xs text-muted block mb-1">{t.detail.teachingEffect}</span>
                  <span className="text-sm">{q.sr || "-"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted block mb-1">{t.detail.classSize} / {t.detail.studentCount}</span>
                  <span className="font-mono text-sm">{q.kv?.toLocaleString("da-DK") || "-"} / {q.el?.toLocaleString("da-DK") || "-"}</span>
                </div>
              </div>
              <p className="text-[10px] text-muted mt-4">{t.detail.dataSource}</p>
            </div>
          )}

          {/* No quality data message for non-school institutions */}
          {!q && (
            <div className="card p-5">
              <p className="text-sm text-muted">
                {language === "da"
                  ? "Kvalitetsdata er ikke tilgængelig for denne institutionstype"
                  : "Quality data is not available for this institution type"}
              </p>
            </div>
          )}

          {/* 5. Prices + Friplads calculator (moved down) */}
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

          {/* Friplads calculator */}
          {inst.annualRate && inst.annualRate > 0 && (
            <FripladsCalculator annualRate={inst.annualRate} label={`${t.friplads.title} — ${inst.name}`} />
          )}
        </div>

        {/* Right column: map + contact + nearby */}
        <div className="space-y-6">
          {/* Mini map */}
          <div className="h-[250px] rounded-xl overflow-hidden border border-border">
            <InstitutionMap
              institutions={[inst, ...nearby]}
              onSelect={() => {}}
              flyTo={{ lat: inst.lat, lng: inst.lng, zoom: 14 }}
            />
          </div>

          {/* Contact */}
          <div className="card p-5">
            <h3 className="font-display text-base font-semibold mb-3">{t.detail.contact}</h3>
            <div className="space-y-2">
              {inst.email && (
                <a href={`mailto:${inst.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Mail className="w-4 h-4" /> {inst.email}
                </a>
              )}
              {inst.phone && (
                <a href={`tel:${inst.phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Phone className="w-4 h-4" /> {inst.phone}
                </a>
              )}
              {inst.web && (
                <a href={inst.web.startsWith("http") ? inst.web : `https://${inst.web}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <ExternalLink className="w-4 h-4" /> {t.detail.website}
                </a>
              )}
              {/* Leader name removed — no GDPR legal basis to display personal names */}
            </div>
          </div>

          {/* Nearby */}
          {nearby.length > 0 && (
            <div className="card p-5">
              <h3 className="font-display text-base font-semibold mb-3">
                {categoryLabels[inst.category]} {t.detail.nearby}
              </h3>
              <ul className="space-y-2">
                {nearby.map((n) => (
                  <li key={n.id}>
                    <Link
                      to={`/institution/${n.id}`}
                      className="block p-2.5 rounded-lg hover:bg-primary/5 transition-colors"
                    >
                      <p className="text-sm font-medium text-foreground">{n.name}</p>
                      <div className="flex justify-between text-xs text-muted mt-0.5">
                        <span>{n.municipality}</span>
                        <span className="font-mono">{formatDKK(n.monthlyRate)}{t.common.perMonth}</span>
                      </div>
                      <span className="text-[10px] text-muted">{n.dist.toFixed(1)} {t.detail.awayKm}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* Reviews section — coming soon */}
      <section className="max-w-5xl mx-auto px-4 pb-12">
        <div className="lg:max-w-[calc(66.666%-0.75rem)] space-y-6">
          <ReviewSummaryComponent
            summary={{ averageRating: 0, totalReviews: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }}
            onWriteReview={() => {}}
          />
        </div>
      </section>

      <CompareBar />
    </>
  );
}
