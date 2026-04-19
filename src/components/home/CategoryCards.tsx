import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
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
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
      <div className="mb-12 sm:mb-16 max-w-2xl">
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground tracking-tight mb-3">
          {language === "da" ? "Hvad leder I efter?" : "What are you looking for?"}
        </h2>
        <p className="text-muted text-base sm:text-lg leading-relaxed">
          {language === "da"
            ? "Hvert område har sine egne kvalitetsmål. Vi samler dem ét sted så I kan sammenligne på tværs af landet."
            : "Each area has its own quality metrics. We bring them together so you can compare nationwide."}
        </p>
      </div>

      {/* Featured: large prominent cards — no colored tiles, no hover-lift */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-border/70">
        {featured.map((card, idx) => {
          const stats = categoryStats[card.category];
          const count = stats?.count ?? 0;
          const hero =
            card.category === "efterskole" && stats?.minYearlyPrice != null
              ? { value: formatDKK(stats.minYearlyPrice), label: language === "da" ? "pr. år fra" : "per year from" }
              : stats?.avgKaraktersnit != null
                ? { value: stats.avgKaraktersnit.toLocaleString("da-DK", { minimumFractionDigits: 1, maximumFractionDigits: 1 }), label: language === "da" ? "gns. karaktersnit" : "avg. grade" }
                : { value: count.toLocaleString("da-DK"), label: language === "da" ? "institutioner" : "institutions" };
          return (
            <Link
              key={card.category}
              to={card.href}
              className="group relative flex flex-col justify-between py-8 sm:py-10 sm:px-6 lg:px-8 border-b border-border/70 sm:border-r last:sm:border-r-0 lg:border-b-0 hover:bg-[var(--color-border)]/20 transition-colors min-h-[280px]"
              aria-label={`${showLabel} ${card.label}`}
            >
              <div>
                <p className="font-mono text-[11px] text-muted/60 tracking-widest mb-6">
                  {String(idx + 1).padStart(2, "0")}
                </p>
                <h3 className="font-display text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3">
                  {card.label}
                </h3>
                <p className="text-sm text-muted leading-relaxed mb-8">{card.desc}</p>
              </div>

              <div>
                <p className="font-display text-[2.5rem] sm:text-[3rem] font-semibold text-foreground leading-none tracking-tight tabular-nums mb-1">
                  {hero.value}
                </p>
                <p className="text-xs text-muted mb-6">{hero.label}</p>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-accent font-medium">{card.cta}</span>
                  <ArrowUpRight className="w-4 h-4 text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Secondary categories — quiet inline row */}
      <div className="mt-10 pt-8 border-t border-border/70 flex flex-wrap items-baseline gap-x-2 gap-y-3 text-sm">
        <span className="text-[11px] uppercase tracking-widest text-muted/60 font-semibold mr-3">
          {language === "da" ? "Også:" : "Also:"}
        </span>
        {other.map((card, i) => {
          const stats = categoryStats[card.category];
          const count = stats?.count ?? 0;
          return (
            <span key={card.category} className="flex items-baseline gap-2">
              <Link
                to={card.href}
                className="text-foreground hover:text-accent transition-colors underline-offset-4 hover:underline font-medium"
                aria-label={`${showLabel} ${card.label}`}
              >
                {card.label}
              </Link>
              {count > 0 && (
                <span className="text-muted tabular-nums text-[13px]">
                  ({count.toLocaleString("da-DK")})
                </span>
              )}
              {i < other.length - 1 && <span aria-hidden="true" className="text-muted/30 ml-1">·</span>}
            </span>
          );
        })}
      </div>
    </section>
  );
}
