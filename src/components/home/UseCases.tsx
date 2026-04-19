import { Link } from "react-router-dom";
import { BarChart3, GraduationCap, Calculator, Users, ArrowRight } from "lucide-react";
import ScrollReveal from "@/components/shared/ScrollReveal";

export default function UseCases({ language, schoolCount }: { language: string; schoolCount: string }) {
  const cards = language === "da" ? [
    { icon: GraduationCap, title: "Vælg den bedste skole", desc: `Trivsel, karakterer, fravær og lærerkompetencer for alle ${schoolCount} skoler`, href: "/skole", cta: "Se skoledata" },
    { icon: Users, title: "Tjek normering", desc: "Se børn pr. voksen i din kommunes vuggestuer og børnehaver", href: "/normering", cta: "Se normering" },
    { icon: BarChart3, title: "Sammenlign priser", desc: "Sammenlign takster for vuggestue, børnehave og dagpleje i din kommune", href: "/prissammenligning", cta: "Se prissammenligning" },
    { icon: Calculator, title: "Beregn fripladstilskud", desc: "Tjek om du har ret til tilskud baseret på din husstandsindkomst", href: "/friplads", cta: "Beregn nu" },
  ] : [
    { icon: GraduationCap, title: "Choose the best school", desc: `Well-being, grades, absence and teacher qualifications for all ${schoolCount} schools`, href: "/skole", cta: "See school data" },
    { icon: Users, title: "Check staff ratios", desc: "See children per adult in your municipality's nurseries and kindergartens", href: "/normering", cta: "See ratios" },
    { icon: BarChart3, title: "Compare prices", desc: "Compare rates for nursery, kindergarten and childminder in your municipality", href: "/prissammenligning", cta: "See price comparison" },
    { icon: Calculator, title: "Calculate subsidy", desc: "Check if you qualify for a childcare subsidy", href: "/friplads", cta: "Calculate now" },
  ];

  return (
    <ScrollReveal>
      <section className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-[11px] uppercase tracking-widest text-accent font-semibold mb-2">
            {language === "da" ? "Værktøjer" : "Tools"}
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
            {language === "da" ? "Sådan bruger forældre Institutionsguiden" : "How parents use Institutionsguiden"}
          </h2>
          <p className="text-muted text-sm sm:text-base max-w-xl mx-auto">
            {language === "da" ? "Fire måder at finde den rette løsning for din familie" : "Four ways to find the right fit for your family"}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {cards.map((card) => (
            <Link
              key={card.href}
              to={card.href}
              className="group rounded-2xl bg-[var(--color-bg-card)] border border-border/60 p-6 hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/8 text-primary border border-primary/15 flex items-center justify-center mb-4">
                <card.icon className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-foreground text-base leading-tight mb-2">{card.title}</h3>
              <p className="text-sm text-muted leading-relaxed mb-5 flex-1">{card.desc}</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                {card.cta}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}
