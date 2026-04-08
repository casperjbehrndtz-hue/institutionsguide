import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calculator, ArrowRight, Info } from "lucide-react";
import FripladsCalculatorForm from "@/components/friplads/FripladsCalculatorForm";
import SEOHead from "@/components/shared/SEOHead";
import JsonLd from "@/components/shared/JsonLd";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { breadcrumbSchema } from "@/lib/schema";
import ScrollReveal from "@/components/shared/ScrollReveal";
import FAQAccordion from "@/components/shared/FAQAccordion";
import FripladsExplainer from "@/components/friplads/FripladsExplainer";
import FripladsRatesGrid from "@/components/friplads/FripladsRatesGrid";
import FripladsBottomCTAs from "@/components/friplads/FripladsBottomCTAs";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFamily } from "@/contexts/FamilyContext";
import { calculateFriplads, FRIPLADS_CONSTANTS } from "@/lib/childcare/friplads";
import { getAllMunicipalities, getChildcareRates } from "@/lib/childcare/rates";
import { formatDKK } from "@/lib/format";
import { toSlug } from "@/lib/slugs";
import type { InstitutionType } from "@/lib/childcare/types";
import DataFreshness from "@/components/shared/DataFreshness";
import { FAQ_DA, FAQ_EN } from "@/lib/fripladsFaqData";

const CATEGORY_LABELS_DA: Record<InstitutionType, string> = {
  vuggestue: "Vuggestue (0-2 år)",
  boernehave: "Børnehave (3-5 år)",
  dagpleje: "Dagpleje (0-2 år)",
  sfo: "SFO (6-9 år)",
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

  const ctaUrl = `/${CATEGORY_URL_MAP[category]}/${toSlug(municipality)}`;

  return (
    <>
      <SEOHead
        title={isDa ? `Beregn fripladstilskud ${FRIPLADS_CONSTANTS.year} — Institutionsguide` : `Calculate childcare subsidy ${FRIPLADS_CONSTANTS.year} — Institutionsguide`}
        description={
          isDa
            ? "Beregn dit fripladstilskud for vuggestue, børnehave, dagpleje og SFO. Se hvad du skal betale i alle 98 kommuner med vores gratis fripladstilskud-beregner."
            : "Calculate your Danish childcare subsidy (fripladstilskud) for nursery, kindergarten, childminder and after-school care. Free calculator for all 98 municipalities."
        }
        path="/friplads"
      />
      <JsonLd data={breadcrumbSchema([
        { name: isDa ? "Hjem" : "Home", url: "https://institutionsguiden.dk/" },
        { name: isDa ? "Fripladstilskud" : "Childcare subsidy", url: "https://institutionsguiden.dk/friplads" },
      ])} />

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
                ? "Fripladstilskud er en indkomstafhængig rabat på forældrebetalingen for dagtilbud. Se præcis hvad du skal betale for vuggestue, børnehave, dagpleje eller SFO i din kommune."
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
          <FripladsCalculatorForm
            municipality={municipality}
            onMunicipalityChange={setMunicipality}
            municipalities={municipalities}
            category={category}
            onCategoryChange={setCategory}
            categoryLabels={categoryLabels}
            income={income}
            onIncomeChange={setIncome}
            singleParent={singleParent}
            onSingleParentChange={setSingleParent}
            children={children}
            onChildrenChange={setChildren}
            siblingChild={siblingChild}
            onSiblingChildChange={setSiblingChild}
            isDa={isDa}
            t={t}
          />
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

        {rates && (
          <FripladsRatesGrid
            rates={rates}
            municipality={municipality}
            income={income}
            singleParent={singleParent}
            children={children}
            siblingChild={siblingChild}
            category={category}
            onCategoryChange={setCategory}
            categoryLabels={categoryLabels}
            isDa={isDa}
          />
        )}

        <FripladsExplainer isDa={isDa} />

        {/* FAQ section */}
        <ScrollReveal>
          <section className="space-y-4">
            <h2 className="font-display text-xl font-semibold text-foreground">
              {isDa ? "Ofte stillede spørgsmål om fripladstilskud" : "Frequently asked questions about childcare subsidy"}
            </h2>
            <FAQAccordion items={isDa ? FAQ_DA : FAQ_EN} />
          </section>
        </ScrollReveal>

        <FripladsBottomCTAs municipality={municipality} categoryLabels={categoryLabels} isDa={isDa} />

        <DataFreshness lang={language} />
      </main>
    </>
  );
}
