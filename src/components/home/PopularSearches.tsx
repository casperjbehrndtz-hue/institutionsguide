import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import ScrollReveal from "@/components/shared/ScrollReveal";
import type { PopularData } from "@/hooks/usePopularData";

export default function PopularSearches({ data, language }: { data: PopularData; language: string }) {
  const lists = [
    {
      title: language === "da" ? "Bedste trivsel" : "Best well-being",
      subtitle: language === "da" ? "Trivselsmåling, 9. klassetrin" : "Well-being score, 9th grade",
      items: data.bestTrivsel,
      href: "/skole",
      ctaLabel: language === "da" ? "Se alle skoler på trivsel" : "See all schools by well-being",
    },
    {
      title: language === "da" ? "Højeste karaktersnit" : "Highest grade average",
      subtitle: language === "da" ? "Afgangsprøve, 9. klassetrin" : "Exit exams, 9th grade",
      items: data.bestSchools,
      href: "/skole",
      ctaLabel: language === "da" ? "Se alle skoler på karakterer" : "See all schools by grades",
    },
  ];

  return (
    <ScrollReveal>
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="mb-12 sm:mb-16 max-w-2xl">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground tracking-tight mb-3">
            {language === "da" ? "Topplaceringer lige nu" : "Top rankings right now"}
          </h2>
          <p className="text-muted text-base sm:text-lg leading-relaxed">
            {language === "da"
              ? "Baseret på officielle data fra Undervisningsministeriet. Opdateres efter hvert skoleår."
              : "Based on official data from the Ministry of Education. Updated each school year."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 border-t border-border/70">
          {lists.map(({ title, subtitle, items, href, ctaLabel }, idx) => (
            <div
              key={title}
              className={`py-10 md:px-8 lg:px-10 ${idx === 0 ? "border-b md:border-b-0 md:border-r border-border/70" : ""}`}
            >
              <div className="mb-8">
                <p className="font-mono text-[11px] text-muted/60 tracking-widest mb-3">
                  {String(idx + 1).padStart(2, "0")}
                </p>
                <h3 className="font-display text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-1">
                  {title}
                </h3>
                <p className="text-sm text-muted">{subtitle}</p>
              </div>

              <ol className="divide-y divide-border/70 mb-6">
                {items.map((item, i) => (
                  <li key={item.id}>
                    <Link
                      to={`/institution/${item.id}`}
                      className="flex items-center gap-4 py-3 group/row hover:text-accent transition-colors"
                    >
                      <span className="font-mono text-[11px] text-muted/50 w-5 shrink-0 tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-sm text-foreground truncate flex-1 group-hover/row:text-accent transition-colors">
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
                className="inline-flex items-center gap-1.5 text-sm font-medium text-accent underline-offset-4 hover:underline"
              >
                {ctaLabel}
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}
