import { Link } from "react-router-dom";
import { ArrowRight, Baby, GraduationCap, Sparkles } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import InstantAnswer from "@/components/home/InstantAnswer";
import SEOHead from "@/components/shared/SEOHead";
import JsonLd from "@/components/shared/JsonLd";
import { websiteSchema, faqSchema } from "@/lib/schema";
import FAQAccordion from "@/components/shared/FAQAccordion";
import CompareBar from "@/components/compare/CompareBar";
import { dataVersions, formatDataDate } from "@/lib/dataVersions";

const CATEGORY_CHIPS: { href: string; label: string }[] = [
  { href: "/vuggestue", label: "Vuggestuer" },
  { href: "/boernehave", label: "Børnehaver" },
  { href: "/dagpleje", label: "Dagplejere" },
  { href: "/skole", label: "Folkeskoler" },
  { href: "/sfo", label: "SFO" },
  { href: "/efterskole", label: "Efterskoler" },
  { href: "/gymnasium", label: "Gymnasier" },
];

const POPULAR_KOMMUNER: string[] = [
  "København", "Aarhus", "Odense", "Aalborg", "Frederiksberg",
  "Gentofte", "Esbjerg", "Vejle", "Randers", "Roskilde",
  "Lyngby-Taarbæk", "Rudersdal",
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Hvordan ved jeg om en institution er god?",
    a: "Vi samler officielle data fra Undervisningsministeriet, Danmarks Statistik og den Nationale Trivselsmåling og viser hvordan hver institution rangerer nationalt. For dagtilbud er de vigtigste mål normering (børn pr. voksen), andel uddannede pædagoger og forældretilfredshed. For skoler er det trivsel, karaktergennemsnit, undervisningseffekt (socioøkonomisk løft) og kompetencedækning.",
  },
  {
    q: "Er data pålidelige og opdaterede?",
    a: `Alle tal kommer fra officielle danske kilder og opdateres automatisk når nye datasæt frigives. Senest opdateret ${formatDataDate(dataVersions.overall.lastUpdated, "da")}.`,
  },
  {
    q: "Hvad koster det at bruge Institutionsguide?",
    a: "Gratis. Vi får ingen penge fra institutioner eller kommuner, og vi sælger ikke dine data. Uafhængighed er hele pointen — ellers kunne du ikke stole på rangeringerne.",
  },
  {
    q: "Kan jeg sammenligne flere institutioner?",
    a: "Ja. Klik på hjerteikon på et institution-kort for at tilføje til sammenligning, eller brug Kommune-intelligens til at sammenligne hele kommuner mod hinanden.",
  },
  {
    q: "Hvorfor er normering så vigtig for dagtilbud?",
    a: "Normeringen (antal børn pr. voksen) er det mest robuste kvalitetsmål for dagtilbud, fordi den direkte styrer hvor meget voksenkontakt hvert barn får. BUVM har fastsat minimumsnormering på 3 børn pr. voksen i vuggestuer og 6 børn pr. voksen i børnehaver, men mange kommuner ligger bedre end det.",
  },
  {
    q: "Hvad er forskellen på folkeskole og privatskole i rangeringen?",
    a: "Begge indgår i samme spor fordi forældre reelt vælger mellem dem. På institutionssiden kan du se skoletype. Vær opmærksom på at privatskoler selv udvælger elever, hvilket kan påvirke trivsels- og karaktermål.",
  },
];

