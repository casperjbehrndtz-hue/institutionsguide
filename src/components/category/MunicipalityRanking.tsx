import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useData } from "@/contexts/DataContext";
import { formatDKK } from "@/lib/format";
import ScrollReveal from "@/components/shared/ScrollReveal";

interface Props {
  category: string;
  categoryTitle: string;
}

export default function MunicipalityRanking({ category, categoryTitle }: Props) {
  const { municipalities } = useData();
  const { t, language } = useLanguage();
  const [showAll, setShowAll] = useState(false);

  const catMunicipalities = useMemo(() => {
    return municipalities
      .map((m) => {
        const rateKey = category === "skole" || category === "efterskole" ? null : category;
        return {
          ...m,
          catRate: rateKey ? m.rates[rateKey as keyof typeof m.rates] : null,
          catCount:
            category === "vuggestue" ? m.vuggestueCount :
            category === "boernehave" ? m.boernehaveCount :
            category === "dagpleje" ? m.dagplejeCount :
            category === "skole" ? m.folkeskoleCount + m.friskoleCount :
            category === "fritidsklub" ? m.fritidsklubCount :
            category === "efterskole" ? m.efterskoleCount :
            m.sfoCount,
        };
      })
      .filter((m) => m.catCount > 0)
      .sort((a, b) => (a.catRate ?? Infinity) - (b.catRate ?? Infinity));
  }, [municipalities, category]);

  const showRate = !["skole", "efterskole"].includes(category);

  return (
    <ScrollReveal><section className="max-w-5xl mx-auto px-4 py-12">
      <h2 className="font-display text-2xl font-bold text-foreground mb-6">
        {language === "da" ? "Kommuner" : "Municipalities"} — {categoryTitle.split(" ")[0]}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-3 text-muted font-medium" scope="col">{t.sort.municipality}</th>
              {showRate && (
                <th className="text-right py-3 px-3 text-muted font-medium" scope="col">
                  {language === "da" ? "Takst/md." : "Rate/mo."}
                </th>
              )}
              <th className="text-right py-3 px-3 text-muted font-medium" scope="col">
                {language === "da" ? "Antal" : "Count"}
              </th>
            </tr>
          </thead>
          <tbody>
            {(showAll ? catMunicipalities : catMunicipalities.slice(0, 30)).map((m) => (
              <tr key={m.municipality} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                <td className="py-2 px-3">
                  <Link to={`/kommune/${encodeURIComponent(m.municipality)}`} className="text-primary hover:underline font-medium">
                    {m.municipality}
                  </Link>
                </td>
                {showRate && (
                  <td className="py-2 px-3 text-right font-mono">{formatDKK(m.catRate)}</td>
                )}
                <td className="py-2 px-3 text-right font-mono">{m.catCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!showAll && catMunicipalities.length > 30 && (
        <div className="text-center mt-4">
          <button
            onClick={() => setShowAll(true)}
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary-light transition-colors min-h-[44px]"
          >
            {language === "da" ? `Vis alle ${catMunicipalities.length} kommuner` : `Show all ${catMunicipalities.length} municipalities`}
          </button>
        </div>
      )}
    </section></ScrollReveal>
  );
}
