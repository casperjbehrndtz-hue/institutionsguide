import { useLanguage } from "@/contexts/LanguageContext";
import { dataVersions, formatDataDate } from "@/lib/dataVersions";

export default function DataSourcesStrip() {
  const { language, t } = useLanguage();
  const isDa = language === "da";

  const sources: string[] = [
    "Danmarks Statistik",
    isDa ? "Undervisningsministeriet" : "Ministry of Education",
    "STIL",
    "Arbejdstilsynet",
    isDa ? "Dagtilbudsregisteret" : "Daycare Registry",
    isDa ? "Kommunale tilsynsrapporter" : "Municipal inspections",
  ];

  return (
    <section
      aria-label={t.home.dataSourcesTitle}
      className="border-b border-border/60 bg-bg-card"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-2 sm:gap-6 text-[12px]">
          <p className="uppercase tracking-[0.15em] text-muted/70 font-semibold text-[10px] shrink-0">
            {isDa ? "Verificeret data fra" : "Verified data from"}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-muted">
            {sources.map((name, i) => (
              <span key={name} className="flex items-center gap-x-4">
                <span className="font-medium text-foreground/80">{name}</span>
                {i < sources.length - 1 && <span aria-hidden="true" className="text-muted/30">·</span>}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-muted/60 shrink-0 tabular-nums">
            {formatDataDate(dataVersions.overall.lastUpdated, language === "da" ? "da" : "en")}
          </p>
        </div>
      </div>
    </section>
  );
}
