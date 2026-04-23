import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import type { MunicipalityScore } from "@/lib/mi/aggregate";
import { toSlug } from "@/lib/slugs";

interface Props {
  municipalities: MunicipalityScore[];
  nationalMean: number;
  trackLabel: string;
}

function scoreColor(score: number): string {
  if (score >= 70) return "text-emerald-700 dark:text-emerald-400";
  if (score >= 55) return "text-foreground";
  if (score >= 45) return "text-muted";
  return "text-red-700 dark:text-red-400";
}

export default function MunicipalityLeaderboard({ municipalities, nationalMean, trackLabel }: Props) {
  if (municipalities.length === 0) {
    return (
      <div className="text-center py-12 text-muted text-sm">
        Sæt mindst én vægt over 0 for at se en rangering.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      <header className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            Kommune-leaderboard — {trackLabel}
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Volumen-vægtet WQI med Bayesisk udjævning (τ = 5). Landsmiddel = {nationalMean.toFixed(1)}.
          </p>
        </div>
        <span className="text-xs text-muted font-mono">{municipalities.length} kommuner</span>
      </header>

      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_4.5rem_4.5rem_5rem] gap-2 px-4 py-2 text-[11px] uppercase tracking-wider text-muted font-semibold border-b border-border bg-muted/5">
        <span>#</span>
        <span>Kommune</span>
        <span className="text-right">Score</span>
        <span className="text-right">N</span>
        <span className="text-right">Konsist.</span>
      </div>

      <ol className="divide-y divide-border">
        {municipalities.map((m, i) => (
          <li key={m.municipality} className="grid grid-cols-[2.5rem_minmax(0,1fr)_4.5rem_4.5rem_5rem] gap-2 px-4 py-2.5 items-center text-sm hover:bg-primary/5 transition-colors">
            <span className="text-muted font-mono tabular-nums text-xs">{i + 1}</span>
            <Link to={`/kommune/${toSlug(m.municipality)}`} className="font-medium text-foreground hover:text-primary truncate">
              {m.municipality}
            </Link>
            <span className={`text-right font-mono font-semibold tabular-nums ${scoreColor(m.score)}`}>
              {m.score.toFixed(1)}
            </span>
            <span className="text-right text-muted font-mono tabular-nums text-xs" title={`Shrinkage λ = ${m.lambda.toFixed(2)}`}>
              {m.n}
            </span>
            <span className="text-right text-muted font-mono tabular-nums text-xs">
              {m.consistency != null ? m.consistency.toFixed(0) : "—"}
            </span>
          </li>
        ))}
      </ol>

      <footer className="px-4 py-2 border-t border-border bg-muted/5 text-[11px] text-muted leading-snug">
        Score: 0–100. <strong>N</strong> = antal institutioner i sporet. Mikro-kommuner (N &lt; 5) trækkes mod landsmiddel via λ = N / (N + 5).
        <strong> Konsist.</strong> = 100 − (Q80 − Q20). Vises ikke ved N &lt; 5.
      </footer>
    </div>
  );
}
