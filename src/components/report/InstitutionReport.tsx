import type { ScoreResult, LocalizedText } from "@/lib/institutionScore";
import type { Assessment } from "@/hooks/useAssessment";
import { dataVersions, formatDataDate } from "@/lib/dataVersions";
import MetricIcon from "@/components/shared/MetricIcon";

interface Props {
  score: ScoreResult;
  institutionName: string;
  category: string;
  municipality: string;
  language: "da" | "en";
  /** AI-generated assessment — overrides deterministic text when present */
  aiAssessment?: Assessment | null;
  aiLoading?: boolean;
}

const SCORE_RING = (s: number) =>
  s >= 8 ? "border-[#1D9E75]" :
  s >= 6 ? "border-[#BA7517]" :
  "border-[#A32D2D]";

const SCORE_TEXT = (s: number) =>
  s >= 8 ? "text-[#0F6E56]" :
  s >= 6 ? "text-[#8A5A12]" :
  "text-[#A32D2D]";

const FALLBACK_HEADLINE: Record<string, Record<string, string>> = {
  A: { da: "Fremragende valg i området", en: "Excellent choice in the area" },
  B: { da: "Stærkt valg i området", en: "Strong choice in the area" },
  C: { da: "Gennemsnitligt i området", en: "Average in the area" },
  D: { da: "Under gennemsnittet i området", en: "Below average in the area" },
  E: { da: "Væsentlige opmærksomhedspunkter", en: "Significant concerns" },
};

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  vuggestue: { da: "Vuggestue · 0–2 år", en: "Nursery · Age 0–2" },
  boernehave: { da: "Børnehave · 3–5 år", en: "Kindergarten · Age 3–5" },
  dagpleje: { da: "Dagpleje · 0–2 år", en: "Childminder · Age 0–2" },
  skole: { da: "Skole · 6–16 år", en: "School · Age 6–16" },
  sfo: { da: "SFO · 6–9 år", en: "After-school · Age 6–9" },
};

function percentileLabel(p: number, lang: string): string {
  if (p >= 90) return lang === "da" ? "Top 10% i Danmark" : "Top 10% in Denmark";
  if (p >= 75) return lang === "da" ? "Top 25% i Danmark" : "Top 25% in Denmark";
  if (p >= 60) return lang === "da" ? "Over middel" : "Above average";
  if (p >= 40) return lang === "da" ? "Middel" : "Average";
  if (p >= 25) return lang === "da" ? "Under middel" : "Below average";
  return lang === "da" ? "Bund 25%" : "Bottom 25%";
}

