import { dataVersions, getFripladsYear } from "@/lib/dataVersions";
import { FRIPLADS_CONSTANTS } from "@/lib/childcare/friplads";

export const FAQ_ITEMS_DA = [
  {
    q: "Hvad er fripladstilskud, og hvem kan få det?",
    a: `Fripladstilskud er en rabat på forældrebetalingen for dagtilbud. Tilskuddet afhænger af husstandsindkomsten. I ${getFripladsYear()} kan familier med en indkomst under ${FRIPLADS_CONSTANTS.upperThreshold.toLocaleString("da-DK")} kr. få delvist tilskud, og under ${FRIPLADS_CONSTANTS.lowerThreshold.toLocaleString("da-DK")} kr. får man fuld friplads.`,
  },
  {
    q: "Hvad er forskellen på dagpleje og vuggestue?",
    a: "Dagpleje foregår i en dagplejers private hjem med maks 4-5 børn, mens en vuggestue er en institution med flere børn og personale. Dagpleje er ofte billigere, mens vuggestuer typisk har flere pædagoger og faciliteter.",
  },
  {
    q: "Hvordan beregnes kvalitetsscoren for skoler?",
    a: "Kvalitetsscoren er baseret på officielle data fra Undervisningsministeriet og inkluderer trivselsmålinger, karaktergennemsnit, fravær, kompetencedækning og undervisningseffekt (socioøkonomisk reference).",
  },
  {
    q: "Er priserne opdaterede?",
    a: `Priserne er baseret på data fra Danmarks Statistik (${dataVersions.prices.year}-tal) og Dagtilbudsregisteret. Kommunerne regulerer typisk taksterne årligt, så der kan forekomme mindre afvigelser.`,
  },
  {
    q: "Hvornår skal jeg skrive mit barn op til vuggestue eller børnehave?",
    a: "Det varierer fra kommune til kommune, men som tommelfingerregel bør du skrive op så tidligt som muligt — gerne lige efter fødslen. I de store byer som København, Aarhus og Odense kan ventelisterne være lange, og mange kommuner bruger Digital Pladsanvisning.",
  },
  {
    q: "Kan jeg se normeringen for en institution?",
    a: "Ja, vi viser normering (børn pr. voksen) for vuggestuer, børnehaver og dagpleje. Data kommer fra Børne- og Undervisningsministeriet. Du kan sammenligne normering på tværs af kommuner under Normering-siden eller se den direkte på den enkelte institutions profil.",
  },
  {
    q: "Hvad er søskenderabat?",
    a: "Har du flere børn i dagtilbud, betaler du typisk kun 50% for barn nr. 2 og derefter. Rabatten gælder automatisk og er indregnet i vores fripladstilskudsberegner.",
  },
];

export const FAQ_ITEMS_EN = [
  {
    q: "What is childcare subsidy, and who can get it?",
    a: `Childcare subsidy (fripladstilskud) is a discount on parental fees for daycare. The subsidy depends on household income. In ${getFripladsYear()}, families with an income below DKK ${FRIPLADS_CONSTANTS.upperThreshold.toLocaleString("en-US")} can receive partial subsidy, and below DKK ${FRIPLADS_CONSTANTS.lowerThreshold.toLocaleString("en-US")} full subsidy.`,
  },
  {
    q: "What is the difference between childminder and nursery?",
    a: "Childminders (dagpleje) care for children in their private home with max 4-5 children, while nurseries (vuggestue) are institutions with more children and staff. Childminders are often cheaper, while nurseries typically have more pedagogues and facilities.",
  },
  {
    q: "How is the quality score for schools calculated?",
    a: "The quality score is based on official data from the Danish Ministry of Education and includes well-being surveys, grade averages, absence, competence coverage and teaching effectiveness (socio-economic reference).",
  },
  {
    q: "Are the prices up to date?",
    a: `Prices are based on data from Statistics Denmark (${dataVersions.prices.year} figures) and the Daycare Registry. Municipalities typically adjust rates annually, so minor deviations may occur.`,
  },
  {
    q: "When should I sign up my child for daycare?",
    a: "It varies by municipality, but as a rule of thumb, sign up as early as possible — ideally right after birth. Waiting lists can be long in larger cities like Copenhagen, Aarhus and Odense.",
  },
  {
    q: "Can I see the staff-to-child ratio?",
    a: "Yes, we show staff-to-child ratios (normering) for nurseries, kindergartens and childminders. Data comes from the Danish Ministry of Children and Education. You can compare ratios across municipalities on the Normering page or see them directly on each institution's profile.",
  },
  {
    q: "What is sibling discount?",
    a: "If you have multiple children in daycare, you typically pay only 50% for the second child onwards. The discount applies automatically and is included in our subsidy calculator.",
  },
];
