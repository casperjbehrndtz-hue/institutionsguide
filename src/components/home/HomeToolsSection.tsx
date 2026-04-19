import { ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function HomeToolsSection() {
  const { t, language } = useLanguage();
  const isDa = language === "da";

  const products = [
    {
      name: "NemtBudget",
      tagline: t.suiteProducts.nemtbudget,
      href: "https://nemtbudget.nu",
      domain: "nemtbudget.nu",
    },
    {
      name: "ParFinans",
      tagline: t.suiteProducts.parfinans,
      href: "https://parfinans.dk",
      domain: "parfinans.dk",
    },
    {
      name: "Børneskat",
      tagline: t.suiteProducts.boerneskat,
      href: "https://xn--brneskat-54a.dk",
      domain: "børneskat.dk",
    },
  ];

  return (
    <section className="bg-[var(--color-border)]/25 border-y border-border/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="mb-12 sm:mb-16 max-w-2xl">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground tracking-tight mb-3">
              {t.home.moreTools}
            </h2>
            <p className="text-muted text-base sm:text-lg leading-relaxed">
              {isDa
                ? "Institutionsguiden er en del af en suite af værktøjer der hjælper danske familier med økonomien."
                : t.home.moreToolsSubtitle}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-l border-border/70">
            {products.map((p) => (
              <a
                key={p.name}
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col justify-between px-6 py-8 lg:px-8 lg:py-10 border-r border-b border-border/70 hover:bg-[var(--color-bg-card)]/60 transition-colors min-h-[200px]"
              >
                <div>
                  <p className="font-mono text-[11px] text-muted/60 tracking-widest mb-6">
                    {p.domain}
                  </p>
                  <h3 className="font-display text-2xl sm:text-3xl font-semibold text-foreground tracking-tight mb-3">
                    {p.name}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed">{p.tagline}</p>
                </div>
                <div className="flex items-center justify-between mt-8">
                  <span className="text-sm text-accent font-medium">
                    {isDa ? "Besøg" : "Visit"} {p.domain}
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </a>
            ))}
          </div>
        </div>
    </section>
  );
}
