import { Baby, GraduationCap, Backpack } from "lucide-react";
import { formatDKK } from "@/lib/format";
import { TOTAL_MONTHS } from "@/lib/totalCostCalculator";
import type { PhaseResult } from "@/lib/totalCostCalculator";

const PHASE_ICONS = [Baby, GraduationCap, Backpack];
const PHASE_COLORS = ["text-pink-500", "text-amber-500", "text-blue-500"];
const PHASE_BG = ["bg-pink-500/10", "bg-amber-500/10", "bg-blue-500/10"];
const PHASE_BAR = ["bg-pink-500", "bg-amber-500", "bg-blue-500"];

interface TotalCostTimelineProps {
  phases: PhaseResult[];
  grandTotal: number;
  grandTotalFull: number;
  totalSavings: number;
  currentRank: number;
  municipality: string;
  isDa: boolean;
}

export default function TotalCostTimeline({
  phases, grandTotal, grandTotalFull, totalSavings,
  currentRank, municipality, isDa,
}: TotalCostTimelineProps) {
  const maxPhaseTotal = Math.max(...phases.map((p) => p.totalFull), 1);

  return (
    <section className="card p-6 sm:p-8 space-y-6">
      <h2 className="font-display text-xl font-semibold text-foreground">
        {isDa ? `Tidslinje for børnepasning i ${municipality}` : `Childcare timeline in ${municipality}`}
      </h2>

      <div className="space-y-6">
        {phases.map((phase, idx) => {
          const Icon = PHASE_ICONS[idx];
          const widthFull = maxPhaseTotal > 0 ? (phase.totalFull / maxPhaseTotal) * 100 : 0;
          const widthAfter = maxPhaseTotal > 0 ? (phase.totalAfterFriplads / maxPhaseTotal) * 100 : 0;
          return (
            <div key={phase.label} className="space-y-2">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${PHASE_BG[idx]}`}>
                  <Icon className={`w-5 h-5 ${PHASE_COLORS[idx]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-foreground text-sm">
                    {isDa ? phase.label : phase.labelEn}
                    <span className="text-muted font-normal ml-1.5">
                      ({isDa ? phase.ageRange : phase.ageRangeEn})
                    </span>
                  </p>
                  {phase.available ? (
                    <p className="text-xs text-muted">
                      {formatDKK(phase.monthlyAfterFriplads)}/{isDa ? "md" : "mo"} &times; {phase.months} {isDa ? "md" : "mo"}
                    </p>
                  ) : (
                    <p className="text-xs text-muted italic">
                      {isDa ? "Ikke tilgngelig i denne kommune" : "Not available in this municipality"}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {phase.available && (
                    <>
                      <p className="font-mono text-lg font-bold text-foreground">
                        {formatDKK(phase.totalAfterFriplads)}
                      </p>
                      {phase.totalFull !== phase.totalAfterFriplads && (
                        <p className="font-mono text-xs text-muted line-through">
                          {formatDKK(phase.totalFull)}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
              {phase.available && (
                <div className="ml-[52px] space-y-1">
                  <div className="h-3 rounded-full bg-bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-muted/30 relative"
                      style={{ width: `${Math.max(widthFull, 2)}%` }}
                    >
                      <div
                        className={`h-full rounded-full ${PHASE_BAR[idx]}`}
                        style={{ width: widthFull > 0 ? `${(widthAfter / widthFull) * 100}%` : "0%" }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Grand total */}
      <div className="border-t border-border pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-lg font-bold text-foreground">
              {isDa ? "Samlet børnepasning" : "Total childcare cost"}
            </p>
            <p className="text-sm text-muted">
              {isDa
                ? `${TOTAL_MONTHS / 12} år (${TOTAL_MONTHS} måneder) i ${municipality}`
                : `${TOTAL_MONTHS / 12} years (${TOTAL_MONTHS} months) in ${municipality}`}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-3xl font-bold text-primary">
              {formatDKK(grandTotal)}
            </p>
            {grandTotalFull !== grandTotal && (
              <p className="font-mono text-sm text-muted line-through">
                {formatDKK(grandTotalFull)}
              </p>
            )}
          </div>
        </div>

        {totalSavings > 0 && (
          <p className="text-sm text-center text-success font-medium bg-success/5 rounded-lg py-2 mt-4">
            {isDa
              ? `Du sparer ${formatDKK(totalSavings)} med fripladstilskud over ${TOTAL_MONTHS / 12} år`
              : `You save ${formatDKK(totalSavings)} with childcare subsidy over ${TOTAL_MONTHS / 12} years`}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-bg-muted/50 rounded-xl p-4 text-center">
            <p className="text-xs text-muted mb-1">{isDa ? "Gns. pr. måned" : "Avg. per month"}</p>
            <p className="font-mono text-xl font-bold text-foreground">
              {formatDKK(Math.round(grandTotal / TOTAL_MONTHS))}
            </p>
          </div>
          <div className="bg-bg-muted/50 rounded-xl p-4 text-center">
            <p className="text-xs text-muted mb-1">{isDa ? "Rangering" : "Ranking"}</p>
            <p className="font-mono text-xl font-bold text-foreground">
              #{currentRank} <span className="text-sm font-normal text-muted">{isDa ? "af 98" : "of 98"}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
