import { Link } from "react-router-dom";
import { toSlug } from "@/lib/slugs";

export default function SEOLinks({ language }: { language: string }) {
  const links = [
    { label: language === "da" ? "Bedste vuggestuer i København" : "Best nurseries in Copenhagen", to: `/bedste-vuggestue/${toSlug("København")}` },
    { label: language === "da" ? "Bedste børnehaver i Aarhus" : "Best kindergartens in Aarhus", to: `/bedste-boernehave/${toSlug("Aarhus")}` },
    { label: language === "da" ? "Bedste skoler i København" : "Best schools in Copenhagen", to: `/bedste-skole/${toSlug("København")}` },
    { label: language === "da" ? "Bedste skoler i Aarhus" : "Best schools in Aarhus", to: `/bedste-skole/${toSlug("Aarhus")}` },
    { label: language === "da" ? "Bedste skoler i Odense" : "Best schools in Odense", to: `/bedste-skole/${toSlug("Odense")}` },
    { label: language === "da" ? "Find den rette efterskole" : "Find the right boarding school", to: "/efterskole" },
    { label: language === "da" ? "Normering i hele Danmark" : "Staff ratios in Denmark", to: "/normering" },
    { label: language === "da" ? "Beregn samlet udgift 0-14 år" : "Calculate total cost 0-14 years", to: "/samlet-pris" },
    { label: language === "da" ? "Vuggestue vs dagpleje" : "Nursery vs childminder", to: `/sammenlign/vuggestue-vs-dagpleje/${toSlug("København")}` },
  ];

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 border-t border-border/70">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted/60 mb-5">
        {language === "da" ? "Populære sider" : "Popular pages"}
      </p>
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="text-foreground hover:text-accent transition-colors underline-offset-4 hover:underline"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
