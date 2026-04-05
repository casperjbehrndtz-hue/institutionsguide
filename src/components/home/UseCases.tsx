import { Link } from "react-router-dom";
import ScrollReveal from "@/components/shared/ScrollReveal";

export default function UseCases({ language, schoolCount }: { language: string; schoolCount: string }) {
  return (
    <ScrollReveal><section className="max-w-4xl mx-auto px-4 py-8 sm:py-10">
      <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-5 text-center">
        {language === "da" ? "Sådan bruger forældre Institutionsguide" : "How parents use Institutionsguide"}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Link to="/prissammenligning" className="card p-5 hover:bg-primary/5 transition-colors group">
          <h3 className="font-semibold text-foreground text-sm mb-1">{language === "da" ? "Sammenlign priser" : "Compare prices"}</h3>
          <p className="text-xs text-muted mb-3">{language === "da" ? "Find den billigste vuggestue eller børnehave i din kommune" : "Find the cheapest nursery or kindergarten in your municipality"}</p>
          <span className="text-[11px] text-primary font-medium">{language === "da" ? "Prøv prissammenligning" : "Try price comparison"} →</span>
        </Link>
        <Link to="/skole" className="card p-5 hover:bg-primary/5 transition-colors group">
          <h3 className="font-semibold text-foreground text-sm mb-1">{language === "da" ? "Se kvalitetsdata for skoler" : "See school quality data"}</h3>
          <p className="text-xs text-muted mb-3">{language === "da" ? `Trivsel, karakterer, fravær og normering for alle ${schoolCount} skoler` : `Well-being, grades, absence and ratios for all ${schoolCount} schools`}</p>
          <span className="text-[11px] text-primary font-medium">{language === "da" ? "Se skoledata" : "See school data"} →</span>
        </Link>
        <Link to="/friplads" className="card p-5 hover:bg-primary/5 transition-colors group">
          <h3 className="font-semibold text-foreground text-sm mb-1">{language === "da" ? "Beregn fripladstilskud" : "Calculate subsidy"}</h3>
          <p className="text-xs text-muted mb-3">{language === "da" ? "Tjek om du har ret til tilskud baseret på din husstandsindkomst" : "Check if you qualify for a subsidy based on household income"}</p>
          <span className="text-[11px] text-primary font-medium">{language === "da" ? "Beregn nu" : "Calculate now"} →</span>
        </Link>
      </div>
    </section></ScrollReveal>
  );
}
