import { Link } from "react-router-dom";
import { dataVersions } from "@/lib/dataVersions";
import QualityMetricRow from "@/components/detail/QualityMetricRow";
import type { PercentileEntry } from "@/hooks/usePercentiles";
import type { SchoolQuality } from "@/lib/types";
import type { TranslationStrings } from "@/lib/translations/types";

interface QualityDataSectionProps {
  percentiles: PercentileEntry[];
  quality: SchoolQuality;
  language: string;
  t: TranslationStrings;
}

export default function QualityDataSection({ percentiles, quality, language, t }: QualityDataSectionProps) {
  return (
    <div className="bg-bg-card rounded-2xl border border-border/50 p-6 sm:p-9 shadow-sm">
      <div className="flex justify-between items-baseline mb-1">
        <h2 className="font-display text-xl font-medium">{t.detail.qualityData}</h2>
        <span className="text-[11px] text-muted/50 tracking-wide">UVM {dataVersions.schoolQuality.schoolYear}</span>
      </div>
      <div className="text-[11px] text-muted/50 mb-4">{percentiles.length} {language === "da" ? "metrikker" : "metrics"}</div>

      {/* Header row */}
      <div
        className="hidden sm:grid gap-3 pb-2 border-b border-border/40"
        style={{ gridTemplateColumns: "minmax(70px, 140px) 1fr auto auto" }}
      >
        <span className="text-[10px] text-muted/50 uppercase tracking-widest font-semibold" />
        <span className="text-[10px] text-muted/50 uppercase tracking-widest font-semibold" />
        <span className="text-[10px] text-muted/50 uppercase tracking-widest font-semibold text-right">{language === "da" ? "Værdi" : "Value"}</span>
        <span className="text-[10px] text-muted/50 uppercase tracking-widest font-semibold text-center" />
      </div>

      {/* Metric rows */}
      <div>
        {percentiles.map((p, i) => (
          <QualityMetricRow key={p.label} label={p.label} percentile={p.percentile} value={p.value} delay={i * 80} lang={language} />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/30 text-[10px] text-muted/60">
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#0d7c5f]" /> Top 25%</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#b8860b]" /> {language === "da" ? "Middel" : "Average"}</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#c0392b]" /> {language === "da" ? "Bund 25%" : "Bottom 25%"}</span>
      </div>
      {quality.sr && (
        <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/15">
          <p className="text-xs text-muted mb-0.5">{t.detail.socioEconomicRef}</p>
          <p className="text-sm font-semibold text-foreground">{quality.sr}</p>
          <p className="text-[10px] text-muted mt-1">
            {language === "da"
              ? "Sammenligner skolens resultater med forventede resultater baseret på elevernes socioøkonomiske baggrund"
              : "Compares the school's results with expected results based on students' socioeconomic background"}
          </p>
        </div>
      )}
      {quality.el != null && (
        <div className="text-xs text-muted mt-3">
          {t.detail.studentCount}: <strong className="text-foreground font-mono">{quality.el.toLocaleString("da-DK")}</strong>
        </div>
      )}
      <div className="flex items-center justify-between mt-3 gap-2">
        <p className="text-[10px] text-muted">{t.detail.dataSource}</p>
        <Link to="/metode" className="text-[10px] text-primary hover:underline shrink-0">
          {language === "da" ? "Se metode" : "See method"} &rarr;
        </Link>
      </div>
    </div>
  );
}
