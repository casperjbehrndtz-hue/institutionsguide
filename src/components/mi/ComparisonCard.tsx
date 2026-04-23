import { useMemo } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Info } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useTrack } from "@/contexts/TrackContext";
import { buildMIDataset } from "@/lib/mi/aggregate";
import { buildComparisonCard, type Reliability } from "@/lib/mi/compareCard";
import { isInTrack } from "@/lib/mi/metrics";

const RELIABILITY_LABEL: Record<Reliability, string> = {
  high: "Direkte målt",
  medium: "Estimeret fra kommunens median",
  low: "Estimeret fra landsmedian",
};

const RELIABILITY_DOT: Record<Reliability, string> = {
  high: "bg-emerald-500",
  medium: "bg-amber-500",
  low: "bg-red-500",
};

function formatRaw(value: number | null, unit: string): string {
  if (value == null) return "—";
  if (unit === "kr./md.") return `${Math.round(value).toLocaleString("da-DK")} kr.`;
  if (unit === "%") return `${value.toFixed(value < 10 ? 1 : 0)}%`;
  if (unit === "/5") return `${value.toFixed(2)} / 5`;
  if (unit === "FP9") return value.toFixed(1);
  if (unit === "Δ karakter") return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
  if (unit === "børn/voksen") return `${value.toFixed(1)} pr. voksen`;
  return value.toFixed(1);
}

interface Props {
  institutionId: string;
}

/**
 * Renders the per-metric comparison: This institution × Kommunens median × Landsmedianen.
 * Direction-corrected: green/up always means "better".
 */
export default function ComparisonCard({ institutionId }: Props) {
  const { institutions, institutionStats, kommuneStats, normering } = useData();
  const { track, setTrack } = useTrack();

  const institution = institutions.find((i) => i.id === institutionId);
  const correctTrack: typeof track | null = institution
    ? isInTrack("daycare", institution)
      ? "daycare"
      : isInTrack("school", institution)
        ? "school"
        : null
    : null;
  const activeTrack = correctTrack ?? track;

  const dataset = useMemo(
    () => buildMIDataset({ track: activeTrack, institutions, institutionStats, kommuneStats, normering }),
    [activeTrack, institutions, institutionStats, kommuneStats, normering],
  );

  const data = useMemo(() => buildComparisonCard({ dataset, institutionId }), [dataset, institutionId]);

  if (!institution || !correctTrack) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-4 text-sm text-muted">
        Sammenligning er ikke tilgængelig for denne institutionstype endnu.
      </div>
    );
  }

  const trackMismatch = correctTrack !== track;

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      <header className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-bold text-foreground">
            Sammenligning — {correctTrack === "daycare" ? "Dagtilbud" : "Folkeskole"}
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Institution mod kommune-median mod landsmedian. Højere balke = bedre.
          </p>
        </div>
        {trackMismatch && (
          <button
            onClick={() => setTrack(correctTrack)}
            className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            Skift til {correctTrack === "daycare" ? "Dagtilbud" : "Folkeskole"}
          </button>
        )}
      </header>

      <div className="divide-y divide-border">
        <div className="grid grid-cols-[1fr_repeat(3,minmax(0,1fr))] gap-2 px-4 py-2 text-[11px] uppercase tracking-wider text-muted font-semibold">
          <span>Metrik</span>
          <span className="text-right">Denne</span>
          <span className="text-right">Kommune</span>
          <span className="text-right">Land</span>
        </div>
        {data.rows.map((row) => {
          const delta = row.deltaVsNational;
          const Arrow = Math.abs(delta) < 5 ? ArrowRight : delta > 0 ? ArrowUp : ArrowDown;
          const arrowCls = Math.abs(delta) < 5 ? "text-muted" : delta > 0 ? "text-emerald-600" : "text-red-600";
          return (
            <div key={row.metric.id} className="px-4 py-3">
              <div className="grid grid-cols-[1fr_repeat(3,minmax(0,1fr))] gap-2 items-baseline text-sm">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${RELIABILITY_DOT[row.this.reliability]}`}
                    title={RELIABILITY_LABEL[row.this.reliability]}
                  />
                  <span className="font-medium text-foreground truncate">{row.metric.labelDa}</span>
                </div>
                <span className="text-right text-foreground font-medium tabular-nums">
                  {formatRaw(row.this.raw, row.metric.unit)}
                </span>
                <span className="text-right text-muted tabular-nums">
                  {data.insufficientMunicipalityData ? "—" : formatRaw(row.municipality.raw, row.metric.unit)}
                </span>
                <span className="text-right text-muted tabular-nums">
                  {formatRaw(row.national.raw, row.metric.unit)}
                </span>
              </div>
              <div className="mt-2 relative h-2 rounded-full bg-border/40 overflow-hidden">
                <div
                  className="absolute top-0 h-full bg-primary"
                  style={{ width: `${Math.max(0, Math.min(100, row.this.percentile))}%` }}
                />
                <div
                  className="absolute top-0 h-full w-0.5 bg-foreground/60"
                  style={{ left: `${row.national.percentile}%` }}
                  aria-hidden
                />
                {!data.insufficientMunicipalityData && (
                  <div
                    className="absolute top-0 h-full w-0.5 bg-accent"
                    style={{ left: `${row.municipality.percentile}%` }}
                    aria-hidden
                  />
                )}
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                <span>National percentil: {row.this.percentile.toFixed(0)}</span>
                <span className="flex items-center gap-1">
                  <Arrow className={`w-3 h-3 ${arrowCls}`} />
                  <span className={arrowCls}>
                    {delta >= 0 ? "+" : ""}{delta.toFixed(0)} vs land
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {data.insufficientMunicipalityData && (
        <footer className="px-4 py-2 border-t border-border bg-muted/5 text-xs text-muted flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Kommunen har for få institutioner i denne kategori (&lt; 5) til en pålidelig kommune-sammenligning.
        </footer>
      )}
    </div>
  );
}
