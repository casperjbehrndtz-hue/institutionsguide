import { FRIPLADS_CONSTANTS } from "@/lib/childcare/friplads";
import ScrollReveal from "@/components/shared/ScrollReveal";

export default function FripladsExplainer({ isDa }: { isDa: boolean }) {
  return (
    <ScrollReveal>
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-foreground">
          {isDa ? "Sådan fungerer fripladstilskud" : "How childcare subsidy works"}
        </h2>
        <div className="prose prose-sm text-muted max-w-none space-y-3">
          {isDa ? (
            <>
              <p>
                Fripladstilskud (også kaldet økonomisk friplads) er en statsstøttet rabat på forældrebetalingen
                for dagtilbud i Danmark. Ordningen er reguleret i Dagtilbudsloven og administreres af kommunerne.
              </p>
              <p>
                I {FRIPLADS_CONSTANTS.year} beregnes tilskuddet ud fra en skala med 95 indkomsttrin. Familier med en
                husstandsindkomst under <strong>{FRIPLADS_CONSTANTS.lowerThreshold.toLocaleString("da-DK")} kr.</strong> får
                fuld friplads (gratis pasning), mens familier over <strong>{FRIPLADS_CONSTANTS.upperThreshold.toLocaleString("da-DK")} kr.</strong> betaler
                fuld pris. Imellem de to grænser stiger forældrebetalingen gradvist.
              </p>
              <p>
                Enlige forsørgere får et tillæg på {FRIPLADS_CONSTANTS.singleParentSupplement.toLocaleString("da-DK")} kr. til
                indkomstgrænserne, og for hvert barn under 18 ud over det første tillægges {FRIPLADS_CONSTANTS.additionalChildSupplement.toLocaleString("da-DK")} kr.
                Det betyder, at større familier og enlige forsørgere kan have gavn af fripladstilskud ved højere indkomster.
              </p>
              <p>
                Taksterne varierer betydeligt fra kommune til kommune. For eksempel kan en vuggestueplads koste fra ca.
                33.000 kr./år i de billigste kommuner til over 57.000 kr./år i de dyreste. Brug beregneren ovenfor til
                at se de præcise takster for din kommune og beregne dit fripladstilskud.
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
  );
}
