import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import SEOHead from "@/components/shared/SEOHead";
import JsonLd from "@/components/shared/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";

const DATA_SOURCES = [
  {
    name: "Danmarks Statistik",
    href: "https://www.dst.dk",
    descDa: "Officielle priser og statistik for dagtilbud (bl.a. RES88).",
    descEn: "Official prices and statistics for childcare (e.g. RES88).",
  },
  {
    name: "Uddannelsesstatistik.dk",
    href: "https://www.uddannelsesstatistik.dk",
    descDa: "Kvalitetsdata, karakterer, trivsel og fravær for skoler fra Undervisningsministeriet.",
    descEn: "Quality data, grades, well-being and absence for schools from the Ministry of Education.",
  },
  {
    name: "ISM Brugertilfredshedsundersøgelse",
    href: "https://www.ism.dk",
    descDa: "Brugertilfredshedsundersøgelser fra kommunale dagtilbud.",
    descEn: "User satisfaction surveys from municipal childcare institutions.",
  },
  {
    name: "Arbejdstilsynet",
    href: "https://www.at.dk",
    descDa: "Arbejdsmiljødata og tilsynsrapporter for institutioner.",
    descEn: "Work environment data and inspection reports for institutions.",
  },
  {
    name: "Kommunale tilsynsrapporter",
    href: null,
    descDa: "Tilsynsrapporter offentliggjort af de enkelte kommuner.",
    descEn: "Inspection reports published by individual municipalities.",
  },
];

const FAQ_DA = [
  {
    q: "Er det gratis at bruge Institutionsguide.dk?",
    a: "Ja, Institutionsguide.dk er helt gratis at bruge. Vi tror på, at alle forældre skal have adgang til gennemsigtige data om dagtilbud og skoler.",
  },
  {
    q: "Hvor ofte opdateres data?",
    a: "Vi opdaterer prisdata årligt, når kommunerne offentliggør nye takster (typisk i starten af året). Kvalitetsdata for skoler opdateres, når Undervisningsministeriet frigiver nye tal.",
  },
  {
    q: "Hvordan beregnes kvalitetsscoren?",
    a: "Kvalitetsscoren for skoler er baseret på officielle data fra Undervisningsministeriet og inkluderer trivselsmålinger, karaktergennemsnit, fravær, kompetencedækning og undervisningseffekt. Læs mere på vores metode-side.",
  },
  {
    q: "Kan jeg stole på priserne?",
    a: "Priserne stammer fra Danmarks Statistik og kommunernes egne takstoversigter. De er vejledende — kontakt altid din kommune for de helt aktuelle priser, da der kan være lokale tilskud eller ændringer.",
  },
];

const FAQ_EN = [
  {
    q: "Is Institutionsguide.dk free to use?",
    a: "Yes, Institutionsguide.dk is completely free. We believe all parents should have access to transparent data about childcare and schools.",
  },
  {
    q: "How often is data updated?",
    a: "We update price data annually when municipalities publish new rates (typically early in the year). School quality data is updated when the Ministry of Education releases new figures.",
  },
  {
    q: "How is the quality score calculated?",
    a: "The quality score for schools is based on official data from the Danish Ministry of Education and includes well-being surveys, grade averages, absence rates, competence coverage and teaching effectiveness. Read more on our methodology page.",
  },
  {
    q: "Can I trust the prices?",
    a: "Prices come from Statistics Denmark and municipal rate overviews. They are advisory — always contact your municipality for the most current prices, as there may be local subsidies or changes.",
  },
];

