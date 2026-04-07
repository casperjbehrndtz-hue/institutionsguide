import { calculateFriplads } from "@/lib/childcare/friplads";
import { formatDKK } from "@/lib/format";
import type { InstitutionType, MunicipalChildcareRates } from "@/lib/childcare/types";
import ScrollReveal from "@/components/shared/ScrollReveal";

interface Props {
  rates: MunicipalChildcareRates;
  municipality: string;
  income: number;
  singleParent: boolean;
  children: number;
  siblingChild: boolean;
  category: InstitutionType;
  onCategoryChange: (cat: InstitutionType) => void;
  categoryLabels: Record<InstitutionType, string>;
  isDa: boolean;
}

const CATEGORIES: InstitutionType[] = ["vuggestue", "boernehave", "dagpleje", "sfo"];

export default function FripladsRatesGrid({
  rates, municipality, income, singleParent, children, siblingChild,
  category, onCategoryChange, categoryLabels, isDa,
}: Props) {
  return (
    <ScrollReveal>
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-foreground">
          {isDa ? `Alle takster i ${municipality}` : `All rates in ${municipality}`}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {CATEGORIES.map((cat) => {
            const rate = rates[cat];
            if (!rate) return null;
            const calc = calculateFriplads(rate, income, singleParent, children, siblingChild ? 1 : 0);
            return (
              <div
                key={cat}
                className={`card p-4 space-y-2 cursor-pointer transition-all ${cat === category ? "ring-2 ring-primary" : "hover:border-primary/30"}`}
                onClick={() => onCategoryChange(cat)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onCategoryChange(cat); }}
                aria-label={`${isDa ? "Vælg" : "Select"} ${categoryLabels[cat]}`}
              >
                <p className="text-xs font-medium text-muted">{categoryLabels[cat]}</p>
                <p className="font-mono text-sm text-foreground">
                  {isDa ? "Fuld:" : "Full:"} {formatDKK(calc.fullMonthlyRate)}/md.
                </p>
                <p className="font-mono text-lg font-bold text-primary">
                  {formatDKK(calc.monthlyPayment)}/md.
                </p>
                {calc.subsidyPercent > 0 && (
                  <p className="text-xs text-success">&minus;{calc.subsidyPercent}%</p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </ScrollReveal>
  );
}
