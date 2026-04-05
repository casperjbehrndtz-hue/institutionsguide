import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { formatDKK } from "@/lib/format";
import type { LucideIcon } from "lucide-react";

interface CategoryCard {
  category: string;
  label: string;
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
  href: string;
  desc: string;
  cta: string;
}

interface CategoryStats {
  count: number;
  minPrice: number | null;
  minYearlyPrice: number | null;
}

interface CategoryCardsProps {
  featured: CategoryCard[];
  other: CategoryCard[];
  categoryStats: Record<string, CategoryStats>;
  language: string;
  showLabel: string;
  perMonth: string;
}

export default function CategoryCards({ featured, other, categoryStats, language, showLabel, perMonth }: CategoryCardsProps) {
  return (
    <section className="max-w-5xl mx-auto px-3 sm:px-4 -mt-5 relative z-20 mb-6">
      {/* Featured: wide cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-2 sm:mb-3">
        {featured.map((card) => {
          const stats = categoryStats[card.category];
          const count = stats?.count ?? 0;
          return (
            <Link
              key={card.category}
              to={card.href}
              className="group rounded-xl bg-[var(--color-bg-card)] border-2 border-primary/20 shadow-sm px-4 py-4 sm:px-5 sm:py-5 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all"
              aria-label={`${showLabel} ${card.label}`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${card.bgColor}`}>
                  <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground text-base leading-tight">{card.label}</p>
                  <p className="text-xs text-muted leading-tight">{card.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div className="flex items-center gap-3 text-xs text-muted">
                {count > 0 && (
                  <span>{count.toLocaleString("da-DK")} {language === "da" ? "steder" : "places"}</span>
                )}
                {card.category === "skole" && (
                  <span className="text-muted">{language === "da" ? "Trivsel · Karakterer · Fravær" : "Well-being · Grades · Absence"}</span>
                )}
                {card.category === "efterskole" && stats?.minYearlyPrice && (
                  <span className="font-mono text-foreground font-medium">{language === "da" ? "fra" : "from"} {formatDKK(stats.minYearlyPrice)}{language === "da" ? "/år" : "/year"}</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
      {/* Other categories — compact row */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
        {other.map((card) => {
          const stats = categoryStats[card.category];
          const count = stats?.count ?? 0;
          const minPrice = stats?.minPrice;
          return (
            <Link
              key={card.category}
              to={card.href}
              className="group rounded-xl bg-[var(--color-bg-card)] border border-border/50 shadow-sm px-3 py-3 sm:px-4 sm:py-4 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all w-[calc(50%-4px)] sm:w-[calc(20%-8px)]"
              aria-label={`${showLabel} ${card.label}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${card.bgColor}`}>
                  <card.icon className={`w-4 h-4 ${card.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm leading-tight">{card.label}</p>
                  <p className="text-[10px] text-muted leading-tight">{card.desc}</p>
                </div>
              </div>
              <div className="text-xs text-muted space-y-0.5">
                {count > 0 && (
                  <p>{count.toLocaleString("da-DK")} {language === "da" ? "steder" : "places"}</p>
                )}
                {minPrice ? (
                  <p className="font-mono text-foreground font-medium">{language === "da" ? "fra" : "from"} {formatDKK(minPrice)}{perMonth}</p>
                ) : null}
              </div>
              <p className="text-[11px] text-primary font-medium mt-2 flex items-center gap-0.5">
                {card.cta} <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
