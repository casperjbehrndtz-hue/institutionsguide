import { useMemo } from "react";
import { Award, Heart, Wallet } from "lucide-react";
import { METRICS_BY_TRACK, type Track } from "@/lib/mi/metrics";
import type { MIDataset } from "@/lib/mi/aggregate";

interface Props {
  pinned: string[];
  dataset: MIDataset;
  track: Track;
}

interface Headline {
  icon: typeof Award;
  label: string;
  winner: string;
  value: string;
  /** Plain-language runner-up sentence */
  runnerUp?: string;
  color: string;
}

function formatValue(value: number, unit: string): string {
  if (unit === "kr./md.") return `${Math.round(value).toLocaleString("da-DK")} kr./md.`;
  if (unit === "%") return `${value.toFixed(value < 10 ? 1 : 0)}%`;
  if (unit === "/5") return `${value.toFixed(2)} / 5`;
  if (unit === "FP9") return `${value.toFixed(1)}`;
  if (unit === "Δ karakter") return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
  if (unit === "børn/voksen") return `${value.toFixed(1)} børn/voksen`;
  if (unit === "sygedage/år") return `${value.toFixed(1)} dage/år`;
  return value.toFixed(1);
}

/**
 * Per-track metrics to highlight as headlines.
 * Each entry says: "which metric matters?" and "do we prefer high or low?"
 */
const HEADLINE_METRICS: Record<Track, { metricId: string; label: string; icon: typeof Award; color: string }[]> = {
  school: [
    { metricId: "s_grade",  label: "Højeste karaktergennemsnit", icon: Award,   color: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/50" },
    { metricId: "s_triv_s", label: "Bedste trivsel",             icon: Heart,   color: "bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800/50" },
    { metricId: "s_undeff", label: "Størst undervisningsløft",   icon: Award,   color: "bg-primary/10 border-primary/30" },
  ],
  daycare: [
    { metricId: "d_norm",     label: "Bedste normering",           icon: Heart, color: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/50" },
    { metricId: "d_tilfreds", label: "Højeste forældretilfredshed", icon: Award, color: "bg-primary/10 border-primary/30" },
    { metricId: "d_takst",    label: "Billigst månedspris",         icon: Wallet, color: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50" },
  ],
};

export default function KommuneHeadlines({ pinned, dataset, track }: Props) {
  const headlines = useMemo<Headline[]>(() => {
    if (pinned.length < 2) return [];
    const metrics = METRICS_BY_TRACK[track];
    const out: Headline[] = [];
    for (const { metricId, label, icon, color } of HEADLINE_METRICS[track]) {
      const metric = metrics.find((m) => m.id === metricId);
      if (!metric) continue;
      // Gather muni medians among pinned
      const entries: { mun: string; value: number }[] = [];
      for (const mun of pinned) {
        const v = dataset.municipalityMedians[metricId]?.[mun];
        if (v != null && Number.isFinite(v)) entries.push({ mun, value: v });
      }
      if (entries.length === 0) continue;
      entries.sort((a, b) => metric.direction === 1 ? b.value - a.value : a.value - b.value);
      const winner = entries[0];
      const runnerUp = entries[1];
      const gap = runnerUp ? Math.abs(winner.value - runnerUp.value) : 0;
      const gapText = runnerUp
        ? gap < 0.01
          ? `lige ved siden af ${runnerUp.mun}`
          : `${formatValue(gap, metric.unit)} ${metric.direction === 1 ? "foran" : "lavere end"} ${runnerUp.mun}`
        : undefined;
      out.push({
        icon,
        label,
        winner: winner.mun,
        value: formatValue(winner.value, metric.unit),
        runnerUp: gapText,
        color,
      });
    }
    return out;
  }, [pinned, dataset, track]);

  if (headlines.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="sr-only">Overskrifter — hvem vinder på hvad</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {headlines.map((h) => {
          const Icon = h.icon;
          return (
            <div
              key={h.label}
              className={`rounded-2xl border p-4 ${h.color}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-foreground/70 shrink-0" />
                <p className="text-[11px] uppercase tracking-wide text-foreground/70 font-semibold">
                  {h.label}
                </p>
              </div>
              <p className="font-display text-lg sm:text-xl font-bold text-foreground leading-tight mb-1">
                {h.winner}
              </p>
              <p className="font-mono text-sm text-foreground/80 tabular-nums">
                {h.value}
              </p>
              {h.runnerUp && (
                <p className="text-[11px] text-muted mt-1.5 leading-snug">
                  {h.runnerUp}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
