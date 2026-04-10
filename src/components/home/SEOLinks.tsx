import { Link } from "react-router-dom";
import { toSlug } from "@/lib/slugs";

export default function SEOLinks({ language }: { language: string }) {
  const links = [
    { label: language === "da" ? "Bedste vuggestuer i København" : "Best nurseries in Copenhagen", to: `/bedste-vuggestue/${toSlug("København")}` },
    { label: language === "da" ? "Bedste børnehaver i Aarhus" : "Best kindergartens in Aarhus", to: `/bedste-boernehave/${toSlug("Aarhus")}` },
    { label: language === "da" ? "Bedste skoler i København" : "Best schools in Copenhagen", to: `/bedste-skole/${toSlug("København")}` },
    { label: language === "da" ? "Bedste skoler i Aarhus" : "Best schools in Aarhus", to: `/bedste-skole/${toSlug("Aarhus")}` },
    { label: language === "da" ? "Bedste skoler i Odense" : "Best schools in Odense", to: `/bedste-skole/${toSlug("Odense")}` },
    { label: language === "da" ? "Normering i hele Danmark" : "Staff ratios in Denmark", to: "/normering" },
    { label: language === "da" ? "Beregn samlet udgift 0-14 år" : "Calculate total cost 0-14 years", to: "/samlet-pris" },
    { label: language === "da" ? "Vuggestue vs dagpleje" : "Nursery vs childminder", to: `/sammenlign/vuggestue-vs-dagpleje/${toSlug("København")}` },
  ];

  return (
    <section className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-wrap gap-2 justify-center">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="card px-4 py-2 text-sm text-primary hover:bg-primary/5 transition-colors min-h-[44px] flex items-center"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
