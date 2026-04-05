import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calculator, ArrowRight, Info, TrendingDown, TrendingUp, Baby, GraduationCap, Backpack } from "lucide-react";
import SEOHead from "@/components/shared/SEOHead";
import JsonLd from "@/components/shared/JsonLd";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { breadcrumbSchema } from "@/lib/schema";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFamily } from "@/contexts/FamilyContext";
import { calculateFriplads, FRIPLADS_CONSTANTS } from "@/lib/childcare/friplads";
import { getAllMunicipalities, getChildcareRates, CHILDCARE_RATES_2025 } from "@/lib/childcare/rates";
import { formatDKK, formatNumber } from "@/lib/format";
import DataFreshness from "@/components/shared/DataFreshness";

// Duration in months for each phase
const VUGGESTUE_MONTHS = 36; // 0-2 years
const BOERNEHAVE_MONTHS = 36; // 3-5 years
const SFO_MONTHS = 48; // 6-9 years (4 years)
const TOTAL_MONTHS = VUGGESTUE_MONTHS + BOERNEHAVE_MONTHS + SFO_MONTHS;

interface PhaseResult {
  label: string;
  labelEn: string;
  ageRange: string;
  ageRangeEn: string;
  months: number;
  monthlyFull: number;
  monthlyAfterFriplads: number;
  totalFull: number;
  totalAfterFriplads: number;
  available: boolean;
}

interface MunicipalTotal {
  municipality: string;
  grandTotal: number;
  grandTotalFull: number;
}

function computePhases(
  municipality: string,
  income: number,
  singleParent: boolean,
  children: number
): PhaseResult[] {
  const rates = getChildcareRates(municipality);
  if (!rates) return [];

  const phases: PhaseResult[] = [];

  // Vuggestue phase (0-2)
  const vugRate = rates.vuggestue;
  if (vugRate !== null) {
    const calc = calculateFriplads(vugRate, income, singleParent, children, 0);
    phases.push({
      label: "Vuggestue",
      labelEn: "Nursery",
      ageRange: "0-2 år",
      ageRangeEn: "0-2 yrs",
      months: VUGGESTUE_MONTHS,
      monthlyFull: calc.fullMonthlyRate,
      monthlyAfterFriplads: calc.monthlyPayment,
      totalFull: calc.fullMonthlyRate * VUGGESTUE_MONTHS,
      totalAfterFriplads: calc.monthlyPayment * VUGGESTUE_MONTHS,
      available: true,
    });
  } else {
    phases.push({
      label: "Vuggestue",
      labelEn: "Nursery",
      ageRange: "0-2 år",
      ageRangeEn: "0-2 yrs",
      months: VUGGESTUE_MONTHS,
      monthlyFull: 0,
      monthlyAfterFriplads: 0,
      totalFull: 0,
      totalAfterFriplads: 0,
      available: false,
    });
  }

  // Boernehave phase (3-5)
  const bhRate = rates.boernehave;
  if (bhRate !== null) {
    const calc = calculateFriplads(bhRate, income, singleParent, children, 0);
    phases.push({
      label: "Børnehave",
      labelEn: "Kindergarten",
      ageRange: "3-5 år",
      ageRangeEn: "3-5 yrs",
      months: BOERNEHAVE_MONTHS,
      monthlyFull: calc.fullMonthlyRate,
      monthlyAfterFriplads: calc.monthlyPayment,
      totalFull: calc.fullMonthlyRate * BOERNEHAVE_MONTHS,
      totalAfterFriplads: calc.monthlyPayment * BOERNEHAVE_MONTHS,
      available: true,
    });
  } else {
    phases.push({
      label: "Børnehave",
      labelEn: "Kindergarten",
      ageRange: "3-5 år",
      ageRangeEn: "3-5 yrs",
      months: BOERNEHAVE_MONTHS,
      monthlyFull: 0,
      monthlyAfterFriplads: 0,
      totalFull: 0,
      totalAfterFriplads: 0,
      available: false,
    });
  }

  // SFO phase (6-9)
  const sfoRate = rates.sfo;
  if (sfoRate !== null) {
    const calc = calculateFriplads(sfoRate, income, singleParent, children, 0);
    phases.push({
      label: "SFO",
      labelEn: "After-school care",
      ageRange: "6-9 år",
      ageRangeEn: "6-9 yrs",
      months: SFO_MONTHS,
      monthlyFull: calc.fullMonthlyRate,
      monthlyAfterFriplads: calc.monthlyPayment,
      totalFull: calc.fullMonthlyRate * SFO_MONTHS,
      totalAfterFriplads: calc.monthlyPayment * SFO_MONTHS,
      available: true,
    });
  } else {
    phases.push({
      label: "SFO",
      labelEn: "After-school care",
      ageRange: "6-9 år",
      ageRangeEn: "6-9 yrs",
      months: SFO_MONTHS,
      monthlyFull: 0,
      monthlyAfterFriplads: 0,
      totalFull: 0,
      totalAfterFriplads: 0,
      available: false,
    });
  }

  return phases;
}

