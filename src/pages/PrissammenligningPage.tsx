import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { useData } from "@/contexts/DataContext";
import SEOHead from "@/components/shared/SEOHead";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import JsonLd from "@/components/shared/JsonLd";
import { toSlug } from "@/lib/slugs";
import { SkeletonHero, SkeletonTable } from "@/components/shared/Skeletons";
import RelatedSearches from "@/components/shared/RelatedSearches";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { dataVersions } from "@/lib/dataVersions";

type RateKey = "vuggestue" | "boernehave" | "dagpleje" | "sfo";
type SortKey = "municipality" | RateKey;
type SortDir = "asc" | "desc";

const RATE_KEYS: RateKey[] = ["vuggestue", "boernehave", "dagpleje", "sfo"];
const RATE_LABELS: Record<RateKey, string> = {
  vuggestue: "Vuggestue",
  boernehave: "Børnehave",
  dagpleje: "Dagpleje",
  sfo: "SFO",
};

function formatMonthly(v: number | null): string | null {
  if (v === null) return null;
  return v.toLocaleString("da-DK", { maximumFractionDigits: 0 }) + " kr/md";
}

/** Return quartile boundaries (Q1 = 25th percentile, Q3 = 75th percentile) */
function quartiles(values: number[]): { q1: number; q3: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return { q1: 0, q3: 0 };
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  return { q1, q3 };
}

