import { Wallet, Calculator, PiggyBank, ExternalLink } from "lucide-react";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { useLanguage } from "@/contexts/LanguageContext";

export default function HomeToolsSection() {
  const { t, language } = useLanguage();
  const isDa = language === "da";

  const products = [
    {
      name: "NemtBudget",
      tagline: t.suiteProducts.nemtbudget,
      href: "https://nemtbudget.nu",
      icon: Wallet,
      accent: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30",
    },
    {
      name: "ParFinans",
      tagline: t.suiteProducts.parfinans,
      href: "https://parfinans.dk",
      icon: Calculator,
      accent: "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30",
    },
    {
      name: "Børneskat",
      tagline: t.suiteProducts.boerneskat,
      href: "https://xn--brneskat-54a.dk",
      icon: PiggyBank,
      accent: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30",
    },
  ];

  return (
    <ScrollReveal>
      <section className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-[11px] uppercase tracking-widest text-accent font-semibold mb-2">
            {isDa ? "Resten af familieøkonomien" : "The rest of family finance"}
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
            {t.home.moreTools}
          </h2>
          <p className="text-muted text-sm sm:text-base max-w-xl mx-auto">
            {t.home.moreToolsSubtitle}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {products.map((p) => (
            <a
              key={p.name}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl bg-[var(--color-bg-card)] border border-border/60 p-6 hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${p.accent}`}>
                <p.icon className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-1.5 mb-1">
                <p className="font-display font-bold text-foreground text-lg leading-tight group-hover:text-primary transition-colors">
                  {p.name}
                </p>
                <ExternalLink className="w-3.5 h-3.5 text-muted/50 group-hover:text-primary transition-colors" />
              </div>
              <p className="text-sm text-muted leading-relaxed">{p.tagline}</p>
            </a>
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}