export default function HomePage() {
  const { institutions, loading, error } = useData();
  const { language } = useLanguage();
  const institutionCount = institutions.length;

  return (
    <>
      <SEOHead
        title="Institutionsguide — Find og sammenlign børnepasning og skoler i Danmark"
        description="Se top-rangerede vuggestuer, børnehaver, dagplejere og skoler i dit område. Officiel data fra Undervisningsministeriet og Danmarks Statistik. Gratis og uafhængigt."
        path="/"
      />
      <JsonLd data={websiteSchema("https://www.institutionsguiden.dk")} />
      <JsonLd data={faqSchema(FAQ)} />

      {/* 1. Hero — Instant Answer Engine */}
      <InstantAnswer />

      {/* 2. Trust bar */}
      <section className="border-b border-border/70 bg-bg">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px]">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted/70">Verificeret data fra</span>
          <span className="text-foreground/75">Undervisningsministeriet</span>
          <span className="text-muted/30" aria-hidden="true">·</span>
          <span className="text-foreground/75">Danmarks Statistik</span>
          <span className="text-muted/30" aria-hidden="true">·</span>
          <span className="text-foreground/75">BUVM</span>
          <span className="text-muted/30" aria-hidden="true">·</span>
          <span className="text-foreground/75">Kommunale tilsynsrapporter</span>
          <span className="text-muted/30" aria-hidden="true">·</span>
          <span className="text-muted">Opdateret {formatDataDate(dataVersions.overall.lastUpdated, language === "da" ? "da" : "en")}</span>
        </div>
      </section>

      {/* 3. Kommune-intelligens preview */}
      <section className="border-b border-border/70">
        <div className="max-w-5xl mx-auto px-4 py-14 sm:py-20">
          <div className="flex items-start gap-3 mb-6 max-w-2xl">
            <Sparkles className="w-5 h-5 text-primary mt-1.5 shrink-0" />
            <div>
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground tracking-tight mb-2">
                Er jeres kommune bedst?
              </h2>
              <p className="text-muted text-base leading-relaxed">
                Et volumen-vægtet kvalitetsindeks for alle 98 kommuner. Vælg om
                du vil vægte normering, trivsel, karakter eller pris — og se
                leaderboardet opdatere sig øjeblikkeligt.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Link
              to="/kommune-intelligens?mode=daycare"
              className="group flex flex-col justify-between p-6 rounded-2xl border border-border hover:border-primary/50 bg-bg-card hover:bg-primary/5 transition-colors min-h-[160px]"
            >
              <div className="flex items-center gap-2">
                <Baby className="w-5 h-5 text-primary" />
                <h3 className="font-display text-lg font-semibold text-foreground">Dagtilbud-ranking</h3>
              </div>
              <p className="text-sm text-muted mt-2 leading-relaxed">
                Se alle 98 kommuner rangeret på normering, stabilitet og forældretilfredshed.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm text-primary font-semibold">
                Åbn værktøj <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>

            <Link
              to="/kommune-intelligens?mode=school"
              className="group flex flex-col justify-between p-6 rounded-2xl border border-border hover:border-primary/50 bg-bg-card hover:bg-primary/5 transition-colors min-h-[160px]"
            >
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                <h3 className="font-display text-lg font-semibold text-foreground">Folkeskole-ranking</h3>
              </div>
              <p className="text-sm text-muted mt-2 leading-relaxed">
                Se alle 98 kommuner rangeret på trivsel, karakter og undervisningseffekt.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm text-primary font-semibold">
                Åbn værktøj <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>

            <Link
              to="/kommune-intelligens/sammenlign"
              className="group flex flex-col justify-between p-6 rounded-2xl border border-border hover:border-primary/50 bg-bg-card hover:bg-primary/5 transition-colors min-h-[160px]"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-display text-lg font-semibold text-foreground">Side om side</h3>
              </div>
              <p className="text-sm text-muted mt-2 leading-relaxed">
                Pin 2-3 kommuner og se deres kvalitetsmål i kolonner.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm text-primary font-semibold">
                Sammenlign <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Browse direct */}
      <section className="border-b border-border/70 bg-[var(--color-border)]/20">
        <div className="max-w-5xl mx-auto px-4 py-14 sm:py-20">
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground tracking-tight mb-3">
            Browse direkte
          </h2>
          <p className="text-muted text-base leading-relaxed mb-8 max-w-2xl">
            Hele landet opdelt efter kategori eller kommune. Klik for at se alle institutioner.
          </p>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted/70 mb-3">Kategori</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {CATEGORY_CHIPS.map((c) => (
                <Link
                  key={c.href}
                  to={c.href}
                  className="inline-flex items-center px-4 py-2 rounded-full border border-border bg-bg text-sm font-medium text-foreground hover:border-primary/60 hover:bg-primary/5 transition-colors min-h-[40px]"
                >
                  {c.label}
                </Link>
              ))}
            </div>

            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted/70 mb-3">Populære kommuner</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_KOMMUNER.map((k) => (
                <Link
                  key={k}
                  to={`/kommune/${encodeURIComponent(k)}`}
                  className="inline-flex items-center px-4 py-2 rounded-full border border-border bg-bg text-sm font-medium text-foreground hover:border-primary/60 hover:bg-primary/5 transition-colors min-h-[40px]"
                >
                  {k}
                </Link>
              ))}
              <Link
                to="/kommune-intelligens"
                className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold text-primary hover:underline min-h-[40px]"
              >
                Se alle 98 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FAQ */}
      <section className="border-b border-border/70">
        <div className="max-w-3xl mx-auto px-4 py-14 sm:py-20">
          <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground tracking-tight mb-6">
            Ofte stillede spørgsmål
          </h2>
          <FAQAccordion items={FAQ} />
        </div>
      </section>

      {/* Compare bar */}
      <CompareBar />

      {/* Loading / error states — non-blocking: hero handles its own via candidates=[] */}
      {loading && (
        <div className="sr-only" aria-live="polite">Indlæser data…</div>
      )}
      {error && (
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="card p-4 text-sm text-muted">Data kunne ikke indlæses fuldt ud — prøv at genopfriske siden.</div>
        </div>
      )}
      {/* Hidden debug stat — used by legacy SEO signal expectations */}
      <span className="sr-only">{institutionCount.toLocaleString("da-DK")} institutioner</span>
    </>
  );
}
