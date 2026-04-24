import { Link, useNavigate } from "react-router-dom";
import { Pin, Sparkles } from "lucide-react";
import type { MunicipalityScore, MIDataset } from "@/lib/mi/aggregate";
import { topDriversForMunicipality } from "@/lib/mi/aggregate";
import { toSlug } from "@/lib/slugs";
import { useKommunePins } from "@/hooks/useKommunePins";
import { useTrack } from "@/contexts/TrackContext";

interface Props {
  municipalities: MunicipalityScore[];
  nationalMean: number;
  trackLabel: string;
  dataset: MIDataset;
}

function scoreLabel(score: number): { label: string; cls: string } {
  if (score >= 75) return { label: "Top 10%", cls: "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border-emerald-600/20" };
  if (score >= 60) return { label: "Over middel", cls: "bg-primary/10 text-primary border-primary/20" };
  if (score >= 45) return { label: "Middel", cls: "bg-border/50 text-muted border-border" };
  if (score >= 35) return { label: "Under middel", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" };
  return { label: "Bund 10%", cls: "bg-red-600/10 text-red-700 dark:text-red-400 border-red-600/20" };
}

function reliabilityLabel(n: number, meanReliability: number): { label: string; cls: string; title: string } {
  if (n < 5) return {
    label: "Få data",
    cls: "text-amber-700 dark:text-amber-400",
    title: `Kun ${n} institutioner i sporet — score er trukket mod landsmiddel (Bayesian shrinkage).`,
  };
  if (meanReliability >= 0.85) return {
    label: "Solid",
    cls: "text-emerald-700 dark:text-emerald-400",
    title: `${n} institutioner, ${(meanReliability * 100).toFixed(0)}% data dækket direkte.`,
  };
  return {
    label: "OK",
    cls: "text-muted",
    title: `${n} institutioner, ${(meanReliability * 100).toFixed(0)}% data dækket direkte — resten er udfyldt med kommunens median.`,
  };
}

export default function MunicipalityLeaderboard({ municipalities, nationalMean, trackLabel, dataset }: Props) {
  const navigate = useNavigate();
  const { weights } = useTrack();
  const { pinned, togglePin, isPinned, clearPins, max } = useKommunePins();

  if (municipalities.length === 0) {
    return (
      <div className="text-center py-12 text-muted text-sm">
        Sæt mindst én vægt over 0 for at se en rangering.
      </div>
    );
  }

  function goToCompare() {
    const qs = new URLSearchParams();
    qs.set("pinned", pinned.map((v) => encodeURIComponent(v)).join(","));
    navigate(`/kommune-intelligens/sammenlign?${qs.toString()}`);
  }

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      <header className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            Kommune-leaderboard — {trackLabel}
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Pin 2-3 kommuner for at sammenligne dem side om side. Landsmiddel = {nationalMean.toFixed(1)}.
          </p>
        </div>
        <span className="text-xs text-muted font-mono shrink-0">{municipalities.length} kommuner</span>
      </header>

      <ol className="divide-y divide-border">
        {municipalities.map((m, i) => {
          const label = scoreLabel(m.score);
          const rel = reliabilityLabel(m.n, m.meanReliability);
          const drivers = topDriversForMunicipality({ dataset, municipality: m.municipality, weights, max: 2 });
          const pinActive = isPinned(m.municipality);
          const pinDisabled = !pinActive && pinned.length >= max;
          return (
            <li key={m.municipality} className="px-3 sm:px-4 py-3 hover:bg-primary/5 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-muted font-mono tabular-nums text-xs w-6 shrink-0">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <Link to={`/kommune/${toSlug(m.municipality)}`} className="font-medium text-foreground hover:text-primary truncate">
                      {m.municipality}
                    </Link>
                    <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border ${label.cls}`}>
                      {label.label}
                    </span>
                    <span className="text-xs font-mono tabular-nums text-foreground/80">
                      Score {m.score.toFixed(1)}
                    </span>
                  </div>
                  {drivers.length > 0 && (
                    <p className="text-[11px] text-muted mt-1 leading-snug">
                      <span className="text-muted/75">Drevet af: </span>
                      {drivers.map((d, idx) => {
                        const sign = d.contribution >= 0 ? "+" : "−";
                        const mag = Math.abs(d.contribution).toFixed(0);
                        const cls = d.contribution >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400";
                        return (
                          <span key={d.metric.id}>
                            <span className="text-foreground/85">{d.metric.labelDa}</span>
                            <span className={`font-mono tabular-nums ml-0.5 ${cls}`}>({sign}{mag})</span>
                            {idx < drivers.length - 1 ? <span className="text-muted/60">, </span> : null}
                          </span>
                        );
                      })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-medium ${rel.cls}`} title={rel.title}>
                    {rel.label}
                  </span>
                  <button
                    onClick={() => togglePin(m.municipality)}
                    disabled={pinDisabled}
                    aria-pressed={pinActive}
                    title={pinDisabled ? `Max ${max} pinned — fjern én først` : pinActive ? "Fjern fra sammenligning" : "Pin til sammenligning"}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium transition-colors min-h-[32px] ${
                      pinActive
                        ? "border-primary bg-primary/10 text-primary"
                        : pinDisabled
                          ? "border-border/50 text-muted/50 cursor-not-allowed"
                          : "border-border text-muted hover:bg-primary/5 hover:text-foreground"
                    }`}
                  >
                    <Pin className={`w-3 h-3 ${pinActive ? "fill-current" : ""}`} />
                    <span className="hidden sm:inline">{pinActive ? "Pinned" : "Pin"}</span>
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <footer className="px-4 py-2 border-t border-border bg-muted/5 text-[11px] text-muted leading-snug">
        Score 0-100. Mikro-kommuner (under 5 institutioner) trækkes mod landsmiddel.
        <span className="font-medium"> Få data</span> = mindre end 5 institutioner.
        <span className="font-medium"> Solid</span> = direkte målt data på over 85% af metrikkerne.
      </footer>

      {pinned.length > 0 && (
        <div className="sticky bottom-0 z-10 border-t border-border bg-bg-card/95 backdrop-blur px-3 py-2 flex items-center justify-between gap-2">
          <div className="text-xs text-foreground">
            <span className="font-semibold">{pinned.length}</span> pinned
            <span className="text-muted"> · max {max}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearPins}
              className="text-xs text-muted hover:text-foreground transition-colors"
            >
              Fjern alle
            </button>
            <button
              onClick={goToCompare}
              disabled={pinned.length < 2}
              className="text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Sammenlign side om side →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
