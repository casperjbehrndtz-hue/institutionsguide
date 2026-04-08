import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import SEOHead from "@/components/shared/SEOHead";
import JsonLd from "@/components/shared/JsonLd";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { breadcrumbSchema } from "@/lib/schema";
import { formatDKK } from "@/lib/format";
import { SkeletonHero, SkeletonTable } from "@/components/shared/Skeletons";
import {
  buildSlugMap,
  CATEGORY_LABELS_DA,
  CATEGORY_SINGULAR_DA,
  CATEGORY_SLUGS,
  toSlug,
  type CategorySlug,
} from "@/lib/slugs";
import type { UnifiedInstitution } from "@/lib/types";
import DataAttribution from "@/components/shared/DataAttribution";
import DataFreshness from "@/components/shared/DataFreshness";
import { ComparisonCard, type CategoryStats } from "@/components/vs/ComparisonCard";
import { CompareRow } from "@/components/vs/CompareRow";

function computeStats(items: UnifiedInstitution[]): CategoryStats {
  const withPrice = items.filter((i) => i.monthlyRate !== null && i.monthlyRate > 0);
  const prices = withPrice.map((i) => i.monthlyRate!);
  const ownerships: Record<string, number> = {};
  for (const i of items) {
    const ow = i.ownership || i.subtype || "ukendt";
    ownerships[ow] = (ownerships[ow] || 0) + 1;
  }
  const minP = prices.length > 0 ? Math.min(...prices) : null;
  return {
    count: items.length,
    withPrice: withPrice.length,
    avgPrice:
      prices.length > 0
        ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
        : null,
    minPrice: minP,
    maxPrice: prices.length > 0 ? Math.max(...prices) : null,
    cheapest: minP !== null ? withPrice.find((i) => i.monthlyRate === minP) ?? null : null,
    ownerships,
  };
}

const VS_DESCRIPTIONS: Record<string, { da: string }> = {
  "vuggestue-vs-dagpleje": {
    da: "Vuggestue og dagpleje er begge pasningsmuligheder for børn i alderen 0-2 år. Dagpleje foregår typisk i dagplejerens private hjem med en lille gruppe børn (op til 4), mens vuggestuer er større institutioner med flere ansatte. Dagpleje tilbyder ofte en mere hjemlig atmosfære, mens vuggestuer typisk har flere pædagogiske ressourcer og aktiviteter.",
  },
  "vuggestue-vs-boernehave": {
    da: "Vuggestue er for de yngste børn (0-2 år), mens børnehave er for børn i alderen 3-5 år. Mange familier starter i vuggestue og skifter til børnehave, men nogle aldersintegrerede institutioner dækker hele aldersgruppen 0-5 år. Priserne varierer typisk, da vuggestuer ofte er dyrere pga. lavere normering (færre børn pr. voksen).",
  },
  "boernehave-vs-sfo": {
    da: "Børnehave er for børn i alderen 3-5 år, mens SFO (skolefritidsordning) er for skolebørn fra 6 år. Overgangen fra børnehave til SFO sker typisk, når barnet starter i skole. SFO er ofte billigere end børnehave, men tilbyder pasning før og efter skoletid samt i ferier.",
  },
  "dagpleje-vs-boernehave": {
    da: "Dagpleje er for børn fra 0-2 år, mens børnehave typisk er for børn fra 3-5 år. Dagpleje drives i private hjem med højst 4 børn, mens børnehaver er større institutioner. Priserne for dagpleje er ofte lavere end for vuggestue, men kan variere afhængigt af kommune.",
  },
  "vuggestue-vs-sfo": {
    da: "Vuggestue er for de yngste børn (0-2 år), mens SFO er en fritidsordning for skolebørn fra 6 år og op. De to tilbud dækker vidt forskellige aldersgrupper og behov. Vuggestuer har typisk den højeste normering og dermed ofte højere priser.",
  },
  "sfo-vs-fritidsklub": {
    da: "SFO (skolefritidsordning) er for børn i indskolingen (0.-3. klasse), mens fritidsklub typisk dækker 4.-6. klasse. Fritidsklubber er ofte billigere og giver børnene mere selvstændighed. Overgangen sker typisk efter 3. klasse.",
  },
  "skole-vs-efterskole": {
    da: "Folkeskoler og friskoler dækker grundskoleforløbet fra 0.-9. klasse, mens efterskoler er kostskoler for typisk 9. og 10. klasse. Efterskoler tilbyder et unikt socialt fællesskab med heldagsundervisning og bolig, men til en markant højere pris.",
  },
};

