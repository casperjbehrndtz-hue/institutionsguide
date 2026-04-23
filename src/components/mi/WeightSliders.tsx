import { RotateCcw } from "lucide-react";
import { useTrack } from "@/contexts/TrackContext";
import { METRICS_BY_TRACK } from "@/lib/mi/metrics";

export default function WeightSliders() {
  const { track, weights, setWeight, resetWeights } = useTrack();
  const metrics = METRICS_BY_TRACK[track];
  const totalWeight = Object.values(weights).reduce((s, v) => s + v, 0);

  return (
    <div className="rounded-xl border border-border bg-bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-display text-base font-bold text-foreground">Dine prioriteter</h3>
          <p className="text-xs text-muted mt-0.5">
            Justér vægten — leaderboardet genberegnes med det samme.
          </p>
        </div>
        <button
          onClick={resetWeights}
          className="text-xs text-muted hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Nulstil
        </button>
      </div>

      <div className="space-y-3">
        {metrics.map((m) => {
          const value = weights[m.id] ?? 0;
          const share = totalWeight > 0 ? (value / totalWeight) * 100 : 0;
          return (
            <div key={m.id}>
              <div className="flex items-baseline justify-between text-sm mb-1">
                <label htmlFor={`weight-${m.id}`} className="text-foreground font-medium">
                  {m.labelDa}
                </label>
                <span className="text-xs text-muted font-mono tabular-nums">
                  {value === 0 ? "—" : `${share.toFixed(0)}%`}
                </span>
              </div>
              <input
                id={`weight-${m.id}`}
                type="range"
                min={0}
                max={10}
                step={1}
                value={value}
                onChange={(e) => setWeight(m.id, Number(e.target.value))}
                className="w-full accent-primary"
                aria-label={`Vægt for ${m.labelDa}`}
              />
            </div>
          );
        })}
      </div>

      {totalWeight === 0 && (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
          Sæt mindst én vægt over 0 for at se en rangering.
        </p>
      )}
    </div>
  );
}
