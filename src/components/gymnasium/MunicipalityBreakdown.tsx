import { Link } from "react-router-dom";
import ScrollReveal from "@/components/shared/ScrollReveal";
import type { UnifiedInstitution } from "@/lib/types";

interface Props {
  municipalityNames: string[];
  gymnasiums: UnifiedInstitution[];
  language: "da" | "en";
}

export default function MunicipalityBreakdown({ municipalityNames, gymnasiums, language }: Props) {
  return (
    <ScrollReveal>
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          {language === "da" ? "Gymnasier pr. kommune" : "Gymnasiums per municipality"}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-3 text-muted font-medium" scope="col">
                  {language === "da" ? "Kommune" : "Municipality"}
                </th>
                <th className="text-right py-3 px-3 text-muted font-medium" scope="col">
                  {language === "da" ? "Antal" : "Count"}
                </th>
              </tr>
            </thead>
            <tbody>
              {municipalityNames
                .map((m) => ({
                  name: m,
                  count: gymnasiums.filter((g) => g.municipality === m).length,
                }))
                .filter((m) => m.count > 0)
                .sort((a, b) => b.count - a.count)
                .slice(0, 30)
                .map((m) => (
                  <tr key={m.name} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                    <td className="py-2 px-3">
                      <Link
                        to={`/kommune/${encodeURIComponent(m.name)}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {m.name}
                      </Link>
                    </td>
                    <td className="py-2 px-3 text-right font-mono">{m.count}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </ScrollReveal>
  );
}
