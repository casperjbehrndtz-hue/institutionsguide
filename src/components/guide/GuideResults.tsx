import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, ChevronRight } from "lucide-react";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { formatDKK } from "@/lib/format";
import { toSlug } from "@/lib/slugs";
import type { InstitutionType } from "@/lib/childcare/types";
import type { WizardState, Recommendation } from "@/lib/guideEngine";
import {
  TYPE_LABELS_DA,
  TYPE_LABELS_EN,
  TYPE_ICONS,
  TYPE_URL,
  COMPARISON_TABLE,
  computeTypeScore,
} from "@/lib/guideEngine";
import type { MunicipalChildcareRates } from "@/lib/childcare/types";

interface GuideResultsProps {
  wizard: WizardState;
  recommendation: Recommendation;
  rates: MunicipalChildcareRates | undefined;
  priceEstimate: {
    monthlyFull: number;
    monthlyAfter: number | null;
    subsidyPercent: number;
    hasFriplads: boolean;
  } | null;
  validMunicipality: string;
  isDa: boolean;
}

export default function GuideResults({
  wizard, recommendation, rates, priceEstimate,
  validMunicipality, isDa,
}: GuideResultsProps) {
  const ctaUrl = `/${TYPE_URL[recommendation.primary]}/${toSlug(validMunicipality)}`;

  return (
    <div className="animate-fade-in space-y-8">
      <div className="text-center space-y-2">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
          {isDa ? "Vores anbefaling til dig" : "Our recommendation for you"}
        </h2>
        <p className="text-muted text-sm">
          {isDa
            ? `Baseret på dit barns alder, dine prioriteter og priser i ${validMunicipality}`
            : `Based on your child's age, your priorities and prices in ${validMunicipality}`}
        </p>
      </div>

      {/* Primary recommendation card */}
      <ScrollReveal>
        <div className="card p-6 sm:p-8 border-primary/30 bg-primary/5 space-y-4">
          <div className="flex items-center gap-3">
            {(() => {
              const Icon = TYPE_ICONS[recommendation.primary];
              return <Icon className="w-8 h-8 text-primary" />;
            })()}
            <div>
              <p className="text-xs text-muted uppercase tracking-wide font-medium">
                {isDa ? "Anbefalet pasningstype" : "Recommended childcare type"}
              </p>
              <p className="font-display text-2xl font-bold text-foreground">
                {isDa
                  ? TYPE_LABELS_DA[recommendation.primary]
                  : TYPE_LABELS_EN[recommendation.primary]}
              </p>
            </div>
          </div>

          {/* Reasons */}
          <div className="space-y-2">
            {recommendation.reasons.map((r, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-muted">{isDa ? r.da : r.en}</p>
              </div>
            ))}
          </div>

          {/* Score breakdown */}
          {wizard.age && ["0-1", "1-2", "2-3"].includes(wizard.age) && (
            <div className="border-t border-border/50 pt-3">
              <p className="text-[11px] text-muted/70 mb-2">
                {isDa ? "Sådan scorer vi dine prioriteter:" : "How we score your priorities:"}
              </p>
              <div className="flex gap-4">
                {(["dagpleje", "vuggestue"] as const).map((type) => {
                  const score = computeTypeScore(type, new Set(wizard.priorities));
                  const isSelected = recommendation.primary === type;
                  return (
                    <div key={type} className={`flex-1 text-center p-2 rounded-lg ${isSelected ? "bg-primary/10 ring-1 ring-primary/30" : "bg-bg-card"}`}>
                      <p className="text-[11px] text-muted">{isDa ? TYPE_LABELS_DA[type] : TYPE_LABELS_EN[type]}</p>
                      <p className={`font-mono text-lg font-bold ${isSelected ? "text-primary" : "text-muted"}`}>{score > 0 ? `+${score}` : score}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Price estimate */}
          {priceEstimate && (
            <div className="border-t border-border pt-4 space-y-2">
              <p className="text-xs text-muted uppercase tracking-wide font-medium">
                {isDa ? `Pris i ${validMunicipality}` : `Price in ${validMunicipality}`}
              </p>
              <div className="flex flex-wrap gap-4">
                <div>
                  <p className="text-xs text-muted">{isDa ? "Fuld pris" : "Full price"}</p>
                  <p className="font-mono text-lg font-bold text-foreground">
                    {formatDKK(priceEstimate.monthlyFull)}
                    <span className="text-xs text-muted font-normal">/md.</span>
                  </p>
                </div>
                {priceEstimate.monthlyAfter !== null && (
                  <div>
                    <p className="text-xs text-muted">
                      {isDa ? "Med fripladstilskud" : "With subsidy"}
                    </p>
                    <p className="font-mono text-lg font-bold text-success">
                      {formatDKK(priceEstimate.monthlyAfter)}
                      <span className="text-xs text-muted font-normal">/md.</span>
                    </p>
                  </div>
                )}
                {priceEstimate.hasFriplads && (
                  <div className="flex items-end">
                    <span className="text-xs text-success bg-success/10 px-2 py-1 rounded">
                      {isDa ? "Du sparer" : "You save"} {priceEstimate.subsidyPercent}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CTA */}
          <Link
            to={ctaUrl}
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors min-h-[44px]"
          >
            {isDa
              ? `Se alle ${TYPE_LABELS_DA[recommendation.primary].toLowerCase()} i ${validMunicipality}`
              : `See all ${TYPE_LABELS_EN[recommendation.primary].toLowerCase()} in ${validMunicipality}`}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </ScrollReveal>

      {/* Alternative types */}
      {recommendation.alternatives.length > 0 && (
        <ScrollReveal>
          <div className="space-y-3">
            <h3 className="font-display text-lg font-semibold text-foreground">
              {isDa ? "Overvej også" : "Also consider"}
            </h3>
            {recommendation.alternatives.map((alt) => {
              const AltIcon = TYPE_ICONS[alt];
              const altRate = rates?.[alt as InstitutionType] ?? null;
              const altMonthly = altRate ? Math.round(altRate / 12) : null;
              return (
                <Link
                  key={alt}
                  to={`/${TYPE_URL[alt]}/${toSlug(validMunicipality)}`}
                  className="card p-4 flex items-center justify-between gap-3 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <AltIcon className="w-6 h-6 text-muted" />
                    <div>
                      <p className="font-semibold text-foreground text-sm">
                        {isDa ? TYPE_LABELS_DA[alt] : TYPE_LABELS_EN[alt]}
                      </p>
                      {altMonthly && (
                        <p className="text-xs text-muted">
                          {isDa ? "Fra" : "From"} {formatDKK(altMonthly)}/md.
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted shrink-0" />
                </Link>
              );
            })}
          </div>
        </ScrollReveal>
      )}

      {/* Comparison table */}
      <ScrollReveal>
        <div className="space-y-3">
          <h3 className="font-display text-lg font-semibold text-foreground">
            {isDa ? "Sammenligning: dagpleje vs. vuggestue vs. børnehave" : "Comparison: childminder vs. nursery vs. kindergarten"}
          </h3>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm border-collapse min-w-[520px]" role="table">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="text-left py-2 pr-3 text-muted font-medium w-[140px]" />
                  <th scope="col" className="text-left py-2 px-3 font-semibold text-foreground">
                    {isDa ? "Dagpleje" : "Childminder"}
                  </th>
                  <th scope="col" className="text-left py-2 px-3 font-semibold text-foreground">
                    {isDa ? "Vuggestue" : "Nursery"}
                  </th>
                  <th scope="col" className="text-left py-2 px-3 font-semibold text-foreground">
                    {isDa ? "Børnehave" : "Kindergarten"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rates && (
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-3 text-muted font-medium">
                      {isDa ? "Pris i " + validMunicipality : "Price in " + validMunicipality}
                    </td>
                    <td className="py-2 px-3 font-mono text-foreground">
                      {rates.dagpleje ? formatDKK(Math.round(rates.dagpleje / 12)) + "/md." : "—"}
                    </td>
                    <td className="py-2 px-3 font-mono text-foreground">
                      {rates.vuggestue ? formatDKK(Math.round(rates.vuggestue / 12)) + "/md." : "—"}
                    </td>
                    <td className="py-2 px-3 font-mono text-foreground">
                      {rates.boernehave ? formatDKK(Math.round(rates.boernehave / 12)) + "/md." : "—"}
                    </td>
                  </tr>
                )}
                {COMPARISON_TABLE.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 pr-3 text-muted font-medium">
                      {isDa ? row.da : row.en}
                    </td>
                    <td className="py-2 px-3 text-foreground">
                      {isDa ? row.dagpleje.da : row.dagpleje.en}
                    </td>
                    <td className="py-2 px-3 text-foreground">
                      {isDa ? row.vuggestue.da : row.vuggestue.en}
                    </td>
                    <td className="py-2 px-3 text-foreground">
                      {isDa ? row.boernehave.da : row.boernehave.en}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </ScrollReveal>

      {/* Related tools */}
      <ScrollReveal>
        <div className="card p-6 bg-primary/5 text-center space-y-3">
          <p className="font-display text-lg font-semibold text-foreground">
            {isDa ? "Vil du vide mere?" : "Want to know more?"}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/friplads"
              className="inline-flex items-center gap-1.5 bg-[var(--color-bg-card)] border border-border px-4 py-2 rounded-lg text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors min-h-[44px]"
            >
              {isDa ? "Beregn fripladstilskud" : "Calculate subsidy"}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/normering"
              className="inline-flex items-center gap-1.5 bg-[var(--color-bg-card)] border border-border px-4 py-2 rounded-lg text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors min-h-[44px]"
            >
              {isDa ? "Se normering" : "See staff ratios"}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/prissammenligning"
              className="inline-flex items-center gap-1.5 bg-[var(--color-bg-card)] border border-border px-4 py-2 rounded-lg text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors min-h-[44px]"
            >
              {isDa ? "Sammenlign priser" : "Compare prices"}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
