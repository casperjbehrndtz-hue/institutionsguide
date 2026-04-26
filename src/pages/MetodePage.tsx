import { Link } from "react-router-dom";
import SEOHead from "@/components/shared/SEOHead";
import Button from "@/components/ui/Button";
import JsonLd from "@/components/shared/JsonLd";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { breadcrumbSchema } from "@/lib/schema";
import DataFreshness from "@/components/shared/DataFreshness";
import ScrollReveal from "@/components/shared/ScrollReveal";
import RelatedSearches from "@/components/shared/RelatedSearches";

export default function MetodePage() {
  return (
    <>
      <SEOHead
        title="Metode og datakilder — Institutionsguiden"
        description="Læs om hvordan Institutionsguiden beregner kvalitetsscorer, normering og priser. Se vores datakilder fra Undervisningsministeriet, STIL og Dagtilbudsregisteret."
        path="/metode"
      />
      <JsonLd data={breadcrumbSchema([
        { name: "Forside", url: "https://www.institutionsguiden.dk/" },
        { name: "Metode og datakilder", url: "https://www.institutionsguiden.dk/metode" },
      ])} />

      <Breadcrumbs
        items={[
          { label: "Forside", href: "/" },
          { label: "Metode og datakilder" },
        ]}
      />

      {/* Header */}
      <ScrollReveal><section className="px-4 py-10 sm:py-14 text-center bg-gradient-to-b from-primary/5 to-transparent">
        <h1 className="font-display text-2xl sm:text-4xl font-bold text-foreground mb-3">
          Metode og datakilder
        </h1>
        <p className="text-muted text-base max-w-2xl mx-auto">
          Institutionsguiden bygger på offentlige data fra danske myndigheder. Her kan du
          læse om, hvordan vi beregner kvalitetsscorer, normering og priser.
        </p>
        <DataFreshness />
      </section></ScrollReveal>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">
        {/* Kommune-intelligens (MIL) */}
        <ScrollReveal><section>
          <div className="card p-6">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">
              Kommune-intelligens (MIL)
            </h2>
            <div className="text-sm text-muted space-y-3">
              <p>
                Vores volumen-vægtede kvalitetsindeks rangerer alle 98 kommuner på dagtilbud
                og folkeskole. For hver institution beregnes en percentil (0-100) for hver
                metrik mod det nationale datasæt. Højere betyder altid bedre, uanset om
                metrikken er "højere karakter" eller "færre sygedage".
              </p>
              <p>
                <strong className="text-foreground">Formel — kort:</strong>{" "}
                <code className="text-[12px] bg-muted/10 px-1.5 py-0.5 rounded">WQI = Σ(w·c·p) / Σ(w·c)</code>
                {" "}hvor w er din vægt, c er konfidens (1 hvis observeret, 0,5 hvis kommune-median, 0,25 hvis landsmedian),
                og p er metrikkens percentil.
              </p>
              <p>
                <strong className="text-foreground">Eksempel:</strong> Hvis Gentofte folkeskole-spor scorer 72,3,
                betyder det at en gennemsnitlig elev i Gentofte (vægtet for skolestørrelse) ligger på den 72. percentil
                nationalt på de metrikker du har vægtet. Klikker du "Tryghed først"-presetten,
                vægtes trivsel og personalestabilitet højere — og scoren ændrer sig.
              </p>
              <p>
                <strong className="text-foreground">Mikro-kommuner</strong> (under 5 institutioner i sporet) får
                Bayesisk udjævning: λ = N / (N + 5) trækker scoren mod landsmiddel for at undgå at en
                enkelt institution producerer ekstreme scores. Ved N=2 vægter landet ca. 71%; ved N=20 vægter
                kommunen selv 80%.
              </p>
            </div>
          </div>
        </section></ScrollReveal>

        {/* Limitations */}
        <ScrollReveal><section>
          <div className="card p-6 border border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/10">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">
              Hvad denne side IKKE er
            </h2>
            <div className="text-sm text-muted space-y-3">
              <ul className="list-disc list-inside space-y-1.5 ml-1">
                <li>Vi vurderer ikke individuelle pædagoger eller lærere — kun aggregerede data.</li>
                <li>Vi måler ikke pasningskultur, pædagogisk tilgang eller "atmosfære" — det er ikke i offentlige datasæt.</li>
                <li>Vi giver ikke rådgivning om hvilken institution der er rigtig for netop dit barn — det er forældrenes valg.</li>
                <li>Vi måler ikke kortere ventelister eller geografisk afstand til hjemmet — det skal du selv tjekke.</li>
                <li>Privatskoler udvælger selv elever, hvilket kan løfte deres trivsels- og karaktermål kunstigt. Vi tager ikke højde for dette.</li>
              </ul>
              <p>
                Brug rangeringen som et <em>udgangspunkt</em>, ikke en facitliste. Besøg altid
                institutionen før du beslutter dig.
              </p>
            </div>
          </div>
        </section></ScrollReveal>

        {/* Quality scores */}
        <ScrollReveal><section>
          <div className="card p-6">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">
              Kvalitetsscore for skoler
            </h2>
            <div className="text-sm text-muted space-y-3">
              <p>
                Kvalitetsscoren for folkeskoler og friskoler beregnes som et vægtet gennemsnit
                af fire officielle indikatorer fra Undervisningsministeriet:
              </p>
              <ul className="list-disc list-inside space-y-1.5 ml-1">
                <li><strong className="text-foreground">Trivsel</strong> — elevernes trivselsmåling (vægt: høj)</li>
                <li><strong className="text-foreground">Karaktergennemsnit</strong> — afgangsprøvernes karaktersnit (vægt: høj)</li>
                <li><strong className="text-foreground">Fravær</strong> — gennemsnitligt fravær i procent (vægt: middel, lavere er bedre)</li>
                <li><strong className="text-foreground">Kompetencedækning</strong> — andel undervisning varetaget af lærere med kompetence i faget (vægt: middel)</li>
              </ul>
              <p>
                Hver indikator normaliseres til en skala fra 0-5 og vægtes for at give en
                samlet kvalitetsscore. Scoren bør ses som en indikator og ikke en absolut
                rangering — den indfanger ikke alt det, der gør en god skole.
              </p>
            </div>
          </div>
        </section></ScrollReveal>

        {/* Normering */}
        <ScrollReveal><section>
          <div className="card p-6">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">
              Normering (børn per voksen)
            </h2>
            <div className="text-sm text-muted space-y-3">
              <p>
                Normering angiver forholdet mellem antal børn og antal voksne i et dagtilbud.
                Et lavere tal betyder færre børn per voksen og dermed bedre normering.
              </p>
              <p>
                Siden 1. januar 2024 gælder lovkravet om minimumsnormering i Danmark:
              </p>
              <ul className="list-disc list-inside space-y-1.5 ml-1">
                <li><strong className="text-foreground">Vuggestue (0-2 år):</strong> Mindst 1 voksen per 3 børn (1:3)</li>
                <li><strong className="text-foreground">Børnehave (3-5 år):</strong> Mindst 1 voksen per 6 børn (1:6)</li>
              </ul>
              <p>
                Normeringsdata hentes fra STIL's normeringsstatistik og opdateres årligt.
                Vi viser data på kommuneniveau, så individuelle institutioner kan afvige.
              </p>
            </div>
          </div>
        </section></ScrollReveal>

        {/* Prices */}
        <ScrollReveal><section>
          <div className="card p-6">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">
              Priser og takster
            </h2>
            <div className="text-sm text-muted space-y-3">
              <p>
                Månedspriser for vuggestuer, børnehaver, dagpleje og SFO'er hentes fra
                Dagtilbudsregisteret og de enkelte kommuners takstoversigter. Priserne
                opdateres årligt, typisk ved årets start når kommunerne vedtager nye budgetter.
              </p>
              <p>
                Priserne viser forældre&shy;betalingen for en fuldtidsplads <em>før</em> eventuelt
                fripladstilskud. Brug vores{" "}
                <Link to="/friplads" className="text-primary hover:underline">
                  fripladsberegner
                </Link>{" "}
                til at se din faktiske pris efter tilskud.
              </p>
            </div>
          </div>
        </section></ScrollReveal>

        {/* Data sources */}
        <ScrollReveal><section>
          <div className="card p-6">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">
              Datakilder
            </h2>
            <div className="text-sm text-muted space-y-3">
              <p>Vi anvender følgende offentlige datakilder:</p>
              <ul className="list-disc list-inside space-y-2 ml-1">
                <li>
                  <strong className="text-foreground">STIL (Styrelsen for IT og Læring)</strong> — normeringsdata og institutionsoplysninger.{" "}
                  <a href="https://stil.dk" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                    stil.dk
                  </a>
                </li>
                <li>
                  <strong className="text-foreground">Uddannelsesstatistik.dk</strong> — trivsel, karaktergennemsnit, fravær og kompetencedækning for skoler.{" "}
                  <a href="https://uddannelsesstatistik.dk" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                    uddannelsesstatistik.dk
                  </a>
                </li>
                <li>
                  <strong className="text-foreground">Dagtilbudsregisteret</strong> — institutionsdata og takster for dagtilbud.{" "}
                  <a href="https://tilbudsportalen.dk" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                    tilbudsportalen.dk
                  </a>
                </li>
                <li>
                  <strong className="text-foreground">BUVM API (Børne- og Undervisningsministeriet)</strong> — kvalitetsdata og rapporter.{" "}
                  <a href="https://buvm.dk" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                    buvm.dk
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </section></ScrollReveal>

        {/* About */}
        <ScrollReveal><section>
          <div className="card p-6">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">
              Om Institutionsguiden
            </h2>
            <div className="text-sm text-muted space-y-3">
              <p>
                Institutionsguiden.dk er en del af{" "}
                <a href="https://parfinans.dk" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  ParFinans
                </a>{" "}
                — en suite af værktøjer til danske familiers økonomi og hverdag. Målet er at
                gøre det nemmere at sammenligne daginstitutioner, skoler og SFO'er baseret
                på offentlige data.
              </p>
              <p>
                Siden er gratis at bruge og finansieres uden reklamer. Vi sælger ikke dine data
                — se vores{" "}
                <Link to="/privatliv" className="text-primary hover:underline">
                  privatlivspolitik
                </Link>{" "}
                for detaljer.
              </p>
            </div>
          </div>
        </section></ScrollReveal>

        {/* Contact */}
        <ScrollReveal><section>
          <div className="card p-6 bg-primary/5">
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">
              Kontakt
            </h2>
            <div className="text-sm text-muted space-y-3">
              <p>
                Har du spørgsmål, feedback eller har du fundet en fejl i data? Kontakt os via{" "}
                <a href="https://parfinans.dk" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  parfinans.dk
                </a>.
              </p>
              <p>
                Vi bestræber os på at holde data så opdaterede og præcise som muligt, men kan
                ikke garantere fuldstændig nøjagtighed. Se altid den enkelte institutions
                eller kommunes egne oplysninger for de mest aktuelle data.
              </p>
            </div>
          </div>
        </section></ScrollReveal>

        {/* CTA — find institution */}
        <section className="text-center py-4">
          <h2 className="font-display text-xl font-semibold text-foreground mb-2">
            Klar til at finde den rette institution?
          </h2>
          <p className="text-sm text-muted mb-4">
            Brug vores søgning til at sammenligne priser, kvalitet og normering.
          </p>
          <Button as="link" to="/" variant="primary" size="md">
            Find institution &rarr;
          </Button>
        </section>
      </div>

      {/* Related searches */}
      <RelatedSearches />
    </>
  );
}
