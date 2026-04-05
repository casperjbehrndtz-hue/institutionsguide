import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import ScrollReveal from "@/components/shared/ScrollReveal";

interface PopularData {
  bestTrivsel: { id: string; navn: string; score: number }[];
  bestSchools: { id: string; navn: string; score: number }[];
}

export default function PopularSearches({ data, language }: { data: PopularData; language: string }) {
  return (
    <ScrollReveal><section className="max-w-4xl mx-auto px-4 py-8 sm:py-10">
      <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-1 text-center">
        {language === "da" ? "Populære søgninger" : "Popular searches"}
      </h2>
      <p className="text-muted text-sm text-center mb-5">
        {language === "da" ? "Baseret på officielle data" : "Based on official data"}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="card p-4 sm:p-5">
          <h3 className="font-semibold text-foreground text-sm mb-3">{language === "da" ? "Bedste trivsel" : "Best well-being"}</h3>
          <div className="space-y-1">
            {data.bestTrivsel.map((item) => (
              <Link
                key={item.id}
                to={`/institution/${item.id}`}
                className="flex justify-between text-xs py-1 px-1.5 -mx-1.5 rounded hover:bg-primary/5 transition-colors group/row"
              >
                <span className="text-muted truncate mr-2 group-hover/row:text-foreground transition-colors">{item.navn}</span>
                <span className="font-mono font-medium text-foreground shrink-0">{item.score.toFixed(1).replace(".", ",")}</span>
              </Link>
            ))}
          </div>
          <Link to="/skole" className="text-[11px] text-primary font-medium mt-3 flex items-center gap-0.5 hover:underline">
            {language === "da" ? "Se alle skoler" : "See all schools"} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="card p-4 sm:p-5">
          <h3 className="font-semibold text-foreground text-sm mb-3">{language === "da" ? "Højeste karaktersnit" : "Highest grade average"}</h3>
          <div className="space-y-1">
            {data.bestSchools.map((item) => (
              <Link
                key={item.id}
                to={`/institution/${item.id}`}
                className="flex justify-between text-xs py-1 px-1.5 -mx-1.5 rounded hover:bg-primary/5 transition-colors group/row"
              >
                <span className="text-muted truncate mr-2 group-hover/row:text-foreground transition-colors">{item.navn}</span>
                <span className="font-mono font-medium text-foreground shrink-0">{item.score.toFixed(1).replace(".", ",")}</span>
              </Link>
            ))}
          </div>
          <Link to="/skole?sort=grades" className="text-[11px] text-primary font-medium mt-3 flex items-center gap-0.5 hover:underline">
            {language === "da" ? "Se alle skoler sorteret på karakterer" : "See all schools sorted by grades"} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <Link to="/normering" className="card p-4 sm:p-5 hover:border-primary/30 transition-all group">
          <h3 className="font-semibold text-foreground text-sm mb-1">{language === "da" ? "Børn pr. voksen" : "Children per adult"}</h3>
          <p className="text-xs text-muted mb-3">{language === "da" ? "Sammenlign normering i alle kommuner" : "Compare staff ratios in all municipalities"}</p>
          <p className="text-[11px] text-primary font-medium flex items-center gap-0.5">
            {language === "da" ? "Se normering" : "See ratios"} <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </Link>

        <Link to="/prissammenligning" className="card p-4 sm:p-5 hover:border-primary/30 transition-all group">
          <h3 className="font-semibold text-foreground text-sm mb-1">{language === "da" ? "Prissammenligning" : "Price comparison"}</h3>
          <p className="text-xs text-muted mb-3">{language === "da" ? "Sammenlign takster på tværs af alle 98 kommuner" : "Compare rates across all 98 municipalities"}</p>
          <p className="text-[11px] text-primary font-medium flex items-center gap-0.5">
            {language === "da" ? "Sammenlign priser" : "Compare prices"} <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </Link>
      </div>
    </section></ScrollReveal>
  );
}
