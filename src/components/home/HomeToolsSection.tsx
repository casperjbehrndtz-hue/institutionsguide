import { Wallet, Calculator, PiggyBank } from "lucide-react";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { useLanguage } from "@/contexts/LanguageContext";

export default function HomeToolsSection() {
  const { t } = useLanguage();

  return (
    <ScrollReveal><section className="max-w-5xl mx-auto px-4 py-8 sm:py-10 border-t border-border/30">
      <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-1 text-center">
        {t.home.moreTools}
      </h2>
      <p className="text-muted text-sm text-center mb-5">
        {t.home.moreToolsSubtitle}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a
          href="https://nemtbudget.nu"
          target="_blank"
          rel="noopener noreferrer"
          className="card p-5 transition-transform group"
        >
          <Wallet className="w-8 h-8 text-blue-500 mb-3" />
          <p className="font-semibold text-foreground group-hover:text-primary transition-colors">NemtBudget</p>
          <p className="text-sm text-muted mt-1">{t.suiteProducts.nemtbudget}</p>
        </a>
        <a
          href="https://parfinans.dk"
          target="_blank"
          rel="noopener noreferrer"
          className="card p-5 transition-transform group"
        >
          <Calculator className="w-8 h-8 text-amber-600 mb-3" />
          <p className="font-semibold text-foreground group-hover:text-primary transition-colors">ParFinans</p>
          <p className="text-sm text-muted mt-1">{t.suiteProducts.parfinans}</p>
        </a>
        <a
          href="https://xn--brneskat-54a.dk"
          target="_blank"
          rel="noopener noreferrer"
          className="card p-5 transition-transform group"
        >
          <PiggyBank className="w-8 h-8 text-success mb-3" />
          <p className="font-semibold text-foreground group-hover:text-primary transition-colors">Børneskat</p>
          <p className="text-sm text-muted mt-1">{t.suiteProducts.boerneskat}</p>
        </a>
      </div>
    </section></ScrollReveal>
  );
}
