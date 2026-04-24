import { useState } from "react";
import { Check, Copy, RotateCcw } from "lucide-react";
import { useTrack } from "@/contexts/TrackContext";
import { METRICS_BY_TRACK } from "@/lib/mi/metrics";
import { PRESETS_BY_TRACK, matchPreset } from "@/lib/mi/presets";

export default function WeightSliders() {
  const { track, weights, setWeight, resetWeights, applyPreset, shareQuery } = useTrack();
  const metrics = METRICS_BY_TRACK[track];
  const presets = PRESETS_BY_TRACK[track];
  const totalWeight = Object.values(weights).reduce((s, v) => s + v, 0);
  const activePreset = matchPreset(track, weights);
  const [copied, setCopied] = useState(false);

  async function handleCopyLink() {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}${window.location.pathname}?${shareQuery}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — silent */
    }
  }

  return (
    <div className="rounded-xl border border-border bg-bg-card p-4 space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display text-base font-bold text-foreground">Vælg en profil</h3>
        </div>
        <div className="flex flex-col gap-1.5">
          {presets.map((p) => {
            const isActive = activePreset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                  isActive
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-bg hover:bg-primary/5 text-foreground/90"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{p.labelDa}</span>
                  {isActive && <Check className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />}
                </div>
                <p className="text-[11px] text-muted mt-0.5 leading-snug">{p.descriptionDa}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Eller tilpas selv</h3>
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

      <div className="border-t border-border pt-3">
        <button
          onClick={handleCopyLink}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-primary/5 transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          {copied ? "Link kopieret" : "Del mine prioriteter"}
        </button>
        <p className="mt-1.5 text-[11px] text-muted text-center leading-snug">
          Send linket til din partner — jeres valg åbner med dine prioriteter.
        </p>
      </div>
    </div>
  );
}
