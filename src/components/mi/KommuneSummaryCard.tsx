import { Sparkles } from "lucide-react";
import { useKommuneIntelligensSummary } from "@/hooks/useKommuneIntelligensSummary";
import { useTrack } from "@/contexts/TrackContext";

interface Props {
  municipality: string;
}

/**
 * Renders a pre-generated AI narrative for a kommune × track pair.
 * Strictly grounded in the same metric data shown on the page (see
 * scripts/generate-kommune-summaries.mjs). Falls back to a short, honest
 * "ingen tekst endnu" line when no row exists yet.
 */
export default function KommuneSummaryCard({ municipality }: Props) {
  const { track } = useTrack();
  const { summary, state } = useKommuneIntelligensSummary(municipality, track);
  const trackLabel = track === "daycare" ? "dagtilbud" : "folkeskole";

  if (state === "loading") {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-4">
        <div className="h-3 w-32 bg-border/40 rounded animate-pulse mb-3" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-border/40 rounded animate-pulse" />
          <div className="h-3 w-full bg-border/40 rounded animate-pulse" />
          <div className="h-3 w-2/3 bg-border/40 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (state === "missing" || state === "error" || !summary) {
    return null;
  }

  const generated = new Date(summary.generatedAt);
  const generatedLabel = generated.toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" });

  return (
    <article className="rounded-xl border border-border bg-bg-card overflow-hidden">
      <header className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" aria-hidden />
        <h2 className="font-display text-base font-bold text-foreground">
          Sådan ligger {municipality} på {trackLabel}
        </h2>
      </header>

      <div className="px-4 py-4 space-y-4">
        <div className="text-sm leading-relaxed text-foreground whitespace-pre-line">
          {summary.summary}
        </div>

        {summary.strengths.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-muted font-semibold mb-1.5">Stærkest</h3>
            <ul className="space-y-1 text-sm">
              {summary.strengths.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-emerald-600 shrink-0" aria-hidden>+</span>
                  <span className="text-foreground">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary.watchouts.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-muted font-semibold mb-1.5">Vær opmærksom på</h3>
            <ul className="space-y-1 text-sm">
              {summary.watchouts.map((w, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-amber-600 shrink-0" aria-hidden>!</span>
                  <span className="text-foreground">{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <footer className="px-4 py-2 border-t border-border bg-muted/5 text-[11px] text-muted">
        Genereret {generatedLabel} på baggrund af kommunens median for hver metrik. Sammenlignet med landsmedianen — samme datagrundlag som tabellen herunder.
      </footer>
    </article>
  );
}
