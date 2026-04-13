import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calculator, ArrowRight, Info } from "lucide-react";
import SEOHead from "@/components/shared/SEOHead";
import JsonLd from "@/components/shared/JsonLd";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { breadcrumbSchema } from "@/lib/schema";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFamily } from "@/contexts/FamilyContext";
import { getAllMunicipalities } from "@/lib/childcare/rates";
import DataFreshness from "@/components/shared/DataFreshness";
import {
  TOTAL_MONTHS,
  FRIPLADS_CONSTANTS,
  computePhases,
  computeAllMunicipalTotals,
} from "@/lib/totalCostCalculator";
import TotalCostInputs from "@/components/totalcost/TotalCostInputs";
import TotalCostTimeline from "@/components/totalcost/TotalCostTimeline";
import TotalCostComparison from "@/components/totalcost/TotalCostComparison";

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

  // Current municipality rank
  const currentRank = useMemo(
    () => allTotals.findIndex((t) => t.municipality === municipality) + 1,
    [allTotals, municipality]
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
        { name: isDa ? "Hjem" : "Home", url: "https://www.institutionsguiden.dk/" },
        { name: isDa ? "Samlet pris" : "Total cost", url: "https://www.institutionsguiden.dk/samlet-pris" },
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

        <ScrollReveal>
          <TotalCostInputs
            municipality={municipality} setMunicipality={setMunicipality}
            municipalities={municipalities} children={children} setChildren={setChildren}
            income={income} setIncome={setIncome}
            singleParent={singleParent} setSingleParent={setSingleParent}
            isDa={isDa}
          />
        </ScrollReveal>

        <ScrollReveal>
          <TotalCostTimeline
            phases={phases} grandTotal={grandTotal} grandTotalFull={grandTotalFull}
            totalSavings={totalSavings} currentRank={currentRank}
            municipality={municipality} isDa={isDa}
          />
        </ScrollReveal>

        <ScrollReveal>
          <TotalCostComparison
            allTotals={allTotals} municipality={municipality}
            setMunicipality={setMunicipality} income={income} isDa={isDa}
          />
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
