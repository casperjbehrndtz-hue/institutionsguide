import { useState, useMemo, useEffect } from "react";
import { Info } from "lucide-react";
import { calculateFriplads } from "@/lib/childcare/friplads";
import { formatDKK } from "@/lib/format";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFamily } from "@/contexts/FamilyContext";

interface Props {
  annualRate: number;
  label?: string;
}

export default function FripladsCalculator({ annualRate, label }: Props) {
  const { profile, setProfile } = useFamily();
  const [income, setIncome] = useState(profile?.income ?? 450_000);
  const [singleParent, setSingleParent] = useState(profile?.singleParent ?? false);
  const [children, setChildren] = useState(profile?.childCount ?? 1);
  const { t, language } = useLanguage();

  // Persist changes back to FamilyContext
  useEffect(() => {
    setProfile({ income, singleParent, childCount: children });
  }, [income, singleParent, children, setProfile]);

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
        <div className="flex items-center gap-1.5 mb-1">
          <label htmlFor="friplads-income" className="block text-sm text-muted">
            {t.friplads.householdIncome}
          </label>
          <span className="group relative">
            <Info className="w-3.5 h-3.5 text-muted/60 cursor-help" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 p-2 rounded-lg bg-foreground text-background text-[11px] leading-tight opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
              {language === "da"
                ? "Husstandsindkomst er den samlede årlige indkomst før skat for alle voksne i husstanden."
                : "Household income is the total annual income before tax for all adults in the household."}
            </span>
          </span>
        </div>
        <p className="text-right font-mono text-base text-foreground font-bold mb-1">
          {income.toLocaleString("da-DK")} kr.
        </p>
        <div className="relative">
          <input
            id="friplads-income"
            type="range"
            min={0}
            max={1_200_000}
            step={10_000}
            value={income}
            onChange={(e) => setIncome(Number(e.target.value))}
            className="w-full h-2 accent-primary cursor-pointer min-h-[44px]"
            aria-label={t.friplads.householdIncome}
            aria-valuetext={`${income.toLocaleString("da-DK")} kr.`}
          />
          {/* Median reference marker */}
          <div className="absolute top-0 pointer-events-none" style={{ left: `${(550_000 / 1_200_000) * 100}%` }}>
            <div className="w-px h-3 bg-muted/60 mx-auto" />
            <span className="text-[10px] sm:text-[11px] text-muted whitespace-nowrap -translate-x-1/2 block">{language === "da" ? "Median" : "Median"}</span>
          </div>
        </div>
        {/* Step labels */}
        <div className="flex justify-between text-[10px] sm:text-[11px] text-muted font-mono mt-0.5 px-0.5">
          <span>200k</span>
          <span>400k</span>
          <span>600k</span>
          <span>800k</span>
          <span>1.000k</span>
        </div>
        {income >= 1_200_000 && (
          <p className="text-[10px] text-muted mt-1">
            {language === "da"
              ? "Maks. i beregner — ved højere indkomst er der ingen friplads."
              : "Calculator max — no subsidy at higher income."}
          </p>
        )}
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
      <div className="flex items-start gap-1.5 mt-2 group relative">
        <Info className="w-3.5 h-3.5 text-muted shrink-0 mt-0.5 cursor-help" />
        <p className="text-xs text-muted">{t.friplads.disclaimer}</p>
      </div>
    </div>
  );
}
