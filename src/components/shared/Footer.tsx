import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFamily } from "@/contexts/FamilyContext";

interface SuiteProduct {
  name: string;
  href: string;
  descKey: "parfinans" | "nemtbudget" | "boerneskat";
}

function useSuiteProducts(): SuiteProduct[] {
  const { profile } = useFamily();

  return useMemo(() => {
    function withParams(base: string, params: Record<string, string | number | boolean | null | undefined>): string {
      const url = new URL(base);
      for (const [key, value] of Object.entries(params)) {
        if (value != null && value !== "") {
          url.searchParams.set(key, String(value));
        }
      }
      return url.toString();
    }

    const familyParams = profile
      ? {
          income: profile.income,
          children: profile.childCount,
          single: profile.singleParent ? "true" : undefined,
        }
      : {};

    const sharedParams = { ...familyParams, source: "institutionsguide" };

    return [
      { name: "ParFinans", href: withParams("https://parfinans.dk", sharedParams), descKey: "parfinans" as const },
      { name: "NemtBudget", href: withParams("https://nemtbudget.nu", sharedParams), descKey: "nemtbudget" as const },
      { name: "Børneskat", href: withParams("https://xn--brneskat-54a.dk", sharedParams), descKey: "boerneskat" as const },
    ];
  }, [profile]);
}

const dataSources = [
  { name: "Dagtilbudsregisteret (STIL)", href: "https://www.stil.dk" },
  { name: "Institutionsregisteret", href: "https://www.uvm.dk" },
  { name: "Uddannelsesstatistik API", href: "https://www.uvm.dk" },
  { name: "Danmarks Statistik (RES88)", href: "https://www.dst.dk" },
];

export default function Footer() {
  const { t } = useLanguage();
  const suiteProducts = useSuiteProducts();

  return (
    <footer className="border-t border-border/50 mt-auto bg-bg">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-6 sm:gap-8">
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
              <li><Link to="/fritidsklub" className="text-xs text-muted hover:text-primary transition-colors">{t.categories.fritidsklub}</Link></li>
              <li><Link to="/efterskole" className="text-xs text-muted hover:text-primary transition-colors">{t.categories.efterskole}</Link></li>
              <li><Link to="/gymnasium" className="text-xs text-muted hover:text-primary transition-colors">{t.categories.gymnasium}</Link></li>
            </ul>
          </div>

          {/* Værktøjer / Tools */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-widest mb-3">{t.footer.tools}</h4>
            <ul className="space-y-1.5">
              <li><Link to="/prissammenligning" className="text-xs text-muted hover:text-primary transition-colors">{t.footer.priceComparison}</Link></li>
              <li><Link to="/bedste-vaerdi" className="text-xs text-muted hover:text-primary transition-colors">{t.footer.bestValue}</Link></li>
              <li><Link to="/friplads" className="text-xs text-muted hover:text-primary transition-colors">{t.footer.subsidyCalc}</Link></li>
              <li><Link to="/normering" className="text-xs text-muted hover:text-primary transition-colors">{t.footer.staffRatio}</Link></li>
              <li><Link to="/sammenlign" className="text-xs text-muted hover:text-primary transition-colors">{t.footer.compareInstitutions}</Link></li>
            </ul>
          </div>

          {/* Information */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-widest mb-3">{t.footer.information}</h4>
            <ul className="space-y-1.5">
              <li><Link to="/metode" className="text-xs text-primary font-medium hover:text-primary/80 transition-colors">{t.footer.methodology}</Link></li>
              <li><Link to="/blog" className="text-xs text-muted hover:text-primary transition-colors">{t.footer.blog}</Link></li>
              <li><Link to="/privatliv" className="text-xs text-muted hover:text-primary transition-colors">{t.footer.privacy}</Link></li>
              <li><Link to="/vilkaar" className="text-xs text-muted hover:text-primary transition-colors">{t.footer.terms}</Link></li>
              <li><Link to="/om" className="text-xs text-muted hover:text-primary transition-colors">{t.footer.about}</Link></li>
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

          {/* Data sources */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-widest mb-3">{t.footer.dataSources}</h4>
            <ul className="space-y-1 text-[10px] text-muted">
              {dataSources.map((source) => (
                <li key={source.name}>
                  <a href={source.href} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                    {source.name}
                  </a>
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-muted/70 mt-2">{t.footer.dataUpdated}</p>
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
