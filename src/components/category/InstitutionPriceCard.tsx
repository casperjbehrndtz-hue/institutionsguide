import { Link } from "react-router-dom";
import { formatDKK } from "@/lib/format";
import type { UnifiedInstitution } from "@/lib/types";

interface Props {
  inst: UnifiedInstitution;
  minPrice: number | null;
  maxPrice: number | null;
}

export default function InstitutionPriceCard({ inst, minPrice, maxPrice }: Props) {
  const pricePosition = inst.monthlyRate && minPrice && maxPrice && maxPrice > minPrice
    ? ((inst.monthlyRate - minPrice) / (maxPrice - minPrice)) * 100
    : null;

  return (
    <Link
      to={`/institution/${inst.id}`}
      className="text-left card p-4 transition-transform min-h-[44px] block hover:shadow-md"
    >
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-foreground text-sm truncate">{inst.name}</p>
          <p className="text-xs text-muted truncate">{inst.address}, {inst.postalCode} {inst.city}</p>
        </div>
        {inst.quality?.r !== undefined && (
          <span className="shrink-0 text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded">
            {inst.quality.r.toLocaleString("da-DK", { maximumFractionDigits: 1 })}/5
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-2">
        {inst.ownership && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
            {inst.ownership}
          </span>
        )}
        <span className="font-mono text-sm text-primary font-medium ml-auto">
          {inst.category === "efterskole" && inst.yearlyPrice
            ? `${formatDKK(inst.yearlyPrice)}/år`
            : inst.monthlyRate
              ? `${formatDKK(inst.monthlyRate)}/md`
              : "Pris ikke tilgængelig"}
        </span>
      </div>
      {pricePosition !== null && (
        <div className="mt-2.5">
          <div className="flex justify-between text-[10px] text-muted mb-0.5">
            <span>Billigst</span>
            <span>Dyrest</span>
          </div>
          <div className="h-1.5 bg-border/50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.max(5, pricePosition)}%`,
                background: pricePosition < 33 ? "var(--color-success)" : pricePosition < 66 ? "var(--color-warning)" : "var(--color-destructive)",
              }}
            />
          </div>
        </div>
      )}
    </Link>
  );
}
