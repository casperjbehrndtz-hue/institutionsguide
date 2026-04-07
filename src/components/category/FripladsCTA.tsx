import { Link } from "react-router-dom";
import { Calculator, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  category: string;
}

const DAYCARE_CATEGORIES = new Set(["vuggestue", "boernehave", "dagpleje", "sfo", "fritidsklub"]);

export default function FripladsCTA({ category }: Props) {
  const { language } = useLanguage();

  if (!DAYCARE_CATEGORIES.has(category)) return null;

  return (
    <section className="max-w-5xl mx-auto px-4 pt-8">
      <Link
        to="/friplads"
        className="flex items-center gap-3 p-4 rounded-xl bg-accent/10 border border-accent/20 hover:bg-accent/15 transition-colors group"
      >
        <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
          <Calculator className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">
            {language === "da" ? "Beregn dit fripladstilskud" : "Calculate your subsidy"}
          </p>
          <p className="text-xs text-muted">
            {language === "da"
              ? "Se hvor meget du kan spare på børnepasning baseret på din indkomst"
              : "See how much you can save on childcare based on your income"}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-accent shrink-0 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </section>
  );
}
