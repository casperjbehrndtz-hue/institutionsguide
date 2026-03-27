import { Link } from "react-router-dom";

export default function TermsPage() {
  return (
    <section className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
      <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-8">
        Vilkår
      </h1>

      <div className="prose prose-sm text-muted space-y-6">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            Vejledende priser
          </h2>
          <p>
            Alle priser vist på Institutionsguide.dk er <strong>vejledende</strong> og baseret på
            offentligt tilgængelige data. De faktiske takster kan afvige. Kontakt altid din kommune
            for den præcise takst.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            Ikke rådgivning
          </h2>
          <p>
            Informationen på denne side udgør ikke finansiel, juridisk eller skattemæssig rådgivning.
            Fripladstilskudsberegningen er vejledende og baseret på 2025-satser. Søg altid
            professionel rådgivning ved behov.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            Datakilder
          </h2>
          <p>Data stammer fra følgende offentlige kilder:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Dagtilbudsregisteret (STIL)</li>
            <li>Institutionsregisteret</li>
            <li>Uddannelsesstatistik API (Undervisningsministeriet)</li>
            <li>Danmarks Statistik (RES88)</li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            Ingen garanti
          </h2>
          <p>
            Vi bestræber os på at vise korrekte og opdaterede data, men kan ikke garantere
            fuldstændighed eller nøjagtighed. Brug af Institutionsguide.dk sker på eget ansvar.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            Ophavsret
          </h2>
          <p>
            &copy; 2026 Institutionsguide. Alle rettigheder forbeholdes. Indholdet på denne side
            må ikke kopieres eller distribueres uden tilladelse.
          </p>
        </div>

        <p className="text-xs text-muted pt-4 border-t border-border">
          Sidst opdateret: marts 2026
        </p>
      </div>

      <div className="mt-8">
        <Link to="/" className="text-primary hover:underline font-medium">
          Tilbage til forsiden
        </Link>
      </div>
    </section>
  );
}
