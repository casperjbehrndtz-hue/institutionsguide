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
    <section className="max-w-5xl mx-auto px-4 -mt-4 sm:-mt-8 relative z-20 mb-10">
      {/* Featured: large prominent cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
        {featured.map((card) => {
          const stats = categoryStats[card.category];
          const count = stats?.count ?? 0;
          return (
            <Link
              key={card.category}
              to={card.href}
              className="group relative rounded-2xl bg-[var(--color-bg-card)] border border-border/60 shadow-sm hover:shadow-lg hover:border-primary/40 transition-all duration-200 overflow-hidden"
              aria-label={`${showLabel} ${card.label}`}
            >
              {/* Top accent bar */}
              <div className={`h-1 ${card.bgColor}`} />

              <div className="p-5 sm:p-6">
                {/* Icon + title */}
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${card.bgColor}`}>
                    <card.icon className={`w-5.5 h-5.5 ${card.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-foreground text-lg leading-tight">{card.label}</h3>
                    <p className="text-xs text-muted mt-0.5">{card.desc}</p>
                  </div>
                </div>

                {/* Stats — quality first */}
                <div className="space-y-2 mb-4">
                  {count > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">{language === "da" ? "Antal" : "Count"}</span>
                      <span className="font-mono font-semibold text-foreground">{count.toLocaleString("da-DK")}</span>
                    </div>
                  )}
                  {stats?.avgKaraktersnit != null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">{language === "da" ? "Gns. karaktersnit" : "Avg. grade"}</span>
                      <span className="font-mono font-semibold text-foreground">{stats.avgKaraktersnit.toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                    </div>
                  )}
                  {stats?.avgTrivsel != null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">{language === "da" ? "Gns. trivsel" : "Avg. well-being"}</span>
                      <span className="font-mono font-semibold text-foreground">{stats.avgTrivsel.toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                    </div>
                  )}
                  {stats?.municipalityCount > 0 && !stats?.avgKaraktersnit && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">{language === "da" ? "Kommuner" : "Municipalities"}</span>
                      <span className="font-mono font-semibold text-foreground">{stats.municipalityCount}</span>
                    </div>
                  )}
                  {card.category === "efterskole" && stats?.minYearlyPrice != null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">{language === "da" ? "Fra" : "From"}</span>
                      <span className="font-mono font-semibold text-foreground">{formatDKK(stats.minYearlyPrice)}{language === "da" ? "/år" : "/year"}</span>
                    </div>
                  )}
                </div>

                {/* Metric tag */}
                <p className="text-xs text-muted mb-4 leading-relaxed">{card.metric}</p>

                {/* CTA */}
                <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                  {card.cta}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Secondary categories — horizontal row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {other.map((card) => {
          const stats = categoryStats[card.category];
          const count = stats?.count ?? 0;
          const minYearlyPrice = stats?.minYearlyPrice;
          return (
            <Link
              key={card.category}
              to={card.href}
              className="group rounded-xl bg-[var(--color-bg-card)] border border-border/40 px-3.5 py-3.5 hover:shadow-md hover:border-primary/30 transition-all duration-200"
              aria-label={`${showLabel} ${card.label}`}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${card.bgColor}`}>
                  <card.icon className={`w-4 h-4 ${card.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm leading-tight">{card.label}</p>
                  <p className="text-[10px] text-muted leading-tight">{card.desc}</p>
                </div>
              </div>
              <div className="text-xs text-muted space-y-0.5">
                {count > 0 && <p>{count.toLocaleString("da-DK")} {language === "da" ? "steder" : "places"}</p>}
                {stats?.avgKaraktersnit != null && (
                  <p className="font-mono text-foreground font-medium">
                    {language === "da" ? "snit" : "avg."} {stats.avgKaraktersnit.toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </p>
                )}
                {card.category === "efterskole" && minYearlyPrice != null && (
                  <p className="font-mono text-foreground font-medium">{language === "da" ? "fra" : "from"} {formatDKK(minYearlyPrice)}{language === "da" ? "/år" : "/year"}</p>
                )}
              </div>
              <p className="text-[11px] text-primary font-medium mt-2.5 flex items-center gap-0.5">
                {card.cta} <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