function computeAllMunicipalTotals(
  income: number,
  singleParent: boolean,
  children: number
): MunicipalTotal[] {
  return CHILDCARE_RATES_2025.map((r) => {
    const phases = computePhases(r.municipality, income, singleParent, children);
    const grandTotal = phases.reduce((sum, p) => sum + p.totalAfterFriplads, 0);
    const grandTotalFull = phases.reduce((sum, p) => sum + p.totalFull, 0);
    return { municipality: r.municipality, grandTotal, grandTotalFull };
  }).sort((a, b) => a.grandTotal - b.grandTotal);
}

const PHASE_ICONS = [Baby, GraduationCap, Backpack];
const PHASE_COLORS = ["text-pink-500", "text-amber-500", "text-blue-500"];
const PHASE_BG = ["bg-pink-500/10", "bg-amber-500/10", "bg-blue-500/10"];

export default function TotalCostPage() {
  const { language } = useLanguage();
  const { profile, setProfile } = useFamily();
  const isDa = language === "da";

  const [income, setIncome] = useState(profile?.income ?? 550_000);
  const [singleParent, setSingleParent] = useState(profile?.singleParent ?? false);
  const [children, setChildren] = useState(profile?.childCount ?? 1);
  const [municipality, setMunicipality] = useState("København");

  const municipalities = useMemo(() => getAllMunicipalities(), []);

  // Persist to FamilyContext
  useEffect(() => {
    setProfile({ income, singleParent, childCount: children });
  }, [income, singleParent, children, setProfile]);

  const phases = useMemo(
    () => computePhases(municipality, income, singleParent, children),
    [municipality, income, singleParent, children]
  );

  const grandTotalFull = useMemo(
    () => phases.reduce((sum, p) => sum + p.totalFull, 0),
    [phases]
  );

  const grandTotal = useMemo(
    () => phases.reduce((sum, p) => sum + p.totalAfterFriplads, 0),
    [phases]
  );

  const totalSavings = grandTotalFull - grandTotal;

  // Cheapest and most expensive municipalities
  const allTotals = useMemo(
    () => computeAllMunicipalTotals(income, singleParent, children),
    [income, singleParent, children]
  );

  const cheapest = allTotals[0];
  const mostExpensive = allTotals[allTotals.length - 1];

  // Current municipality rank
  const currentRank = useMemo(
    () => allTotals.findIndex((t) => t.municipality === municipality) + 1,
    [allTotals, municipality]
  );

  // Bar width max for visualization
  const maxPhaseTotal = useMemo(
    () => Math.max(...phases.map((p) => p.totalFull), 1),
    [phases]
  );

  return (
    <>
      <SEOHead
        title={
          isDa
            ? `Hvad koster børnepasning i ${municipality}? Samlet pris fra vuggestue til SFO — Institutionsguide`
            : `What does childcare cost in ${municipality}? Total cost from nursery to after-school care — Institutionsguide`
        }
        description={
          isDa
            ? `Se den samlede pris for børnepasning fra vuggestue til SFO i ${municipality} og alle 98 kommuner. Beregn med fripladstilskud og sammenlign kommuner.`
            : `See the total cost of childcare from nursery to after-school care in ${municipality} and all 98 municipalities. Calculate with subsidy and compare municipalities.`
        }
        path="/samlet-pris"
      />
      <JsonLd data={breadcrumbSchema([
        { name: isDa ? "Hjem" : "Home", url: "https://institutionsguiden.dk/" },
        { name: isDa ? "Samlet pris" : "Total cost", url: "https://institutionsguiden.dk/samlet-pris" },
      ])} />

      <Breadcrumbs
        items={[
          { label: isDa ? "Hjem" : "Home", href: "/" },
          { label: isDa ? "Samlet pris" : "Total cost" },
        ]}
      />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-12">
        {/* Hero */}
        <ScrollReveal>
          <section className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium">
              <Calculator className="w-4 h-4" />
              {isDa ? `${FRIPLADS_CONSTANTS.year}-satser` : `${FRIPLADS_CONSTANTS.year} rates`}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
              {isDa
                ? "Hvad koster børnepasning i alt?"
                : "What does childcare cost in total?"}
            </h1>
            <p className="text-muted text-lg max-w-2xl mx-auto leading-relaxed">
              {isDa
                ? "Se den samlede pris for børnepasning fra vuggestue (0 år) til SFO (9 år) i din kommune — med fripladstilskud beregnet automatisk."
                : "See the total cost of childcare from nursery (age 0) through after-school care (age 9) in your municipality — with subsidy calculated automatically."}
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted">
              <span>{isDa ? `${TOTAL_MONTHS / 12} års pasning` : `${TOTAL_MONTHS / 12} years of care`}</span>
              <span className="text-muted/40">|</span>
              <span>{isDa ? "Alle 98 kommuner" : "All 98 municipalities"}</span>
              <span className="text-muted/40">|</span>
              <span>{isDa ? "Inkl. fripladstilskud" : "Incl. subsidy"}</span>
            </div>
          </section>
        </ScrollReveal>

        {/* Calculator inputs */}
        <ScrollReveal>
          <section className="card p-6 sm:p-8 space-y-6">
            <h2 className="font-display text-xl font-semibold text-foreground">
              {isDa ? "Din situation" : "Your situation"}
            </h2>

            <div className="grid sm:grid-cols-2 gap-6">
              {/* Municipality */}
              <div>
                <label htmlFor="tc-municipality" className="block text-sm font-medium text-foreground mb-1.5">
                  {isDa ? "Kommune" : "Municipality"}
                </label>
                <select
                  id="tc-municipality"
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-card text-foreground text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {municipalities.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Children count */}
              <div>
                <label htmlFor="tc-children" className="block text-sm font-medium text-foreground mb-1.5">
                  {isDa ? "Born under 18" : "Children under 18"}
                </label>
                <select
                  id="tc-children"
                  value={children}
                  onChange={(e) => setChildren(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-card text-foreground text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? (isDa ? "barn" : "child") : (isDa ? "børn" : "children")}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Income */}
            <div>
              <label htmlFor="tc-income" className="block text-sm font-medium text-foreground mb-1.5">
                {isDa ? "Husstandsindkomst (årlig)" : "Household income (annual)"}
              </label>
              <div className="flex items-center justify-end gap-2 mb-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={income.toLocaleString("da-DK")}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    const num = Number(raw);
                    if (!isNaN(num)) setIncome(Math.min(num, 1_200_000));
                  }}
                  className="font-mono text-2xl text-foreground font-bold text-right bg-transparent border-b-2 border-border focus:border-primary outline-none w-40 transition-colors"
                  aria-label={isDa ? "Husstandsindkomst" : "Household income"}
                />
                <span className="font-mono text-2xl text-foreground font-bold">kr.</span>
              </div>
              <input
                id="tc-income"
                type="range"
                min={0}
                max={1_200_000}
                step={10_000}
                value={income}
                onChange={(e) => setIncome(Number(e.target.value))}
                className="w-full h-3 accent-primary cursor-pointer min-h-[44px]"
                aria-valuetext={`${income.toLocaleString("da-DK")} kr.`}
              />
              <div className="flex justify-between text-[10px] text-muted font-mono mt-0.5 px-0.5">
                <span>0</span>
                <span>300.000</span>
                <span>600.000</span>
                <span>900.000</span>
                <span>1.200.000</span>
              </div>
            </div>

            {/* Single parent toggle */}
            <div className="flex items-center gap-3">
              <input
                id="tc-single"
                type="checkbox"
                checked={singleParent}
                onChange={(e) => setSingleParent(e.target.checked)}
                className="w-5 h-5 accent-primary cursor-pointer min-w-[44px] min-h-[44px]"
              />
              <label htmlFor="tc-single" className="text-sm text-foreground cursor-pointer">
                {isDa ? "Enlig forsorger" : "Single parent"}
                <span className="block text-xs text-muted">
                  {isDa
                    ? `+${FRIPLADS_CONSTANTS.singleParentSupplement.toLocaleString("da-DK")} kr. i indkomstgrnse`
                    : `+${FRIPLADS_CONSTANTS.singleParentSupplement.toLocaleString("da-DK")} DKK threshold`}
                </span>
              </label>
            </div>
          </section>
        </ScrollReveal>

        {/* Timeline visualization */}
        <ScrollReveal>
          <section className="card p-6 sm:p-8 space-y-6">
            <h2 className="font-display text-xl font-semibold text-foreground">
              {isDa ? `Tidslinje for børnepasning i ${municipality}` : `Childcare timeline in ${municipality}`}
            </h2>

            <div className="space-y-6">
              {phases.map((phase, idx) => {
                const Icon = PHASE_ICONS[idx];
                const widthFull = maxPhaseTotal > 0 ? (phase.totalFull / maxPhaseTotal) * 100 : 0;
                const widthAfter = maxPhaseTotal > 0 ? (phase.totalAfterFriplads / maxPhaseTotal) * 100 : 0;
                return (
                  <div key={phase.label} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${PHASE_BG[idx]}`}>
                        <Icon className={`w-5 h-5 ${PHASE_COLORS[idx]}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-semibold text-foreground text-sm">
                          {isDa ? phase.label : phase.labelEn}
                          <span className="text-muted font-normal ml-1.5">
                            ({isDa ? phase.ageRange : phase.ageRangeEn})
                          </span>
                        </p>
                        {phase.available ? (
                          <p className="text-xs text-muted">
                            {formatDKK(phase.monthlyAfterFriplads)}/{isDa ? "md" : "mo"} &times; {phase.months} {isDa ? "md" : "mo"}
                          </p>
                        ) : (
                          <p className="text-xs text-muted italic">
                            {isDa ? "Ikke tilgngelig i denne kommune" : "Not available in this municipality"}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {phase.available && (
                          <>
                            <p className="font-mono text-lg font-bold text-foreground">
                              {formatDKK(phase.totalAfterFriplads)}
                            </p>
                            {phase.totalFull !== phase.totalAfterFriplads && (
                              <p className="font-mono text-xs text-muted line-through">
                                {formatDKK(phase.totalFull)}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    {/* Bar visualization */}
                    {phase.available && (
                      <div className="ml-[52px] space-y-1">
                        <div className="h-3 rounded-full bg-bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-muted/30 relative"
                            style={{ width: `${Math.max(widthFull, 2)}%` }}
                          >
                            <div
                              className={`h-full rounded-full ${
                                idx === 0 ? "bg-pink-500" : idx === 1 ? "bg-amber-500" : "bg-blue-500"
                              }`}
                              style={{ width: widthFull > 0 ? `${(widthAfter / widthFull) * 100}%` : "0%" }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Grand total */}
            <div className="border-t border-border pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-lg font-bold text-foreground">
                    {isDa ? "Samlet børnepasning" : "Total childcare cost"}
                  </p>
                  <p className="text-sm text-muted">
                    {isDa
                      ? `${TOTAL_MONTHS / 12} år (${TOTAL_MONTHS} måneder) i ${municipality}`
                      : `${TOTAL_MONTHS / 12} years (${TOTAL_MONTHS} months) in ${municipality}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-3xl font-bold text-primary">
                    {formatDKK(grandTotal)}
                  </p>
                  {grandTotalFull !== grandTotal && (
                    <p className="font-mono text-sm text-muted line-through">
                      {formatDKK(grandTotalFull)}
                    </p>
                  )}
                </div>
              </div>

              {totalSavings > 0 && (
                <p className="text-sm text-center text-success font-medium bg-success/5 rounded-lg py-2 mt-4">
                  {isDa
                    ? `Du sparer ${formatDKK(totalSavings)} med fripladstilskud over ${TOTAL_MONTHS / 12} år`
                    : `You save ${formatDKK(totalSavings)} with childcare subsidy over ${TOTAL_MONTHS / 12} years`}
                </p>
              )}

              {/* Monthly average */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-bg-muted/50 rounded-xl p-4 text-center">
                  <p className="text-xs text-muted mb-1">{isDa ? "Gns. pr. måned" : "Avg. per month"}</p>
                  <p className="font-mono text-xl font-bold text-foreground">
                    {formatDKK(Math.round(grandTotal / TOTAL_MONTHS))}
                  </p>
                </div>
                <div className="bg-bg-muted/50 rounded-xl p-4 text-center">
                  <p className="text-xs text-muted mb-1">{isDa ? "Rangering" : "Ranking"}</p>
                  <p className="font-mono text-xl font-bold text-foreground">
                    #{currentRank} <span className="text-sm font-normal text-muted">{isDa ? "af 98" : "of 98"}</span>
                  </p>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Cheapest vs most expensive comparison */}
        <ScrollReveal>
          <section className="card p-6 sm:p-8 space-y-5">
            <h2 className="font-display text-xl font-semibold text-foreground">
              {isDa ? "Billigste vs. dyreste kommune" : "Cheapest vs. most expensive municipality"}
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Cheapest */}
              {cheapest && (
                <div className="bg-success/5 border border-success/20 rounded-xl p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-success" />
                    <p className="text-sm font-medium text-success">
                      {isDa ? "Billigste" : "Cheapest"}
                    </p>
                  </div>
                  <p className="font-display text-lg font-bold text-foreground">{cheapest.municipality}</p>
                  <p className="font-mono text-2xl font-bold text-success">{formatDKK(cheapest.grandTotal)}</p>
                  <p className="text-xs text-muted">
                    {isDa ? "Samlet over" : "Total over"} {TOTAL_MONTHS / 12} {isDa ? "år" : "years"}
                  </p>
                </div>
              )}

              {/* Most expensive */}
              {mostExpensive && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-red-500" />
                    <p className="text-sm font-medium text-red-500">
                      {isDa ? "Dyreste" : "Most expensive"}
                    </p>
                  </div>
                  <p className="font-display text-lg font-bold text-foreground">{mostExpensive.municipality}</p>
                  <p className="font-mono text-2xl font-bold text-red-500">{formatDKK(mostExpensive.grandTotal)}</p>
                  <p className="text-xs text-muted">
                    {isDa ? "Samlet over" : "Total over"} {TOTAL_MONTHS / 12} {isDa ? "år" : "years"}
                  </p>
                </div>
              )}
            </div>

            {cheapest && mostExpensive && (
              <p className="text-sm text-center text-muted">
                {isDa
                  ? `Forskel: ${formatDKK(mostExpensive.grandTotal - cheapest.grandTotal)} over ${TOTAL_MONTHS / 12} år (${formatDKK(Math.round((mostExpensive.grandTotal - cheapest.grandTotal) / TOTAL_MONTHS))}/md.)`
                  : `Difference: ${formatDKK(mostExpensive.grandTotal - cheapest.grandTotal)} over ${TOTAL_MONTHS / 12} years (${formatDKK(Math.round((mostExpensive.grandTotal - cheapest.grandTotal) / TOTAL_MONTHS))}/mo.)`}
              </p>
            )}
          </section>
        </ScrollReveal>

        {/* Top 10 cheapest / most expensive table */}
        <ScrollReveal>
          <section className="card p-6 sm:p-8 space-y-5">
            <h2 className="font-display text-xl font-semibold text-foreground">
              {isDa ? "Alle kommuner rangeret efter samlet pris" : "All municipalities ranked by total cost"}
            </h2>
            <p className="text-sm text-muted">
              {isDa
                ? `Samlet pris for vuggestue + børnehave + SFO (${TOTAL_MONTHS / 12} år) ved husstandsindkomst ${formatNumber(income)} kr.`
                : `Total cost for nursery + kindergarten + after-school care (${TOTAL_MONTHS / 12} years) at household income ${formatNumber(income)} DKK`}
            </p>

            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-xs text-muted font-medium">#</th>
                    <th className="text-left py-2 px-2 text-xs text-muted font-medium">{isDa ? "Kommune" : "Municipality"}</th>
                    <th className="text-right py-2 px-2 text-xs text-muted font-medium">{isDa ? "Samlet pris" : "Total cost"}</th>
                    <th className="text-right py-2 px-2 text-xs text-muted font-medium hidden sm:table-cell">{isDa ? "Pr. md." : "Per mo."}</th>
                  </tr>
                </thead>
                <tbody>
                  {allTotals.map((t, idx) => {
                    const isSelected = t.municipality === municipality;
                    return (
                      <tr
                        key={t.municipality}
                        className={`border-b border-border/50 cursor-pointer transition-colors hover:bg-bg-muted/50 ${isSelected ? "bg-primary/5 font-semibold" : ""}`}
                        onClick={() => setMunicipality(t.municipality)}
                      >
                        <td className="py-2 px-2 text-muted tabular-nums">{idx + 1}</td>
                        <td className={`py-2 px-2 ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {t.municipality}
                          {isSelected && <span className="ml-1 text-xs text-primary">&larr;</span>}
                        </td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums">{formatDKK(t.grandTotal)}</td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums text-muted hidden sm:table-cell">
                          {formatDKK(Math.round(t.grandTotal / TOTAL_MONTHS))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </ScrollReveal>

        {/* SEO content */}
        <ScrollReveal>
          <section className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-foreground">
              {isDa ? "Om beregningen" : "About the calculation"}
            </h2>
            <div className="prose prose-sm text-muted max-w-none space-y-3">
              {isDa ? (
                <>
                  <p>
                    Denne beregner viser den samlede pris for børnepasning fra vuggestue (0-2 år) over
                    børnehave (3-5 år) til SFO (6-9 år) — i alt {TOTAL_MONTHS / 12} års kommunal pasning.
                    Priserne er baseret på officielle takster fra Danmarks Statistik ({FRIPLADS_CONSTANTS.year}-satser).
                  </p>
                  <p>
                    Fripladstilskud beregnes automatisk ud fra din husstandsindkomst efter den nationale
                    fripladsskala med 95 indkomsttrin. Familier med en indkomst under {FRIPLADS_CONSTANTS.lowerThreshold.toLocaleString("da-DK")} kr.
                    får fuld friplads, mens familier over {FRIPLADS_CONSTANTS.upperThreshold.toLocaleString("da-DK")} kr. betaler fuld pris.
                  </p>
                  <p>
                    Beregningen bruger vuggestue-taksten for 0-2 år. Hvis din kommune også tilbyder dagpleje,
                    kan den reelle pris være lavere. Brug vores <Link to="/friplads" className="text-primary hover:underline">fripladstilskud-beregner</Link> for
                    at se dagpleje-priser, eller se <Link to="/prissammenligning" className="text-primary hover:underline">prissammenligningen</Link> for
                    en detaljeret oversigt.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    This calculator shows the total cost of childcare from nursery (age 0-2) through
                    kindergarten (age 3-5) to after-school care (age 6-9) — {TOTAL_MONTHS / 12} years
                    of municipal childcare in total. Prices are based on official rates from Statistics
                    Denmark ({FRIPLADS_CONSTANTS.year} rates).
                  </p>
                  <p>
                    The childcare subsidy (fripladstilskud) is calculated automatically based on your
                    household income using the national 95-step income scale. Families with an income
                    below {FRIPLADS_CONSTANTS.lowerThreshold.toLocaleString("da-DK")} DKK receive full subsidy, while families
                    above {FRIPLADS_CONSTANTS.upperThreshold.toLocaleString("da-DK")} DKK pay the full rate.
                  </p>
                  <p>
                    The calculation uses nursery rates for ages 0-2. If your municipality also offers
                    childminders (dagpleje), the actual cost may be lower. Use our <Link to="/friplads" className="text-primary hover:underline">subsidy calculator</Link> to
                    see childminder prices, or the <Link to="/prissammenligning" className="text-primary hover:underline">price comparison</Link> for
                    a detailed overview.
                  </p>
                </>
              )}
            </div>
          </section>
        </ScrollReveal>

        {/* CTA */}
        <ScrollReveal>
          <section className="card p-6 sm:p-8 text-center space-y-4 bg-primary/5">
            <h2 className="font-display text-xl font-semibold text-foreground">
              {isDa ? "Beregn dit fripladstilskud" : "Calculate your childcare subsidy"}
            </h2>
            <p className="text-muted text-sm max-w-lg mx-auto">
              {isDa
                ? "Se prisen for en specifik type pasning og beregn dit fripladstilskud med soskendeabat."
                : "See the price for a specific type of care and calculate your subsidy with sibling discount."}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                to="/friplads"
                className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors min-h-[44px]"
              >
                {isDa ? "Fripladstilskud-beregner" : "Subsidy calculator"}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/prissammenligning"
                className="inline-flex items-center gap-2 bg-[var(--color-bg-card)] border border-border px-6 py-3 rounded-lg font-medium text-sm text-foreground hover:border-primary hover:text-primary transition-colors min-h-[44px]"
              >
                {isDa ? "Prissammenligning" : "Price comparison"}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </section>
        </ScrollReveal>

        <div className="flex items-start gap-1.5 px-2">
          <Info className="w-3.5 h-3.5 text-muted shrink-0 mt-0.5" />
          <p className="text-xs text-muted">
            {isDa
              ? "Priserne er vejledende og baseret pa officielle kommunale takster. Den faktiske pris kan afvige. Beregningen forudsatter eet barn i pasning ad gangen uden soskendeabat."
              : "Prices are indicative and based on official municipal rates. Actual prices may vary. The calculation assumes one child in care at a time without sibling discount."}
          </p>
        </div>

        <DataFreshness lang={language} />
      </main>
    </>
  );
}
