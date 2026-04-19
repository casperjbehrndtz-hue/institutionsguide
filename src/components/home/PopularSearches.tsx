import { Link } from "react-router-dom";
import { ArrowRight, Trophy, Sparkles } from "lucide-react";
import ScrollReveal from "@/components/shared/ScrollReveal";
import type { PopularData } from "@/hooks/usePopularData";

export default function PopularSearches({ data, language }: { data: PopularData; language: string }) {
  const lists = [
    {
      icon: Sparkles,
      title: language === "da" ? "Bedste trivsel" : "Best well-being",
      subtitle: language === "da" ? "Top 5 skoler på trivselsmåling" : "Top 5 schools by well-being",
      items: data.bestTrivsel,
      href: "/skole",
      ctaLabel: language === "da" ? "Se alle skoler på trivsel" : "See all schools by well-being",
    },
    {
      icon: Trophy,
      title: language === "da" ? "Højeste karaktersnit" : "Highest grade average",
      subtitle: language === "da" ? "Top 5 skoler på 9. klasses karakterer" : "Top 5 schools by 9th grade marks",
      items: data.bestSchools,
      href: "/skole",
      ctaLabel: language === "da" ? "Se alle skoler på karakterer" : "See all schools by grades",
    },
  ];

  return (
    <ScrollReveal>
      <section className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-[11px] uppercase tracking-widest text-accent font-semibold mb-2">
            {language === "da" ? "Data du ikke finder andre steder" : "Data you won't find elsewhere"}
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
            {language === "da" ? "Topplaceringer lige nu" : "Top rankings right now"}
          </h2>
          <p className="text-muted text-sm sm:text-base max-w-xl mx-auto">
            {language === "da" ? "Baseret på officielle data fra Undervisningsministeriet" : "Based on official data from the Ministry of Education"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {lists.map(({ icon: Icon, title, subtitle, items, href, ctaLabel }) => (
            <div key={title} className="rounded-2xl bg-[var(--color-bg-card)] border border-border/60 shadow-sm p-6 flex flex-col">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-foreground text-lg leading-tight">{title}</h3>
                  <p className="text-xs text-muted mt-0.5">{subtitle}</p>
                </div>
              </div>

              <ol className="space-y-0.5 mb-4 flex-1">
                {items.map((item, i) => (
                  <li key={item.id}>
                    <Link
                      to={`/institution/${item.id}`}
                      className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-primary/5 transition-colors group/row"
                    >
                      <span className="font-mono text-[11px] text-muted/60 w-4 shrink-0">{i + 1}</span>
                      <span className="text-sm text-foreground truncate flex-1 group-hover/row:text-primary transition-colors">
                        {item.navn}
                      </span>
                      <span className="font-mono text-sm font-semibold text-foreground tabular-nums shrink-0">
                        {item.score.toFixed(1).replace(".", ",")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>

              <Link
                to={href}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline underline-offset-4"
              >
                {ctaLabel}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}
