import type { ScoreResult } from "@/lib/institutionScore";

interface StickyHeaderProps {
  shrunk: boolean;
  instName: string;
  scoreResult: ScoreResult | null;
}

export default function StickyHeader({ shrunk, instName, scoreResult }: StickyHeaderProps) {
  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        shrunk
          ? "bg-background/95 backdrop-blur-xl border-b border-border/40 py-2.5"
          : "bg-transparent py-4 pointer-events-none"
      }`}
    >
      <div className="max-w-[1020px] mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-display text-sm font-semibold text-foreground/80">Institutionsguide</span>
          {shrunk && scoreResult && (
            <>
              <span className="text-border">·</span>
              <span className="text-sm text-muted font-medium">{instName}</span>
              {scoreResult.overall != null && (
                <span className="font-mono text-sm font-medium text-[#0d7c5f]">
                  {(Math.round(scoreResult.overall / 10 * 10) / 10).toLocaleString("da-DK")}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
