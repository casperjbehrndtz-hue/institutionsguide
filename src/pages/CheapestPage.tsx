import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import SEOHead from "@/components/shared/SEOHead";
import JsonLd from "@/components/shared/JsonLd";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { formatDKK } from "@/lib/format";
import { SkeletonHero, SkeletonCardGrid } from "@/components/shared/Skeletons";
import {
  buildSlugMap,
  DAYCARE_CATEGORY_SLUGS,
  CATEGORY_LABELS_DA,
  CATEGORY_SINGULAR_DA,
  toSlug,
  type CategorySlug,
} from "@/lib/slugs";
import RelatedSearches from "@/components/shared/RelatedSearches";
import DataAttribution from "@/components/shared/DataAttribution";
import DataFreshness from "@/components/shared/DataFreshness";
import ScrollReveal from "@/components/shared/ScrollReveal";
import AnimatedNumber from "@/components/shared/AnimatedNumber";
import { dataVersions } from "@/lib/dataVersions";

export default function CheapestPage() {
  const { category: rawCat, municipality: munSlug } = useParams<{
    category: string;
    municipality: string;
  }>();
  const { institutions, municipalities, loading } = useData();

  // The route is /billigste-:category/:municipality, so rawCat already has the category
  const cat = rawCat as CategorySlug;
  const isValidCat = (DAYCARE_CATEGORY_SLUGS as readonly string[]).includes(cat);

  const slugMap = useMemo(
    () => buildSlugMap(municipalities.map((m) => m.municipality)),
    [municipalities]
  );
  const munName = munSlug ? slugMap.get(munSlug) ?? "" : "";

  const sorted = useMemo(() => {
    return institutions
      .filter(
        (i) =>
          i.category === cat &&
          i.municipality === munName &&
          i.monthlyRate !== null &&
          i.monthlyRate > 0
      )
      .sort((a, b) => a.monthlyRate! - b.monthlyRate!);
  }, [institutions, cat, munName]);

  const totalInCat = useMemo(
    () =>
      institutions.filter(
        (i) => i.category === cat && i.municipality === munName
      ).length,
    [institutions, cat, munName]
  );

  const savings = useMemo(() => {
    if (sorted.length < 2) return null;
    return sorted[sorted.length - 1].monthlyRate! - sorted[0].monthlyRate!;
  }, [sorted]);

  // National average
  const nationalAvg = useMemo(() => {
    const all = institutions.filter(
      (i) => i.category === cat && i.monthlyRate !== null && i.monthlyRate > 0
    );
    if (all.length === 0) return null;
    return Math.round(
      all.reduce((s, i) => s + i.monthlyRate!, 0) / all.length
    );
  }, [institutions, cat]);

  // Municipality average for this category
  const munAvg = useMemo(() => {
    if (sorted.length === 0) return null;
    return Math.round(
      sorted.reduce((s, i) => s + i.monthlyRate!, 0) / sorted.length
    );
  }, [sorted]);

  // Ownership breakdown
  const ownershipBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const i of sorted) {
      const ow = i.ownership || "ukendt";
      map[ow] = (map[ow] || 0) + 1;
    }
    return map;
  }, [sorted]);

  // Median price
  const medianPrice = useMemo(() => {
    if (sorted.length === 0) return null;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1].monthlyRate! + sorted[mid].monthlyRate!) / 2)
      : sorted[mid].monthlyRate!;
  }, [sorted]);

  if (loading) {
    return (<><SkeletonHero /><SkeletonCardGrid /></>);
  }

  if (!isValidCat || !munName || sorted.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 text-center max-w-md">
          <h1 className="font-display text-2xl font-bold mb-4">Side ikke fundet</h1>
          <p className="text-muted mb-6">
            Vi kunne ikke finde prisdata for denne kombination.
          </p>
          <Link to="/" className="text-primary hover:underline font-medium">
            Gå til forsiden
          </Link>
        </div>
      </div>
    );
  }

  const catLabel = CATEGORY_LABELS_DA[cat];
  const catSingular = CATEGORY_SINGULAR_DA[cat];
  const cheapestPrice = sorted[0].monthlyRate!;
  const pageTitle = `Billigste ${catSingular} i ${munName} ${new Date().getFullYear()} — Fra ${cheapestPrice.toLocaleString("da-DK")} kr/md`;
  const pageDesc = `Se de billigste ${catLabel.toLowerCase()} i ${munName} Kommune, rangeret efter pris. Billigste: ${sorted[0].name} til ${cheapestPrice.toLocaleString("da-DK")} kr/md.${savings ? ` Spar op til ${savings.toLocaleString("da-DK")} kr/md.` : ""}`;

  // JSON-LD ItemList
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Billigste ${catLabel.toLowerCase()} i ${munName}`,
    numberOfItems: sorted.length,
    itemListElement: sorted.slice(0, 10).map((inst, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: inst.name,
      url: `https://institutionsguiden.dk/institution/${inst.id}`,
    })),
  };

  return (
    <>
      <SEOHead
        title={pageTitle}
        description={pageDesc}
        path={`/billigste-${cat}/${munSlug}`}
      />
      <JsonLd data={jsonLd} />

      <Breadcrumbs
        items={[
          { label: "Forside", href: "/" },
          { label: catLabel, href: `/${cat}` },
          { label: munName, href: `/kommune/${encodeURIComponent(munName)}` },
          { label: `Billigste ${catSingular} i ${munName}` },
        ]}
      />

      {/* Header */}
      <ScrollReveal><section className="px-4 py-10 sm:py-14 text-center bg-gradient-to-b from-primary/5 to-transparent">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
          Billigste {catSingular} i {munName}
        </h1>
        <p className="text-muted text-base max-w-2xl mx-auto">
          {sorted.length} ud af {totalInCat} {catLabel.toLowerCase()} i {munName} har
          offentlige prisoplysninger. Rangeret fra billigst til dyrest.
        </p>
        {savings !== null && savings > 0 && (
          <p className="mt-3 text-green-600 font-semibold text-lg">
            Spar op til {formatDKK(savings)}/md ved at vælge den billigste
          </p>
        )}
      </section></ScrollReveal>

      {/* Savings callout */}
      {savings !== null && savings > 0 && (
        <ScrollReveal><section className="max-w-3xl mx-auto px-4 py-4">
          <div className="card p-5 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-center">
            <p className="text-xs text-green-700 dark:text-green-400 uppercase tracking-wider font-semibold mb-1">Potentiel besparelse</p>
            <p className="font-display text-3xl font-bold text-green-700 dark:text-green-400">
              <AnimatedNumber value={savings * 12} format={formatDKK} /><span className="text-lg font-normal">/år</span>
            </p>
            <p className="text-sm text-green-600 dark:text-green-500 mt-1">
              ved at vælge {sorted[0].name} frem for {sorted[sorted.length - 1].name}
            </p>
          </div>
        </section></ScrollReveal>
      )}

      {/* Fripladstilskud hint */}
      <section className="max-w-3xl mx-auto px-4 py-4">
        <div className="card p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> Har du en husstandsindkomst under 609.700 kr. ({dataVersions.friplads.year}),
            kan du søge om fripladstilskud og få reduceret prisen yderligere.{" "}
            <Link
              to={`/kommune/${encodeURIComponent(munName)}`}
              className="underline hover:text-blue-600"
            >
              Se fripladstilskud-beregner for {munName}
            </Link>
          </p>
        </div>
      </section>

      {/* Ranked list */}
      <section className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="font-display text-xl font-bold text-foreground mb-4">
          Prisrangliste — {catLabel} i {munName}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-bg z-10">
              <tr className="border-b text-left">
                <th className="py-2 pr-4 text-muted font-medium">#</th>
                <th className="py-2 pr-4 text-muted font-medium">Navn</th>
                <th className="py-2 pr-4 text-muted font-medium">Ejerskab</th>
                <th className="py-2 text-muted font-medium text-right">Pris/md</th>
                {nationalAvg && (
                  <th className="py-2 pl-4 text-muted font-medium text-right">vs. landsgnst.</th>
                )}
              </tr>
            </thead>
            <tbody>
              {sorted.map((inst, idx) => {
                const diff = nationalAvg
                  ? inst.monthlyRate! - nationalAvg
                  : null;
                return (
                  <tr
                    key={inst.id}
                    className={`border-b hover:bg-primary/5 transition-colors ${idx === 0 ? "bg-green-50 dark:bg-green-950/20" : ""}`}
                  >
                    <td className="py-3 pr-4 font-mono text-muted">{idx + 1}</td>
                    <td className="py-3 pr-4">
                      <Link
                        to={`/institution/${inst.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {inst.name}
                      </Link>
                      <p className="text-xs text-muted">{inst.address}</p>
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted capitalize">
                      {inst.ownership || "–"}
                    </td>
                    <td className="py-3 font-mono text-right font-semibold">
                      <div className="flex items-center justify-end gap-2">
                        <div className="hidden sm:block w-16 h-1.5 bg-border/50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/60 rounded-full"
                            style={{ width: `${Math.min(100, (inst.monthlyRate! / sorted[sorted.length - 1].monthlyRate!) * 100)}%` }}
                          />
                        </div>
                        {formatDKK(inst.monthlyRate)}
                      </div>
                    </td>
                    {nationalAvg && (
                      <td
                        className={`py-3 pl-4 font-mono text-right text-xs ${
                          diff !== null && diff < 0
                            ? "text-green-600"
                            : diff !== null && diff > 0
                            ? "text-red-500"
                            : "text-muted"
                        }`}
                      >
                        {diff !== null
                          ? `${diff > 0 ? "+" : ""}${diff.toLocaleString("da-DK")} kr.`
                          : "–"}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Dynamic analysis — unique content per municipality */}
      <section className="max-w-3xl mx-auto px-4 py-6">
        <h2 className="font-display text-xl font-bold text-foreground mb-3">
          Prisanalyse — {catLabel} i {munName}
        </h2>
        <div className="prose prose-sm text-muted leading-relaxed space-y-3">
          <p>
            I {munName} Kommune er der {sorted.length} {catLabel.toLowerCase()} med
            offentlige prisoplysninger ud af {totalInCat} i alt. Den billigste{" "}
            {catSingular} koster {formatDKK(cheapestPrice)}/md
            {sorted.length > 1 && (
              <>, mens den dyreste koster {formatDKK(sorted[sorted.length - 1].monthlyRate)}/md</>
            )}
            .{" "}
            {munAvg && nationalAvg && (
              <>
                Gennemsnitsprisen i {munName} er {formatDKK(munAvg)}/md, hvilket er{" "}
                {munAvg < nationalAvg
                  ? `${formatDKK(nationalAvg - munAvg)} under landsgennemsnittet på ${formatDKK(nationalAvg)}/md.`
                  : munAvg > nationalAvg
                  ? `${formatDKK(munAvg - nationalAvg)} over landsgennemsnittet på ${formatDKK(nationalAvg)}/md.`
                  : `lig med landsgennemsnittet.`}
              </>
            )}
          </p>
          {medianPrice && (
            <p>
              Medianprisen er {formatDKK(medianPrice)}/md
              {munAvg && medianPrice !== munAvg && (
                <>
                  , {medianPrice < munAvg
                    ? "lavere end gennemsnittet — de dyreste trækker snittet op"
                    : "højere end gennemsnittet — de billigste trækker snittet ned"}
                </>
              )}
              .{" "}
              {savings !== null && savings > 0 && (
                <>
                  Prisspændet er {formatDKK(savings)}/md, svarende til{" "}
                  {formatDKK(savings * 12)} årligt i forskel mellem billigste og dyreste.
                </>
              )}
            </p>
          )}
          {Object.keys(ownershipBreakdown).length > 1 && (
            <p>
              Fordelt på ejerskab:{" "}
              {Object.entries(ownershipBreakdown)
                .map(([ow, count]) => `${count} ${ow}`)
                .join(", ")}
              .
            </p>
          )}
        </div>
      </section>

      {/* Data attribution */}
      <DataAttribution category={cat} />

      {/* Related links */}
      <section className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="font-display text-lg font-bold text-foreground mb-3">
          Se også
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/${cat}/${toSlug(munName)}`}
            className="card px-4 py-2 text-sm text-primary hover:bg-primary/5 transition-colors min-h-[44px] flex items-center"
          >
            Alle {catLabel.toLowerCase()} i {munName}
          </Link>
          {DAYCARE_CATEGORY_SLUGS.filter((c) => c !== cat).map((c) => (
            <Link
              key={c}
              to={`/billigste-${c}/${toSlug(munName)}`}
              className="card px-4 py-2 text-sm text-primary hover:bg-primary/5 transition-colors min-h-[44px] flex items-center"
            >
              Billigste {CATEGORY_SINGULAR_DA[c]} i {munName}
            </Link>
          ))}
        </div>
      </section>

      {/* Related searches */}
      <RelatedSearches municipality={munName} category={cat} />

      <DataFreshness />
    </>
  );
}
