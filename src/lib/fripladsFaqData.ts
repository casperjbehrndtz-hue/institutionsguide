import { FRIPLADS_CONSTANTS } from "@/lib/childcare/friplads";

export interface FAQItem {
  q: string;
  a: string;
}

export const FAQ_DA: FAQItem[] = [
  {
    q: "Hvad er fripladstilskud?",
    a: "Fripladstilskud (økonomisk friplads) er en rabat på forældrebetalingen for dagtilbud som vuggestue, børnehave, dagpleje og SFO. Tilskuddet beregnes ud fra husstandens samlede indkomst og reguleres årligt af Børne- og Undervisningsministeriet.",
  },
  {
    q: "Hvem kan få fripladstilskud?",
    a: `I ${FRIPLADS_CONSTANTS.year} kan familier med en husstandsindkomst under ${FRIPLADS_CONSTANTS.upperThreshold.toLocaleString("da-DK")} kr. få delvist fripladstilskud. Er indkomsten under ${FRIPLADS_CONSTANTS.lowerThreshold.toLocaleString("da-DK")} kr., får man fuld friplads (0 kr. i forældrebetaling). Enlige forsørgere får et tillæg på ${FRIPLADS_CONSTANTS.singleParentSupplement.toLocaleString("da-DK")} kr., og for hvert barn ud over det første tillægges ${FRIPLADS_CONSTANTS.additionalChildSupplement.toLocaleString("da-DK")} kr.`,
  },
  {
    q: "Hvordan søger jeg om fripladstilskud?",
    a: "Du søger om fripladstilskud hos din kommune, typisk via Digital Pladsanvisning eller kommunens hjemmeside. Kommunen indhenter automatisk indkomstoplysninger fra SKAT. Du skal søge hvert år, og tilskuddet reguleres løbende.",
  },
  {
    q: "Hvad er søskenderabat?",
    a: "Har du flere børn i dagtilbud samtidig, betaler du fuld pris for det dyreste barn og 50% for hvert ekstra barn. Søskenderabatten gælder automatisk og kan kombineres med fripladstilskud.",
  },
  {
    q: "Hvad er forskellen på dagpleje og vuggestue prismæssigt?",
    a: "Dagpleje er ofte billigere end vuggestue, men det varierer fra kommune til kommune. Brug beregneren ovenfor til at sammenligne de to muligheder i din kommune.",
  },
  {
    q: "Gælder fripladstilskud også for SFO?",
    a: "Ja, fripladstilskud gælder for alle kommunale dagtilbud inkl. vuggestue, børnehave, dagpleje og SFO. Private institutioner følger også fripladsskalaen, men kan have andre takster.",
  },
  {
    q: "Hvad hvis min indkomst ændrer sig i løbet af året?",
    a: "Hvis din indkomst ændrer sig væsentligt (fx ved jobskifte, barsel eller skilsmisse), skal du kontakte kommunen så tilskuddet kan reguleres. Kommunen foretager også en årlig efterregulering.",
  },
];

export const FAQ_EN: FAQItem[] = [
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
