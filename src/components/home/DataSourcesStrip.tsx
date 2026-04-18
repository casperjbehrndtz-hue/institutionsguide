import { useLanguage } from "@/contexts/LanguageContext";
import { dataVersions, formatDataDate } from "@/lib/dataVersions";

interface Source {
  name: string;
  note: string;
}

export default function DataSourcesStrip() {
  const { language, t } = useLanguage();
  const isDa = language === "da";

  const sources: Source[] = [
    {
      name: "Danmarks Statistik",
      note: `${isDa ? "Priser" : "Prices"} ${dataVersions.prices.year}`,
    },
    {
      name: isDa ? "Børne- og Undervisningsministeriet" : "Ministry of Education",
      note: `${isDa ? "Skoleåret" : "School year"} ${dataVersions.schoolQuality.schoolYear}`,
    },
    {
      name: "STIL",
      note: isDa ? "Uddannelsesstatistik" : "Education statistics",
    },
    {
      name: "Arbejdstilsynet",
      note: isDa ? "Sygefravær" : "Sick leave",
    },
    {
      name: isDa ? "Dagtilbudsregisteret" : "Daycare Registry",
      note: isDa ? "Adresser og typer" : "Addresses and types",
    },
    {
      name: isDa ? "Kommunale tilsynsrapporter" : "Municipal inspections",
      note: isDa ? "Løbende opdateret" : "Continuously updated",
    },
  ];

  return (
    <section
      aria-label={t.home.dataSourcesTitle}
      className="border-b border-border/60 bg-bg-card"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <div className="shrink-0">
            <p className="text-[11px] uppercase tracking-widest text-muted/80 font-semibold">
              {t.home.dataSourcesTitle}
            </p>
            <p className="text-[11px] text-muted/60 mt-0.5">
              {isDa ? "Senest opdateret" : "Last updated"} {formatDataDate(dataVersions.overall.lastUpdated, language === "da" ? "da" : "en")}
            </p>
          </div>
          <div className="flex-1 flex flex-wrap items-center gap-x-5 gap-y-2 sm:gap-x-7">
            {sources.map((s, i) => (
              <div key={s.name} className="flex items-center gap-3 sm:gap-5">
                <div>
                  <p className="text-sm font-semibold text-foreground leading-tight">{s.name}</p>
                  <p className="text-[11px] text-muted leading-tight">{s.note}</p>
                </div>
                {i < sources.length - 1 && (
                  <span aria-hidden="true" className="hidden sm:inline-block w-px h-7 bg-border/70" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
