import type { ScoreResult, LocalizedText } from "@/lib/institutionScore";
import type { Assessment } from "@/hooks/useAssessment";
import type { UnifiedInstitution } from "@/lib/types";
import { Link } from "react-router-dom";
import { formatDKK } from "@/lib/format";

interface Props {
  score: ScoreResult;
  institutionName: string;
  category: string;
  municipality: string;
  language: "da" | "en";
  nearby?: (UnifiedInstitution & { dist?: number })[];
  nearbyScores?: { id: string; overall: number }[];
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
  const s10 = Math.round(score.overall / 10 * 10) / 10;

  // Use AI text when available, fall back to deterministic
  const headline: string = aiAssessment?.headline?.[lang]
    ?? FALLBACK_HEADLINE[score.grade]?.[lang]
    ?? FALLBACK_HEADLINE.C[lang];

  const summary: string = aiAssessment?.summary?.[lang]
    ?? score.recommendation[lang];

  const pros: LocalizedText[] = aiAssessment?.pros ?? score.pros;
  const cons: LocalizedText[] = aiAssessment?.cons ?? score.cons;
  const recommendation: string = aiAssessment?.recommendation?.[lang]
    ?? score.recommendation[lang];

  const now = new Date();
  const months = lang === "da"
    ? ["januar","februar","marts","april","maj","juni","juli","august","september","oktober","november","december"]
    : ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const dateStr = `${lang === "da" ? "Opdateret" : "Updated"} ${months[now.getMonth()]} ${now.getFullYear()}`;

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
        <div className="flex flex-col items-center shrink-0" title={lang === "da" ? `Score: ${s10.toFixed(1)}/10 baseret på pris, kvalitet og placering` : `Score: ${s10.toFixed(1)}/10 based on price, quality and location`}>
          <div className={`w-[64px] h-[64px] sm:w-[72px] sm:h-[72px] rounded-full border-[3px] flex items-center justify-center shrink-0 ${SCORE_COLOR(s10)}`}>
            <span className="font-mono text-[24px] sm:text-[28px] font-medium w-full text-center">{s10.toFixed(1)}</span>
          </div>
          <span className="text-[10px] text-muted mt-1">{lang === "da" ? "af 10" : "of 10"}</span>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
        {score.metrics.slice(0, 4).map((m) => {
          const valColor = m.score >= 70 ? "text-[#0F6E56]" : m.score >= 45 ? "text-[#BA7517]" : "text-[#A32D2D]";
          return (
            <div key={m.key} className="rounded-lg bg-bg-card p-3.5">
              <p className="text-[11px] text-muted uppercase tracking-wide">{m.label[lang]}</p>
              <p className={`font-mono text-xl font-medium mt-1 ${m.score >= 45 ? valColor : "text-foreground"}`}>
                {m.value.split(" ")[0]}
              </p>
              <p className="text-[11px] text-muted mt-0.5">{m.value.split(" ").slice(1).join(" ") || ""}</p>
            </div>
          );
        })}
      </div>

      {/* Fordele & Opmærksomhedspunkter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
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
      </div>

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
              const badgeColor = ns
                ? ns.overall >= 65 ? { bg: "#E1F5EE", text: "#085041" }
                  : ns.overall >= 45 ? { bg: "#FAEEDA", text: "#633806" }
                  : { bg: "#FCEBEB", text: "#791F1F" }
                : null;
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
                    {ns && badgeColor && (
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
