import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import ScrollReveal from "@/components/shared/ScrollReveal";

export default function UseCases({ language, schoolCount }: { language: string; schoolCount: string }) {
  const cards = language === "da" ? [
    { title: "Vælg den bedste skole", desc: `Trivsel, karakterer, fravær og lærerkompetencer for alle ${schoolCount} skoler`, href: "/skole", cta: "Se skoledata" },
    { title: "Tjek normering", desc: "Se børn pr. voksen i din kommunes vuggestuer og børnehaver", href: "/normering", cta: "Se normering" },
    { title: "Sammenlign priser", desc: "Sammenlign takster for vuggestue, børnehave og dagpleje i din kommune", href: "/prissammenligning", cta: "Se prissammenligning" },
    { title: "Beregn fripladstilskud", desc: "Tjek om du har ret til tilskud baseret på din husstandsindkomst", href: "/friplads", cta: "Beregn nu" },
  ] : [
    { title: "Choose the best school", desc: `Well-being, grades, absence and teacher qualifications for all ${schoolCount} schools`, href: "/skole", cta: "See school data" },
    { title: "Check staff ratios", desc: "See children per adult in your municipality's nurseries and kindergartens", href: "/normering", cta: "See ratios" },
    { title: "Compare prices", desc: "Compare rates for nursery, kindergarten and childminder in your municipality", href: "/prissammenligning", cta: "See price comparison" },
    { title: "Calculate subsidy", desc: "Check if you qualify for a childcare subsidy", href: "/friplads", cta: "Calculate now" },
  ];

  return (
    <ScrollReveal>
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="mb-12 sm:mb-16 max-w-2xl">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground tracking-tight mb-3">
            {language === "da" ? "Sådan bruger forældre siden" : "How parents use the site"}
          </h2>
          <p className="text-muted text-base sm:text-lg leading-relaxed">
            {language === "da"
              ? "Fire arbejdsgange der dækker de fleste beslutninger om dagtilbud og skole."
              : "Four workflows that cover most decisions about childcare and schools."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-border/70">
          {cards.map((card, i) => (
            <Link
              key={card.href}
              to={card.href}
              className="group flex flex-col justify-between py-8 sm:py-10 sm:px-6 lg:px-8 border-b border-border/70 sm:border-r last:sm:border-r-0 lg:border-b-0 hover:bg-[var(--color-border)]/20 transition-colors min-h-[220px]"
            >
              <div>
                <p className="font-mono text-[11px] text-muted/60 tracking-widest mb-6">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="font-display text-xl sm:text-2xl font-semibold text-foreground leading-tight tracking-tight mb-3">
                  {card.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed">{card.desc}</p>
              </div>
              <div className="flex items-center justify-between mt-8">
                <span className="text-sm text-accent font-medium">{card.cta}</span>
                <ArrowUpRight className="w-4 h-4 text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}
