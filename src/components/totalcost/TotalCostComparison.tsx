import { TrendingDown, TrendingUp } from "lucide-react";
import { formatDKK, formatNumber } from "@/lib/format";
import { TOTAL_MONTHS } from "@/lib/totalCostCalculator";
import type { MunicipalTotal } from "@/lib/totalCostCalculator";

interface TotalCostComparisonProps {
  allTotals: MunicipalTotal[];
  municipality: string;
  setMunicipality: (v: string) => void;
  income: number;
  isDa: boolean;
}

export default function TotalCostComparison({ allTotals, municipality, setMunicipality, income, isDa }: TotalCostComparisonProps) {
  const cheapest = allTotals[0];
  const mostExpensive = allTotals[allTotals.length - 1];

  return (
    <>
      {/* Cheapest vs most expensive */}
      <section className="card p-6 sm:p-8 space-y-5">
        <h2 className="font-display text-xl font-semibold text-foreground">
          {isDa ? "Billigste vs. dyreste kommune" : "Cheapest vs. most expensive municipality"}
        </h2>

        <div className="grid sm:grid-cols-2 gap-4">
          {cheapest && (
            <div className="bg-success/5 border border-success/20 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-success" />
                <p className="text-sm font-medium text-success">
                  {isDa ? "Billigste" : "Cheapest"}
                </p>
              </div>
              <p className="font-display text-lg font-bold text-foreground">{cheapest.municipality}</p>
              <p className="font-mono text-2xl font-bold text-success">{formatDKK(cheapest.grandTotal)}</p>
              <p className="text-xs text-muted">
                {isDa ? "Samlet over" : "Total over"} {TOTAL_MONTHS / 12} {isDa ? "år" : "years"}
              </p>
            </div>
          )}

          {mostExpensive && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-red-500" />
                <p className="text-sm font-medium text-red-500">
                  {isDa ? "Dyreste" : "Most expensive"}
                </p>
              </div>
              <p className="font-display text-lg font-bold text-foreground">{mostExpensive.municipality}</p>
              <p className="font-mono text-2xl font-bold text-red-500">{formatDKK(mostExpensive.grandTotal)}</p>
              <p className="text-xs text-muted">
                {isDa ? "Samlet over" : "Total over"} {TOTAL_MONTHS / 12} {isDa ? "år" : "years"}
              </p>
            </div>
          )}
        </div>

        {cheapest && mostExpensive && (
          <p className="text-sm text-center text-muted">
            {isDa
              ? `Forskel: ${formatDKK(mostExpensive.grandTotal - cheapest.grandTotal)} over ${TOTAL_MONTHS / 12} år (${formatDKK(Math.round((mostExpensive.grandTotal - cheapest.grandTotal) / TOTAL_MONTHS))}/md.)`
              : `Difference: ${formatDKK(mostExpensive.grandTotal - cheapest.grandTotal)} over ${TOTAL_MONTHS / 12} years (${formatDKK(Math.round((mostExpensive.grandTotal - cheapest.grandTotal) / TOTAL_MONTHS))}/mo.)`}
          </p>
        )}
      </section>

      {/* All municipalities table */}
      <section className="card p-6 sm:p-8 space-y-5">
        <h2 className="font-display text-xl font-semibold text-foreground">
          {isDa ? "Alle kommuner rangeret efter samlet pris" : "All municipalities ranked by total cost"}
        </h2>
        <p className="text-sm text-muted">
          {isDa
            ? `Samlet pris for vuggestue + børnehave + SFO (${TOTAL_MONTHS / 12} år) ved husstandsindkomst ${formatNumber(income)} kr.`
            : `Total cost for nursery + kindergarten + after-school care (${TOTAL_MONTHS / 12} years) at household income ${formatNumber(income)} DKK`}
        </p>

        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="text-left py-2 px-2 text-xs text-muted font-medium">#</th>
                <th scope="col" className="text-left py-2 px-2 text-xs text-muted font-medium">{isDa ? "Kommune" : "Municipality"}</th>
                <th scope="col" className="text-right py-2 px-2 text-xs text-muted font-medium">{isDa ? "Samlet pris" : "Total cost"}</th>
                <th scope="col" className="text-right py-2 px-2 text-xs text-muted font-medium hidden sm:table-cell">{isDa ? "Pr. md." : "Per mo."}</th>
              </tr>
            </thead>
            <tbody>
              {allTotals.map((t, idx) => {
                const isSelected = t.municipality === municipality;
                return (
                  <tr
                    key={t.municipality}
                    className={`border-b border-border/50 cursor-pointer transition-colors hover:bg-bg-muted/50 ${isSelected ? "bg-primary/5 font-semibold" : ""}`}
                    onClick={() => setMunicipality(t.municipality)}
                  >
                    <td className="py-2 px-2 text-muted tabular-nums">{idx + 1}</td>
                    <td className={`py-2 px-2 ${isSelected ? "text-primary" : "text-foreground"}`}>
                      {t.municipality}
                      {isSelected && <span className="ml-1 text-xs text-primary">&larr;</span>}
                    </td>
                    <td className="py-2 px-2 text-right font-mono tabular-nums">{formatDKK(t.grandTotal)}</td>
                    <td className="py-2 px-2 text-right font-mono tabular-nums text-muted hidden sm:table-cell">
                      {formatDKK(Math.round(t.grandTotal / TOTAL_MONTHS))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
