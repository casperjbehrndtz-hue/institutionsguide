import { useMunicipalityIntelligence } from "@/hooks/useMunicipalityIntelligence";
import { useTrack } from "@/contexts/TrackContext";
import LifeStageToggle from "@/components/mi/LifeStageToggle";
import WeightSliders from "@/components/mi/WeightSliders";
import MunicipalityLeaderboard from "@/components/mi/MunicipalityLeaderboard";
import SEOHead from "@/components/shared/SEOHead";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import JsonLd from "@/components/shared/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/schema";
import FAQAccordion from "@/components/shared/FAQAccordion";

const MI_FAQ: { q: string; a: string }[] = [
  {
    q: "Hvordan beregnes score for en kommune?",
    a: "For hvert spor (dagtilbud eller folkeskole) rangerer vi hver institutions nøgletal nationalt som en percentil (0-100, hvor højere altid betyder bedre). Institutionerne vægtes med antallet af børn/elever, så store institutioner får mere vægt end små. Kommunens score er det volumen-vægtede gennemsnit af institutionernes percentiler, efter at jeres prioriteter er ganget på.",
  },
  {
    q: "Hvorfor er små kommuner trukket mod landsmiddel?",
    a: "Hvis en kommune kun har 1-3 institutioner i et spor, kan en enkelt outlier vælte scoren. Vi bruger Bayesisk udjævning (τ=5), der trækker små kommuner lidt ind mod landsmiddel. Formel: λ = N / (N + 5). Har kommunen 5 institutioner vægtes dens egne data 50% mod landsmiddel; ved 20 institutioner er det 80%.",
  },
  {
    q: "Hvad sker der når data mangler?",
    a: "Hvis en institution ikke rapporterer en specifik metrik, bruges kommunens median for samme metrik — ikke 0. Derudover sænkes metrikens vægt med en konfidens-straf (α=0,5 for kommune-median, α²=0,25 hvis vi falder helt tilbage på landsmedian). På den måde belønner leaderboardet kommuner med fuldstændig dataindsamling.",
  },
  {
    q: "Hvor kommer data fra?",
    a: "Uddannelsesstatistik (FP9-karakterer, socioøkonomisk løft, kompetencedækning), Den Nationale Trivselsmåling, Danmarks Statistik (normering, løn, sygefravær), BUVM (minimumsnormering), KRL (pædagog-andel) og den kommunale brugertilfredshedsundersøgelse (BTU). Kilder er opdateret skoleåret 2024/2025.",
  },
  {
    q: "Kan jeg dele mine prioriteter med min partner?",
    a: "Ja. Klik 'Del mine prioriteter' under skyderne, så kopieres et link der åbner leaderboardet med dine valg. Du kan også pin'e 2-3 kommuner og klikke 'Sammenlign side om side' for at se dem direkte op mod hinanden.",
  },
  {
    q: "Hvorfor vises privatskoler sammen med folkeskoler?",
    a: "Spec'en for kvalitetsindekset inkluderer både folkeskoler og privatskoler i samme spor, fordi forældre reelt vælger mellem dem. Institutionsformen er synlig på institutionssiden, så du kan filtrere ved at klikke gennem til den enkelte skole.",
  },
];