export default function PrissammenligningPage() {
  const { municipalities, loading } = useData();
  const [sortKey, setSortKey] = useState<SortKey>("vuggestue");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Compute quartile bounds per rate category
  const quartileBounds = useMemo(() => {
    const bounds: Record<RateKey, { q1: number; q3: number }> = {} as any;
    for (const key of RATE_KEYS) {
      const values = municipalities
        .map((m) => m.rates[key])
        .filter((v): v is number => v !== null);
      bounds[key] = quartiles(values);
    }
    return bounds;
  }, [municipalities]);

  // National averages
  const nationalAvg = useMemo(() => {
    const avgs: Record<RateKey, number | null> = {} as any;
    for (const key of RATE_KEYS) {
      const values = municipalities
        .map((m) => m.rates[key])
        .filter((v): v is number => v !== null);
      avgs[key] = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
    }
    return avgs;
  }, [municipalities]);

  // Cheapest and most expensive per category
  const extremes = useMemo(() => {
    const result: Record<RateKey, { cheapest: string | null; expensive: string | null }> = {} as any;
    for (const key of RATE_KEYS) {
      let minVal = Infinity;
      let maxVal = -Infinity;
      let minName: string | null = null;
      let maxName: string | null = null;
      for (const m of municipalities) {
        const v = m.rates[key];
        if (v === null) continue;
        if (v < minVal) { minVal = v; minName = m.municipality; }
        if (v > maxVal) { maxVal = v; maxName = m.municipality; }
      }
      result[key] = { cheapest: minName, expensive: maxName };
    }
    return result;
  }, [municipalities]);

  // Sorted rows
  const sortedRows = useMemo(() => {
    const rows = [...municipalities];
    rows.sort((a, b) => {
      if (sortKey === "municipality") {
        const cmp = a.municipality.localeCompare(b.municipality, "da");
        return sortDir === "asc" ? cmp : -cmp;
      }
      const av = a.rates[sortKey];
      const bv = b.rates[sortKey];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      const cmp = av - bv;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [municipalities, sortKey, sortDir]);

  // Active rate key for bar chart (only show when sorting by a rate category)
  const activeRateKey: RateKey = sortKey === "municipality" ? "vuggestue" : sortKey;

  // Bar chart data: top 10 cheapest + top 10 most expensive for active category
  const barChartData = useMemo(() => {
    const withRate = municipalities
      .filter((m) => m.rates[activeRateKey] !== null)
      .map((m) => ({ name: m.municipality, value: m.rates[activeRateKey]! }))
      .sort((a, b) => a.value - b.value);

    if (withRate.length < 20) return withRate;

    const cheapest = withRate.slice(0, 10);
    const expensive = withRate.slice(-10).reverse();
    // Combine: cheapest ascending, then a gap, then expensive descending
    return [
      ...cheapest,
      ...expensive.reverse(),
    ];
  }, [municipalities, activeRateKey]);

  const barChartAvg = nationalAvg[activeRateKey];

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

  function priceColor(value: number | null, key: RateKey): { className: string; label: string | null } {
    if (value === null) return { className: "", label: null };
    const { q1, q3 } = quartileBounds[key];
    if (value <= q1) return { className: "text-green-600 dark:text-green-400", label: "Billig ▼" };
    if (value >= q3) return { className: "text-red-600 dark:text-red-400", label: "Dyr ▲" };
    return { className: "", label: null };
  }

  function isExtreme(municipality: string, key: RateKey): string {
    const e = extremes[key];
    if (municipality === e.cheapest) return "bg-green-50 dark:bg-green-950/30";
    if (municipality === e.expensive) return "bg-red-50 dark:bg-red-950/30";
    return "";
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <SkeletonHero />
        <SkeletonTable rows={8} />
      </div>
    );
  }

  if (municipalities.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 text-center max-w-md">
          <h1 className="font-display text-2xl font-bold mb-4">Prisdata ikke tilgængelig</h1>
          <p className="text-muted mb-6">
            Vi kunne ikke indlæse prisdata. Prøv igen senere.
          </p>
          <Link to="/" className="text-primary hover:underline font-medium">
            Gå til forsiden
          </Link>
        </div>
      </div>
    );
  }

  const pageTitle = "Prissammenligning på tværs af kommuner — Find den billigste børnepasning i Danmark";
  const pageDesc =
    "Sammenlign priser på vuggestue, børnehave, dagpleje og SFO i alle 98 danske kommuner. Se hvem der er billigst og dyrest, og find den bedste pris for dit barn.";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: pageTitle,
    description: pageDesc,
    url: "https://institutionsguide.dk/prissammenligning",
    publisher: {
      "@type": "Organization",
      name: "Institutionsguide.dk",
      url: "https://institutionsguide.dk",
    },
  };

  return (
    <>
      <SEOHead title={pageTitle} description={pageDesc} path="/prissammenligning" />
      <JsonLd data={jsonLd} />

      <Breadcrumbs
        items={[
          { label: "Forside", href: "/" },
          { label: "Prissammenligning" },
        ]}
      />

      {/* Hero */}
      <ScrollReveal><section className="px-4 py-10 sm:py-14 text-center bg-gradient-to-b from-primary/5 to-transparent">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
          Prissammenligning på tværs af kommuner
        </h1>
        <p className="text-muted text-base max-w-2xl mx-auto">
          Find den billigste børnepasning i Danmark. Sammenlign månedlige takster for
          vuggestue, børnehave, dagpleje og SFO i alle {municipalities.length} kommuner.
        </p>
      </section></ScrollReveal>

      {/* National averages */}
      <ScrollReveal><section className="max-w-5xl mx-auto px-4 py-6">
        <h2 className="font-display text-xl font-bold text-foreground mb-4">
          Landsgennemsnit (månedlig takst)
        </h2>
        <ScrollReveal stagger><div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {RATE_KEYS.map((key) => (
            <div key={key} className="card p-4 text-center">
              <p className="text-xs text-muted mb-1">{RATE_LABELS[key]}</p>
              <p className="font-mono text-lg font-bold text-foreground">
                {formatMonthly(nationalAvg[key]) ?? <span className="text-muted/60 text-sm font-normal italic">Ikke tilgængelig</span>}
              </p>
              {extremes[key].cheapest && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Billigst: {extremes[key].cheapest}
                </p>
              )}
              {extremes[key].expensive && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Dyrest: {extremes[key].expensive}
                </p>
              )}
            </div>
          ))}
        </div></ScrollReveal>
      </section></ScrollReveal>

      {/* Price spread bar chart */}
      {barChartData.length > 0 && (
        <ScrollReveal><section className="max-w-5xl mx-auto px-4 py-6">
          <h2 className="font-display text-xl font-bold text-foreground mb-2">
            Prisspredning — {RATE_LABELS[activeRateKey]}
          </h2>
          <p className="text-xs text-muted mb-4">
            10 billigste og 10 dyreste kommuner. Stiplet linje viser landsgennemsnittet.
          </p>
          <div className="card p-4">
            <ResponsiveContainer width="100%" height={420}>
              <BarChart
                data={barChartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                <XAxis
                  type="number"
                  tickFormatter={(v: number) => `${v.toLocaleString("da-DK")} kr`}
                  fontSize={11}
                  tick={{ fill: "#4F5F6F" }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  fontSize={11}
                  tick={{ fill: "#4F5F6F" }}
                />
                <Tooltip
                  formatter={(value) => [
                    `${typeof value === 'number' ? value.toLocaleString("da-DK") : value} kr/md`,
                    RATE_LABELS[activeRateKey],
                  ]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    fontSize: "12px",
                  }}
                />
                {barChartAvg !== null && (
                  <ReferenceLine
                    x={barChartAvg}
                    stroke="#4F5F6F"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Gns: ${barChartAvg.toLocaleString("da-DK")} kr`,
                      position: "top",
                      fontSize: 11,
                      fill: "#4F5F6F",
                    }}
                  />
                )}
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {barChartData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={index < 10 ? "#1B3A5C" : "#B8642E"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-2 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#1B3A5C" }} />
                10 billigste
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#B8642E" }} />
                10 dyreste
              </span>
            </div>
          </div>
        </section></ScrollReveal>
      )}

      {/* Price table */}
      <ScrollReveal><section className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="font-display text-xl font-bold text-foreground mb-3">
          Alle kommuner — månedlig takst
        </h2>
        {/* Color legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted mb-4 px-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            Billigste kvartil
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            Dyreste kvartil
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 font-medium text-muted" scope="col">
                  <button
                    onClick={() => handleSort("municipality")}
                    className="hover:text-foreground transition-colors"
                  >
                    Kommune{sortIndicator("municipality")}
                  </button>
                </th>
                {RATE_KEYS.map((key) => (
                  <th key={key} className="text-right py-3 px-2 font-medium text-muted" scope="col">
                    <button
                      onClick={() => handleSort(key)}
                      className="hover:text-foreground transition-colors"
                    >
                      {RATE_LABELS[key]}{sortIndicator(key)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr
                  key={row.municipality}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-2 px-2">
                    <Link
                      to={`/kommune/${toSlug(row.municipality)}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {row.municipality}
                    </Link>
                  </td>
                  {RATE_KEYS.map((key) => {
                    const formatted = formatMonthly(row.rates[key]);
                    const { className: colorClass, label: quartileLabel } = priceColor(row.rates[key], key);
                    return (
                      <td
                        key={key}
                        className={`text-right py-2 px-2 font-mono ${colorClass} ${isExtreme(row.municipality, key)}`}
                      >
                        {formatted !== null ? (
                          <span>
                            {formatted}
                            {quartileLabel && (
                              <span className="ml-1 text-[10px] font-normal opacity-80">{quartileLabel}</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted/60 text-xs font-normal italic">Ikke tilgængelig</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section></ScrollReveal>

      {/* FAQ */}
      <ScrollReveal><section className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="font-display text-xl font-bold text-foreground mb-4">
          Om prissammenligning
        </h2>
        <div className="space-y-4 text-sm text-muted">
          <p>
            <strong className="text-foreground">Hvor kommer priserne fra?</strong><br />
            Taksterne er baseret på data fra Danmarks Statistik (StatBank RES88) og viser de
            kommunale takster for {dataVersions.prices.year}. Priserne er omregnet til månedlige beløb.
          </p>
          <p>
            <strong className="text-foreground">Hvorfor varierer priserne?</strong><br />
            Kommunerne fastsætter selv taksterne for børnepasning. Forskellen skyldes bl.a.
            kommunens økonomi, serviceniveau og lokale politiske prioriteringer. Forældre
            betaler maks. 25% af de faktiske udgifter.
          </p>
          <p>
            <strong className="text-foreground">Kan jeg få tilskud?</strong><br />
            Ja — familier med lav indkomst kan søge om hel eller delvis friplads.
            Beregn dit tilskud på vores{" "}
            <Link to="/friplads" className="text-primary hover:underline">
              fripladsberegner
            </Link>.
          </p>
        </div>
      </section></ScrollReveal>

      {/* Related searches */}
      <RelatedSearches />
    </>
  );
}
