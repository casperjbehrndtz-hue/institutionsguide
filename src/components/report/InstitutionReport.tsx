import type { ScoreResult, LocalizedText } from "@/lib/institutionScore";
import type { Assessment } from "@/hooks/useAssessment";
import type { UnifiedInstitution } from "@/lib/types";
import { Link } from "react-router-dom";
import { formatDKK } from "@/lib/format";
import { scoreBadgeInlineColors } from "@/lib/badges";
import { dataVersions, formatDataDate } from "@/lib/dataVersions";

interface Props {
  score: ScoreResult;
  institutionName: string;
  category: string;
  municipality: string;
  language: "da" | "en";
  nearby?: (UnifiedInstitution & { dist?: number })[];
  nearbyScores?: { id: string; overall: number | null }[];
  /** AI-generated assessment — overrides deterministic text when present */
  aiAssessment?: Assessment | null;
  aiLoading?: boolean;
}

const SCORE_COLOR = (s: number) =>
  s >= 8 ? "border-[#1D9E75] text-[#0F6E56]" :
  s >= 6 ? "border-[#BA7517] text-[#8A5A12]" :
  "border-[#A32D2D] text-[#A32D2D]";

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

export default function InstitutionReport({
  score,
  institutionName,
  category,
  municipality,
  language: lang,
  nearby = [],
  nearbyScores = [],
  aiAssessment,
  aiLoading,
}: Props) {
  const hasData = score.hasData;
  const s10 = hasData && score.overall != null ? Math.round(score.overall / 10 * 10) / 10 : null;

  // Use AI text when available, fall back to deterministic
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

      {/* Overall score */}
      <div className="flex items-center gap-4 sm:gap-6 rounded-xl bg-bg-card p-4 sm:p-5 mb-4">
        <div className="flex flex-col items-center shrink-0" title={s10 != null ? (lang === "da" ? `Score: ${s10.toFixed(1)}/10 baseret på pris, kvalitet og placering` : `Score: ${s10.toFixed(1)}/10 based on price, quality and location`) : (lang === "da" ? "Ingen data" : "No data")}>
          {s10 != null ? (
            <div className={`w-[64px] h-[64px] sm:w-[72px] sm:h-[72px] rounded-full border-[3px] flex items-center justify-center shrink-0 ${SCORE_COLOR(s10)}`}>
              <span className="font-mono text-[24px] sm:text-[28px] font-medium w-full text-center">{s10.toFixed(1)}</span>
            </div>
          ) : (
            <div className="w-[64px] h-[64px] sm:w-[72px] sm:h-[72px] rounded-full border-[3px] border-border/50 flex items-center justify-center shrink-0">
              <span className="font-mono text-[20px] sm:text-[24px] font-medium text-muted w-full text-center">&mdash;</span>
            </div>
          )}
          <span className="text-[10px] text-muted mt-1">{s10 != null ? (lang === "da" ? "af 10" : "of 10") : (lang === "da" ? "Ingen data" : "No data")}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-medium text-foreground">
            {headline}
          </p>
          <p className="text-[13px] text-muted mt-1 leading-relaxed">
            {aiLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                {lang === "da" ? "Genererer vurdering..." : "Generating assessment..."}
              </span>
            ) : summary}
          </p>
        </div>
      </div>

      {/* Metric cards — always deterministic */}
      {score.metrics.length > 0 && <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
        {score.metrics.slice(0, 4).map((m) => {
          const bgColor = m.score >= 70 ? "bg-[#E1F5EE]" : m.score >= 45 ? "bg-[#FAEEDA]" : "bg-[#FCEBEB]";
          const textColor = m.score >= 70 ? "text-[#0F6E56]" : m.score >= 45 ? "text-[#BA7517]" : "text-[#A32D2D]";
          const dotColor = m.score >= 70 ? "bg-[#0F6E56]" : m.score >= 45 ? "bg-[#BA7517]" : "bg-[#A32D2D]";
          const munLabel = m.municipalityAvg != null ? `Kom: ${m.municipalityAvg}` : null;
          const contextText = m.context?.[lang] ?? null;
          const contextLine = [contextText, munLabel].filter(Boolean).join(" · ");

          return (
            <div key={m.key} className={`rounded-lg p-3.5 ${bgColor}`}>
              <div className="flex items-center justify-between mb-1">
                <p className={`text-[11px] uppercase tracking-wide font-medium ${textColor}`}>{m.label[lang]}</p>
                <span className="text-sm leading-none">{m.icon}</span>
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
              {contextLine && (
                <p className="text-[10px] text-muted mt-1.5 leading-tight truncate">{contextLine}</p>
              )}
            </div>
          );
        })}
      </div>}

      {/* Fordele & Opmærksomhedspunkter */}
      {(pros.length > 0 || cons.length > 0) && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <div className="rounded-xl border border-border/50 p-4">
          <p className="text-[13px] font-medium text-[#0F6E56] mb-2.5">
            {lang === "da" ? "Fordele" : "Strengths"}
          </p>
          <div className="space-y-2">
            {pros.map((pro, i) => (
              <div key={i} className="flex gap-2 text-[13px] text-foreground leading-relaxed">
                <span className="w-4 h-4 rounded-full bg-[#E1F5EE] flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[#0F6E56] text-[10px] font-bold">&#10003;</span>
                </span>
                <span>{pro[lang]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border/50 p-4">
          <p className="text-[13px] font-medium text-[#A32D2D] mb-2.5">
            {lang === "da" ? "Opmærksomhedspunkter" : "Areas of concern"}
          </p>
          <div className="space-y-2">
            {cons.map((con, i) => (
              <div key={i} className="flex gap-2 text-[13px] text-foreground leading-relaxed">
                <span className="w-4 h-4 rounded-full bg-[#FAEEDA] flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[#BA7517] text-[10px] font-bold">!</span>
                </span>
                <span>{con[lang]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>}

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

      {/* Nearby comparison */}
      {nearby.length > 0 && (
        <div className="border-t border-border/40 pt-4 mb-5">
          <p className="text-[13px] font-medium text-foreground mb-3">
            {lang === "da" ? "Andre institutioner i nærheden" : "Other institutions nearby"}
          </p>
          <div className="space-y-2">
            {nearby.slice(0, 5).map((n) => {
              const ns = nearbyScores.find((s) => s.id === n.id);
              const isSchool = n.category === "skole";
              const badgeColor = ns && ns.overall != null ? scoreBadgeInlineColors(ns.overall) : null;
              return (
                <Link
                  key={n.id}
                  to={`/institution/${n.id}`}
                  className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-bg-card hover:bg-border/20 transition-colors"
                >
                  <div className="min-w-0">
                    <span className="text-[13px] font-medium text-foreground">{n.name}</span>
                    {n.dist != null && (
                      <span className="text-[12px] text-muted ml-2">{n.dist.toFixed(1)} km</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[12px] text-muted shrink-0">
                    {!isSchool && n.monthlyRate != null && n.monthlyRate > 0 && (
                      <span>{formatDKK(n.monthlyRate)}/md.</span>
                    )}
                    {ns && ns.overall != null && badgeColor && (
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: badgeColor.bg, color: badgeColor.text }}
                      >
                        {(ns.overall / 10).toFixed(1)}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-muted leading-relaxed">
        {lang === "da"
          ? "Vurderingen er baseret på offentligt tilgængelige data fra Undervisningsministeriet, kommunale nøgletal og geografisk analyse. Scoren er vejledende og erstatter ikke et personligt besøg."
          : "The assessment is based on publicly available data from the Danish Ministry of Education, municipal statistics and geographical analysis. The score is advisory and does not replace a personal visit."}
      </p>
    </div>
  );
}
