import { Link } from "react-router-dom";
import { ArrowRight, Calculator, GitCompareArrows, Sparkles } from "lucide-react";
import { toSlug } from "@/lib/slugs";

interface Props {
  category: string;
  municipality: string;
  similarCount: number;
}

/**
 * Sticky "next step" footer that appears below the fold on the institution
 * detail page. Three contextual links: similar in kommune, kommune ranking,
 * friplads beregner. Hidden on mobile when very narrow to avoid covering
 * action bar — re-appears as a floating row.
 */
export default function NextStepBar({ category, municipality, similarCount }: Props) {
  const isDaycare = category === "vuggestue" || category === "boernehave" || category === "dagpleje";
  const isSchool = category === "skole";

  return (
    <div className="border-t border-border/70 bg-bg-card mt-6">
      <div className="max-w-[1020px] mx-auto px-4 py-4 sm:py-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted/70 mb-3">Næste skridt</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          <Link
            to={`/${category}/${toSlug(municipality)}`}
            className="group flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-bg hover:border-primary/40 hover:bg-primary/5 transition-colors"
          >
            <GitCompareArrows className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">
                Sammenlign med {similarCount > 0 ? similarCount : "andre"} i {municipality}
              </p>
              <p className="text-[11px] text-muted truncate">Side-om-side på pris og kvalitet</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <Link
            to={`/kommune-intelligens/${toSlug(municipality)}`}
            className="group flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-bg hover:border-primary/40 hover:bg-primary/5 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">
                Se {municipality} på kvalitetsindekset
              </p>
              <p className="text-[11px] text-muted truncate">{isSchool ? "Trivsel, karakter, undervisningseffekt" : "Normering, stabilitet, tilfredshed"}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          {isDaycare ? (
            <Link
              to="/friplads"
              className="group flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-bg hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <Calculator className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">Beregn pris med friplads</p>
                <p className="text-[11px] text-muted truncate">Se hvad det koster efter tilskud</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ) : (
            <Link
              to="/kommune-intelligens/sammenlign"
              className="group flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-bg hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <GitCompareArrows className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">Sammenlign kommuner side om side</p>
                <p className="text-[11px] text-muted truncate">Pin op til 3 kommuner</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
