import { Link } from "react-router-dom";

export default function PrivacyPage() {
  return (
    <section className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
      <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-8">
        Privatlivspolitik
      </h1>

      <div className="prose prose-sm text-muted space-y-6">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            Hvad vi indsamler
          </h2>
          <p>
            Institutionsguide.dk indsamler <strong>ingen persondata</strong>. Vi gemmer udelukkende din
            cookie-præference i din browsers localStorage. Der sendes ingen data til vores servere.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            Cookies og tracking
          </h2>
          <p>
            Vi bruger ingen tredjepartscookies og ingen sporingsværktøjer uden dit samtykke.
            Den eneste lokale lagring er din accept eller afvisning af cookiebanneret.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            Dine rettigheder (GDPR)
          </h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Ret til indsigt i dine data</li>
            <li>Ret til sletning af dine data</li>
            <li>Ret til at klage til Datatilsynet (datatilsynet.dk)</li>
          </ul>
          <p className="mt-2">
            Da vi ikke indsamler persondata, er der i praksis intet at slette eller udlevere.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            Datakilder
          </h2>
          <p>
            Alle data om institutioner, priser og kvalitet stammer fra offentligt tilgængelige kilder:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Dagtilbudsregisteret (STIL)</li>
            <li>Institutionsregisteret</li>
            <li>Uddannelsesstatistik API (Undervisningsministeriet)</li>
            <li>Danmarks Statistik (RES88)</li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            Kontakt
          </h2>
          <p>
            Har du spørgsmål til vores privatlivspolitik, er du velkommen til at kontakte os via{" "}
            <a href="https://parfinans.dk" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              parfinans.dk
            </a>.
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
