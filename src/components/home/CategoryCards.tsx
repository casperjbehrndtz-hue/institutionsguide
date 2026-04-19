import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { formatDKK } from "@/lib/format";
import type { LucideIcon } from "lucide-react";

interface FeaturedCard {
  category: string;
  label: string;
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
  href: string;
  desc: string;
  cta: string;
  metric: string;
}

interface OtherCard {
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
  avgKaraktersnit: number | null;
  avgTrivsel: number | null;
  municipalityCount: number;
}

interface CategoryCardsProps {
  featured: FeaturedCard[];
  other: OtherCard[];
  categoryStats: Record<string, CategoryStats>;
  language: string;
  showLabel: string;
}

export default function CategoryCards({ featured, other, categoryStats, language, showLabel }: CategoryCardsProps) {
  return (
    <section className="max-w-6xl mx-auto px-4 -mt-6 sm:-mt-10 relative z-20 mb-12">
      {/* Featured: large prominent cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-3">
        {featured.map((card) => {
          const stats = categoryStats[card.category];
          const count = stats?.count ?? 0;
          const hero =
            card.category === "efterskole" && stats?.minYearlyPrice != null
              ? { value: `${formatDKK(stats.minYearlyPrice)}`, label: language === "da" ? "pr. år fra" : "per year from" }
              : stats?.avgKaraktersnit != null
                ? { value: stats.avgKaraktersnit.toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 1 }), label: language === "da" ? "gns. karaktersnit" : "avg. grade" }
                : { value: count.toLocaleString("da-DK"), label: language === "da" ? "institutioner" : "institutions" };
          return (
            <Link
              key={card.category}
              to={card.href}
              className="group relative rounded-2xl bg-[var(--color-bg-card)] border border-border/60 shadow-sm hover:shadow-xl hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col"
              aria-label={`${showLabel} ${card.label}`}
            >
              <div className={`h-1 ${card.bgColor}`} />

              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-start gap-3 mb-5">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${card.bgColor}`}>
                    <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-foreground text-lg leading-tight">{card.label}</h3>
                    <p className="text-xs text-muted mt-0.5 leading-relaxed">{card.desc}</p>
                  </div>
                </div>

                {/* Hero stat */}
                <div className="mb-5">
                  <p className="font-display font-bold text-foreground text-3xl sm:text-[2rem] leading-none tracking-tight tabular-nums">
                    {hero.value}
                  </p>
                  <p className="text-[11px] text-muted uppercase tracking-widest mt-1.5 font-semibold">
                    {hero.label}
                  </p>
                </div>

                {/* Metric tag (trust signal) */}
                <p className="text-xs text-muted leading-relaxed mb-5 flex-1">{card.metric}</p>

                <div className="flex items-center gap-1.5 text-sm font-semibold text-primary mt-auto">
                  {card.cta}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Secondary categories — compact row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {other.map((card) => {
          const stats = categoryStats[card.category];
          const count = stats?.count ?? 0;
          return (
            <Link
              key={card.category}
              to={card.href}
              className="group flex items-center gap-3 rounded-xl bg-[var(--color-bg-card)] border border-border/50 px-3.5 py-3 hover:border-primary/40 hover:shadow-md transition-all duration-200"
              aria-label={`${showLabel} ${card.label}`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${card.bgColor}`}>
                <card.icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground text-sm leading-tight truncate">{card.label}</p>
                {count > 0 && (
                  <p className="text-[11px] text-muted tabular-nums mt-0.5">
                    {count.toLocaleString("da-DK")} {language === "da" ? "steder" : "places"}
                  </p>
                )}
              </div>
              <ArrowRight className="w-4 h-4 text-muted/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
