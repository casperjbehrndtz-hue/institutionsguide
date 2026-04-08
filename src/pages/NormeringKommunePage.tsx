import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import SEOHead from "@/components/shared/SEOHead";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import JsonLd from "@/components/shared/JsonLd";
import { buildSlugMap, toSlug } from "@/lib/slugs";
import { SkeletonHero, SkeletonTable } from "@/components/shared/Skeletons";
import DataFreshness from "@/components/shared/DataFreshness";
import NormeringTrendChart from "@/components/charts/NormeringTrendChart";

interface NormeringEntry {
  municipality: string;
  ageGroup: string;
  year: number;
  ratio: number;
}

const AGE_GROUPS = ["dagpleje", "0-2", "3-5"] as const;
const AGE_GROUP_SHORT: Record<string, string> = {
  dagpleje: "Dagpleje",
  "0-2": "0-2 år",
  "3-5": "3-5 år",
};

function ratioColor(value: number | null, ageGroup: string): string {
  if (value === null) return "";
  if (ageGroup === "0-2") {
    if (value < 3) return "text-green-600 dark:text-green-400";
    if (value < 3.5) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  }
  if (ageGroup === "dagpleje") {
    if (value < 3.5) return "text-green-600 dark:text-green-400";
    if (value < 4) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  }
  // 3-5
  if (value < 6) return "text-green-600 dark:text-green-400";
  if (value < 6.5) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function formatRatio(v: number | null): string {
  if (v === null) return "—";
  return v.toFixed(1).replace(".", ",");
}

function trendArrow(current: number | null, previous: number | null): string {
  if (current === null || previous === null) return "";
  if (current < previous) return " ↓"; // improving (fewer children per adult)
  if (current > previous) return " ↑"; // worsening
  return " →";
}

function trendLabel(current: number | null, previous: number | null): string {
  if (current === null || previous === null) return "";
  if (current < previous) return "Forbedret";
  if (current > previous) return "Forværret";
  return "Uændret";
}

function trendColor(current: number | null, previous: number | null): string {
  if (current === null || previous === null) return "text-muted";
  if (current < previous) return "text-green-600 dark:text-green-400";
  if (current > previous) return "text-red-600 dark:text-red-400";
  return "text-muted";
}

export default function NormeringKommunePage() {
  const { kommune: kommuneSlug } = useParams<{ kommune: string }>();
  const { normering, municipalities, loading } = useData() as ReturnType<typeof useData> & {
    normering: NormeringEntry[];
  };

  const normeringData = useMemo<NormeringEntry[]>(() => normering ?? [], [normering]);

  // Build slug map from all municipalities in normering data
  const allMunicipalities = useMemo(() => {
    const names = new Set<string>();
    for (const d of normeringData) names.add(d.municipality);
    // Also include municipalities from DataContext
    for (const m of municipalities) names.add(m.municipality);
    return Array.from(names);
  }, [normeringData, municipalities]);

  const slugMap = useMemo(() => buildSlugMap(allMunicipalities), [allMunicipalities]);
  const kommuneName = kommuneSlug ? slugMap.get(kommuneSlug) ?? "" : "";

  // Filter data for this kommune
  const kommuneData = useMemo(
    () => normeringData.filter((d) => d.municipality === kommuneName),
    [normeringData, kommuneName]
  );

  const latestYear = useMemo(() => {
    if (normeringData.length === 0) return 2023;
    return Math.max(...normeringData.map((d) => d.year));
  }, [normeringData]);

  const previousYear = latestYear - 1;

  // Latest values for this kommune
  const latestValues = useMemo(() => {
    const vals: Record<string, number | null> = {};
    for (const ag of AGE_GROUPS) {
      const entry = kommuneData.find((d) => d.year === latestYear && d.ageGroup === ag);
      vals[ag] = entry?.ratio ?? null;
    }
    return vals;
  }, [kommuneData, latestYear]);

  // Previous year values for trend
  const previousValues = useMemo(() => {
    const vals: Record<string, number | null> = {};
    for (const ag of AGE_GROUPS) {
      const entry = kommuneData.find((d) => d.year === previousYear && d.ageGroup === ag);
      vals[ag] = entry?.ratio ?? null;
    }
    return vals;
  }, [kommuneData, previousYear]);

  // National averages per age group (latest year)
  const nationalAvg = useMemo(() => {
    const avgs: Record<string, { sum: number; count: number }> = {};
    for (const d of normeringData) {
      if (d.year !== latestYear) continue;
      if (!avgs[d.ageGroup]) avgs[d.ageGroup] = { sum: 0, count: 0 };
      avgs[d.ageGroup].sum += d.ratio;
      avgs[d.ageGroup].count++;
    }
    const result: Record<string, number | null> = {};
    for (const ag of AGE_GROUPS) {
      result[ag] = avgs[ag] ? avgs[ag].sum / avgs[ag].count : null;
    }
    return result;
  }, [normeringData, latestYear]);

  // Rankings per age group
  const rankings = useMemo(() => {
    const result: Record<string, { rank: number; total: number } | null> = {};
    for (const ag of AGE_GROUPS) {
      const entries = normeringData
        .filter((d) => d.year === latestYear && d.ageGroup === ag)
        .sort((a, b) => a.ratio - b.ratio); // ascending = best first
      const idx = entries.findIndex((d) => d.municipality === kommuneName);
      if (idx === -1) {
        result[ag] = null;
      } else {
        result[ag] = { rank: idx + 1, total: entries.length };
      }
    }
    return result;
  }, [normeringData, latestYear, kommuneName]);

  // Chart data
  const chartData = useMemo(() => {
    const byYear: Record<number, Record<string, number>> = {};
    for (const d of kommuneData) {
      if (!byYear[d.year]) byYear[d.year] = {};
      byYear[d.year][d.ageGroup] = d.ratio;
    }
    return Object.keys(byYear)
      .map(Number)
      .sort((a, b) => a - b)
      .map((year) => ({ year, ...byYear[year] }));
  }, [kommuneData]);

  const activeAgeGroups = useMemo(() => {
    const groups = new Set(kommuneData.map((d) => d.ageGroup));
    return AGE_GROUPS.filter((ag) => groups.has(ag));
  }, [kommuneData]);

  if (loading) {
    return (<><SkeletonHero /><SkeletonTable /></>);
  }

  if (!kommuneName || kommuneData.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 text-center max-w-md">
          <h1 className="font-display text-2xl font-bold mb-4">Kommune ikke fundet</h1>
          <p className="text-muted mb-6">
            Vi kunne ikke finde normeringsdata for denne kommune.
          </p>
          <Link to="/normering" className="text-primary hover:underline font-medium">
            Se alle kommuner
          </Link>
        </div>
      </div>
    );
  }

  const pageTitle = `Normering i ${kommuneName} — Børn per voksen`;
  const pageDesc = `Se normering (børn per voksen) i ${kommuneName} Kommune for dagpleje, vuggestue og børnehave. Historisk udvikling fra 2017 til ${latestYear} og sammenligning med landsgennemsnittet.`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: pageTitle,
    description: pageDesc,
    url: `https://institutionsguiden.dk/normering/${toSlug(kommuneName)}`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Forside",
          item: "https://institutionsguiden.dk",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Normering",
          item: "https://institutionsguiden.dk/normering",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: kommuneName,
          item: `https://institutionsguiden.dk/normering/${toSlug(kommuneName)}`,
        },
      ],
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Hvad er normering?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Normering angiver forholdet mellem antal børn og antal voksne i et dagtilbud. Et lavere tal betyder færre børn per voksen og dermed mere opmærksomhed til det enkelte barn.",
        },
      },
      {
        "@type": "Question",
        name: "Hvad er minimumsnormering?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Minimumsnormeringen kræver mindst 1 voksen per 3 børn i vuggestuer (0-2 år) og mindst 1 voksen per 6 børn i børnehaver (3-5 år). Kravet blev lovfæstet i Danmark.",
        },
      },
      {
        "@type": "Question",
        name: "Hvornår trådte minimumsnormeringen i kraft?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Lovkravet om minimumsnormering trådte i kraft den 1. januar 2024. Kommunerne havde frem til da til at indfase normeringen gradvist.",
        },
      },
    ],
  };

  return (
    <>
      <SEOHead title={pageTitle} description={pageDesc} path={`/normering/${kommuneSlug}`} />
      <JsonLd data={jsonLd} />
      <JsonLd data={faqJsonLd} />

      <Breadcrumbs
        items={[
          { label: "Forside", href: "/" },
          { label: "Normering", href: "/normering" },
          { label: kommuneName },
        ]}
      />

      {/* Header */}
      <section className="px-4 py-10 sm:py-14 text-center bg-gradient-to-b from-primary/5 to-transparent">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
          Normering i {kommuneName}
        </h1>
        <p className="text-muted text-base max-w-2xl mx-auto">
          Børn per voksen i dagtilbud i {kommuneName} Kommune. Data for {latestYear}.
        </p>
      </section>

      {/* Stat cards */}
      <section className="max-w-4xl mx-auto px-4 py-6">
        <h2 className="font-display text-xl font-bold text-foreground mb-4">
          Aktuel normering i {kommuneName}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {AGE_GROUPS.map((ag) => {
            const current = latestValues[ag];
            const previous = previousValues[ag];
            const natAvg = nationalAvg[ag];
            const ranking = rankings[ag];

            return (
              <div key={ag} className="card p-4">
                <p className="text-xs text-muted mb-1">{AGE_GROUP_SHORT[ag]}</p>
                <div className="flex items-baseline gap-2">
                  <p className={`font-mono text-2xl font-bold ${ratioColor(current, ag)}`}>
                    {formatRatio(current)}
                  </p>
                  {current !== null && previous !== null && (
                    <span className={`text-sm font-medium ${trendColor(current, previous)}`}>
                      {trendArrow(current, previous)} {trendLabel(current, previous)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted mt-1">børn/voksen</p>

                {/* National comparison */}
                {current !== null && natAvg !== null && (
                  <p className="text-xs text-muted mt-2">
                    {formatRatio(current)} vs. landsgennemsnit {formatRatio(natAvg)}
                    {current < natAvg ? (
                      <span className="text-green-600 dark:text-green-400 ml-1">
                        ({formatRatio(natAvg - current)} bedre)
                      </span>
                    ) : current > natAvg ? (
                      <span className="text-red-600 dark:text-red-400 ml-1">
                        ({formatRatio(current - natAvg)} dårligere)
                      </span>
                    ) : (
                      <span className="ml-1">(lig med)</span>
                    )}
                  </p>
                )}

                {/* Ranking */}
                {ranking && (
                  <p className="text-xs text-muted mt-1">
                    Rang {ranking.rank} af {ranking.total} kommuner
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Trend chart */}
      <NormeringTrendChart chartData={chartData} activeAgeGroups={activeAgeGroups} kommuneName={kommuneName} />

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="font-display text-xl font-bold text-foreground mb-4">
          Ofte stillede spørgsmål
        </h2>
        <div className="space-y-4">
          <details className="card card-static p-4 group" open>
            <summary className="font-medium text-foreground cursor-pointer list-none flex items-center justify-between">
              Hvad er normering?
              <span className="text-muted group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="text-sm text-muted mt-2">
              Normering angiver forholdet mellem antal børn og antal voksne i et dagtilbud.
              Et lavere tal betyder færre børn per voksen og dermed mere opmærksomhed til det
              enkelte barn. I {kommuneName} er normeringen for 0-2 år {formatRatio(latestValues["0-2"])} børn
              per voksen ({latestYear}).
            </p>
          </details>
          <details className="card card-static p-4 group">
            <summary className="font-medium text-foreground cursor-pointer list-none flex items-center justify-between">
              Hvad er minimumsnormering?
              <span className="text-muted group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="text-sm text-muted mt-2">
              Minimumsnormeringen kræver mindst 1 voksen per 3 børn i vuggestuer (0-2 år) og
              mindst 1 voksen per 6 børn i børnehaver (3-5 år). Det svarer til en normering på
              henholdsvis 3,0 og 6,0.
            </p>
          </details>
          <details className="card card-static p-4 group">
            <summary className="font-medium text-foreground cursor-pointer list-none flex items-center justify-between">
              Hvornår trådte minimumsnormeringen i kraft?
              <span className="text-muted group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="text-sm text-muted mt-2">
              Lovkravet om minimumsnormering trådte i kraft den 1. januar 2024. Kommunerne havde
              frem til da til at indfase normeringen gradvist. Data på denne side viser udviklingen
              fra 2017 og frem.
            </p>
          </details>
        </div>
      </section>

      {/* Back link */}
      <section className="max-w-3xl mx-auto px-4 py-6 text-center">
        <Link
          to="/normering"
          className="inline-flex items-center gap-2 text-primary hover:underline font-medium min-h-[44px]"
        >
          ← Se alle kommuner
        </Link>
      </section>

      <DataFreshness />
    </>
  );
}