export default function InstitutionReport({
  score,
  institutionName,
  category,
  municipality,
  language: lang,
  aiAssessment,
  aiLoading,
}: Props) {
  const hasData = score.hasData;
  const s10 = hasData && score.overall != null ? Math.round(score.overall / 10 * 10) / 10 : null;

  const headline: string = hasData
    ? (aiAssessment?.headline?.[lang]
      ?? (score.grade ? FALLBACK_HEADLINE[score.grade]?.[lang] : null)
      ?? FALLBACK_HEADLINE.C[lang])
    : (lang === "da" ? "Ingen kvalitetsdata tilgængelig" : "No quality data available");

  const summary: string = hasData
    ? (aiAssessment?.summary?.[lang] ?? score.recommendation[lang])
    : (lang === "da"
      ? "Der er ikke nok offentligt tilgængelige data til at beregne en samlet vurdering for denne institution."
      : "There is not enough publicly available data to compute an overall assessment for this institution.");

  const pros: LocalizedText[] = aiAssessment?.pros ?? score.pros;
  const cons: LocalizedText[] = aiAssessment?.cons ?? score.cons;
  const recommendation: string = hasData
    ? (aiAssessment?.recommendation?.[lang] ?? score.recommendation[lang])
    : (lang === "da"
      ? "Vi anbefaler at kontakte institutionen direkte eller besøge den for at danne dit eget indtryk."
      : "We recommend contacting the institution directly or visiting to form your own impression.");

  const dateStr = `${lang === "da" ? "Opdateret" : "Updated"} ${formatDataDate(dataVersions.overall.lastUpdated, lang)}`;

  return (
    <div className="max-w-[640px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-[11px] text-muted uppercase tracking-wider">
            {lang === "da" ? "Områdevurdering" : "Area Assessment"}
          </p>
          <h2 className="text-lg font-medium text-foreground mt-1">
            {institutionName} · {municipality} Kommune
          </h2>
        </div>
        <div className="text-[11px] text-muted text-right">
          <div>{CATEGORY_LABELS[category]?.[lang] ?? category}</div>
          <div className="mt-0.5">{dateStr}</div>
        </div>
      </div>

      <div className="border-t border-border/40 my-3" />

      {/* Hero score — large, centered, dominant */}
      <div className="flex flex-col items-center text-center rounded-xl bg-bg-card p-6 sm:p-8 mb-5">
        <div
          className="mb-4"
          title={s10 != null ? (lang === "da" ? `Score: ${s10.toFixed(1)}/10 baseret på pris, kvalitet og placering` : `Score: ${s10.toFixed(1)}/10 based on price, quality and location`) : (lang === "da" ? "Ingen data" : "No data")}
        >
          {s10 != null ? (
            <div className={`w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] rounded-full border-4 flex items-center justify-center mx-auto ${SCORE_RING(s10)}`}>
              <span className={`font-mono text-[40px] sm:text-[48px] font-semibold ${SCORE_TEXT(s10)}`}>{s10.toFixed(1)}</span>
            </div>
          ) : (
            <div className="w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] rounded-full border-4 border-border/50 flex items-center justify-center mx-auto">
              <span className="font-mono text-[36px] sm:text-[40px] font-medium text-muted">&mdash;</span>
            </div>
          )}
          <p className="text-xs text-muted mt-2">{s10 != null ? (lang === "da" ? "af 10" : "of 10") : (lang === "da" ? "Ingen data" : "No data")}</p>
        </div>
        <p className="text-lg font-semibold text-foreground mb-1.5">{headline}</p>
        <p className="text-sm text-muted leading-relaxed max-w-md">
          {aiLoading ? (
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              {lang === "da" ? "Genererer vurdering..." : "Generating assessment..."}
            </span>
          ) : summary}
        </p>
      </div>

      {/* Metric cards */}
      {score.metrics.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          {score.metrics.slice(0, 4).map((m) => {
            const bgColor = m.score >= 70 ? "bg-[#E1F5EE]" : m.score >= 45 ? "bg-[#FAEEDA]" : "bg-[#FCEBEB]";
            const textColor = m.score >= 70 ? "text-[#0F6E56]" : m.score >= 45 ? "text-[#BA7517]" : "text-[#A32D2D]";
            const dotColor = m.score >= 70 ? "bg-[#0F6E56]" : m.score >= 45 ? "bg-[#BA7517]" : "bg-[#A32D2D]";
            const pctLabel = m.percentile != null ? percentileLabel(m.percentile, lang) : null;
            const munLabel = m.municipalityAvg != null ? `${lang === "da" ? "Kom." : "Mun."}: ${m.municipalityAvg}` : null;
            const contextText = m.context?.[lang] ?? null;

            return (
              <div key={m.key} className={`rounded-lg p-3.5 ${bgColor}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className={`text-[11px] uppercase tracking-wide font-medium ${textColor}`}>{m.label[lang]}</p>
                  <MetricIcon name={m.icon} className={`w-3.5 h-3.5 ${textColor}`} />
                </div>
                <p className={`font-mono text-xl font-semibold ${textColor}`}>
                  {m.value.split(" ")[0]}
                  <span className="text-[11px] font-normal ml-1">{m.value.split(" ").slice(1).join(" ")}</span>
                </p>
                {m.percentile != null && (
                  <div className="mt-2 h-1 bg-border/50 rounded-full relative">
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${dotColor} ring-2 ring-white`}
                      style={{ left: `${Math.max(4, Math.min(96, m.percentile))}%` }}
                    />
                  </div>
                )}
                {pctLabel && (
                  <p className={`text-[10px] font-medium mt-1.5 ${textColor}`}>{pctLabel}</p>
                )}
                {!pctLabel && (contextText || munLabel) && (
                  <p className="text-[10px] text-muted mt-1.5 leading-tight truncate">
                    {[contextText, munLabel].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Fordele & Opmærksomhedspunkter — prominent colored backgrounds */}
      {(pros.length > 0 || cons.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {pros.length > 0 && (
            <div className="rounded-xl bg-[#E1F5EE] p-4">
              <p className="text-sm font-semibold text-[#0F6E56] mb-3">
                {lang === "da" ? "Fordele" : "Strengths"}
              </p>
              <div className="space-y-2.5">
                {pros.map((pro, i) => (
                  <div key={i} className="flex gap-2.5 text-sm text-[#085041] leading-relaxed">
                    <span className="w-5 h-5 rounded-full bg-[#0F6E56]/15 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[#0F6E56] text-[11px] font-bold">&#10003;</span>
                    </span>
                    <span>{pro[lang]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {cons.length > 0 && (
            <div className="rounded-xl bg-[#FEF3E2] p-4">
              <p className="text-sm font-semibold text-[#8A5A12] mb-3">
                {lang === "da" ? "Opmærksomhedspunkter" : "Areas of concern"}
              </p>
              <div className="space-y-2.5">
                {cons.map((con, i) => (
                  <div key={i} className="flex gap-2.5 text-sm text-[#633806] leading-relaxed">
                    <span className="w-5 h-5 rounded-full bg-[#BA7517]/15 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[#BA7517] text-[11px] font-bold">!</span>
                    </span>
                    <span>{con[lang]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vores vurdering */}
      <div className="rounded-r-lg border border-primary/20 border-l-[3px] border-l-primary p-4 mb-5">
        <p className="text-[13px] font-medium text-primary mb-1.5">
          {lang === "da" ? "Vores vurdering" : "Our assessment"}
        </p>
        <p className="text-[13px] text-foreground leading-relaxed">
          {aiLoading ? (
            <span className="inline-block w-full h-12 bg-border/30 rounded animate-pulse" />
          ) : recommendation}
        </p>
        {aiAssessment && (
          <p className="text-[10px] text-muted mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 inline-block" />
            {lang === "da" ? "AI-genereret vurdering" : "AI-generated assessment"}
          </p>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-muted leading-relaxed">
        {lang === "da"
          ? "Vurderingen er baseret på offentligt tilgængelige data fra Undervisningsministeriet, kommunale nøgletal og geografisk analyse. Scoren er vejledende og erstatter ikke et personligt besøg."
          : "The assessment is based on publicly available data from the Danish Ministry of Education, municipal statistics and geographical analysis. The score is advisory and does not replace a personal visit."}
      </p>
    </div>
  );
}
