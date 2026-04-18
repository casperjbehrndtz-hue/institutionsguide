import type { ScoreResult } from "@/lib/institutionScore";

interface StickyHeaderProps {
  shrunk: boolean;
  instName: string;
  scoreResult: ScoreResult | null;
}

export default function StickyHeader({ shrunk, instName, scoreResult }: StickyHeaderProps) {
  return (
    <div
      className={`hidden sm:block fixed left-0 right-0 z-30 transition-all duration-300 ${
        shrunk
          ? "bg-background/95 backdrop-blur-xl border-b border-border/40 py-2.5 top-14"
          : "bg-transparent py-4 pointer-events-none top-14"
      }`}
    >
      <div className="max-w-[1020px] mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {shrunk && scoreResult && (
            <>
              <span className="text-sm text-muted font-medium truncate">{instName}</span>
              {scoreResult.overall != null && (
                <span className="font-mono text-sm font-medium text-[#0d7c5f] shrink-0">
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
