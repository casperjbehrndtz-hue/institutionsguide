import type { ScoreResult, LocalizedText } from "@/lib/institutionScore";
import type { Assessment } from "@/hooks/useAssessment";
import { dataVersions, formatDataDate } from "@/lib/dataVersions";
import ScoreRing from "@/components/shared/ScoreRing";
import MetricBar from "@/components/shared/MetricBar";
import GoogleRatingBadge from "@/components/shared/GoogleRatingBadge";

interface Props {
  score: ScoreResult;
  institutionName: string;
  category: string;
  municipality: string;
  language: "da" | "en";
  aiAssessment?: Assessment | null;
  aiLoading?: boolean;
  googleRating?: { rating: number; review_count: number; maps_url: string | null } | null;
}

const SCORE_COLOR = (s: number) =>
  s >= 7 ? "#0d7c5f" : s >= 5 ? "#b8860b" : "#c0392b";

const SCORE_BG = (s: number) =>
  s >= 7 ? "rgba(13,124,95,0.08)" : s >= 5 ? "rgba(184,134,11,0.08)" : "rgba(192,57,43,0.08)";

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
  fritidsklub: { da: "Fritidsklub · 10+ år", en: "Leisure club · Age 10+" },
  efterskole: { da: "Efterskole · 14–18 år", en: "Boarding school · Age 14–18" },
  gymnasium: { da: "Gymnasium · 16–19 år", en: "Upper secondary · Age 16–19" },
};

function pctLabel(p: number, lang: string): string {
  if (p >= 90) return "Top 10%";
  if (p >= 75) return "Top 25%";
  if (p >= 60) return lang === "da" ? "Over middel" : "Above avg";
  if (p >= 40) return lang === "da" ? "Middel" : "Average";
  if (p >= 25) return lang === "da" ? "Under middel" : "Below avg";
  return lang === "da" ? "Bund 25%" : "Bottom 25%";
}

function pctColor(p: number): string {
  if (p >= 60) return "#0d7c5f";
  if (p >= 40) return "#b8860b";
  return "#c0392b";
}

function metricFillPct(m: { score: number }): number {
  return Math.max(5, Math.min(100, m.score));
}

