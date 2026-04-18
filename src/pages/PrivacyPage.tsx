import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { dataVersions, formatDataDate } from "@/lib/dataVersions";
import SEOHead from "@/components/shared/SEOHead";
import Breadcrumbs from "@/components/shared/Breadcrumbs";

export default function PrivacyPage() {
  const { t, language } = useLanguage();

  return (
    <>
      <SEOHead
        title="Privatlivspolitik — Institutionsguide.dk"
        description="Læs om hvordan Institutionsguide.dk behandler dine personoplysninger, cookies og lokalt lagrede data."
        path="/privatliv"
      />
      <Breadcrumbs items={[
        { label: language === "da" ? "Forside" : "Home", href: "/" },
        { label: language === "da" ? "Privatlivspolitik" : "Privacy policy" },
      ]} />
      <section className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
      {language === "en" && t.privacy.englishBanner && (
        <div className="mb-6 rounded-lg bg-primary/10 border border-primary/20 px-4 py-3 text-sm text-primary">
          {t.privacy.englishBanner}
        </div>
      )}
      <h1 className="font-display text-2xl sm:text-4xl font-bold text-foreground mb-8">
        Privatlivspolitik
      </h1>

      <div className="prose prose-sm text-muted space-y-6">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            1. Dataansvarlig
          </h2>
          <p>
            Institutionsguide.dk drives af Casper via ParFinans (parfinans.dk).
            Har du spørgsmål vedrørende behandlingen af dine personoplysninger,
            er du velkommen til at kontakte os via{" "}
            <a href="https://parfinans.dk" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              parfinans.dk
            </a>.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            2. Cookie-samtykke
          </h2>
          <p>
            Når du besøger Institutionsguide.dk, vises et cookiebanner, hvor du
            aktivt kan vælge at acceptere eller afvise analytiske cookies. Ingen
            analytiske scripts indlæses, før du har givet dit udtrykkelige
            samtykke. Du kan til enhver tid ændre dit valg ved at slette
            nøglen <code className="text-xs bg-border/40 px-1 rounded">cookie-consent</code> fra
            din browsers localStorage.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            3. Analyse- og statistikværktøjer
          </h2>
          <p>
            Hvis du accepterer cookies, indlæses følgende tjenester:
          </p>
          <ul className="list-disc list-inside space-y-2 mt-2">
            <li>
              <strong>PostHog</strong> (EU-hostet, eu.i.posthog.com) — bruges til
              anonym webanalyse (sidevisninger, klikflows). Data gemmes i hukommelsen
              (persistence: memory) og ikke i cookies. Session recording er deaktiveret.
            </li>
            <li>
              <strong>Umami</strong> (cloud.umami.is) — bruges til simpel, anonym
              besøgsstatistik. Umami er designet til at være privacy-venlig og
              indsamler ingen personhenførbare oplysninger.
            </li>
          </ul>
          <p className="mt-2">
            Ingen af disse tjenester placerer trackingcookies eller indsamler
            personhenførbare data såsom IP-adresser i identificerbar form.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            4. Lokal lagring (localStorage)
          </h2>
          <p>
            Vi anvender din browsers localStorage til følgende formål:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>cookie-consent</strong> — gemmer dit valg om accept eller afvisning af cookies.</li>
            <li><strong>favorites</strong> — gemmer dine favoritinstitutioner, så de huskes mellem besøg.</li>
            <li><strong>language</strong> — gemmer dit sprogvalg (dansk/engelsk).</li>
          </ul>
          <p className="mt-2">
            Disse data forlader aldrig din browser og sendes ikke til vores servere.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            5. Geolokation
          </h2>
          <p>
            Funktionen &ldquo;Nær mig&rdquo; anvender din browsers
            Geolocation API til at finde institutioner i nærheden. Din browser
            vil altid bede om din tilladelse, før din placering tilgås.
            Positionsdata behandles udelukkende lokalt i din browser og sendes
            ikke til vores servere.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            6. Videregivelse til tredjeparter
          </h2>
          <p>
            Vi sælger, videregiver eller deler ikke personoplysninger med
            tredjeparter. De eneste eksterne tjenester, der modtager data, er de
            analyseværktøjer, der er beskrevet ovenfor — og kun efter dit
            udtrykkelige samtykke.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            7. Datakilder
          </h2>
          <p>
            Alle data om institutioner, priser og kvalitet stammer fra offentligt
            tilgængelige kilder:
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
            8. Dine rettigheder (GDPR)
          </h2>
          <p>
            I henhold til databeskyttelsesforordningen (GDPR) har du følgende
            rettigheder:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Ret til indsigt i, hvilke personoplysninger vi behandler om dig.</li>
            <li>Ret til berigtigelse af urigtige oplysninger.</li>
            <li>Ret til sletning af dine personoplysninger.</li>
            <li>Ret til at gøre indsigelse mod behandlingen.</li>
            <li>Ret til dataportabilitet.</li>
            <li>
              Ret til at klage til Datatilsynet (
              <a href="https://datatilsynet.dk" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                datatilsynet.dk
              </a>
              ).
            </li>
          </ul>
          <p className="mt-2">
            Da vi ikke indsamler personhenførbare data på vores servere, vil der
            i praksis sjældent være oplysninger at udlevere eller slette. Du kan
            altid rydde localStorage i din browser for at fjerne alle lokalt
            gemte præferencer.
          </p>
        </div>

        <div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            9. Kontakt
          </h2>
          <p>
            Har du spørgsmål til vores privatlivspolitik, er du velkommen til at kontakte os via{" "}
            <a href="https://parfinans.dk" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              parfinans.dk
            </a>.
          </p>
        </div>

        <p className="text-xs text-muted pt-4 border-t border-border">
          Sidst opdateret: {formatDataDate(dataVersions.legal.lastUpdated, "da")}
        </p>
      </div>

      <div className="mt-8">
        <Link to="/" className="text-primary hover:underline font-medium">
          Tilbage til forsiden
        </Link>
      </div>
    </section>
    </>
  );
}
