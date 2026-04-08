import { FRIPLADS_CONSTANTS } from "@/lib/childcare/friplads";
import type { InstitutionType } from "@/lib/childcare/types";
import type { TranslationStrings } from "@/lib/translations/types";

interface Props {
  municipality: string;
  onMunicipalityChange: (v: string) => void;
  municipalities: string[];
  category: InstitutionType;
  onCategoryChange: (v: InstitutionType) => void;
  categoryLabels: Record<InstitutionType, string>;
  income: number;
  onIncomeChange: (v: number) => void;
  singleParent: boolean;
  onSingleParentChange: (v: boolean) => void;
  children: number;
  onChildrenChange: (v: number) => void;
  siblingChild: boolean;
  onSiblingChildChange: (v: boolean) => void;
  isDa: boolean;
  t: TranslationStrings;
}

export default function FripladsCalculatorForm({
  municipality, onMunicipalityChange, municipalities,
  category, onCategoryChange, categoryLabels,
  income, onIncomeChange,
  singleParent, onSingleParentChange,
  children, onChildrenChange,
  siblingChild, onSiblingChildChange,
  isDa, t,
}: Props) {
  return (
    <section className="card p-6 sm:p-8 space-y-6">
      <h2 className="font-display text-xl font-semibold text-foreground">
        {isDa ? "Din situation" : "Your situation"}
      </h2>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Municipality selector */}
        <div>
          <label htmlFor="friplads-municipality" className="block text-sm font-medium text-foreground mb-1.5">
            {isDa ? "Kommune" : "Municipality"}
          </label>
          <select
            id="friplads-municipality"
            value={municipality}
            onChange={(e) => onMunicipalityChange(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-card text-foreground text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label={isDa ? "Vælg kommune" : "Select municipality"}
          >
            {municipalities.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Category selector */}
        <div>
          <label htmlFor="friplads-category" className="block text-sm font-medium text-foreground mb-1.5">
            {isDa ? "Type af pasning" : "Type of care"}
          </label>
          <select
            id="friplads-category"
            value={category}
            onChange={(e) => onCategoryChange(e.target.value as InstitutionType)}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-card text-foreground text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label={isDa ? "Vælg type" : "Select type"}
          >
            {(["vuggestue", "boernehave", "dagpleje", "sfo"] as InstitutionType[]).map((cat) => (
              <option key={cat} value={cat}>{categoryLabels[cat]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Income slider + text input */}
      <div>
        <label htmlFor="friplads-income" className="block text-sm font-medium text-foreground mb-1.5">
          {t.friplads.householdIncome}
        </label>
        <div className="flex items-center justify-end gap-2 mb-2">
          <input
            type="text"
            inputMode="numeric"
            value={income.toLocaleString("da-DK")}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              const num = Number(raw);
              if (!isNaN(num)) onIncomeChange(Math.min(num, 1_200_000));
            }}
            className="font-mono text-2xl text-foreground font-bold text-right bg-transparent border-b-2 border-border focus:border-primary outline-none w-40 transition-colors"
            aria-label={t.friplads.householdIncome}
          />
          <span className="font-mono text-2xl text-foreground font-bold">kr.</span>
        </div>
        <div className="relative">
          <input
            id="friplads-income"
            type="range"
            min={0}
            max={1_200_000}
            step={10_000}
            value={income}
            onChange={(e) => onIncomeChange(Number(e.target.value))}
            className="w-full h-3 accent-primary cursor-pointer min-h-[44px]"
            aria-label={t.friplads.householdIncome}
            aria-valuetext={`${income.toLocaleString("da-DK")} kr.`}
          />
          {/* Median reference marker */}
          <div className="absolute top-0 pointer-events-none" style={{ left: `${(550_000 / 1_200_000) * 100}%` }}>
            <div className="w-px h-4 bg-muted/60 mx-auto" />
            <span className="text-[10px] text-muted whitespace-nowrap -translate-x-1/2 block">
              {isDa ? "Median" : "Median"}
            </span>
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-muted font-mono mt-0.5 px-0.5">
          <span>0</span>
          <span>200.000</span>
          <span>400.000</span>
          <span>600.000</span>
          <span>800.000</span>
          <span>1.000.000</span>
          <span>1.200.000</span>
        </div>
        {/* Threshold info */}
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted">
          <span className="bg-success/10 text-success px-2 py-0.5 rounded">
            {isDa ? "Fuld friplads" : "Full subsidy"}: &lt; {FRIPLADS_CONSTANTS.lowerThreshold.toLocaleString("da-DK")} kr.
          </span>
          <span className="bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded">
            {isDa ? "Delvis friplads" : "Partial subsidy"}: {FRIPLADS_CONSTANTS.lowerThreshold.toLocaleString("da-DK")} &ndash; {FRIPLADS_CONSTANTS.upperThreshold.toLocaleString("da-DK")} kr.
          </span>
          <span className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded">
            {isDa ? "Ingen friplads" : "No subsidy"}: &gt; {FRIPLADS_CONSTANTS.upperThreshold.toLocaleString("da-DK")} kr.
          </span>
        </div>
      </div>

      {/* Toggles row */}
      <div className="grid sm:grid-cols-3 gap-4">
        {/* Single parent toggle */}
        <div className="flex items-center gap-3">
          <input
            id="friplads-single"
            type="checkbox"
            checked={singleParent}
            onChange={(e) => onSingleParentChange(e.target.checked)}
            className="w-5 h-5 accent-primary cursor-pointer min-w-[44px] min-h-[44px]"
          />
          <label htmlFor="friplads-single" className="text-sm text-foreground cursor-pointer">
            {t.friplads.singleParent}
            <span className="block text-xs text-muted">
              {isDa
                ? `+${FRIPLADS_CONSTANTS.singleParentSupplement.toLocaleString("da-DK")} kr. i indkomstgranse`
                : `+${FRIPLADS_CONSTANTS.singleParentSupplement.toLocaleString("da-DK")} DKK threshold`}
            </span>
          </label>
        </div>

        {/* Sibling discount toggle */}
        <div className="flex items-center gap-3">
          <input
            id="friplads-sibling"
            type="checkbox"
            checked={siblingChild}
            onChange={(e) => onSiblingChildChange(e.target.checked)}
            disabled={children <= 1}
            className="w-5 h-5 accent-primary cursor-pointer min-w-[44px] min-h-[44px] disabled:opacity-40"
          />
          <label htmlFor="friplads-sibling" className={`text-sm cursor-pointer ${children <= 1 ? "text-muted" : "text-foreground"}`}>
            {isDa ? "Søskenderabat (barn nr. 2+)" : "Sibling discount (2nd+ child)"}
            <span className="block text-xs text-muted">
              {children <= 1
                ? (isDa ? "Kræver 2+ børn" : "Requires 2+ children")
                : (isDa ? "50% rabat på dette barn" : "50% discount on this child")}
            </span>
          </label>
        </div>

        {/* Children count */}
        <div>
          <label htmlFor="friplads-children" className="block text-sm text-foreground mb-1">
            {t.friplads.childrenUnder18}
          </label>
          <select
            id="friplads-children"
            value={children}
            onChange={(e) => onChildrenChange(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-border bg-bg-card text-foreground text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label={t.friplads.childrenUnder18}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? t.friplads.child : t.friplads.children}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
