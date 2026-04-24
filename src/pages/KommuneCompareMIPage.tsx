import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, ArrowUp, X } from "lucide-react";
import { useMunicipalityIntelligence } from "@/hooks/useMunicipalityIntelligence";
import { useTrack } from "@/contexts/TrackContext";
import { useData } from "@/contexts/DataContext";
import { useKommunePins } from "@/hooks/useKommunePins";
import { nationalPercentileOfMedian } from "@/lib/mi/aggregate";
import { METRICS_BY_TRACK } from "@/lib/mi/metrics";
import LifeStageToggle from "@/components/mi/LifeStageToggle";
import WeightSliders from "@/components/mi/WeightSliders";
import SEOHead from "@/components/shared/SEOHead";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import JsonLd from "@/components/shared/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";
import { toSlug } from "@/lib/slugs";

function formatRaw(value: number | null, unit: string): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (unit === "kr./md.") return `${Math.round(value).toLocaleString("da-DK")} kr.`;
  if (unit === "%") return `${value.toFixed(value < 10 ? 1 : 0)}%`;
  if (unit === "/5") return `${value.toFixed(2)}`;
  if (unit === "FP9") return value.toFixed(1);
  if (unit === "Δ karakter") return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
  if (unit === "børn/voksen") return `${value.toFixed(1)}`;
  if (unit === "sygedage/år") return `${value.toFixed(1)}`;
  return value.toFixed(1);
}

