import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import SEOHead from "@/components/shared/SEOHead";
import JsonLd from "@/components/shared/JsonLd";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import RelatedSearches from "@/components/shared/RelatedSearches";
import { useNearbyMunicipalities } from "@/hooks/useNearbyMunicipalities";
import DataFreshness from "@/components/shared/DataFreshness";
import DataAttribution from "@/components/shared/DataAttribution";
import ScrollReveal from "@/components/shared/ScrollReveal";
import AnimatedNumber from "@/components/shared/AnimatedNumber";
import { SkeletonHero, SkeletonCardGrid } from "@/components/shared/Skeletons";
import { formatDKK } from "@/lib/format";
import { computeScore } from "@/lib/institutionScore";
import {
  buildSlugMap,
  toSlug,
  type CategorySlug,
} from "@/lib/slugs";
import RankedCard from "@/components/ranking/RankedCard";
import RankingAnalysis from "@/components/ranking/RankingAnalysis";
import ShareButton from "@/components/shared/ShareButton";
import {
  BEDSTE_CATEGORIES,
  isBedsteCategory,
  CATEGORY_LABELS_DA,
  CATEGORY_SINGULAR_DA,
  CATEGORY_LABELS_EN,
  CATEGORY_SINGULAR_EN,
  CATEGORY_PLURAL_DA,
  type BedsteCategory,
} from "@/lib/bedsteCategories";

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

  // Best score for stat card
  const bestScore = ranked.length > 0 ? ranked[0].score.overall : null;
  const avgScore = useMemo(() => {
    const withScore = ranked.filter((r) => r.score.overall != null);
    if (withScore.length === 0) return null;
    return Math.round(withScore.reduce((s, r) => s + r.score.overall!, 0) / withScore.length);
  }, [ranked]);

  // Nearby municipalities (geographic proximity)
  const nearbyMuns = useNearbyMunicipalities(institutions, munName);

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
      ? `Top ${Math.min(ranked.length, 10)} ${catPluralDa} i ${munName} rangeret efter kvalitetsdata. ${bestInst.score.overall != null ? `${bestInst.inst.name} scorer højest med ${bestInst.score.overall}/100. ` : ""}Se normering, kvalitet og priser for ${totalInCat} ${catPluralDa}.`
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

      <JsonLd data={jsonLd} />

      <Breadcrumbs
        items={[
          { label: language === "da" ? "Forside" : "Home", href: "/" },
          { label: catLabelDa, href: `/${cat}` },
          { label: munName, href: `/${cat}/${toSlug(munName)}` },
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
        <section className="px-4 py-10 sm:py-14 text-center bg-gradient-to-b from-primary/5 to-transparent relative">
          <div className="absolute top-4 right-4">
            <ShareButton title={`Bedste ${catPluralDa} i ${munName}`} url={`/bedste-${cat}/${munSlug}`} />
          </div>
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

      {/* Key stats */}
      <ScrollReveal>
        <section className="max-w-4xl mx-auto px-4 py-4">
          <ScrollReveal stagger><div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {bestScore != null && (
              <div className="card card-static p-4 text-center">
                <p className="text-xs text-muted mb-1">{language === "da" ? "Bedste score" : "Best score"}</p>
                <p className="font-mono text-lg font-bold text-primary">
                  <AnimatedNumber value={bestScore} />/100
                </p>
              </div>
            )}
            {avgScore != null && (
              <div className="card card-static p-4 text-center">
                <p className="text-xs text-muted mb-1">{language === "da" ? "Gns. score" : "Avg. score"}</p>
                <p className="font-mono text-lg font-bold text-foreground">
                  <AnimatedNumber value={avgScore} />/100
                </p>
              </div>
            )}
            <div className="card card-static p-4 text-center">
              <p className="text-xs text-muted mb-1">{language === "da" ? "I alt" : "Total"}</p>
              <p className="font-mono text-lg font-bold text-foreground">
                <AnimatedNumber value={totalInCat} />
              </p>
            </div>
            {municipalityAvgPrice != null && (
              <div className="card card-static p-4 text-center">
                <p className="text-xs text-muted mb-1">{language === "da" ? "Gns. pris" : "Avg. price"}</p>
                <p className="font-mono text-lg font-bold text-foreground">
                  <AnimatedNumber value={municipalityAvgPrice} format={formatDKK} />
                </p>
              </div>
            )}
          </div></ScrollReveal>
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

      <RankingAnalysis
        ranked={ranked}
        totalInCat={totalInCat}
        catPluralDa={catPluralDa}
        munName={munName}
        municipalityAvgPrice={municipalityAvgPrice}
        language={language}
      />

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