export default function VsPage() {
  const { comparison, municipality: munSlug } = useParams<{
    comparison: string;
    municipality: string;
  }>();
  const { institutions, municipalities, loading } = useData();

  const slugMap = useMemo(
    () => buildSlugMap(municipalities.map((m) => m.municipality)),
    [municipalities]
  );
  const munName = munSlug ? slugMap.get(munSlug) ?? "" : "";

  // Parse "vuggestue-vs-dagpleje" into [catA, catB]
  const [catA, catB] = useMemo(() => {
    if (!comparison) return [null, null];
    const parts = comparison.split("-vs-");
    if (parts.length !== 2) return [null, null];
    const a = parts[0] as CategorySlug;
    const b = parts[1] as CategorySlug;
    if (
      !(CATEGORY_SLUGS as readonly string[]).includes(a) ||
      !(CATEGORY_SLUGS as readonly string[]).includes(b)
    )
      return [null, null];
    return [a, b] as [CategorySlug, CategorySlug];
  }, [comparison]);

  const itemsA = useMemo(
    () =>
      catA
        ? institutions.filter(
            (i) => i.category === catA && i.municipality === munName
          )
        : [],
    [institutions, catA, munName]
  );

  const itemsB = useMemo(
    () =>
      catB
        ? institutions.filter(
            (i) => i.category === catB && i.municipality === munName
          )
        : [],
    [institutions, catB, munName]
  );

  const statsA = useMemo(() => computeStats(itemsA), [itemsA]);
  const statsB = useMemo(() => computeStats(itemsB), [itemsB]);

  if (loading) {
    return (<><SkeletonHero /><SkeletonTable /></>);
  }

  if (!catA || !catB || !munName || (itemsA.length === 0 && itemsB.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 text-center max-w-md">
          <h1 className="font-display text-2xl font-bold mb-4">Side ikke fundet</h1>
          <p className="text-muted mb-6">
            Vi kunne ikke finde data for denne sammenligning.
          </p>
          <Link to="/" className="text-primary hover:underline font-medium">
            Gå til forsiden
          </Link>
        </div>
      </div>
    );
  }

  const labelA = CATEGORY_LABELS_DA[catA];
  const labelB = CATEGORY_LABELS_DA[catB];
  const singA = CATEGORY_SINGULAR_DA[catA];
  const singB = CATEGORY_SINGULAR_DA[catB];
  const vsKey = `${catA}-vs-${catB}`;
  const descText = VS_DESCRIPTIONS[vsKey]?.da ?? "";

  const pageTitle = `${singA.charAt(0).toUpperCase() + singA.slice(1)} vs ${singB} i ${munName} ${new Date().getFullYear()} — Pris og forskelle`;
  const pageDesc = `Sammenlign ${singA} og ${singB} i ${munName}. ${statsA.count} ${labelA.toLowerCase()} vs. ${statsB.count} ${labelB.toLowerCase()}. Se priser, antal og forskelle.`;

  // JSON-LD FAQ for comparison
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Hvad er forskellen mellem ${singA} og ${singB} i ${munName}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: descText || `${labelA} og ${labelB.toLowerCase()} i ${munName} adskiller sig primært i pris og antal tilbud. Se den fulde sammenligning på denne side.`,
        },
      },
      ...(statsA.avgPrice && statsB.avgPrice
        ? [
            {
              "@type": "Question",
              name: `Hvad koster ${singA} vs ${singB} i ${munName}?`,
              acceptedAnswer: {
                "@type": "Answer",
                text: `Gennemsnitsprisen for ${singA} i ${munName} er ${statsA.avgPrice.toLocaleString("da-DK")} kr/md, mens ${singB} koster ${statsB.avgPrice.toLocaleString("da-DK")} kr/md i gennemsnit.`,
              },
            },
          ]
        : []),
    ],
  };

  return (
    <>
      <SEOHead
        title={pageTitle}
        description={pageDesc}
        path={`/sammenlign/${comparison}/${munSlug}`}
      />
      <JsonLd data={faqLd} />
      <JsonLd data={breadcrumbSchema([
        { name: "Forside", url: "https://institutionsguiden.dk/" },
        { name: munName, url: `https://institutionsguiden.dk/kommune/${encodeURIComponent(munName)}` },
        { name: `${singA.charAt(0).toUpperCase() + singA.slice(1)} vs ${singB}`, url: `https://institutionsguiden.dk/sammenlign/${comparison}/${munSlug}` },
      ])} />

      <Breadcrumbs
        items={[
          { label: "Forside", href: "/" },
          { label: munName, href: `/kommune/${encodeURIComponent(munName)}` },
          { label: `${singA.charAt(0).toUpperCase() + singA.slice(1)} vs ${singB}` },
        ]}
      />

      {/* Header */}
      <section className="px-4 py-10 sm:py-14 text-center bg-gradient-to-b from-primary/5 to-transparent">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
          {singA.charAt(0).toUpperCase() + singA.slice(1)} vs {singB} i {munName}
        </h1>
        <p className="text-muted text-base max-w-2xl mx-auto">
          En sammenligning af {singA} og {singB} i {munName} Kommune baseret
          på pris, antal og ejerskab.
        </p>
      </section>

      {/* Side-by-side comparison */}
      <section className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ComparisonCard label={labelA} stats={statsA} cat={catA} munName={munName} munSlug={munSlug!} />
          <ComparisonCard label={labelB} stats={statsB} cat={catB} munName={munName} munSlug={munSlug!} />
        </div>
      </section>

      {/* Comparison table */}
      <section className="max-w-3xl mx-auto px-4 py-6">
        <h2 className="font-display text-xl font-bold text-foreground mb-4">
          Sammenligning — {singA} vs {singB}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-4 text-left text-muted font-medium"></th>
                <th className="py-2 px-4 text-center text-muted font-medium">{labelA}</th>
                <th className="py-2 pl-4 text-center text-muted font-medium">{labelB}</th>
              </tr>
            </thead>
            <tbody>
              <CompareRow label="Antal" a={String(statsA.count)} b={String(statsB.count)} />
              <CompareRow
                label="Gennemsnitspris"
                a={statsA.avgPrice ? formatDKK(statsA.avgPrice) + "/md" : "–"}
                b={statsB.avgPrice ? formatDKK(statsB.avgPrice) + "/md" : "–"}
                highlightLower
                aNum={statsA.avgPrice}
                bNum={statsB.avgPrice}
              />
              <CompareRow
                label="Billigste"
                a={statsA.minPrice ? formatDKK(statsA.minPrice) + "/md" : "–"}
                b={statsB.minPrice ? formatDKK(statsB.minPrice) + "/md" : "–"}
                highlightLower
                aNum={statsA.minPrice}
                bNum={statsB.minPrice}
              />
              <CompareRow
                label="Dyreste"
                a={statsA.maxPrice ? formatDKK(statsA.maxPrice) + "/md" : "–"}
                b={statsB.maxPrice ? formatDKK(statsB.maxPrice) + "/md" : "–"}
              />
              <CompareRow
                label="Med prisoplysninger"
                a={`${statsA.withPrice} af ${statsA.count}`}
                b={`${statsB.withPrice} af ${statsB.count}`}
              />
            </tbody>
          </table>
        </div>
      </section>

      {/* Description */}
      {descText && (
        <section className="max-w-3xl mx-auto px-4 py-6">
          <h2 className="font-display text-xl font-bold text-foreground mb-3">
            Forskellen mellem {singA} og {singB}
          </h2>
          <p className="text-muted text-sm leading-relaxed">{descText}</p>
        </section>
      )}

      {/* Price winner */}
      {statsA.avgPrice && statsB.avgPrice && (
        <section className="max-w-3xl mx-auto px-4 py-6">
          <div className="card p-5 bg-green-50 border-green-200 text-center">
            <p className="text-green-800 font-semibold">
              {statsA.avgPrice < statsB.avgPrice ? (
                <>
                  {labelA} er i gennemsnit{" "}
                  <strong>{formatDKK(statsB.avgPrice - statsA.avgPrice)}/md billigere</strong>{" "}
                  end {labelB.toLowerCase()} i {munName}.
                </>
              ) : statsB.avgPrice < statsA.avgPrice ? (
                <>
                  {labelB} er i gennemsnit{" "}
                  <strong>{formatDKK(statsA.avgPrice - statsB.avgPrice)}/md billigere</strong>{" "}
                  end {labelA.toLowerCase()} i {munName}.
                </>
              ) : (
                <>
                  {labelA} og {labelB.toLowerCase()} koster i gennemsnit det samme i{" "}
                  {munName}.
                </>
              )}
            </p>
          </div>
        </section>
      )}

      {/* Dynamic analysis — unique per municipality */}
      <section className="max-w-3xl mx-auto px-4 py-6">
        <h2 className="font-display text-xl font-bold text-foreground mb-3">
          {singA.charAt(0).toUpperCase() + singA.slice(1)} og {singB} i {munName} — opsummering
        </h2>
        <div className="prose prose-sm text-muted leading-relaxed space-y-3">
          <p>
            I {munName} Kommune er der {statsA.count} {labelA.toLowerCase()} og{" "}
            {statsB.count} {labelB.toLowerCase()}.
            {statsA.withPrice > 0 && statsB.withPrice > 0 && (
              <> Af disse har {statsA.withPrice} {labelA.toLowerCase()} og {statsB.withPrice}{" "}
              {labelB.toLowerCase()} offentlige prisoplysninger.</>
            )}
          </p>
          {statsA.avgPrice && statsB.avgPrice && (
            <p>
              Prisniveauet adskiller sig med en gennemsnitlig forskel på{" "}
              {formatDKK(Math.abs(statsA.avgPrice - statsB.avgPrice))}/md.{" "}
              {statsA.avgPrice < statsB.avgPrice
                ? `${labelA} er billigst med et gennemsnit på ${formatDKK(statsA.avgPrice)}/md mod ${formatDKK(statsB.avgPrice)}/md for ${labelB.toLowerCase()}.`
                : `${labelB} er billigst med et gennemsnit på ${formatDKK(statsB.avgPrice)}/md mod ${formatDKK(statsA.avgPrice)}/md for ${labelA.toLowerCase()}.`}
              {" "}Over et helt år svarer det til en forskel på ca. {formatDKK(Math.abs(statsA.avgPrice - statsB.avgPrice) * 11)}{" "}
              (11 betalingsmåneder).
            </p>
          )}
          {Object.keys(statsA.ownerships).length > 1 && (
            <p>
              Blandt {labelA.toLowerCase()} i {munName} er ejerskabet fordelt på:{" "}
              {Object.entries(statsA.ownerships)
                .map(([ow, count]) => `${count} ${ow}`)
                .join(", ")}
              .
            </p>
          )}
        </div>
      </section>

      {/* Data attribution */}
      <DataAttribution category={catA} />

      {/* Related links */}
      <section className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="font-display text-lg font-bold text-foreground mb-3">
          Se også
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/${catA}/${toSlug(munName)}`}
            className="card px-4 py-2 text-sm text-primary hover:bg-primary/5 transition-colors min-h-[44px] flex items-center"
          >
            Alle {labelA.toLowerCase()} i {munName}
          </Link>
          <Link
            to={`/${catB}/${toSlug(munName)}`}
            className="card px-4 py-2 text-sm text-primary hover:bg-primary/5 transition-colors min-h-[44px] flex items-center"
          >
            Alle {labelB.toLowerCase()} i {munName}
          </Link>
          <Link
            to={`/kommune/${encodeURIComponent(munName)}`}
            className="card px-4 py-2 text-sm text-primary hover:bg-primary/5 transition-colors min-h-[44px] flex items-center"
          >
            Alle institutioner i {munName}
          </Link>
        </div>
      </section>

      <DataFreshness />
    </>
  );
}