export default function KommuneCompareMIPage() {
  const { track } = useTrack();
  const { dataset, municipalities, nationalMean } = useMunicipalityIntelligence();
  const { pinned, togglePin, clearPins } = useKommunePins();
  const { institutions } = useData();
  const trackLabel = track === "daycare" ? "Dagtilbud" : "Folkeskole";
  const metrics = METRICS_BY_TRACK[track];

  // Resolve pinned names against canonical municipality list (handles "Gentofte" vs "Gentofte Kommune")
  const resolvedPins = useMemo(() => {
    const canonical = new Set(institutions.map((i) => i.municipality));
    return pinned.map((raw) => {
      if (canonical.has(raw)) return raw;
      const slug = toSlug(raw);
      const match = [...canonical].find((m) => toSlug(m) === slug);
      return match ?? raw;
    });
  }, [pinned, institutions]);

  const scoreByMunicipality = useMemo(
    () => new Map(municipalities.map((m) => [m.municipality, m])),
    [municipalities],
  );

  return (
    <>
      <SEOHead
        title={`Sammenlign kommuner side om side — Kommune-intelligens | Institutionsguide`}
        description="Pin op til 3 kommuner og se deres score, drivers og råtal side om side. Del linket med din partner."
        path="/kommune-intelligens/sammenlign"
      />
      <JsonLd data={breadcrumbSchema([
        { name: "Forside", url: "https://www.institutionsguiden.dk/" },
        { name: "Kommune-intelligens", url: "https://www.institutionsguiden.dk/kommune-intelligens" },
        { name: "Sammenlign", url: "https://www.institutionsguiden.dk/kommune-intelligens/sammenlign" },
      ])} />

      <Breadcrumbs items={[
        { label: "Forside", href: "/" },
        { label: "Kommune-intelligens", href: "/kommune-intelligens" },
        { label: "Sammenlign" },
      ]} />

      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
        <header className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-4xl font-bold text-foreground mb-2">
              Sammenlign kommuner side om side
            </h1>
            <p className="text-muted max-w-2xl">
              {trackLabel} — landsmiddel = {nationalMean.toFixed(1)}.
              Justér vægtene for at se hvordan rangeringen ændrer sig.
            </p>
          </div>
          <LifeStageToggle />
        </header>

        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-[340px] shrink-0">
            <div className="lg:sticky lg:top-20 space-y-3">
              <WeightSliders />
              <Link
                to="/kommune-intelligens"
                className="block text-sm text-primary hover:underline text-center"
              >
                ← Tilbage til leaderboard
              </Link>
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            {resolvedPins.length === 0 ? (
              <div className="rounded-xl border border-border bg-bg-card p-6 text-center">
                <p className="text-sm text-muted mb-3">
                  Ingen kommuner valgt endnu. Gå tilbage til leaderboardet og klik
                  på pin-ikonet ved op til 3 kommuner.
                </p>
                <Link
                  to="/kommune-intelligens"
                  className="inline-block text-sm font-semibold px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary-light transition-colors"
                >
                  Åbn leaderboard →
                </Link>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/5">
                        <th className="text-left text-[11px] uppercase tracking-wider text-muted font-semibold px-3 py-3 sticky left-0 bg-muted/5 z-10 w-[38%]">
                          Metrik
                        </th>
                        {resolvedPins.map((mun) => {
                          const score = scoreByMunicipality.get(mun);
                          return (
                            <th key={mun} className="text-left px-3 py-3 align-top">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <Link to={`/kommune/${toSlug(mun)}`} className="block font-display text-sm font-bold text-foreground hover:text-primary truncate">
                                    {mun}
                                  </Link>
                                  {score && (
                                    <p className="text-[11px] text-muted mt-0.5">
                                      Score <span className="font-mono text-foreground font-semibold">{score.score.toFixed(1)}</span>
                                      <span className="text-muted/70"> · N={score.n}</span>
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={() => togglePin(mun)}
                                  className="p-1 text-muted hover:text-foreground transition-colors"
                                  aria-label={`Fjern ${mun}`}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </th>
                          );
                        })}
                        <th className="text-left text-[11px] uppercase tracking-wider text-muted font-semibold px-3 py-3">
                          Land
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.map((metric) => {
                        const natMedian = dataset.national[metric.id]?.median ?? null;
                        return (
                          <tr key={metric.id} className="border-b border-border last:border-b-0">
                            <th scope="row" className="text-left px-3 py-3 align-top font-medium text-foreground sticky left-0 bg-bg-card z-10">
                              <span className="block text-sm">{metric.labelDa}</span>
                              <span className="block text-[11px] text-muted font-normal">{metric.unit}</span>
                            </th>
                            {resolvedPins.map((mun) => {
                              const muniMedian = dataset.municipalityMedians[metric.id]?.[mun] ?? null;
                              const p = muniMedian != null ? nationalPercentileOfMedian(metric, dataset, muniMedian) : null;
                              const delta = p != null ? p - 50 : 0;
                              const Arrow = Math.abs(delta) < 5 ? ArrowRight : delta > 0 ? ArrowUp : ArrowDown;
                              const arrowCls = Math.abs(delta) < 5 ? "text-muted" : delta > 0 ? "text-emerald-600" : "text-red-600";
                              return (
                                <td key={mun} className="px-3 py-3 align-top">
                                  <div className="flex items-baseline justify-between gap-1">
                                    <span className="font-mono tabular-nums text-sm text-foreground font-medium">
                                      {formatRaw(muniMedian, metric.unit)}
                                    </span>
                                    <span className={`inline-flex items-center gap-0.5 text-[11px] tabular-nums ${arrowCls}`}>
                                      <Arrow className="w-3 h-3" />
                                      {delta >= 0 ? "+" : ""}{delta.toFixed(0)}
                                    </span>
                                  </div>
                                  <div className="mt-1.5 relative h-1 rounded-full bg-border/40 overflow-hidden">
                                    <div
                                      className="absolute top-0 h-full bg-primary"
                                      style={{ width: `${Math.max(0, Math.min(100, p ?? 50))}%` }}
                                    />
                                    <div
                                      className="absolute top-0 h-full w-0.5 bg-foreground/60"
                                      style={{ left: "50%" }}
                                      aria-hidden
                                    />
                                  </div>
                                </td>
                              );
                            })}
                            <td className="px-3 py-3 align-top font-mono tabular-nums text-sm text-muted">
                              {formatRaw(natMedian, metric.unit)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <footer className="px-4 py-2 border-t border-border bg-muted/5 flex items-center justify-between">
                  <p className="text-[11px] text-muted">
                    Tal er median pr. kommune for {trackLabel.toLowerCase()}-sporet. Bjælken viser
                    national percentil (0-100) — højere er bedre.
                  </p>
                  <button
                    onClick={clearPins}
                    className="text-xs text-muted hover:text-foreground transition-colors shrink-0"
                  >
                    Ryd pinned
                  </button>
                </footer>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
