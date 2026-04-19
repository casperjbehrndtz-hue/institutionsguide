import { useLanguage } from "@/contexts/LanguageContext";

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
    <section aria-label={t.home.dataSourcesTitle} className="border-b border-border/70">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-[13px]">
          <p className="uppercase tracking-[0.18em] text-muted/70 font-medium text-[10px] shrink-0">
            {isDa ? "Verificeret data fra" : "Verified data from"}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted">
            {sources.map((name, i) => (
              <span key={name} className="flex items-center gap-x-4">
                <span className="text-foreground/75">{name}</span>
                {i < sources.length - 1 && <span aria-hidden="true" className="text-muted/30">·</span>}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
