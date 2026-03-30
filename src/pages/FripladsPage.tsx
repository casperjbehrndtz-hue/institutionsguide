import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calculator, ArrowRight, Info, ChevronDown, ChevronUp } from "lucide-react";
import SEOHead from "@/components/shared/SEOHead";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFamily } from "@/contexts/FamilyContext";
import { calculateFriplads, FRIPLADS_CONSTANTS } from "@/lib/childcare/friplads";
import { getAllMunicipalities, getChildcareRates } from "@/lib/childcare/rates";
import { formatDKK } from "@/lib/format";
import type { InstitutionType } from "@/lib/childcare/types";

const CATEGORY_LABELS_DA: Record<InstitutionType, string> = {
  vuggestue: "Vuggestue (0-2 ar)",
  boernehave: "Bornehave (3-5 ar)",
  dagpleje: "Dagpleje (0-2 ar)",
  sfo: "SFO (6-9 ar)",
};

const CATEGORY_LABELS_EN: Record<InstitutionType, string> = {
  vuggestue: "Nursery (0-2 yrs)",
  boernehave: "Kindergarten (3-5 yrs)",
  dagpleje: "Childminder (0-2 yrs)",
  sfo: "After-school care (6-9 yrs)",
};

const CATEGORY_URL_MAP: Record<InstitutionType, string> = {
  vuggestue: "vuggestue",
  boernehave: "boernehave",
  dagpleje: "dagpleje",
  sfo: "sfo",
};

interface FAQItem {
  q: string;
  a: string;
}

const FAQ_DA: FAQItem[] = [
  {
    q: "Hvad er fripladstilskud?",
    a: "Fripladstilskud (okonomisk friplads) er en rabat pa foraldrebetalingen for dagtilbud som vuggestue, bornehave, dagpleje og SFO. Tilskuddet beregnes ud fra husstandens samlede indkomst og reguleres arligt af Borne- og Undervisningsministeriet.",
  },
  {
    q: "Hvem kan fa fripladstilskud?",
    a: `I ${FRIPLADS_CONSTANTS.year} kan familier med en husstandsindkomst under ${FRIPLADS_CONSTANTS.upperThreshold.toLocaleString("da-DK")} kr. fa delvist fripladstilskud. Er indkomsten under ${FRIPLADS_CONSTANTS.lowerThreshold.toLocaleString("da-DK")} kr., far man fuld friplads (0 kr. i foraldrebetaling). Enlige forsorgere far et tillg pa ${FRIPLADS_CONSTANTS.singleParentSupplement.toLocaleString("da-DK")} kr., og for hvert barn ud over det forste tillgges ${FRIPLADS_CONSTANTS.additionalChildSupplement.toLocaleString("da-DK")} kr.`,
  },
  {
    q: "Hvordan soger jeg om fripladstilskud?",
    a: "Du soger om fripladstilskud hos din kommune, typisk via Digital Pladsanvisning eller kommunens hjemmeside. Kommunen indhenter automatisk indkomstoplysninger fra SKAT. Du skal soge hvert ar, og tilskuddet reguleres lobende.",
  },
  {
    q: "Hvad er soskendeabat?",
    a: "Har du flere born i dagtilbud samtidig, betaler du fuld pris for det dyreste barn og 50% for hvert ekstra barn. Soskendeabatten glder automatisk og kan kombineres med fripladstilskud.",
  },
  {
    q: "Hvad er forskellen pa dagpleje og vuggestue prismssigt?",
    a: "Dagpleje er ofte billigere end vuggestue, men det varierer fra kommune til kommune. Brug beregneren ovenfor til at sammenligne de to muligheder i din kommune.",
  },
  {
    q: "Glder fripladstilskud ogsa for SFO?",
    a: "Ja, fripladstilskud glder for alle kommunale dagtilbud inkl. vuggestue, bornehave, dagpleje og SFO. Private institutioner folger ogsa fripladsskalaen, men kan have andre takster.",
  },
  {
    q: "Hvad hvis min indkomst ndrer sig i lobet af aret?",
    a: "Hvis din indkomst ndrer sig vasentligt (fx ved jobskifte, barsel eller skilsmisse), skal du kontakte kommunen sa tilskuddet kan reguleres. Kommunen foretager ogsa en arlig efterregulering.",
  },
];

