import { formatDKK } from "@/lib/format";
import { dataVersions } from "@/lib/dataVersions";
import GatedSection from "@/components/shared/GatedSection";
import type { UnifiedInstitution } from "@/lib/types";

interface PriceSectionProps {
  inst: UnifiedInstitution;
  municipalityAvgPrice: number | null;
  unlocked: boolean;
  onRequestUnlock: () => void;
  language: string;
  t: any;
}

export default function PriceSection({ inst, municipalityAvgPrice, unlocked, onRequestUnlock, language, t }: PriceSectionProps) {
  if (inst.monthlyRate == null && inst.yearlyPrice == null) return null;

  return (
    <div id="section-data" className="card p-5">
      <h2 className="font-display text-lg font-semibold mb-4">{t.detail.prices}</h2>
      {municipalityAvgPrice != null && inst.monthlyRate != null && (
        <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/15 text-center">
          {(() => {
            const diff = inst.monthlyRate! - municipalityAvgPrice;
            const pct = Math.round((diff / municipalityAvgPrice) * 100);
            if (Math.abs(pct) < 2) return <p className="text-sm font-medium text-muted">{language === "da" ? "Tæt på gennemsnittet for kommunen" : "Close to municipality average"}</p>;
            return (
              <p className={`text-sm font-medium ${diff < 0 ? "text-green-600" : "text-red-500"}`}>
                {diff < 0
                  ? (language === "da" ? `${Math.abs(pct)}% billigere end gennemsnittet i ${inst.municipality}` : `${Math.abs(pct)}% cheaper than average in ${inst.municipality}`)
                  : (language === "da" ? `${pct}% dyrere end gennemsnittet i ${inst.municipality}` : `${pct}% more expensive than average in ${inst.municipality}`)}
              </p>
            );
          })()}
        </div>
      )}
      <GatedSection unlocked={unlocked} onRequestUnlock={onRequestUnlock}>
        {inst.category === "efterskole" && inst.yearlyPrice ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-bg-card border border-border rounded-lg p-4 text-center">
              <p className="text-xs text-muted mb-1">{language === "da" ? "Ugepris" : "Weekly rate"}</p>
              <p className="font-mono text-2xl font-bold text-primary">{formatDKK(inst.weeklyPrice)}</p>
              <p className="text-[10px] text-muted mt-1">{language === "da" ? "~42 uger" : "~42 weeks"}</p>
            </div>
            <div className="bg-bg-card border border-border rounded-lg p-4 text-center">
              <p className="text-xs text-muted mb-1">{language === "da" ? "Årspris" : "Yearly rate"}</p>
              <p className="font-mono text-2xl font-bold text-foreground">{formatDKK(inst.yearlyPrice)}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-bg-card border border-border rounded-lg p-4 text-center">
              <p className="text-xs text-muted mb-1">{t.detail.monthlyRate}</p>
              <p className="font-mono text-2xl font-bold text-primary">{formatDKK(inst.monthlyRate)}</p>
              <p className="text-[10px] text-muted mt-1">{language === "da" ? "Før evt. fripladstilskud" : "Before subsidy"}</p>
            </div>
            <div className="bg-bg-card border border-border rounded-lg p-4 text-center">
              <p className="text-xs text-muted mb-1">{t.detail.annualRate}</p>
              <p className="font-mono text-2xl font-bold text-foreground">{formatDKK(inst.annualRate)}</p>
            </div>
          </div>
        )}
        {municipalityAvgPrice != null && inst.monthlyRate != null && (
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/15 text-center">
            <p className="text-xs text-muted mb-0.5">
              {language === "da" ? `Gennemsnit i ${inst.municipality}` : `Average in ${inst.municipality}`}
            </p>
            <p className="font-mono text-lg font-bold text-foreground">{formatDKK(municipalityAvgPrice)}<span className="text-xs font-normal text-muted">{t.common.perMonth}</span></p>
          </div>
        )}
      </GatedSection>
      <p className="text-[10px] text-muted mt-3 text-center">
        {language === "da" ? `Priser fra ${dataVersions.prices.year} \u2014 kan afvige fra aktuelle takster` : `Prices from ${dataVersions.prices.year} \u2014 may differ from current rates`}
      </p>
    </div>
  );
}
