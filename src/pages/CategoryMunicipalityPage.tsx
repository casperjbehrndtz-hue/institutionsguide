import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import SEOHead from "@/components/shared/SEOHead";
import JsonLd from "@/components/shared/JsonLd";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { breadcrumbSchema, itemListSchema } from "@/lib/schema";
import { formatDKK } from "@/lib/format";
import { SkeletonHero, SkeletonCardGrid } from "@/components/shared/Skeletons";
import DataFreshness from "@/components/shared/DataFreshness";
import {
  buildSlugMap,
  CATEGORY_SLUGS,
  CATEGORY_LABELS_DA,
  CATEGORY_SINGULAR_DA,
  toSlug,
  type CategorySlug,
} from "@/lib/slugs";
import RelatedSearches from "@/components/shared/RelatedSearches";
import ScrollReveal from "@/components/shared/ScrollReveal";
import AnimatedNumber from "@/components/shared/AnimatedNumber";
import ShareButton from "@/components/shared/ShareButton";
import InstitutionPriceCard from "@/components/category/InstitutionPriceCard";

export default function CategoryMunicipalityPage() {
  const { category, municipality: munSlug } = useParams<{
    category: string;
    municipality: string;
  }>();
  const { institutions, municipalities, loading } = useData();
  const { language } = useLanguage();

  const slugMap = useMemo(
    () => buildSlugMap(municipalities.map((m) => m.municipality)),
    [municipalities]
  );

  const munName = munSlug ? slugMap.get(munSlug) ?? "" : "";
  const cat = (category ?? "") as CategorySlug;
  const isValidCat = CATEGORY_SLUGS.includes(cat as CategorySlug);

  const filtered = useMemo(
    () =>
      institutions.filter(
        (i) => i.category === cat && i.municipality === munName
      ),
    [institutions, cat, munName]
  );

  const stats = useMemo(() => {
    const withPrice = filtered.filter(
      (i) => i.monthlyRate !== null && i.monthlyRate > 0
    );
    if (withPrice.length === 0)
      return { avg: null, min: null, max: null, cheapest: null, priciest: null };
    const prices = withPrice.map((i) => i.monthlyRate!);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    return {
      avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      min: minP,
      max: maxP,
      cheapest: withPrice.find((i) => i.monthlyRate === minP)!,
      priciest: withPrice.find((i) => i.monthlyRate === maxP)!,
    };
  }, [filtered]);

  // National average for the category
  const nationalAvg = useMemo(() => {
    const all = institutions.filter(
      (i) =>
        i.category === cat && i.monthlyRate !== null && i.monthlyRate > 0
    );
    if (all.length === 0) return null;
    return Math.round(
      all.reduce((s, i) => s + i.monthlyRate!, 0) / all.length
    );
  }, [institutions, cat]);

  // Related: other categories in this municipality
  const otherCategories = useMemo(() => {
    return CATEGORY_SLUGS.filter((c) => {
      if (c === cat) return false;
      return institutions.some(
        (i) => i.category === c && i.municipality === munName
      );
    });
  }, [institutions, cat, munName]);

  // Nearby municipalities with this category
  const nearbyMuns = useMemo(() => {
    const idx = municipalities.findIndex((m) => m.municipality === munName);
    if (idx === -1) return [];
    const nearby: string[] = [];
    for (
      let i = Math.max(0, idx - 4);
      i <= Math.min(municipalities.length - 1, idx + 4);
      i++
    ) {
      if (i !== idx) {
        const m = municipalities[i].municipality;
        if (institutions.some((inst) => inst.category === cat && inst.municipality === m)) {
          nearby.push(m);
        }
      }
    }
    return nearby;
  }, [municipalities, institutions, munName, cat]);

  const catLabel = CATEGORY_LABELS_DA[cat] ?? "";
  const catSingular = CATEGORY_SINGULAR_DA[cat] ?? "";

  // Contextual intro text unique to each category/municipality combination (must be before early returns — rules of hooks)
  const introText = useMemo(() => {
    if (filtered.length === 0) return "";
    const parts: string[] = [];

    // Ownership mix
    const privateCount = filtered.filter((i) => i.ownership === "Privat" || i.ownership === "Selvejende").length;
    const publicCount = filtered.length - privateCount;
    if (privateCount > 0 && publicCount > 0) {
      parts.push(`Af de ${filtered.length} ${catLabel.toLowerCase()} i ${munName} Kommune er ${publicCount} kommunale og ${privateCount} private eller selvejende`);
    } else if (publicCount === filtered.length) {
      parts.push(`Alle ${filtered.length} ${catLabel.toLowerCase()} i ${munName} Kommune er kommunale`);
    } else {
      parts.push(`Alle ${filtered.length} ${catLabel.toLowerCase()} i ${munName} Kommune er private eller selvejende`);
    }

    // Price comparison to national average
    if (stats.avg && nationalAvg) {
      const diff = stats.avg - nationalAvg;
      const pctDiff = Math.round((Math.abs(diff) / nationalAvg) * 100);
      if (pctDiff >= 5) {
        parts.push(
          diff > 0
            ? `Prisniveauet ligger ${pctDiff}% over landsgennemsnittet på ${formatDKK(nationalAvg)}/md`
            : `Prisniveauet ligger ${pctDiff}% under landsgennemsnittet på ${formatDKK(nationalAvg)}/md`
        );
      } else {
        parts.push(`Prisniveauet ligger tæt på landsgennemsnittet på ${formatDKK(nationalAvg)}/md`);
      }
    }

    return parts.join(". ") + ".";
  }, [filtered, catLabel, munName, stats.avg, nationalAvg]);

  if (loading) {
    return (<><SkeletonHero /><SkeletonCardGrid /></>);
  }

  if (!isValidCat || !munName || filtered.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 text-center max-w-md">
          <h1 className="font-display text-2xl font-bold mb-4">Side ikke fundet</h1>
          <p className="text-muted mb-6">
            Vi kunne ikke finde data for denne kombination.
          </p>
          <Link to="/" className="text-primary hover:underline font-medium">
            Gå til forsiden
          </Link>
        </div>
      </div>
    );
  }

  const pageTitle = `${catLabel} i ${munName} ${new Date().getFullYear()} — Sammenlign kvalitet og priser`;
  const pageDesc = `Sammenlign ${filtered.length} ${catLabel.toLowerCase()} i ${munName} Kommune. Se normering, kvalitetsdata${stats.avg ? `, priser (gns. ${stats.avg} kr/md)` : ""} og kontaktinfo.`;

  return (
    <>
      <SEOHead
        title={pageTitle}
        description={pageDesc}
        path={`/${cat}/${munSlug}`}
      />
      <JsonLd data={breadcrumbSchema([
        { name: language === "da" ? "Forside" : "Home", url: "https://institutionsguiden.dk/" },
        { name: catLabel, url: `https://institutionsguiden.dk/${cat}` },
        { name: munName, url: `https://institutionsguiden.dk/kommune/${encodeURIComponent(munName)}` },
        { name: `${catLabel} i ${munName}`, url: `https://institutionsguiden.dk/${cat}/${munSlug}` },
      ])} />
      <JsonLd data={itemListSchema(
        filtered.slice(0, 10).map((inst) => ({
          name: inst.name,
          url: `/institution/${inst.id}`,
        })),
        "https://institutionsguiden.dk",
        `${catLabel} i ${munName}`,
      )} />

      <Breadcrumbs
        items={[
          { label: language === "da" ? "Forside" : "Home", href: "/" },
          { label: catLabel, href: `/${cat}` },
          { label: munName, href: `/kommune/${encodeURIComponent(munName)}` },
          { label: `${catLabel} i ${munName}` },
        ]}
      />

      {/* Header */}
      <ScrollReveal><section className="px-4 py-10 sm:py-14 text-center bg-gradient-to-b from-primary/5 to-transparent relative">
        <div className="absolute top-4 right-4">
          <ShareButton title={`${catLabel} i ${munName}`} url={`/${category}/${munSlug}`} />
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
          {catLabel} i {munName}
        </h1>
        <p className="text-muted text-base max-w-2xl mx-auto">
          {language === "da"
            ? `Der er ${filtered.length} ${catLabel.toLowerCase()} i ${munName} Kommune.`
            : `There are ${filtered.length} ${catLabel.toLowerCase()} in ${munName} Municipality.`}
          {stats.avg && (
            <>
              {" "}
              {language === "da"
                ? `Sammenlign kvalitet og priser (gns. ${formatDKK(stats.avg)}/md).`
                : `Compare quality and prices (avg. ${formatDKK(stats.avg)}/mo).`}
            </>
          )}
        </p>
        {introText && (
          <p className="text-muted text-sm max-w-2xl mx-auto mt-3">
            {introText}
          </p>
        )}
      </section></ScrollReveal>

      {/* Price stats */}
      {stats.avg && (
        <ScrollReveal><section className="max-w-4xl mx-auto px-4 py-6">
          <h2 className="font-display text-xl font-bold text-foreground mb-4">
            {language === "da" ? `Priser for ${catLabel.toLowerCase()} i ${munName}` : `Prices for ${catLabel.toLowerCase()} in ${munName}`}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card p-4 text-center">
              <p className="text-xs text-muted mb-1">{language === "da" ? "Gennemsnit" : "Average"}</p>
              <p className="font-mono text-lg font-bold text-primary">
                <AnimatedNumber value={stats.avg!} format={formatDKK} />
              </p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xs text-muted mb-1">{language === "da" ? "Billigste" : "Cheapest"}</p>
              <p className="font-mono text-lg font-bold text-green-600">
                <AnimatedNumber value={stats.min!} format={formatDKK} />
              </p>
              {stats.cheapest && (
                <p className="text-xs text-muted mt-1 truncate">
                  {stats.cheapest.name}
                </p>
              )}
            </div>
            <div className="card p-4 text-center">
              <p className="text-xs text-muted mb-1">{language === "da" ? "Dyreste" : "Most expensive"}</p>
              <p className="font-mono text-lg font-bold text-red-500">
                <AnimatedNumber value={stats.max!} format={formatDKK} />
              </p>
              {stats.priciest && (
                <p className="text-xs text-muted mt-1 truncate">
                  {stats.priciest.name}
                </p>
              )}
            </div>
            {nationalAvg && (
              <div className="card p-4 text-center">
                <p className="text-xs text-muted mb-1">{language === "da" ? "Landsgennemsnit" : "National avg."}</p>
                <p className="font-mono text-lg font-bold text-muted">
                  <AnimatedNumber value={nationalAvg} format={formatDKK} />
                </p>
                {stats.avg > nationalAvg ? (
                  <p className="text-xs text-red-500 mt-1">
                    {formatDKK(stats.avg - nationalAvg)} {language === "da" ? "over" : "above"}
                  </p>
                ) : (
                  <p className="text-xs text-green-600 mt-1">
                    {formatDKK(nationalAvg - stats.avg)} {language === "da" ? "under" : "below"}
                  </p>
                )}
              </div>
            )}
          </div>
          {stats.cheapest && stats.priciest && stats.min !== null && stats.max !== null && (
            <p className="text-sm text-muted mt-4 text-center">
              {language === "da"
                ? <>Den billigste {catSingular} i {munName} er <strong>{stats.cheapest.name}</strong> til {formatDKK(stats.min)}/md, mens den dyreste er <strong>{stats.priciest.name}</strong> til {formatDKK(stats.max)}/md.</>
                : <>The cheapest {catSingular} in {munName} is <strong>{stats.cheapest.name}</strong> at {formatDKK(stats.min)}/mo, while the most expensive is <strong>{stats.priciest.name}</strong> at {formatDKK(stats.max)}/mo.</>}
            </p>
          )}
        </section></ScrollReveal>
      )}

      {/* Institution list */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="font-display text-xl font-bold text-foreground mb-4">
          {language === "da" ? `Alle ${filtered.length} ${catLabel.toLowerCase()} i ${munName}` : `All ${filtered.length} ${catLabel.toLowerCase()} in ${munName}`}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((inst) => (
            <InstitutionPriceCard key={inst.id} inst={inst} minPrice={stats.min} maxPrice={stats.max} />
          ))}
        </div>
      </section>

      {/* Related: other categories */}
      {otherCategories.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 py-8">
          <h2 className="font-display text-xl font-bold text-foreground mb-4">
            {language === "da" ? `Andre institutionstyper i ${munName}` : `Other institution types in ${munName}`}
          </h2>
          <div className="flex flex-wrap gap-2">
            {otherCategories.map((c) => (
              <Link
                key={c}
                to={`/${c}/${toSlug(munName)}`}
                className="card px-4 py-2 text-sm text-primary hover:bg-primary/5 transition-colors min-h-[44px] flex items-center"
              >
                {CATEGORY_LABELS_DA[c]} {language === "da" ? "i" : "in"} {munName}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Nearby municipalities */}
      {nearbyMuns.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 py-8">
          <h2 className="font-display text-xl font-bold text-foreground mb-4">
            {language === "da" ? `${catLabel} i nærliggende kommuner` : `${catLabel} in nearby municipalities`}
          </h2>
          <div className="flex flex-wrap gap-2">
            {nearbyMuns.map((m) => (
              <Link
                key={m}
                to={`/${cat}/${toSlug(m)}`}
                className="card px-4 py-2 text-sm text-primary hover:bg-primary/5 transition-colors min-h-[44px] flex items-center"
              >
                {m}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Related searches */}
      <RelatedSearches municipality={munName} category={cat} />

      <DataFreshness lang={language} />
    </>
  );
}