const FAQ_EN: FAQItem[] = [
  {
    q: "What is fripladstilskud (childcare subsidy)?",
    a: "Fripladstilskud is an income-based subsidy that reduces the cost of childcare in Denmark. It applies to nurseries, kindergartens, childminders, and after-school care (SFO). The subsidy is calculated based on total household income.",
  },
  {
    q: "Who is eligible for childcare subsidy?",
    a: `In ${FRIPLADS_CONSTANTS.year}, families with a household income below ${FRIPLADS_CONSTANTS.upperThreshold.toLocaleString("da-DK")} DKK can receive a partial subsidy. Below ${FRIPLADS_CONSTANTS.lowerThreshold.toLocaleString("da-DK")} DKK, childcare is fully free. Single parents get an additional ${FRIPLADS_CONSTANTS.singleParentSupplement.toLocaleString("da-DK")} DKK allowance.`,
  },
  {
    q: "How do I apply for childcare subsidy?",
    a: "You apply through your municipality, usually via Digital Pladsanvisning or the municipality's website. The municipality automatically retrieves income data from SKAT (Danish tax authority). You must reapply annually.",
  },
  {
    q: "What is the sibling discount?",
    a: "If you have multiple children in childcare, you pay full price for the most expensive child and 50% for each additional child. The sibling discount is applied automatically and can be combined with fripladstilskud.",
  },
  {
    q: "Does the subsidy apply to SFO (after-school care)?",
    a: "Yes, fripladstilskud applies to all municipal childcare including nurseries, kindergartens, childminders, and SFO. Private institutions also follow the subsidy scale but may have different base rates.",
  },
];

