import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import SEOHead from "@/components/shared/SEOHead";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import JsonLd from "@/components/shared/JsonLd";
import { toSlug } from "@/lib/slugs";
import DataFreshness from "@/components/shared/DataFreshness";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { SkeletonHero, SkeletonTable } from "@/components/shared/Skeletons";
import NormeringTrendChart from "@/components/charts/NormeringTrendChart";

type SortKey = "municipality" | "dagpleje" | "0-2" | "3-5";
type SortDir = "asc" | "desc";

interface NormeringEntry {
  municipality: string;
  ageGroup: string;
  year: number;
  ratio: number;
}

interface KommuneRow {
  municipality: string;
  dagpleje: number | null;
  "0-2": number | null;
  "3-5": number | null;
}

const AGE_GROUPS = ["dagpleje", "0-2", "3-5"] as const;
const AGE_GROUP_LABELS: Record<string, string> = {
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

export default function NormeringPage() {
  const { normering, loading } = useData() as ReturnType<typeof useData> & {
    normering: NormeringEntry[];
  };
  const { language } = useLanguage();
  const isDa = language === "da";
  const [sortKey, setSortKey] = useState<SortKey>("0-2");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [searchQuery, setSearchQuery] = useState("");

  const normeringData = useMemo<NormeringEntry[]>(() => normering ?? [], [normering]);

  const latestYear = useMemo(() => {
    if (normeringData.length === 0) return 2023;
    return Math.max(...normeringData.map((d) => d.year));
  }, [normeringData]);

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

  // Kommune rows for latest year
  const kommuneRows = useMemo(() => {
    const map = new Map<string, KommuneRow>();
    for (const d of normeringData) {
      if (d.year !== latestYear) continue;
      let row = map.get(d.municipality);
      if (!row) {
        row = { municipality: d.municipality, dagpleje: null, "0-2": null, "3-5": null };
        map.set(d.municipality, row);
      }
      if (d.ageGroup === "dagpleje") row.dagpleje = d.ratio;
      else if (d.ageGroup === "0-2") row["0-2"] = d.ratio;
      else if (d.ageGroup === "3-5") row["3-5"] = d.ratio;
    }
    return Array.from(map.values());
  }, [normeringData, latestYear]);

  // Sorted rows
  const sortedRows = useMemo(() => {
    const rows = [...kommuneRows];
    rows.sort((a, b) => {
      if (sortKey === "municipality") {
        const cmp = a.municipality.localeCompare(b.municipality, "da");
        return sortDir === "asc" ? cmp : -cmp;
      }
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      const cmp = av - bv;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [kommuneRows, sortKey, sortDir]);

  // Filtered rows by search query
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return sortedRows;
    const q = searchQuery.toLowerCase().trim();
    return sortedRows.filter((row) =>
      row.municipality.toLowerCase().includes(q)
    );
  }, [sortedRows, searchQuery]);

  // National trend chart data (2017-2023)
  const trendData = useMemo(() => {
    const byYear: Record<number, Record<string, { sum: number; count: number }>> = {};
    for (const d of normeringData) {
      if (!byYear[d.year]) byYear[d.year] = {};
      if (!byYear[d.year][d.ageGroup]) byYear[d.year][d.ageGroup] = { sum: 0, count: 0 };
      byYear[d.year][d.ageGroup].sum += d.ratio;
      byYear[d.year][d.ageGroup].count++;
    }
    return Object.keys(byYear)
      .map(Number)
      .sort((a, b) => a - b)
      .map((year) => {
        const entry: Record<string, number> = { year };
        for (const ag of AGE_GROUPS) {
          const v = byYear[year][ag];
          if (v) entry[ag] = +(v.sum / v.count).toFixed(2);
        }
        return entry;
      });
  }, [normeringData]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <SkeletonHero />
        <SkeletonTable rows={8} />
      </div>
    );
  }

  if (normeringData.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 text-center max-w-md">
          <h1 className="font-display text-2xl font-bold mb-4">Normeringsdata ikke tilgængelig</h1>
          <p className="text-muted mb-6">
            Vi kunne ikke indlæse normeringsdata. Prøv igen senere.
          </p>
          <Link to="/" className="text-primary hover:underline font-medium">
            Gå til forsiden
          </Link>
        </div>
      </div>
    );
  }

  const pageTitle = "Normering i danske dagtilbud — Kommune-ranking";
  const pageDesc = `Se normering (børn per voksen) i alle 98 kommuner for dagpleje, vuggestue (0-2 år) og børnehave (3-5 år). Sammenlign kommuner og find de bedste normeringer i Danmark.`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: pageTitle,
    description: pageDesc,
    url: "https://institutionsguiden.dk/normering",
    publisher: {
      "@type": "Organization",
      name: "Institutionsguide.dk",
      url: "https://institutionsguiden.dk",
    },
  };

  return (
    <>
      <SEOHead title={pageTitle} description={pageDesc} path="/normering" />
      <JsonLd data={jsonLd} />

      <Breadcrumbs
        items={[
          { label: isDa ? "Forside" : "Home", href: "/" },
          { label: isDa ? "Normering" : "Staff ratios" },
        ]}
      />

      {/* Header */}
      <ScrollReveal><section className="px-4 py-10 sm:py-14 text-center bg-gradient-to-b from-primary/5 to-transparent">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
          Normering i danske dagtilbud
        </h1>
        <p className="text-muted text-base max-w-2xl mx-auto">
          Oversigt over normering (børn per voksen) i alle {kommuneRows.length} kommuner.
          Lavere tal = bedre normering. Data for {latestYear}.
        </p>
        <DataFreshness />
      </section></ScrollReveal>

      {/* National averages */}
      <ScrollReveal><section className="max-w-4xl mx-auto px-4 py-6">
        <h2 className="font-display text-xl font-bold text-foreground mb-4">
          Landsgennemsnit {latestYear}
        </h2>
        <ScrollReveal stagger className="grid grid-cols-3 gap-3">
          {AGE_GROUPS.map((ag) => (
            <div key={ag} className="card p-4 text-center">
              <p className="text-xs text-muted mb-1">{AGE_GROUP_LABELS[ag]}</p>
              <p className={`font-mono text-lg font-bold ${ratioColor(nationalAvg[ag], ag)}`}>
                {formatRatio(nationalAvg[ag])}
              </p>
              <p className="text-xs text-muted mt-1">børn/voksen</p>
            </div>
          ))}
        </ScrollReveal>
      </section></ScrollReveal>

      {/* National trend chart */}
      <ScrollReveal>
        <NormeringTrendChart
          chartData={trendData}
          activeAgeGroups={[...AGE_GROUPS]}
          title="Udvikling i normering på landsplan"
        />
      </ScrollReveal>

      {/* Kommune ranking table */}
      <ScrollReveal><section className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="font-display text-xl font-bold text-foreground mb-3">
          Kommune-ranking {latestYear}
        </h2>
        {/* Search input */}
        <div className="mb-4">
          <input
            type="search"
            placeholder={isDa ? "Søg kommune..." : "Search municipality..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-80 px-4 py-2.5 rounded-xl border border-border bg-bg-card text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            aria-label={isDa ? "Søg kommune" : "Search municipality"}
          />
          {searchQuery.trim() && (
            <p className="text-xs text-muted mt-2" aria-live="polite">
              {isDa
                ? `Viser ${filteredRows.length} af ${kommuneRows.length} kommuner`
                : `Showing ${filteredRows.length} of ${kommuneRows.length} municipalities`}
            </p>
          )}
        </div>
        {/* Color legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted mb-4 px-1">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />{isDa ? "God normering" : "Good ratio"}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />{isDa ? "Middel" : "Average"}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />{isDa ? "Over grænseværdi" : "Above threshold"}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-bg z-10">
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 font-medium text-muted">
                  <button
                    onClick={() => handleSort("municipality")}
                    className="hover:text-foreground transition-colors"
                  >
                    Kommune{sortIndicator("municipality")}
                  </button>
                </th>
                {AGE_GROUPS.map((ag) => (
                  <th key={ag} className="text-right py-3 px-2 font-medium text-muted">
                    <button
                      onClick={() => handleSort(ag)}
                      className="hover:text-foreground transition-colors"
                    >
                      {AGE_GROUP_LABELS[ag]}{sortIndicator(ag)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr
                  key={row.municipality}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-2 px-2">
                    <Link
                      to={`/normering/${toSlug(row.municipality)}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {row.municipality}
                    </Link>
                  </td>
                  {AGE_GROUPS.map((ag) => (
                    <td
                      key={ag}
                      className={`text-right py-2 px-2 font-mono ${ratioColor(row[ag], ag)}`}
                    >
                      {formatRatio(row[ag])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section></ScrollReveal>

      {/* FAQ section */}
      <ScrollReveal><section className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="font-display text-xl font-bold text-foreground mb-4">
          Om normering i dagtilbud
        </h2>
        <div className="space-y-4 text-sm text-muted">
          <p>
            <strong className="text-foreground">Hvad er normering?</strong><br />
            Normering angiver forholdet mellem antal børn og antal voksne i et dagtilbud.
            Et lavere tal betyder færre børn per voksen og dermed bedre normering.
          </p>
          <p>
            <strong className="text-foreground">Hvad er minimumsnormering?</strong><br />
            Minimumsnormeringen kræver mindst 1 voksen per 3 børn i vuggestuer (0-2 år)
            og mindst 1 voksen per 6 børn i børnehaver (3-5 år).
          </p>
          <p>
            <strong className="text-foreground">Hvornår trådte minimumsnormeringen i kraft?</strong><br />
            Lovkravet om minimumsnormering trådte i kraft den 1. januar 2024.
            Kommunerne havde frem til da til at indfase normeringen gradvist.
          </p>
        </div>
      </section></ScrollReveal>
    </>
  );
}
