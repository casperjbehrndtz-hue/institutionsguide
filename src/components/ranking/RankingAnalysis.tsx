import { Link } from "react-router-dom";
import { formatDKK } from "@/lib/format";

interface RankedEntry {
  inst: { id: string; name: string };
  score: { overall: number | null };
}

interface Props {
  ranked: RankedEntry[];
  totalInCat: number;
  catPluralDa: string;
  munName: string;
  municipalityAvgPrice: number | null;
  language: string;
}

export default function RankingAnalysis({ ranked, totalInCat, catPluralDa, munName, municipalityAvgPrice, language }: Props) {
  const bestInst = ranked[0];

  return (
    <>
      {/* Dynamic analysis */}
      {language === "da" && (
        <section className="max-w-3xl mx-auto px-4 py-6">
          <h2 className="font-display text-xl font-bold text-foreground mb-3">
            Analyse — {catPluralDa} i {munName}
          </h2>
          <div className="prose prose-sm text-muted leading-relaxed space-y-3">
            <p>
              Vi har vurderet {ranked.length} ud af {totalInCat} {catPluralDa} i {munName} Kommune
              baseret på tilgængelige kvalitetsdata.
              {bestInst.score.overall != null && (
                <> {bestInst.inst.name} scorer højest med {bestInst.score.overall}/100 point.</>
              )}
              {municipalityAvgPrice && (
                <> Gennemsnitsprisen for {catPluralDa} i kommunen er {formatDKK(municipalityAvgPrice)}/md.</>
              )}
            </p>
            {ranked.length >= 3 && (
              <p>
                Top 3 i {munName} er{" "}
                {ranked.slice(0, 3).map((e, idx) => (
                  <span key={e.inst.id}>
                    {idx > 0 && (idx === 2 ? " og " : ", ")}
                    {e.inst.name}{e.score.overall != null ? ` (${e.score.overall}/100)` : ""}
                  </span>
                ))}
                . Scoren tager højde for pris, normering og personalets uddannelsesbaggrund.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Methodology note */}
      <section className="max-w-3xl mx-auto px-4 py-6">
        <div className="card card-static p-4 bg-[var(--color-bg)] dark:bg-[var(--color-bg-card)]">
          <h3 className="font-semibold text-sm mb-2">
            {language === "da" ? "Om kvalitetsvurderingen" : "About the quality rating"}
          </h3>
          <p className="text-xs text-muted">
            {language === "da"
              ? `Kvalitetsscoren er beregnet ud fra tilgængelige data: pris i forhold til kommunegennemsnit, normering (antal børn pr. voksen), personalets uddannelsesniveau og forældretilfredshed (BTU). Scoren er en indikator og bør suppleres med besøg og egne observationer.`
              : `The quality score is calculated from available data: price relative to municipality average, staff ratio, staff education level and parent satisfaction. The score is an indicator and should be supplemented with visits and personal observations.`}
          </p>
          <Link
            to="/metode"
            className="text-xs text-primary hover:underline mt-2 inline-block"
          >
            {language === "da" ? "Læs mere om vores metode" : "Read more about our methodology"}
          </Link>
        </div>
      </section>
    </>
  );
}
