import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDKK } from "@/lib/format";
import type { UnifiedInstitution } from "@/lib/types";

interface Props {
  inst: UnifiedInstitution;
  minPrice: number | null;
  maxPrice: number | null;
}

export default function InstitutionPriceCard({ inst, minPrice, maxPrice }: Props) {
  const { language } = useLanguage();
  const isDa = language === "da";
  const pricePosition = inst.monthlyRate && minPrice && maxPrice && maxPrice > minPrice
    ? ((inst.monthlyRate - minPrice) / (maxPrice - minPrice)) * 100
    : null;

  const q = inst.quality;
  const hasQuality = q && (q.ts != null || q.k != null || q.fp != null || q.r != null);

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
        {q?.r !== undefined && (
          <span className="shrink-0 text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-1 rounded">
            {q.r.toLocaleString("da-DK", { maximumFractionDigits: 1 })}/5
          </span>
        )}
      </div>
      {/* Quality metrics — shown before price */}
      {hasQuality && (
        <div className="flex items-center gap-2 mt-2 text-[11px] text-muted overflow-x-auto no-scrollbar">
          {q.ts != null && (
            <span className="shrink-0">{isDa ? "Trivsel" : "Well-being"} <strong className="text-foreground font-mono">{q.ts.toFixed(1).replace(".", ",")}</strong></span>
          )}
          {q.k != null && (
            <span className="shrink-0">{isDa ? "Karakter" : "Grades"} <strong className="text-foreground font-mono">{q.k.toFixed(1).replace(".", ",")}</strong></span>
          )}
          {q.fp != null && (
            <span className="shrink-0">{isDa ? "Fravær" : "Absence"} <strong className="text-foreground font-mono">{q.fp.toFixed(1).replace(".", ",")}%</strong></span>
          )}
          {q.kp != null && (
            <span className="shrink-0">{isDa ? "Komp." : "Comp."} <strong className="text-foreground font-mono">{q.kp.toFixed(0)}%</strong></span>
          )}
        </div>
      )}
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
              : isDa ? "Pris ikke tilgængelig" : "Price not available"}
        </span>
      </div>
      {pricePosition !== null && (
        <div className="mt-2.5">
          <div className="flex justify-between text-[10px] text-muted mb-0.5">
            <span>{isDa ? "Billigst" : "Cheapest"}</span>
            <span>{isDa ? "Dyrest" : "Most expensive"}</span>
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
