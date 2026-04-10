import { Link } from "react-router-dom";
import { BarChart3, GraduationCap, Calculator, Users } from "lucide-react";
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
    <ScrollReveal><section className="max-w-5xl mx-auto px-4 py-10 sm:py-14 border-t border-border/30">
      <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-6 text-center">
        {language === "da" ? "Sådan bruger forældre Institutionsguiden" : "How parents use Institutionsguiden"}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((card) => (
          <Link key={card.href} to={card.href} className="card p-5 hover:border-primary/30 hover:shadow-md transition-all group">
            <card.icon className="w-6 h-6 text-primary mb-3" />
            <h3 className="font-display font-bold text-foreground text-sm mb-1.5">{card.title}</h3>
            <p className="text-xs text-muted mb-3 leading-relaxed">{card.desc}</p>
            <span className="text-xs text-primary font-semibold">{card.cta} →</span>
          </Link>
        ))}
      </div>
    </section></ScrollReveal>
  );
}
