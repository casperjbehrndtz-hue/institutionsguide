import { useState, useMemo } from "react";
import { calculateFriplads } from "@/lib/childcare/friplads";
import { formatDKK } from "@/lib/format";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  annualRate: number;
  label?: string;
}

export default function FripladsCalculator({ annualRate, label }: Props) {
  const [income, setIncome] = useState(450_000);
  const [singleParent, setSingleParent] = useState(false);
  const [children, setChildren] = useState(1);
  const { t } = useLanguage();

  const result = useMemo(
    () => calculateFriplads(annualRate, income, singleParent, children, 0),
    [annualRate, income, singleParent, children]
  );

  return (
    <div className="card p-5 space-y-4">
      <h3 className="font-display text-lg font-semibold text-foreground">
        {label || t.friplads.title}
      </h3>

      {/* Income slider */}
      <div>
        <label htmlFor="friplads-income" className="block text-sm text-muted mb-1">
          {t.friplads.householdIncome}
        </label>
        <input
          id="friplads-income"
          type="range"
          min={0}
          max={1_200_000}
          step={5_000}
          value={income}
          onChange={(e) => setIncome(Number(e.target.value))}
          className="w-full h-2 accent-primary cursor-pointer min-h-[44px]"
          aria-label={t.friplads.householdIncome}
          aria-valuetext={formatDKK(income)}
        />
        <p className="text-right font-mono text-sm text-foreground font-medium">
          {formatDKK(income)}
        </p>
      </div>

      {/* Single parent toggle */}
      <div className="flex items-center gap-3">
        <input
          id="friplads-single"
          type="checkbox"
          checked={singleParent}
          onChange={(e) => setSingleParent(e.target.checked)}
          className="w-5 h-5 accent-primary cursor-pointer min-w-[44px] min-h-[44px]"
        />
        <label htmlFor="friplads-single" className="text-sm text-foreground cursor-pointer">
          {t.friplads.singleParent}
        </label>
      </div>

      {/* Children count */}
      <div>
        <label htmlFor="friplads-children" className="block text-sm text-muted mb-1">
          {t.friplads.childrenUnder18}
        </label>
        <select
          id="friplads-children"
          value={children}
          onChange={(e) => setChildren(Number(e.target.value))}
          className="px-3 py-2 rounded-lg border border-border bg-bg-card text-foreground text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label={t.friplads.childrenUnder18}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n} {n === 1 ? t.friplads.child : t.friplads.children}</option>
          ))}
        </select>
      </div>

      {/* Results */}
      <div className="border-t border-border pt-4 space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-muted">{t.friplads.fullRate}</span>
          <span className="font-mono text-sm">{formatDKK(result.fullMonthlyRate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted">{t.friplads.yourSubsidy}</span>
          <span className="font-mono text-sm text-success font-medium">
            &minus;{formatDKK(result.monthlySubsidy)}
          </span>
        </div>
        {result.siblingDiscount > 0 && (
          <div className="flex justify-between">
            <span className="text-sm text-muted">{t.friplads.siblingDiscount}</span>
            <span className="font-mono text-sm text-success">
              &minus;{formatDKK(result.siblingDiscount)}
            </span>
          </div>
        )}
        <div className="flex justify-between border-t border-border pt-2">
          <span className="text-sm font-semibold text-foreground">{t.friplads.youPay}</span>
          <span className="font-mono text-lg font-bold text-primary">
            {formatDKK(result.monthlyPayment)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted">{t.friplads.annualSavings}</span>
          <span className="font-mono text-sm text-success font-medium">
            {formatDKK(result.annualSavings)}
          </span>
        </div>
        {result.subsidyPercent > 0 && (
          <p className="text-xs text-muted text-center mt-2">
            {t.friplads.savingsPercent.replace("{pct}", String(result.subsidyPercent))}
          </p>
        )}
      </div>
      <p className="text-[10px] text-muted mt-2">
        {t.friplads.disclaimer}
      </p>
    </div>
  );
}