function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="card overflow-hidden">
          <button
            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-bg-muted/50 transition-colors min-h-[44px]"
            aria-expanded={openIndex === idx}
          >
            <span className="font-display text-sm font-semibold text-foreground pr-4">{item.q}</span>
            {openIndex === idx ? (
              <ChevronUp className="w-4 h-4 text-muted shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted shrink-0" />
            )}
          </button>
          {openIndex === idx && (
            <div className="px-4 pb-4 text-sm text-muted leading-relaxed">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function FripladsPage() {
  const { t, language } = useLanguage();
  const { profile, setProfile } = useFamily();
  const isDa = language === "da";

  // State
  const [income, setIncome] = useState(profile?.income ?? 450_000);
  const [singleParent, setSingleParent] = useState(profile?.singleParent ?? false);
  const [children, setChildren] = useState(profile?.childCount ?? 1);
  const [municipality, setMunicipality] = useState("København");
  const [category, setCategory] = useState<InstitutionType>("vuggestue");
  const [siblingChild, setSiblingChild] = useState(false);

  const municipalities = useMemo(() => getAllMunicipalities(), []);
  const categoryLabels = isDa ? CATEGORY_LABELS_DA : CATEGORY_LABELS_EN;

  // Persist to FamilyContext
  useEffect(() => {
    setProfile({ income, singleParent, childCount: children });
  }, [income, singleParent, children, setProfile]);

  // Get rate for selected municipality + category
  const rates = useMemo(() => getChildcareRates(municipality), [municipality]);
  const annualRate = useMemo(() => {
    if (!rates) return null;
    return rates[category] ?? null;
  }, [rates, category]);

  // Calculate friplads
  const result = useMemo(() => {
    if (!annualRate) return null;
    return calculateFriplads(annualRate, income, singleParent, children, siblingChild ? 1 : 0);
  }, [annualRate, income, singleParent, children, siblingChild]);

  const ctaUrl = `/${CATEGORY_URL_MAP[category]}/${municipality.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <>
      <SEOHead
        title={isDa ? `Beregn fripladstilskud ${FRIPLADS_CONSTANTS.year} — Institutionsguide` : `Calculate childcare subsidy ${FRIPLADS_CONSTANTS.year} — Institutionsguide`}
        description={
          isDa
            ? "Beregn dit fripladstilskud for vuggestue, bornehave, dagpleje og SFO. Se hvad du skal betale i alle 98 kommuner med vores gratis fripladstilskud beregner."
            : "Calculate your Danish childcare subsidy (fripladstilskud) for nursery, kindergarten, childminder and after-school care. Free calculator for all 98 municipalities."
        }
        path="/friplads"
      />

      <Breadcrumbs
        items={[
          { label: isDa ? "Hjem" : "Home", href: "/" },
          { label: isDa ? "Fripladstilskud" : "Childcare subsidy" },
        ]}
      />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-12">
        {/* Hero section */}
        <ScrollReveal>
          <section className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium">
              <Calculator className="w-4 h-4" />
              {isDa ? `Opdateret med ${FRIPLADS_CONSTANTS.year}-satser` : `Updated with ${FRIPLADS_CONSTANTS.year} rates`}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
              {isDa ? "Beregn dit fripladstilskud" : "Calculate your childcare subsidy"}
            </h1>
            <p className="text-muted text-lg max-w-2xl mx-auto leading-relaxed">
              {isDa
                ? "Fripladstilskud er en indkomstafhngig rabat pa foraldrebetalingen for dagtilbud. Se prcis hvad du skal betale for vuggestue, bornehave, dagpleje eller SFO i din kommune."
                : "Fripladstilskud is an income-based subsidy that reduces childcare costs in Denmark. See exactly what you'll pay for nursery, kindergarten, childminder, or after-school care in your municipality."}
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted">
              <span>{isDa ? "Alle 98 kommuner" : "All 98 municipalities"}</span>
              <span className="text-muted/40">|</span>
              <span>{isDa ? "Officielle satser" : "Official rates"}</span>
              <span className="text-muted/40">|</span>
              <span>{isDa ? "Gratis og anonym" : "Free and anonymous"}</span>
            </div>
          </section>
        </ScrollReveal>

        {/* Calculator section */}
        <ScrollReveal>
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
                  onChange={(e) => setMunicipality(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-card text-foreground text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label={isDa ? "Vlg kommune" : "Select municipality"}
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
                  onChange={(e) => setCategory(e.target.value as InstitutionType)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-card text-foreground text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label={isDa ? "Vlg type" : "Select type"}
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
                    if (!isNaN(num)) setIncome(Math.min(num, 1_200_000));
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
                  onChange={(e) => setIncome(Number(e.target.value))}
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
                  onChange={(e) => setSingleParent(e.target.checked)}
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
                  onChange={(e) => setSiblingChild(e.target.checked)}
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
                  onChange={(e) => setChildren(Number(e.target.value))}
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
        </ScrollReveal>

        {/* Results section */}
        <ScrollReveal>
          <section className="card p-6 sm:p-8 space-y-5">
            <h2 className="font-display text-xl font-semibold text-foreground">
              {isDa ? "Dit resultat" : "Your result"}
              {rates && (
                <span className="text-sm font-normal text-muted ml-2">
                  &mdash; {municipality}, {categoryLabels[category]}
                </span>
              )}
            </h2>

            {!rates || annualRate === null ? (
              <div className="text-center py-8 text-muted">
                <p className="text-sm">
                  {isDa
                    ? `Ingen takst registreret for ${categoryLabels[category].toLowerCase()} i ${municipality}.`
                    : `No rate registered for ${categoryLabels[category].toLowerCase()} in ${municipality}.`}
                </p>
                <p className="text-xs mt-1">
                  {isDa ? "Prov en anden type eller kommune." : "Try another type or municipality."}
                </p>
              </div>
            ) : result ? (
              <div className="space-y-4">
                {/* Main result cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-bg-muted/50 rounded-xl p-4 text-center">
                    <p className="text-xs text-muted mb-1">{t.friplads.fullRate}</p>
                    <p className="font-mono text-lg font-bold text-foreground">{formatDKK(result.fullMonthlyRate)}</p>
                  </div>
                  <div className="bg-success/5 rounded-xl p-4 text-center">
                    <p className="text-xs text-muted mb-1">{t.friplads.yourSubsidy}</p>
                    <p className="font-mono text-lg font-bold text-success">&minus;{formatDKK(result.monthlySubsidy)}</p>
                  </div>
                  {result.siblingDiscount > 0 && (
                    <div className="bg-success/5 rounded-xl p-4 text-center">
                      <p className="text-xs text-muted mb-1">{t.friplads.siblingDiscount}</p>
                      <p className="font-mono text-lg font-bold text-success">&minus;{formatDKK(result.siblingDiscount)}</p>
                    </div>
                  )}
                  <div className="bg-primary/5 rounded-xl p-4 text-center col-span-2 sm:col-span-1">
                    <p className="text-xs text-muted mb-1">{t.friplads.youPay}</p>
                    <p className="font-mono text-2xl font-bold text-primary">{formatDKK(result.monthlyPayment)}</p>
                  </div>
                </div>

                {/* Annual overview */}
                <div className="border-t border-border pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted">{t.friplads.annualSavings}</span>
                      <span className="font-mono text-base font-bold text-success">{formatDKK(result.annualSavings)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted">{isDa ? "Arlig betaling" : "Annual payment"}</span>
                      <span className="font-mono text-base font-semibold text-foreground">{formatDKK(result.annualPayment)}</span>
                    </div>
                  </div>
                </div>

                {result.subsidyPercent > 0 && (
                  <p className="text-sm text-center text-success font-medium bg-success/5 rounded-lg py-2">
                    {t.friplads.savingsPercent.replace("{pct}", String(result.subsidyPercent))}
                  </p>
                )}

                {/* CTA */}
                <div className="pt-2">
                  <Link
                    to={ctaUrl}
                    className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors min-h-[44px]"
                  >
                    {isDa
                      ? `Find ${categoryLabels[category].split(" (")[0].toLowerCase()} i ${municipality}`
                      : `Find ${categoryLabels[category].split(" (")[0].toLowerCase()} in ${municipality}`}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : null}

            <div className="flex items-start gap-1.5 pt-2">
              <Info className="w-3.5 h-3.5 text-muted shrink-0 mt-0.5" />
              <p className="text-xs text-muted">{t.friplads.disclaimer}</p>
            </div>
          </section>
        </ScrollReveal>

        {/* Quick comparison: all categories for this municipality */}
        {rates && (
          <ScrollReveal>
            <section className="space-y-4">
              <h2 className="font-display text-xl font-semibold text-foreground">
                {isDa ? `Alle takster i ${municipality}` : `All rates in ${municipality}`}
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(["vuggestue", "boernehave", "dagpleje", "sfo"] as InstitutionType[]).map((cat) => {
                  const rate = rates[cat];
                  if (!rate) return null;
                  const calc = calculateFriplads(rate, income, singleParent, children, siblingChild ? 1 : 0);
                  return (
                    <div
                      key={cat}
                      className={`card p-4 space-y-2 cursor-pointer transition-all ${cat === category ? "ring-2 ring-primary" : "hover:border-primary/30"}`}
                      onClick={() => setCategory(cat)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setCategory(cat); }}
                      aria-label={`${isDa ? "Vlg" : "Select"} ${categoryLabels[cat]}`}
                    >
                      <p className="text-xs font-medium text-muted">{categoryLabels[cat]}</p>
                      <p className="font-mono text-sm text-foreground">
                        {isDa ? "Fuld:" : "Full:"} {formatDKK(calc.fullMonthlyRate)}/md.
                      </p>
                      <p className="font-mono text-lg font-bold text-primary">
                        {formatDKK(calc.monthlyPayment)}/md.
                      </p>
                      {calc.subsidyPercent > 0 && (
                        <p className="text-xs text-success">
                          &minus;{calc.subsidyPercent}%
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </ScrollReveal>
        )}

        {/* Explainer / SEO content */}
        <ScrollReveal>
          <section className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-foreground">
              {isDa ? "Sadan fungerer fripladstilskud" : "How childcare subsidy works"}
            </h2>
            <div className="prose prose-sm text-muted max-w-none space-y-3">
              {isDa ? (
                <>
                  <p>
                    Fripladstilskud (ogsa kaldet okonomisk friplads) er en statsstottet rabat pa foraldrebetalingen
                    for dagtilbud i Danmark. Ordningen er reguleret i Dagtilbudsloven og administreres af kommunerne.
                  </p>
                  <p>
                    I {FRIPLADS_CONSTANTS.year} beregnes tilskuddet ud fra en skala med 95 indkomsttrin. Familier med en
                    husstandsindkomst under <strong>{FRIPLADS_CONSTANTS.lowerThreshold.toLocaleString("da-DK")} kr.</strong> far
                    fuld friplads (gratis pasning), mens familier over <strong>{FRIPLADS_CONSTANTS.upperThreshold.toLocaleString("da-DK")} kr.</strong> betaler
                    fuld pris. Imellem de to grenser stiger foraldrebetalingen gradvist.
                  </p>
                  <p>
                    Enlige forsorgere far et tillg pa {FRIPLADS_CONSTANTS.singleParentSupplement.toLocaleString("da-DK")} kr. til
                    indkomstgrnserne, og for hvert barn under 18 ud over det forste tillgges {FRIPLADS_CONSTANTS.additionalChildSupplement.toLocaleString("da-DK")} kr.
                    Det betyder, at storre familier og enlige forsorgere kan have gavn af fripladstilskud ved hojere indkomster.
                  </p>
                  <p>
                    Taksterne varierer betydeligt fra kommune til kommune. For eksempel kan en vuggestueplads koste fra ca.
                    33.000 kr./ar i de billigste kommuner til over 57.000 kr./ar i de dyreste. Brug beregneren ovenfor til
                    at se de prcise takster for din kommune og beregne dit fripladstilskud.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Fripladstilskud (childcare subsidy) is a government-funded discount on parental fees for
                    childcare in Denmark. The scheme is regulated by the Day Care Act (Dagtilbudsloven) and
                    administered by municipalities.
                  </p>
                  <p>
                    In {FRIPLADS_CONSTANTS.year}, the subsidy is calculated using a scale with 95 income brackets. Families
                    with a household income below <strong>{FRIPLADS_CONSTANTS.lowerThreshold.toLocaleString("da-DK")} DKK</strong> receive
                    full subsidy (free childcare), while families above <strong>{FRIPLADS_CONSTANTS.upperThreshold.toLocaleString("da-DK")} DKK</strong> pay
                    the full rate. Between these thresholds, the parental payment increases gradually.
                  </p>
                  <p>
                    Rates vary significantly between municipalities. Use the calculator above to see exact
                    rates for your municipality and calculate your subsidy.
                  </p>
                </>
              )}
            </div>
          </section>
        </ScrollReveal>

        {/* FAQ section */}
        <ScrollReveal>
          <section className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-foreground">
              {isDa ? "Ofte stillede sporgsmal om fripladstilskud" : "Frequently asked questions about childcare subsidy"}
            </h2>
            <FAQAccordion items={isDa ? FAQ_DA : FAQ_EN} />
          </section>
        </ScrollReveal>

        {/* Total cost CTA */}
        <ScrollReveal>
          <section className="card p-6 sm:p-8 text-center space-y-4">
            <h2 className="font-display text-xl font-semibold text-foreground">
              {isDa ? "Hvad koster bornepasning i alt?" : "What does childcare cost in total?"}
            </h2>
            <p className="text-muted text-sm max-w-lg mx-auto">
              {isDa
                ? "Se den samlede pris for vuggestue, bornehave og SFO over 10 ar i din kommune."
                : "See the total cost of nursery, kindergarten and after-school care over 10 years in your municipality."}
            </p>
            <Link
              to="/samlet-pris"
              className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors min-h-[44px]"
            >
              {isDa ? "Se samlet pris" : "See total cost"}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </section>
        </ScrollReveal>

        {/* Bottom CTA */}
        <ScrollReveal>
          <section className="card p-6 sm:p-8 text-center space-y-4 bg-primary/5">
            <h2 className="font-display text-xl font-semibold text-foreground">
              {isDa ? "Find institutioner i din kommune" : "Find childcare in your municipality"}
            </h2>
            <p className="text-muted text-sm max-w-lg mx-auto">
              {isDa
                ? "Se alle vuggestuer, bornehaver, dagplejere og SFO'er med priser, afstand og beregnet fripladstilskud."
                : "See all nurseries, kindergartens, childminders and after-school care with prices, distance and calculated subsidy."}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {(["vuggestue", "boernehave", "dagpleje", "sfo"] as InstitutionType[]).map((cat) => (
                <Link
                  key={cat}
                  to={`/${CATEGORY_URL_MAP[cat]}/${municipality.toLowerCase().replace(/\s+/g, "-")}`}
                  className="inline-flex items-center gap-1.5 bg-[var(--color-bg-card)] border border-border px-4 py-2 rounded-lg text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors min-h-[44px]"
                >
                  {categoryLabels[cat].split(" (")[0]}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ))}
            </div>
          </section>
        </ScrollReveal>
      </main>
    </>
  );
}