export default function InstitutionReport({
  score,
  institutionName,
  category,
  municipality,
  language: lang,
  aiAssessment,
  aiLoading,
  googleRating,
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

  const dateStr = formatDataDate(dataVersions.overall.lastUpdated, lang);
  const headlineColor = s10 != null ? SCORE_COLOR(s10) : "#888";
  const headlineBg = s10 != null ? SCORE_BG(s10) : "rgba(0,0,0,0.04)";

  // Top 2 metrics for the mini-badges next to score ring
  const topMetrics = score.metrics.slice(0, 2);

  return (
    <div>
      {/* Hero card */}
      <div className="bg-bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm">
        {/* Top section: info left, score right */}
        <div className="p-6 sm:p-10 flex flex-col sm:flex-row gap-8 sm:gap-12 items-start">
          {/* Left: Info */}
          <div className="flex-1 min-w-0">
            {/* Grade badge */}
            {s10 != null && (
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-5"
                style={{ background: headlineBg }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: headlineColor }} />
                <span
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: headlineColor }}
                >
                  {headline}
                </span>
              </div>
            )}

            <h1 className="font-display text-3xl sm:text-[38px] font-medium text-foreground leading-tight tracking-tight mb-3">
              {institutionName}
            </h1>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-6">
              <p className="text-base text-muted">
                {CATEGORY_LABELS[category]?.[lang] ?? category} · {municipality} Kommune
              </p>
              {googleRating && (
                <GoogleRatingBadge
                  rating={googleRating.rating}
                  reviewCount={googleRating.review_count}
                  mapsUrl={googleRating.maps_url}
                  compact
                />
              )}
            </div>

            <p className="text-[15px] text-foreground/70 leading-relaxed mb-7 max-w-[440px]">
              {aiLoading ? (
                <span className="inline-flex items-center gap-2 text-muted">
                  <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  {lang === "da" ? "Genererer vurdering..." : "Generating assessment..."}
                </span>
              ) : summary}
            </p>
          </div>

          {/* Right: Score ring + mini metrics */}
          <div className="flex flex-col items-center gap-4 shrink-0">
            {s10 != null ? (
              <ScoreRing score={s10} size={160} />
            ) : (
              <div className="w-[160px] h-[160px] rounded-full border-[8px] border-border/20 flex items-center justify-center">
                <span className="font-mono text-4xl text-muted">&mdash;</span>
              </div>
            )}

            {/* Mini metric badges under ring */}
            {topMetrics.length > 0 && (
              <div className="flex gap-6 mt-2">
                {topMetrics.map((m) => {
                  const mColor = m.score >= 70 ? "#0d7c5f" : m.score >= 45 ? "#b8860b" : "#c0392b";
                  const mBg = m.score >= 70 ? "rgba(13,124,95,0.08)" : m.score >= 45 ? "rgba(184,134,11,0.08)" : "rgba(192,57,43,0.08)";
                  return (
                    <div key={m.key} className="text-center">
                      <div className="font-mono text-xl font-medium text-foreground leading-none">
                        {m.value.split(" ")[0]}
                      </div>
                      <div className="text-[10px] text-muted uppercase tracking-wider mt-1">
                        {m.label[lang]}
                      </div>
                      {m.percentile != null && (
                        <div
                          className="text-[10px] font-semibold mt-1.5 px-2 py-0.5 rounded-full tracking-wide"
                          style={{ color: mColor, background: mBg }}
                        >
                          {pctLabel(m.percentile, lang)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Strengths strip */}
        {pros.length > 0 && (
          <div className="border-t border-[#0d7c5f]/10 bg-[#0d7c5f]/[0.03] px-6 sm:px-10 py-4 flex flex-wrap gap-x-8 gap-y-2">
            {pros.map((pro, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                  <circle cx="8" cy="8" r="8" fill="#0d7c5f" fillOpacity="0.12" />
                  <path d="M5 8l2 2 4-4" stroke="#0d7c5f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-[13px] text-[#2a5a4a] font-medium">{pro[lang]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Metric bars */}
      {score.metrics.length > 0 && (
        <div className="mt-8 bg-bg-card rounded-2xl border border-border/50 p-6 sm:p-10 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-xl font-medium text-foreground tracking-tight">
              {lang === "da" ? "Kvalitetsdata" : "Quality Data"}
            </h2>
            <span className="text-[11px] text-muted uppercase tracking-wider">
              {lang === "da" ? "Undervisningsministeriet" : "Ministry of Education"} {dateStr}
            </span>
          </div>

          {score.metrics.map((m, i) => {
            const color = m.percentile != null ? pctColor(m.percentile) : (m.score >= 70 ? "#0d7c5f" : m.score >= 45 ? "#b8860b" : "#c0392b");
            return (
              <MetricBar
                key={m.key}
                label={m.label[lang]}
                value={m.value}
                percentile={m.percentile}
                percentileLabel={m.percentile != null ? pctLabel(m.percentile, lang) : (m.context?.[lang] ?? null)}
                color={color}
                fillPct={metricFillPct(m)}
                delay={i * 150}
              />
            );
          })}

          {/* Legend */}
          <div className="flex gap-4 mt-4 pt-4 border-t border-border/40">
            {[
              { color: "#0d7c5f", label: "Top 25%" },
              { color: "#b8860b", label: lang === "da" ? "Middel" : "Average" },
              { color: "#c0392b", label: lang === "da" ? "Bund 25%" : "Bottom 25%" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                <span className="text-[11px] text-muted">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Concerns (if any) — below metrics */}
      {cons.length > 0 && (
        <div className="mt-4 bg-[#FEF3E2] rounded-2xl border border-[#b8860b]/10 p-6 sm:p-8">
          <p className="text-sm font-semibold text-[#8A5A12] mb-3">
            {lang === "da" ? "Opmærksomhedspunkter" : "Areas of concern"}
          </p>
          <div className="space-y-2.5">
            {cons.map((con, i) => (
              <div key={i} className="flex gap-2.5 text-sm text-[#633806] leading-relaxed">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
                  <circle cx="8" cy="8" r="8" fill="#b8860b" fillOpacity="0.15" />
                  <text x="8" y="12" textAnchor="middle" fill="#b8860b" fontSize="11" fontWeight="700">!</text>
                </svg>
                <span>{con[lang]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assessment */}
      <div className="mt-4 bg-bg-card rounded-2xl border border-border/50 p-6 sm:p-8 shadow-sm">
        <p className="text-sm font-semibold text-foreground mb-2">
          {lang === "da" ? "Vores vurdering" : "Our assessment"}
        </p>
        <p className="text-[15px] text-foreground/70 leading-relaxed">
          {aiLoading ? (
            <span className="inline-block w-full h-12 bg-border/30 rounded animate-pulse" />
          ) : recommendation}
        </p>
        {aiAssessment && (
          <p className="text-[10px] text-muted mt-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 inline-block" />
            {lang === "da" ? "AI-genereret vurdering" : "AI-generated assessment"}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between text-[11px] text-muted">
        <span>
          {lang === "da"
            ? "Scoren er vejledende og erstatter ikke et personligt besøg"
            : "The score is advisory and does not replace a personal visit"}
        </span>
        <span className="text-muted/60">
          {lang === "da" ? "Opdateret" : "Updated"} {dateStr}
        </span>
      </div>
    </div>
  );
}
