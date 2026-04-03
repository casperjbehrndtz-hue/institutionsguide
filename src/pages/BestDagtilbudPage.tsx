import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import SEOHead from "@/components/shared/SEOHead";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import RelatedSearches from "@/components/shared/RelatedSearches";
import DataFreshness from "@/components/shared/DataFreshness";
import DataAttribution from "@/components/shared/DataAttribution";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { SkeletonHero, SkeletonCardGrid } from "@/components/shared/Skeletons";
import { formatDKK } from "@/lib/format";
import MetricIcon from "@/components/shared/MetricIcon";
import { computeScore, type ScoreResult } from "@/lib/institutionScore";
import {
  buildSlugMap,
  toSlug,
  type CategorySlug,
} from "@/lib/slugs";
import type { UnifiedInstitution } from "@/lib/types";

/** The four dagtilbud categories that get "bedste" pages */
const BEDSTE_CATEGORIES = ["vuggestue", "boernehave", "dagpleje", "sfo"] as const;
type BedsteCategory = (typeof BEDSTE_CATEGORIES)[number];

function isBedsteCategory(s: string): s is BedsteCategory {
  return (BEDSTE_CATEGORIES as readonly string[]).includes(s);
}

const CATEGORY_LABELS_DA: Record<BedsteCategory, string> = {
  vuggestue: "Vuggestuer",
  boernehave: "Børnehaver",
  dagpleje: "Dagplejere",
  sfo: "SFO'er",
};

const CATEGORY_SINGULAR_DA: Record<BedsteCategory, string> = {
  vuggestue: "vuggestue",
  boernehave: "børnehave",
  dagpleje: "dagpleje",
  sfo: "SFO",
};

const CATEGORY_LABELS_EN: Record<BedsteCategory, string> = {
  vuggestue: "Nurseries",
  boernehave: "Kindergartens",
  dagpleje: "Childminders",
  sfo: "After-school care",
};

const CATEGORY_SINGULAR_EN: Record<BedsteCategory, string> = {
  vuggestue: "nursery",
  boernehave: "kindergarten",
  dagpleje: "childminder",
  sfo: "after-school care",
};

/** Plural form for page titles (DA) */
const CATEGORY_PLURAL_DA: Record<BedsteCategory, string> = {
  vuggestue: "vuggestuer",
  boernehave: "børnehaver",
  dagpleje: "dagplejere",
  sfo: "SFO'er",
};

function scoreBadgeColor(overall: number | null): string {
  if (overall == null) return "bg-border/30 text-muted";
  if (overall >= 65) return "bg-[#E1F5EE] text-[#085041] dark:bg-[#085041]/30 dark:text-[#34D399]";
  if (overall >= 45) return "bg-[#FAEEDA] text-[#633806] dark:bg-[#633806]/30 dark:text-[#FBBF24]";
  return "bg-[#FCEBEB] text-[#791F1F] dark:bg-[#791F1F]/30 dark:text-[#F87171]";
}

function gradeLabel(grade: string | null, lang: "da" | "en"): string {
  if (grade == null) return lang === "da" ? "Ingen data" : "No data";
  const labels: Record<string, { da: string; en: string }> = {
    A: { da: "Fremragende", en: "Excellent" },
    B: { da: "God", en: "Good" },
    C: { da: "Middel", en: "Average" },
    D: { da: "Under middel", en: "Below average" },
    E: { da: "Lav", en: "Low" },
  };
  return labels[grade]?.[lang] ?? grade;
}

interface BestDagtilbudPageProps {
  category: BedsteCategory;
}

