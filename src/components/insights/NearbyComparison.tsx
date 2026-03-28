import { useLanguage } from "@/contexts/LanguageContext";
import type { NearbyComparison as NearbyComparisonType } from "@/lib/insights";

interface Props {
  comparisons: NearbyComparisonType[];
  neighborCount: number;
}

export default function NearbyComparison({ comparisons, neighborCount }: Props) {
  const { language } = useLanguage();

  if (comparisons.length === 0) return null;

  return (
    <div>
      <p className="text-xs text-muted mb-3">
        {language === "da"
          ? `Sammenlignet med ${neighborCount} skoler inden for 5 km:`
          : `Compared to ${neighborCount} schools within 5 km:`}
      </p>
      <div className="space-y-2">
        {comparisons.map((c) => (
          <div key={c.metric} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
            <span className="text-xs text-muted">{c.label[language]}</span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-medium text-foreground">
                {c.thisValue.toLocaleString("da-DK")}{c.metric === "fravaer" ? "%" : ""}
              </span>
              <span className="text-[10px] text-muted">vs</span>
              <span className="font-mono text-xs text-muted">
                {c.areaAvg.toLocaleString("da-DK")}{c.metric === "fravaer" ? "%" : ""}
              </span>
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                c.isBetter
                  ? "bg-success/10 text-success"
                  : c.diffPct === 0
                    ? "bg-border/30 text-muted"
                    : "bg-destructive/10 text-destructive"
              }`}>
                {c.isBetter ? "+" : ""}{c.diffPct}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
