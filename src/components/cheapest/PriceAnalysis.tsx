import { formatDKK } from "@/lib/format";

interface PriceAnalysisProps {
  munName: string;
  catLabel: string;
  catSingular: string;
  sorted: { monthlyRate: number | null }[];
  totalInCat: number;
  cheapestPrice: number;
  munAvg: number | null;
  nationalAvg: number | null;
  medianPrice: number | null;
  savings: number | null;
  ownershipBreakdown: Record<string, number>;
}

export default function PriceAnalysis({
  munName,
  catLabel,
  catSingular,
  sorted,
  totalInCat,
  cheapestPrice,
  munAvg,
  nationalAvg,
  medianPrice,
  savings,
  ownershipBreakdown,
}: PriceAnalysisProps) {
  return (
    <section className="max-w-3xl mx-auto px-4 py-6">
      <h2 className="font-display text-xl font-bold text-foreground mb-3">
        Prisanalyse — {catLabel} i {munName}
      </h2>
      <div className="prose prose-sm text-muted leading-relaxed space-y-3">
        <p>
          I {munName} Kommune er der {sorted.length} {catLabel.toLowerCase()} med
          offentlige prisoplysninger ud af {totalInCat} i alt. Den billigste{" "}
          {catSingular} koster {formatDKK(cheapestPrice)}/md
          {sorted.length > 1 && (
            <>, mens den dyreste koster {formatDKK(sorted[sorted.length - 1].monthlyRate)}/md</>
          )}
          .{" "}
          {munAvg && nationalAvg && (
            <>
              Gennemsnitsprisen i {munName} er {formatDKK(munAvg)}/md, hvilket er{" "}
              {munAvg < nationalAvg
                ? `${formatDKK(nationalAvg - munAvg)} under landsgennemsnittet på ${formatDKK(nationalAvg)}/md.`
                : munAvg > nationalAvg
                ? `${formatDKK(munAvg - nationalAvg)} over landsgennemsnittet på ${formatDKK(nationalAvg)}/md.`
                : `lig med landsgennemsnittet.`}
            </>
          )}
        </p>
        {medianPrice && (
          <p>
            Medianprisen er {formatDKK(medianPrice)}/md
            {munAvg && medianPrice !== munAvg && (
              <>
                , {medianPrice < munAvg
                  ? "lavere end gennemsnittet — de dyreste trækker snittet op"
                  : "højere end gennemsnittet — de billigste trækker snittet ned"}
              </>
            )}
            .{" "}
            {savings !== null && savings > 0 && (
              <>
                Prisspændet er {formatDKK(savings)}/md, svarende til{" "}
                {formatDKK(savings * 12)} årligt i forskel mellem billigste og dyreste.
              </>
            )}
          </p>
        )}
        {Object.keys(ownershipBreakdown).length > 1 && (
          <p>
            Fordelt på ejerskab:{" "}
            {Object.entries(ownershipBreakdown)
              .map(([ow, count]) => `${count} ${ow}`)
              .join(", ")}
            .
          </p>
        )}
      </div>
    </section>
  );
}