export default function BestDagtilbudPage({ category: cat }: BestDagtilbudPageProps) {
  const { municipality: munSlug } = useParams<{
    municipality: string;
  }>();
  const { institutions, municipalities, normering, institutionStats, loading } = useData();
  const { language } = useLanguage();

  const isValidCat = isBedsteCategory(cat);

  const slugMap = useMemo(
    () => buildSlugMap(municipalities.map((m) => m.municipality)),
    [municipalities]
  );
  const munName = munSlug ? slugMap.get(munSlug) ?? "" : "";

  // Compute municipality average price for scoring
  const municipalityAvgPrice = useMemo(() => {
    if (!munName || !isValidCat) return null;
    const prices = institutions
      .filter(
        (i) =>
          i.category === cat &&
          i.municipality === munName &&
          i.monthlyRate !== null &&
          i.monthlyRate > 0
      )
      .map((i) => i.monthlyRate!);
    if (prices.length === 0) return null;
    return Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
  }, [institutions, cat, munName, isValidCat]);

  // Score and rank all institutions in this category+municipality
  const ranked = useMemo(() => {
    if (!isValidCat || !munName) return [];

    const insts = institutions.filter(
      (i) => i.category === cat && i.municipality === munName
    );

    const scored = insts.map((inst) => {
      const stats = institutionStats[inst.id.replace(/^(vug|bh|dag|sfo)-/, "")];
      const result = computeScore(inst, [], normering, municipalityAvgPrice, stats);
      return { inst, score: result };
    });

    // Sort by overall score descending (null scores go to end)
    scored.sort((a, b) => (b.score.overall ?? -1) - (a.score.overall ?? -1));

    return scored.slice(0, 10);
  }, [institutions, cat, munName, normering, institutionStats, municipalityAvgPrice, isValidCat]);

  const totalInCat = useMemo(
    () =>
      institutions.filter(
        (i) => i.category === cat && i.municipality === munName
      ).length,
    [institutions, cat, munName]
  );

  // Nearby municipalities
  const nearbyMuns = useMemo(() => {
    const idx = municipalities.findIndex((m) => m.municipality === munName);
    if (idx === -1) return [];
    const nearby: string[] = [];
    for (
      let i = Math.max(0, idx - 4);
      i <= Math.min(municipalities.length - 1, idx + 4);
      i++
    ) {
      if (i !== idx) nearby.push(municipalities[i].municipality);
    }
    return nearby;
  }, [municipalities, munName]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <SkeletonHero />
        <SkeletonCardGrid count={6} />
      </div>
    );
  }

  if (!isValidCat || !munName || ranked.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 text-center max-w-md">
          <h1 className="font-display text-2xl font-bold mb-4">
            {language === "da" ? "Side ikke fundet" : "Page not found"}
          </h1>
          <p className="text-muted mb-6">
            {language === "da"
              ? `Vi har ikke data for ${CATEGORY_PLURAL_DA[cat] ?? "denne kategori"} i denne kommune.`
              : `We don't have data for ${CATEGORY_LABELS_EN[cat]?.toLowerCase() ?? "this category"} in this municipality.`}
          </p>
          <Link to="/" className="text-primary hover:underline font-medium">
            {language === "da" ? "Ga til forsiden" : "Go to front page"}
          </Link>
        </div>
      </div>
    );
  }

  const catLabelDa = CATEGORY_LABELS_DA[cat];
  const catPluralDa = CATEGORY_PLURAL_DA[cat];
  const bestInst = ranked[0];

  const pageTitle =
    language === "da"
      ? `Top 10 bedste ${catPluralDa} i ${munName} ${new Date().getFullYear()} — Kvalitetsranking`
      : `Top 10 best ${CATEGORY_LABELS_EN[cat].toLowerCase()} in ${munName} ${new Date().getFullYear()} — Quality ranking`;

  const pageDesc =
    language === "da"
      ? `Top ${Math.min(ranked.length, 10)} ${catPluralDa} i ${munName} rangeret efter kvalitetsdata. ${bestInst.score.overall != null ? `${bestInst.inst.name} scorer højest med ${bestInst.score.overall}/100. ` : ""}Se priser, normering og kvalitet for ${totalInCat} ${catPluralDa}.`
      : `Top ${Math.min(ranked.length, 10)} ${CATEGORY_LABELS_EN[cat].toLowerCase()} in ${munName} ranked by quality data. ${bestInst.score.overall != null ? `${bestInst.inst.name} scores highest at ${bestInst.score.overall}/100.` : ""}`;

  // JSON-LD ItemList for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: language === "da"
      ? `Bedste ${catPluralDa} i ${munName}`
      : `Best ${CATEGORY_LABELS_EN[cat].toLowerCase()} in ${munName}`,
    numberOfItems: ranked.length,
    itemListElement: ranked.map((entry, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: entry.inst.name,
      url: `https://institutionsguiden.dk/institution/${entry.inst.id}`,
    })),
  };

  return (
    <>
      <SEOHead
        title={pageTitle}
        description={pageDesc}
        path={`/bedste-${cat}/${munSlug}`}
      />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumbs
        items={[
          { label: language === "da" ? "Forside" : "Home", href: "/" },
          { label: catLabelDa, href: `/${cat}` },
          { label: munName, href: `/kommune/${encodeURIComponent(munName)}` },
          {
            label:
              language === "da"
                ? `Bedste ${catPluralDa} i ${munName}`
                : `Best ${CATEGORY_LABELS_EN[cat].toLowerCase()} in ${munName}`,
          },
        ]}
      />

      {/* Header */}
      <ScrollReveal>
        <section className="px-4 py-10 sm:py-14 text-center bg-gradient-to-b from-primary/5 to-transparent">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
            {language === "da"
              ? `Bedste ${catPluralDa} i ${munName}`
              : `Best ${CATEGORY_LABELS_EN[cat].toLowerCase()} in ${munName}`}
          </h1>
          <p className="text-muted text-base max-w-2xl mx-auto">
            {language === "da"
              ? `Top ${Math.min(ranked.length, 10)} ud af ${totalInCat} ${catPluralDa} i ${munName}, rangeret efter kvalitetsdata inkl. pris, normering og personaleuddannelse.`
              : `Top ${Math.min(ranked.length, 10)} of ${totalInCat} ${CATEGORY_LABELS_EN[cat].toLowerCase()} in ${munName}, ranked by quality data incl. price, staff ratio and education.`}
          </p>
          <DataFreshness />
        </section>
      </ScrollReveal>

      {/* Top entries — highlight cards */}
      <ScrollReveal>
        <section className="max-w-4xl mx-auto px-4 py-6">
          <h2 className="font-display text-xl font-bold text-foreground mb-4">
            {language === "da"
              ? `Top ${Math.min(ranked.length, 10)} ${catPluralDa} i ${munName}`
              : `Top ${Math.min(ranked.length, 10)} ${CATEGORY_LABELS_EN[cat].toLowerCase()} in ${munName}`}
          </h2>
          <div className="space-y-3">
            {ranked.map((entry, idx) => (
              <RankedCard
                key={entry.inst.id}
                entry={entry}
                rank={idx + 1}
                language={language}
              />
            ))}
          </div>
        </section>
      </ScrollReveal>

      {/* Dynamic analysis — unique per municipality+category */}
      {language === "da" && (
        <section className="max-w-3xl mx-auto px-4 py-6">
          <h2 className="font-display text-xl font-bold text-foreground mb-3">
            Analyse — {catPluralDa} i {munName}
          </h2>
          <div className="prose prose-sm text-muted leading-relaxed space-y-3">
            <p>
              Vi har vurderet {ranked.length} ud af {totalInCat} {catPluralDa} i {munName} Kommune
              baseret på tilgængelige kvalitetsdata.
              {bestInst.score.overall != null && (
                <> {bestInst.inst.name} scorer højest med {bestInst.score.overall}/100 point.</>
              )}
              {municipalityAvgPrice && (
                <> Gennemsnitsprisen for {catPluralDa} i kommunen er {formatDKK(municipalityAvgPrice)}/md.</>
              )}
            </p>
            {ranked.length >= 3 && (
              <p>
                Top 3 i {munName} er{" "}
                {ranked.slice(0, 3).map((e, idx) => (
                  <span key={e.inst.id}>
                    {idx > 0 && (idx === 2 ? " og " : ", ")}
                    {e.inst.name}{e.score.overall != null ? ` (${e.score.overall}/100)` : ""}
                  </span>
                ))}
                . Scoren tager højde for pris, normering og personalets uddannelsesbaggrund.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Methodology note */}
      <section className="max-w-3xl mx-auto px-4 py-6">
        <div className="card card-static p-4 bg-[var(--color-bg)] dark:bg-[var(--color-bg-card)]">
          <h3 className="font-semibold text-sm mb-2">
            {language === "da" ? "Om kvalitetsvurderingen" : "About the quality rating"}
          </h3>
          <p className="text-xs text-muted">
            {language === "da"
              ? `Kvalitetsscoren er beregnet ud fra tilgængelige data: pris i forhold til kommunegennemsnit, normering (antal børn pr. voksen), personalets uddannelsesniveau og forældretilfredshed (BTU). Scoren er en indikator og bør suppleres med besøg og egne observationer.`
              : `The quality score is calculated from available data: price relative to municipality average, staff ratio, staff education level and parent satisfaction. The score is an indicator and should be supplemented with visits and personal observations.`}
          </p>
          <Link
            to="/metode"
            className="text-xs text-primary hover:underline mt-2 inline-block"
          >
            {language === "da" ? "Læs mere om vores metode" : "Read more about our methodology"}
          </Link>
        </div>
      </section>

      {/* Data attribution */}
      <DataAttribution category={cat} />

      {/* Other "bedste" categories in same municipality */}
      <section className="max-w-4xl mx-auto px-4 py-6">
        <h2 className="font-display text-lg font-bold text-foreground mb-3">
          {language === "da" ? "Se også" : "See also"}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/${cat}/${toSlug(munName)}`}
            className="card px-4 py-2 text-sm text-primary hover:bg-primary/5 transition-colors min-h-[44px] flex items-center"
          >
            {language === "da"
              ? `Alle ${catLabelDa.toLowerCase()} i ${munName}`
              : `All ${CATEGORY_LABELS_EN[cat].toLowerCase()} in ${munName}`}
          </Link>
          {BEDSTE_CATEGORIES.filter((c) => c !== cat).map((c) => {
            const hasInsts = institutions.some(
              (i) => i.category === c && i.municipality === munName
            );
            if (!hasInsts) return null;
            return (
              <Link
                key={c}
                to={`/bedste-${c}/${toSlug(munName)}`}
                className="card px-4 py-2 text-sm text-primary hover:bg-primary/5 transition-colors min-h-[44px] flex items-center"
              >
                {language === "da"
                  ? `Bedste ${CATEGORY_PLURAL_DA[c]} i ${munName}`
                  : `Best ${CATEGORY_LABELS_EN[c].toLowerCase()} in ${munName}`}
              </Link>
            );
          })}
          {(["vuggestue", "boernehave", "dagpleje"] as const)
            .filter((c) => c === cat)
            .map((c) => (
              <Link
                key={`billigste-${c}`}
                to={`/billigste-${c}/${toSlug(munName)}`}
                className="card px-4 py-2 text-sm text-primary hover:bg-primary/5 transition-colors min-h-[44px] flex items-center"
              >
                {language === "da"
                  ? `Billigste ${CATEGORY_SINGULAR_DA[c]} i ${munName}`
                  : `Cheapest ${CATEGORY_SINGULAR_EN[c]} in ${munName}`}
              </Link>
            ))}
        </div>
      </section>

      {/* Nearby municipalities */}
      {nearbyMuns.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 py-8">
          <h2 className="font-display text-lg font-bold text-foreground mb-3">
            {language === "da"
              ? `Bedste ${catPluralDa} i nærliggende kommuner`
              : `Best ${CATEGORY_LABELS_EN[cat].toLowerCase()} in nearby municipalities`}
          </h2>
          <div className="flex flex-wrap gap-2">
            {nearbyMuns.map((m) => (
              <Link
                key={m}
                to={`/bedste-${cat}/${toSlug(m)}`}
                className="card px-4 py-2 text-sm text-primary hover:bg-primary/5 transition-colors min-h-[44px] flex items-center"
              >
                {m}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Related searches */}
      <RelatedSearches municipality={munName} category={cat as CategorySlug} />
    </>
  );
}

function RankedCard({
  entry,
  rank,
  language,
}: {
  entry: { inst: UnifiedInstitution; score: ScoreResult };
  rank: number;
  language: "da" | "en";
}) {
  const { inst, score } = entry;
  const badgeColor = scoreBadgeColor(score.overall);

  // Pick up to 3 key metrics to show
  const keyMetrics = score.metrics.slice(0, 3);

  return (
    <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
          {rank}
        </span>
        <div className="min-w-0">
          <Link
            to={`/institution/${inst.id}`}
            className="font-semibold text-primary hover:underline block truncate"
          >
            {inst.name}
          </Link>
          <p className="text-xs text-muted truncate">
            {inst.ownership
              ? `${inst.ownership.charAt(0).toUpperCase()}${inst.ownership.slice(1)}`
              : ""}
            {inst.ownership && inst.address ? " — " : ""}
            {inst.address}
          </p>
          {/* Key stats */}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            {inst.monthlyRate != null && (
              <span className="text-xs text-muted">
                {formatDKK(inst.monthlyRate)}/md.
              </span>
            )}
            {keyMetrics.map((m) => (
              <span key={m.key} className="inline-flex items-center gap-1 text-xs text-muted">
                <MetricIcon name={m.icon} className="w-3 h-3" /> {m.value}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={`text-xs px-2 py-1 rounded ${badgeColor}`}>
          {gradeLabel(score.grade, language)}
        </span>
        <span className="font-mono font-bold text-primary">
          {score.overall != null ? `${score.overall}/100` : "—"}
        </span>
      </div>
    </div>
  );
}