export default function AboutPage() {
  const { language } = useLanguage();
  const isDa = language === "da";
  const faq = isDa ? FAQ_DA : FAQ_EN;

  return (
    <>
      <SEOHead
        title={isDa ? "Om Institutionsguide.dk — Kontakt og datakilder" : "About Institutionsguide.dk — Contact and data sources"}
        description={isDa
          ? "Lær mere om Institutionsguide.dk, vores datakilder og hvordan vi hjælper forældre med at sammenligne dagtilbud og skoler i Danmark."
          : "Learn more about Institutionsguide.dk, our data sources and how we help parents compare childcare and schools in Denmark."}
        path="/om"
      />
      <JsonLd data={breadcrumbSchema([
        { name: isDa ? "Forside" : "Home", url: "https://institutionsguiden.dk/" },
        { name: isDa ? "Om os" : "About", url: "https://institutionsguiden.dk/om" },
      ])} />
      <section className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        {/* About section */}
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
          {isDa ? "Om Institutionsguide.dk" : "About Institutionsguide.dk"}
        </h1>
        <div className="prose prose-sm text-muted space-y-4 mb-12">
          <p>
            {isDa
              ? "Institutionsguide.dk er en gratis platform, der hjælper danske forældre med at sammenligne vuggestuer, børnehaver, dagplejere, skoler og SFO'er på tværs af hele Danmark. Vi samler officielle data fra offentlige kilder, så du kan træffe et informeret valg om dit barns institution."
              : "Institutionsguide.dk is a free platform that helps Danish parents compare nurseries, kindergartens, childminders, schools and after-school programs across Denmark. We gather official data from public sources so you can make an informed choice about your child's institution."}
          </p>
          <p>
            {isDa
              ? "Vi er en del af ParFinans-familien og arbejder på at gøre privatøkonomi og børnerelaterede beslutninger mere gennemsigtige for danske familier."
              : "We are part of the ParFinans family and work to make personal finance and child-related decisions more transparent for Danish families."}
          </p>
        </div>

        {/* Data sources */}
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          {isDa ? "Vores datakilder" : "Our data sources"}
        </h2>
        <div className="space-y-3 mb-12">
          {DATA_SOURCES.map((source) => (
            <div key={source.name} className="card p-4">
              <h3 className="font-display font-semibold text-foreground text-sm">
                {source.href ? (
                  <a href={source.href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {source.name}
                  </a>
                ) : (
                  source.name
                )}
              </h3>
              <p className="text-xs text-muted mt-1">
                {isDa ? source.descDa : source.descEn}
              </p>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          {isDa ? "Ofte stillede spørgsmål" : "Frequently asked questions"}
        </h2>
        <div className="space-y-4 mb-12">
          {faq.map((item, i) => (
            <details key={i} className="card p-4 group">
              <summary className="font-display font-semibold text-foreground text-sm cursor-pointer list-none flex items-center justify-between">
                {item.q}
                <span className="text-muted text-xs ml-2 group-open:rotate-180 transition-transform">&#9660;</span>
              </summary>
              <p className="text-sm text-muted mt-3 leading-relaxed">
                {item.a}
                {i === 2 && (
                  <>
                    {" "}
                    <Link to="/metode" className="text-primary hover:underline">
                      {isDa ? "Se metode-siden" : "See methodology page"} &rarr;
                    </Link>
                  </>
                )}
              </p>
            </details>
          ))}
        </div>

        {/* Contact */}
        <h2 className="font-display text-2xl font-bold text-foreground mb-4">
          {isDa ? "Kontakt" : "Contact"}
        </h2>
        <div className="card p-6 mb-8">
          <p className="text-sm text-muted mb-3">
            {isDa
              ? "Har du spørgsmål, forslag eller feedback? Vi hører gerne fra dig."
              : "Have questions, suggestions or feedback? We would love to hear from you."}
          </p>
          <a
            href="mailto:kontakt@institutionsguiden.dk"
            className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
          >
            kontakt@institutionsguiden.dk
          </a>
        </div>

        <div className="mt-8">
          <Link to="/" className="text-primary hover:underline font-medium">
            {isDa ? "Tilbage til forsiden" : "Back to homepage"}
          </Link>
        </div>
      </section>
    </>
  );
}
