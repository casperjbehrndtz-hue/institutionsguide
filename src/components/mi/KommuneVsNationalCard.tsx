import { useMemo } from "react";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { useTrack } from "@/contexts/TrackContext";
import { buildMIDataset, leaderboard, nationalPercentileOfMedian } from "@/lib/mi/aggregate";
import { METRICS_BY_TRACK } from "@/lib/mi/metrics";
import { toSlug } from "@/lib/slugs";

function formatRaw(value: number | null, unit: string): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (unit === "kr./md.") return `${Math.round(value).toLocaleString("da-DK")} kr.`;
  if (unit === "%") return `${value.toFixed(value < 10 ? 1 : 0)}%`;
  if (unit === "/5") return `${value.toFixed(2)} / 5`;
  if (unit === "FP9") return value.toFixed(1);
  if (unit === "Δ karakter") return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
  if (unit === "børn/voksen") return `${value.toFixed(1)} pr. voksen`;
  if (unit === "sygedage/år") return `${value.toFixed(1)} dage`;
  return value.toFixed(1);
}

interface Props {
  /** Full kommune name, e.g. "Gentofte Kommune" or "Gentofte" */
  municipality: string;
  /** When true (default), includes a header row with the municipality name. */
  showHeader?: boolean;
  /** When true, adds a link to the full kommune page for the metric breakdown. */
  showKommuneLink?: boolean;
}

/**
 * A compact MIL comparison card for a single municipality. Shows — per metric —
 * kommunens medianværdi mod landsmedianen, direction-corrected so greener/up
 * always means "better".
 */
export default function KommuneVsNationalCard({ municipality, showHeader = true, showKommuneLink = false }: Props) {
  const { institutions, institutionStats, kommuneStats, normering } = useData();
  const { track, weights } = useTrack();

  const dataset = useMemo(
    () => buildMIDataset({ track, institutions, institutionStats, kommuneStats, normering }),
    [track, institutions, institutionStats, kommuneStats, normering],
  );

  const trackLabel = track === "daycare" ? "Dagtilbud" : "Folkeskole";
  const metrics = METRICS_BY_TRACK[track];

  const rows = useMemo(() => {
    const muniRows = dataset.byMunicipality.get(municipality) ?? [];
    return metrics.map((metric) => {
      const natMedian = dataset.national[metric.id]?.median ?? null;
      const muniMedian = dataset.municipalityMedians[metric.id]?.[municipality] ?? null;
      const muniPercentile = muniMedian != null
        ? nationalPercentileOfMedian(metric, dataset, muniMedian)
        : null;
      const delta = muniPercentile != null ? muniPercentile - 50 : 0;
      return { metric, natMedian, muniMedian, muniPercentile, delta, muniN: muniRows.length };
    });
  }, [dataset, metrics, municipality]);

  const muniScore = useMemo(() => {
    try {
      const board = leaderboard(dataset, weights);
      return board.municipalities.find((m) => m.municipality === municipality) ?? null;
    } catch {
      return null;
    }
  }, [dataset, weights, municipality]);

  const muniExists = (dataset.byMunicipality.get(municipality)?.length ?? 0) > 0;

  if (!muniExists) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-4 text-sm text-muted">
        Ingen {trackLabel.toLowerCase()}-data for {municipality}.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      {showHeader && (
        <header className="px-4 py-3 border-b border-border">
          <h3 className="font-display text-base font-bold text-foreground">
            {municipality} vs. landsmedianen — {trackLabel}
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Kommunens median sammenlignet med landsmedianen. Højere bjælke = bedre, uanset metrik.
          </p>
        </header>
      )}

      <div className="divide-y divide-border">
        <div className="grid grid-cols-[1fr_repeat(3,minmax(0,1fr))] gap-2 px-4 py-2 text-[11px] uppercase tracking-wider text-muted font-semibold">
          <span>Metrik</span>
          <span className="text-right">Kommune</span>
          <span className="text-right">Land</span>
          <span className="text-right">vs land</span>
        </div>
        {rows.map((row) => {
          const Arrow = Math.abs(row.delta) < 5 ? ArrowRight : row.delta > 0 ? ArrowUp : ArrowDown;
          const arrowCls = Math.abs(row.delta) < 5 ? "text-muted" : row.delta > 0 ? "text-emerald-600" : "text-red-600";
          return (
            <div key={row.metric.id} className="px-4 py-2.5">
              <div className="grid grid-cols-[1fr_repeat(3,minmax(0,1fr))] gap-2 items-baseline text-sm">
                <span className="font-medium text-foreground truncate">{row.metric.labelDa}</span>
                <span className="text-right text-foreground tabular-nums">
                  {formatRaw(row.muniMedian, row.metric.unit)}
                </span>
                <span className="text-right text-muted tabular-nums">
                  {formatRaw(row.natMedian, row.metric.unit)}
                </span>
                <span className={`text-right tabular-nums inline-flex items-center gap-0.5 justify-end ${arrowCls}`}>
                  <Arrow className="w-3 h-3" />
                  {row.delta >= 0 ? "+" : ""}{row.delta.toFixed(0)}
                </span>
              </div>
              <div className="mt-1.5 relative h-1.5 rounded-full bg-border/40 overflow-hidden">
                <div
                  className="absolute top-0 h-full bg-primary"
                  style={{ width: `${Math.max(0, Math.min(100, row.muniPercentile ?? 50))}%` }}
                />
                <div
                  className="absolute top-0 h-full w-0.5 bg-foreground/60"
                  style={{ left: "50%" }}
                  aria-hidden
                />
              </div>
            </div>
          );
        })}
      </div>

      <footer className="px-4 py-2 border-t border-border bg-muted/5 flex items-center justify-between text-[11px] text-muted">
        <span>
          {muniScore ? `Samlet score: ${muniScore.score.toFixed(1)} · ` : ""}
          {rows[0]?.muniN ?? 0} institutioner i sporet
        </span>
        {showKommuneLink && (
          <Link to={`/kommune/${toSlug(municipality)}`} className="text-primary hover:underline font-medium">
            Se {municipality} →
          </Link>
        )}
      </footer>
    </div>
  );
}
