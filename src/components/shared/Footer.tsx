import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const suiteProducts = [
  { name: "ParFinans", href: "https://parfinans.dk", descKey: "parfinans" as const },
  { name: "NemtBudget", href: "https://nemtbudget.nu", descKey: "nemtbudget" as const },
  { name: "Børneskat", href: "https://børneskat.dk", descKey: "boerneskat" as const },
];

const dataSources = [
  "Dagtilbudsregisteret (STIL)",
  "Institutionsregisteret",
  "Uddannelsesstatistik API",
  "Danmarks Statistik (RES88)",
];

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border/50 mt-auto bg-bg">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-2">
            <span className="font-display font-bold text-lg text-foreground">Institutionsguide</span>
            <p className="text-xs text-muted leading-relaxed">
              {t.home.moreToolsSubtitle}
            </p>
          </div>

          {/* Kategorier */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-widest mb-3">{t.footer.categories}</h4>
            <ul className="space-y-1.5">
              <li><Link to="/vuggestue" className="text-xs text-muted hover:text-primary transition-colors">{t.categories.vuggestue}</Link></li>
              <li><Link to="/boernehave" className="text-xs text-muted hover:text-primary transition-colors">{t.categories.boernehave}</Link></li>
              <li><Link to="/dagpleje" className="text-xs text-muted hover:text-primary transition-colors">{t.categories.dagpleje}</Link></li>
              <li><Link to="/skole" className="text-xs text-muted hover:text-primary transition-colors">{t.categories.skole}</Link></li>
              <li><Link to="/sfo" className="text-xs text-muted hover:text-primary transition-colors">{t.categories.sfo}</Link></li>
              <li><Link to="/sammenlign" className="text-xs text-muted hover:text-primary transition-colors">{t.common.compare}</Link></li>
            </ul>
          </div>

          {/* Suite products */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-widest mb-3">{t.footer.seeAlso}</h4>
            <ul className="space-y-2">
              {suiteProducts.map((p) => (
                <li key={p.name}>
                  <a
                    href={p.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted hover:text-primary transition-colors block"
                  >
                    <span className="font-medium text-foreground">{p.name}</span>
                    <span className="block text-[10px] text-muted">{t.suiteProducts[p.descKey]}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal + Data */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-widest mb-3">{t.footer.legal}</h4>
            <ul className="space-y-1.5 mb-4">
              <li><Link to="/privatliv" className="text-xs text-muted hover:text-primary transition-colors">{t.footer.privacy}</Link></li>
              <li><Link to="/vilkaar" className="text-xs text-muted hover:text-primary transition-colors">{t.footer.terms}</Link></li>
            </ul>
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-widest mb-2">{t.footer.dataSources}</h4>
            <ul className="space-y-1 text-[10px] text-muted">
              {dataSources.map((source) => (
                <li key={source}>{source}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="divider mt-8 mb-6" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted">
            &copy; {new Date().getFullYear()} Institutionsguide &middot; {t.common.partOfFamily}
          </p>
          <p className="text-[10px] text-muted/70 max-w-md text-center md:text-right">
            {t.footer.disclaimer}
          </p>
        </div>
      </div>
    </footer>
  );
}
