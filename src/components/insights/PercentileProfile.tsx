import { useLanguage } from "@/contexts/LanguageContext";
import { getPercentileLabel, type PercentileBar } from "@/lib/insights";

interface Props {
  bars: PercentileBar[];
}

export default function PercentileProfile({ bars }: Props) {
  const { language } = useLanguage();

  if (bars.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {bars.map((bar) => (
        <div key={bar.metric} className="flex items-center gap-3">
          {/* Label */}
          <span className="text-xs text-muted w-28 shrink-0 truncate" title={bar.label[language]}>
            {bar.label[language]}
          </span>

          {/* Bar visualization */}
          <div className="flex-1 flex items-center gap-0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={`h-3 flex-1 rounded-sm transition-colors ${
                  i < bar.filledBars
                    ? bar.isWarning
                      ? "bg-destructive/70"
                      : bar.filledBars >= 8
                        ? "bg-success/70"
                        : "bg-primary/50"
                    : "bg-border/40"
                }`}
              />
            ))}
          </div>

          {/* Percentile label */}
          <span className={`text-[10px] font-medium w-20 text-right shrink-0 ${
            bar.isWarning ? "text-destructive" : bar.filledBars >= 8 ? "text-success" : "text-muted"
          }`}>
            {getPercentileLabel(bar.tier, language)}
          </span>
        </div>
      ))}
    </div>
  );
}
