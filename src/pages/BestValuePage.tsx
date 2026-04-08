import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import SEOHead from "@/components/shared/SEOHead";
import JsonLd from "@/components/shared/JsonLd";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { toSlug } from "@/lib/slugs";
import { formatDKK, formatDecimal } from "@/lib/format";
import type { UnifiedInstitution } from "@/lib/types";
import { SkeletonHero, SkeletonCardGrid } from "@/components/shared/Skeletons";
import RelatedSearches from "@/components/shared/RelatedSearches";
import DataAttribution from "@/components/shared/DataAttribution";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { qualityBadge } from "@/lib/badges";
import DataFreshness from "@/components/shared/DataFreshness";
import AnimatedNumber from "@/components/shared/AnimatedNumber";
import ValueScatterChart from "@/components/charts/ValueScatterChart";
import ShareButton from "@/components/shared/ShareButton";

interface RankedSchool {
  school: UnifiedInstitution;
  valueScore: number;
}

export default function BestValuePage() {
  const { institutions, loading } = useData();

  const ranked = useMemo(() => {
    const withBoth = institutions
      .filter(
        (i) =>
          i.category === "skole" &&
          i.quality?.r !== undefined &&
          i.monthlyRate !== null &&
          i.monthlyRate > 0
      )
      .map((school) => ({
        school,
        valueScore: school.quality!.r! / (school.monthlyRate! / 1000),
      }))
      .sort((a, b) => b.valueScore - a.valueScore);

    return withBoth.slice(0, 25);
  }, [institutions]);

  const stats = useMemo(() => {
    if (ranked.length === 0) return null;
    const avgQuality =
      ranked.reduce((s, r) => s + r.school.quality!.r!, 0) / ranked.length;
    const avgPrice =
      ranked.reduce((s, r) => s + r.school.monthlyRate!, 0) / ranked.length;
    const best = ranked[0];
    return { avgQuality, avgPrice, best };
  }, [ranked]);

  // Scatter chart data
  const scatterData = useMemo(() => {
    return ranked.map((r, idx) => ({
      name: r.school.name,
      price: r.school.monthlyRate!,
      quality: r.school.quality!.r!,
      isTop5: idx < 5,
    }));
  }, [ranked]);

  const scatterAvgs = useMemo(() => {
    if (scatterData.length === 0) return { avgPrice: 0, avgQuality: 0 };
    const avgPrice = scatterData.reduce((s, d) => s + d.price, 0) / scatterData.length;
    const avgQuality = scatterData.reduce((s, d) => s + d.quality, 0) / scatterData.length;
    return { avgPrice, avgQuality };
  }, [scatterData]);

  // Unique municipalities represented in top 25
  const representedMunicipalities = useMemo(() => {
    const set = new Set(ranked.map((r) => r.school.municipality));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "da"));
  }, [ranked]);

  // Extra stats for unique content (must be before early returns — rules of hooks)
  const valueStats = useMemo(() => {
    if (ranked.length === 0) return null;
    const prices = ranked.map((r) => r.school.monthlyRate!);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const topMun = ranked[0].school.municipality;
    const munCounts: Record<string, number> = {};
    for (const r of ranked) {
      munCounts[r.school.municipality] = (munCounts[r.school.municipality] || 0) + 1;
    }
    const topMunByCount = Object.entries(munCounts).sort((a, b) => b[1] - a[1])[0];
    return { minPrice, maxPrice, topMun, topMunByCount };
  }, [ranked]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <SkeletonHero />
        <SkeletonCardGrid count={6} />
      </div>
    );
  }

  if (ranked.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 text-center max-w-md">
          <h1 className="font-display text-2xl font-bold mb-4">Ingen data tilgængelig</h1>
          <p className="text-muted mb-6">
            Vi har ikke tilstrækkeligt data til at beregne værdi-for-pengene lige nu.
          </p>
          <Link to="/" className="text-primary hover:underline font-medium">
            Gå til forsiden
          </Link>
        </div>
      </div>
    );
  }

  const pageTitle = `Bedste værdi for pengene — Skoler med mest kvalitet per krone ${new Date().getFullYear()}`;
  const pageDesc = `Top 25 skoler i Danmark rangeret efter kvalitet i forhold til SFO-pris. ${ranked[0].school.name} giver mest kvalitet per krone med en score på ${formatDecimal(ranked[0].valueScore)}.`;

  // JSON-LD ItemList
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Top 25 skoler med bedste værdi for pengene i Danmark",
    numberOfItems: ranked.length,
    itemListElement: ranked.slice(0, 10).map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.school.name,
      url: `https://institutionsguiden.dk/institution/${item.school.id}`,
    })),
  };

  return (
    <>
      <SEOHead title={pageTitle} description={pageDesc} path="/bedste-vaerdi" />
      <JsonLd data={jsonLd} />

      <Breadcrumbs
        items={[
          { label: "Forside", href: "/" },
          { label: "Skoler", href: "/skole" },
          { label: "Bedste værdi for pengene" },
        ]}
      />

      {/* Hero */}
      <ScrollReveal><section className="px-4 py-10 sm:py-14 text-center bg-gradient-to-b from-primary/5 to-transparent relative">
        <div className="absolute top-4 right-4">
          <ShareButton title="Bedste værdi — Skoler der giver mest kvalitet for pengene" url="/bedste-vaerdi" />
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
          Skoler der giver mest kvalitet for pengene
        </h1>
        <p className="text-muted text-base max-w-2xl mx-auto">
          Vi har kombineret officielle kvalitetsdata med SFO-priser for at finde de skoler,
          der giver mest værdi for pengene. Top 25 skoler i hele Danmark rangeret efter
          kvalitet per 1.000 kr. i månedlig SFO-betaling.
        </p>
      </section></ScrollReveal>

      {/* Stat cards */}
      {stats && (
        <ScrollReveal><section className="max-w-4xl mx-auto px-4 py-6">
          <ScrollReveal stagger className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-4 text-center">
              <p className="text-xs text-muted uppercase tracking-wide mb-1">
                Bedste skole
              </p>
              <p className="font-display text-lg font-bold text-primary truncate">
                {stats.best.school.name}
              </p>
              <p className="text-xs text-muted">
                Værdi-score: {formatDecimal(stats.best.valueScore)}
              </p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xs text-muted uppercase tracking-wide mb-1">
                Gns. kvalitet (top 25)
              </p>
              <p className="font-display text-2xl font-bold text-foreground">
                <AnimatedNumber value={stats.avgQuality} format={(n) => formatDecimal(n) + "/5"} />
              </p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xs text-muted uppercase tracking-wide mb-1">
                Gns. SFO-pris (top 25)
              </p>
              <p className="font-display text-2xl font-bold text-foreground">
                <AnimatedNumber value={stats.avgPrice} format={(n) => formatDKK(n) + "/md"} />
              </p>
            </div>
          </ScrollReveal>
        </section></ScrollReveal>
      )}

      {/* Scatter plot: price vs quality */}
      {scatterData.length > 0 && (
        <ValueScatterChart data={scatterData} avgPrice={scatterAvgs.avgPrice} avgQuality={scatterAvgs.avgQuality} />
      )}

      {/* Top 5 highlight cards */}
      <ScrollReveal><section className="max-w-4xl mx-auto px-4 py-6">
        <h2 className="font-display text-xl font-bold text-foreground mb-4">
          Top 5 — mest kvalitet for pengene
        </h2>
        <div className="space-y-3">
          {ranked.slice(0, 5).map((item, idx) => {
            const badge = qualityBadge(item.school.quality?.r);
            const topStyle = idx === 0 ? "border-l-4 border-l-primary bg-primary/[0.03]" :
                             idx === 1 ? "border-l-4 border-l-primary/50" :
                             idx === 2 ? "border-l-4 border-l-primary/30" : "";
            return (
              <div
                key={item.school.id}
                className={`card p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${topStyle}`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm font-mono">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <Link
                      to={`/institution/${item.school.id}`}
                      className="font-semibold text-primary hover:underline block truncate"
                    >
                      {item.school.name}
                    </Link>
                    <p className="text-xs text-muted truncate">
                      {item.school.municipality} — {formatDKK(item.school.monthlyRate)}/md SFO
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {badge && (
                    <span className={`text-xs px-2 py-1 rounded ${badge.color}`}>
                      {badge.label}
                    </span>
                  )}
                  <span className="font-mono font-bold text-primary">
                    {formatDecimal(item.valueScore)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section></ScrollReveal>

      {/* Full table */}
      <ScrollReveal><section className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="font-display text-xl font-bold text-foreground mb-4">
          Top 25 skoler — værdi for pengene
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-bg z-10">
              <tr className="border-b text-left">
                <th className="py-2 pr-2 text-muted font-medium">#</th>
                <th className="py-2 pr-4 text-muted font-medium">Skole</th>
                <th className="py-2 pr-2 text-muted font-medium">Kommune</th>
                <th className="py-2 pr-2 text-muted font-medium text-center">Kvalitet</th>
                <th className="py-2 pr-2 text-muted font-medium text-center">SFO-pris</th>
                <th className="py-2 text-muted font-medium text-center">Værdi-score</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((item, idx) => (
                <ValueRow key={item.school.id} item={item} rank={idx + 1} />
              ))}
            </tbody>
          </table>
        </div>
      </section></ScrollReveal>

      {/* Dynamic analysis — unique content */}
      {stats && valueStats && (
        <section className="max-w-3xl mx-auto px-4 py-6">
          <h2 className="font-display text-xl font-bold text-foreground mb-3">
            Analyse — værdi for pengene {new Date().getFullYear()}
          </h2>
          <div className="prose prose-sm text-muted leading-relaxed space-y-3">
            <p>
              De 25 skoler med bedste værdi for pengene har en gennemsnitlig kvalitetsscore
              på {formatDecimal(stats.avgQuality)}/5 til en gennemsnitlig SFO-pris
              på {formatDKK(stats.avgPrice)}/md. SFO-priserne i top 25 spænder fra{" "}
              {formatDKK(valueStats.minPrice)}/md til {formatDKK(valueStats.maxPrice)}/md.
            </p>
            <p>
              {ranked[0].school.name} i {ranked[0].school.municipality} topper listen
              med en værdi-score på {formatDecimal(ranked[0].valueScore)} — det betyder at
              skolen leverer {formatDecimal(ranked[0].school.quality!.r!)}/5 i kvalitet
              til kun {formatDKK(ranked[0].school.monthlyRate)}/md i SFO-betaling.
              {valueStats.topMunByCount && valueStats.topMunByCount[1] > 1 && (
                <> {valueStats.topMunByCount[0]} Kommune er repræsenteret med {valueStats.topMunByCount[1]} skoler
                i top 25.</>
              )}
            </p>
            <p>
              Skolerne er fordelt på {representedMunicipalities.length} kommuner.
              Værdi-scoren belønner skoler der kombinerer høj kvalitet med rimelige priser,
              hvilket gør den særligt relevant for familier der ønsker det bedste tilbud.
            </p>
          </div>
        </section>
      )}

      {/* Data attribution */}
      <DataAttribution category="skole" />

      {/* Methodology */}
      <section className="max-w-3xl mx-auto px-4 py-6">
        <div className="card card-static p-4 bg-[var(--color-bg)] dark:bg-[var(--color-bg-card)]">
          <h3 className="font-semibold text-sm mb-2">Om beregningen</h3>
          <p className="text-xs text-muted">
            Værdi-scoren beregnes som kvalitetsscore divideret med den månedlige SFO-pris
            i tusinder (kvalitet / (SFO-pris / 1.000)). En højere score betyder mere
            kvalitet per krone. Kun skoler med både en kvalitetsvurdering fra
            Undervisningsministeriet og en offentlig SFO-takst er medtaget.
            Kvalitetsscoren er baseret på trivsel, karaktergennemsnit, fravær og
            kompetencedækning.
          </p>
        </div>
      </section>

      {/* Municipality links */}
      {representedMunicipalities.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 py-8">
          <h2 className="font-display text-lg font-bold text-foreground mb-3">
            Se bedste skoler i disse kommuner
          </h2>
          <div className="flex flex-wrap gap-2">
            {representedMunicipalities.map((m) => (
              <Link
                key={m}
                to={`/bedste-skole/${toSlug(m)}`}
                className="card px-4 py-2 text-sm text-primary hover:bg-primary/5 transition-colors min-h-[44px] flex items-center"
              >
                {m}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Related searches */}
      <RelatedSearches />

      <DataFreshness />
    </>
  );
}

function ValueRow({ item, rank }: { item: RankedSchool; rank: number }) {
  const badge = qualityBadge(item.school.quality?.r);

  return (
    <tr className={`border-b hover:bg-primary/5 transition-colors ${rank === 1 ? "bg-green-50 dark:bg-green-950/20" : ""}`}>
      <td className="py-3 pr-2 font-mono text-muted text-xs">{rank}</td>
      <td className="py-3 pr-4">
        <Link
          to={`/institution/${item.school.id}`}
          className="font-medium text-primary hover:underline"
        >
          {item.school.name}
        </Link>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted capitalize">{item.school.subtype}</span>
          {badge && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${badge.color}`}>
              {badge.label}
            </span>
          )}
        </div>
      </td>
      <td className="py-3 pr-2 text-sm text-muted">{item.school.municipality}</td>
      <td className="py-3 pr-2 font-mono text-center font-semibold">
        {formatDecimal(item.school.quality!.r!)}/5
      </td>
      <td className="py-3 pr-2 font-mono text-center">
        {formatDKK(item.school.monthlyRate)}
      </td>
      <td className="py-3 font-mono text-center font-semibold text-primary">
        {formatDecimal(item.valueScore)}
      </td>
    </tr>
  );
}
