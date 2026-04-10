import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import ScrollReveal from "@/components/shared/ScrollReveal";
import type { PopularData } from "@/hooks/usePopularData";

export default function PopularSearches({ data, language }: { data: PopularData; language: string }) {
  return (
    <ScrollReveal><section className="max-w-5xl mx-auto px-4 py-10 sm:py-14 border-t border-border/30">
      <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-1 text-center">
        {language === "da" ? "Populære søgninger" : "Popular searches"}
      </h2>
      <p className="text-muted text-sm text-center mb-6">
        {language === "da" ? "Baseret på officielle data" : "Based on official data"}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Best trivsel */}
        <div className="card p-5">
          <h3 className="font-display font-bold text-foreground text-sm mb-3">
            {language === "da" ? "Bedste trivsel" : "Best well-being"}
          </h3>
          <div className="space-y-1.5">
            {data.bestTrivsel.map((item) => (
              <Link
                key={item.id}
                to={`/institution/${item.id}`}
                className="flex justify-between text-sm py-1.5 px-2 -mx-2 rounded-lg hover:bg-primary/5 transition-colors group/row"
              >
                <span className="text-muted truncate mr-2 group-hover/row:text-foreground transition-colors">{item.navn}</span>
                <span className="font-mono font-semibold text-foreground shrink-0">{item.score.toFixed(1).replace(".", ",")}</span>
              </Link>
            ))}
          </div>
          <Link to="/skole" className="text-xs text-primary font-semibold mt-3 flex items-center gap-0.5 hover:underline">
            {language === "da" ? "Se alle skoler" : "See all schools"} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Best grades */}
        <div className="card p-5">
          <h3 className="font-display font-bold text-foreground text-sm mb-3">
            {language === "da" ? "Højeste karaktersnit" : "Highest grade average"}
          </h3>
          <div className="space-y-1.5">
            {data.bestSchools.map((item) => (
              <Link
                key={item.id}
                to={`/institution/${item.id}`}
                className="flex justify-between text-sm py-1.5 px-2 -mx-2 rounded-lg hover:bg-primary/5 transition-colors group/row"
              >
                <span className="text-muted truncate mr-2 group-hover/row:text-foreground transition-colors">{item.navn}</span>
                <span className="font-mono font-semibold text-foreground shrink-0">{item.score.toFixed(1).replace(".", ",")}</span>
              </Link>
            ))}
          </div>
          <Link to="/skole" className="text-xs text-primary font-semibold mt-3 flex items-center gap-0.5 hover:underline">
            {language === "da" ? "Se alle skoler sorteret på karakterer" : "See all schools sorted by grades"} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Find bedste vuggestue */}
        <Link to="/vuggestue" className="card p-5 hover:border-primary/30 transition-all group">
          <h3 className="font-display font-bold text-foreground text-sm mb-1">
            {language === "da" ? "Find den bedste vuggestue" : "Find the best nursery"}
          </h3>
          <p className="text-sm text-muted mb-3 leading-relaxed">
            {language === "da" ? "Se normering, priser og placering for alle vuggestuer i din kommune" : "See staff ratios, prices and location for all nurseries in your municipality"}
          </p>
          <p className="text-xs text-primary font-semibold flex items-center gap-0.5">
            {language === "da" ? "Se vuggestuer" : "See nurseries"} <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </Link>

        {/* Find bedste børnehave */}
        <Link to="/boernehave" className="card p-5 hover:border-primary/30 transition-all group">
          <h3 className="font-display font-bold text-foreground text-sm mb-1">
            {language === "da" ? "Find den bedste børnehave" : "Find the best kindergarten"}
          </h3>
          <p className="text-sm text-muted mb-3 leading-relaxed">
            {language === "da" ? "Se normering, priser og placering for alle børnehaver i din kommune" : "See staff ratios, prices and location for all kindergartens in your municipality"}
          </p>
          <p className="text-xs text-primary font-semibold flex items-center gap-0.5">
            {language === "da" ? "Se børnehaver" : "See kindergartens"} <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </Link>

        {/* Normering link card */}
        <Link to="/normering" className="card p-5 hover:border-primary/30 transition-all group">
          <h3 className="font-display font-bold text-foreground text-sm mb-1">
            {language === "da" ? "Normering i din kommune" : "Staff ratios in your municipality"}
          </h3>
          <p className="text-sm text-muted mb-3 leading-relaxed">
            {language === "da" ? "Sammenlign børn pr. voksen i alle kommuner for dagpleje, vuggestue og børnehave" : "Compare children per adult in all municipalities"}
          </p>
          <p className="text-xs text-primary font-semibold flex items-center gap-0.5">
            {language === "da" ? "Se normering" : "See ratios"} <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </Link>

        {/* Prissammenligning link card */}
        <Link to="/prissammenligning" className="card p-5 hover:border-primary/30 transition-all group">
          <h3 className="font-display font-bold text-foreground text-sm mb-1">
            {language === "da" ? "Prissammenligning" : "Price comparison"}
          </h3>
          <p className="text-sm text-muted mb-3 leading-relaxed">
            {language === "da" ? "Sammenlign takster for vuggestue, børnehave, dagpleje og SFO på tværs af alle 98 kommuner" : "Compare rates across all 98 municipalities"}
          </p>
          <p className="text-xs text-primary font-semibold flex items-center gap-0.5">
            {language === "da" ? "Sammenlign priser" : "Compare prices"} <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </Link>
      </div>
    </section></ScrollReveal>
  );
}