export default function KommuneIntelligensPage() {
  const { track } = useTrack();
  const { municipalities, nationalMean, ready, dataset } = useMunicipalityIntelligence();
  const trackLabel = track === "daycare" ? "Dagtilbud" : "Folkeskole";

  return (
    <>
      <SEOHead
        title="Kommune-intelligens — Sammenlign Danmarks 98 kommuner på børnepasning og skole"
        description="Volumen-vægtet kvalitetsindeks for alle 98 kommuner. Vælg selv hvor meget normering, trivsel, karakter og pris skal tælle — leaderboardet genberegnes med det samme."
        path="/kommune-intelligens"
      />
      <JsonLd data={breadcrumbSchema([
        { name: "Forside", url: "https://www.institutionsguiden.dk/" },
        { name: "Kommune-intelligens", url: "https://www.institutionsguiden.dk/kommune-intelligens" },
      ])} />
      <JsonLd data={faqSchema(MI_FAQ)} />

      <Breadcrumbs items={[
        { label: "Forside", href: "/" },
        { label: "Kommune-intelligens" },
      ]} />

      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
        <header className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-4xl font-bold text-foreground mb-2">
              Kommune-intelligens
            </h1>
            <p className="text-muted max-w-2xl">
              Et to-spors kvalitetsindeks for Danmarks 98 kommuner. Vælg en profil
              eller juster vægten selv — leaderboardet genberegnes med det samme.
              Pin 2-3 kommuner for at se dem side om side.
            </p>
          </div>
          <LifeStageToggle />
        </header>

        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-[340px] shrink-0">
            <div className="lg:sticky lg:top-20 space-y-3">
              <WeightSliders />
              <p className="text-[11px] text-muted px-1 leading-snug">
                Datakilder: Uddannelsesstatistik, Den Nationale Trivselsmåling,
                Danmarks Statistik, BUVM, KRL, BTU. Confidence-penalty α = 0,5
                ved kommune-median; α² = 0,25 ved landsmedian.
              </p>
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            {!ready && (
              <div className="rounded-xl border border-border bg-bg-card p-4 mb-3 text-sm text-muted">
                Indlæser supplerende data — leaderboardet opdateres når metrikker er klar.
              </div>
            )}
            <MunicipalityLeaderboard
              municipalities={municipalities}
              nationalMean={nationalMean}
              trackLabel={trackLabel}
              dataset={dataset}
            />
          </main>
        </div>

        <section className="mt-12 max-w-3xl">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-4">
            Sådan bruger du kommune-intelligens
          </h2>
          <ol className="space-y-3 text-sm text-foreground/85 leading-relaxed list-decimal pl-5">
            <li>
              <strong>Vælg spor.</strong> Dagtilbud dækker vuggestue, børnehave og dagpleje.
              Folkeskole dækker folkeskoler og privatskoler (efterskoler og gymnasier er et særskilt valg).
            </li>
            <li>
              <strong>Vælg en profil eller tilpas vægten.</strong> Profilerne er forudindstillede kombinationer
              af vægte, så du hurtigt kan se hvordan kommunerne rangerer for "Tryghed først",
              "Budgetbevidst familie", "Trivsel først" osv. Finjustér med skyderne hvis du vil.
            </li>
            <li>
              <strong>Pin kommuner til sammenligning.</strong> Klik på pin-ikonet ved op til 3
              kommuner og tryk "Sammenlign side om side". Du får en kolonne pr. kommune
              med hver enkelt metrik stillet op — tal og bjælker.
            </li>
            <li>
              <strong>Del dine prioriteter.</strong> "Del mine prioriteter" kopierer et link
              som din partner kan åbne for at se samme rangering på deres enhed.
            </li>
          </ol>
        </section>

        <section className="mt-12 max-w-3xl">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-4">
            Metoden kort fortalt
          </h2>
          <div className="space-y-3 text-sm text-foreground/85 leading-relaxed">
            <p>
              Rangeringen bygger på et <em>Weighted Quality Index</em> (WQI) for hver kommune
              per spor. For hver institution beregnes en percentil (0-100) for hver metrik mod
              det nationale datasæt — højere betyder altid bedre, uanset om metrikken er "højere
              karakter" eller "færre sygedage".
            </p>
            <p>
              Institutionerne bidrager til kommunens score med vægt proportional til deres størrelse
              (antal børn for dagtilbud, antal elever for skoler). Manglende data fyldes op med
              kommunens median, men straffes med en konfidens-faktor (α=0,5), så kommuner med
              fuldstændig indrapportering belønnes.
            </p>
            <p>
              Mikro-kommuner (N&lt;5 institutioner) får <em>Bayesisk udjævning</em>:
              λ = N / (N + 5), der blødt trækker deres score mod landsmiddel. Ved N=1 vægter
              landet 83%; ved N=20 vægter kommunen selv 80%.
            </p>
          </div>
        </section>

        <section className="mt-12 max-w-3xl">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-4">
            Ofte stillede spørgsmål
          </h2>
          <FAQAccordion items={MI_FAQ} />
        </section>
      </div>
    </>
  );
}
