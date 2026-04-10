import { BarChart3 } from "lucide-react";
import { formatDKK } from "@/lib/format";

interface Props {
  count: number;
  cheapest: number | null;
  hasGeolocation: boolean;
  radiusKm: number | null;
  t: {
    home: { summaryInstitutions: string; summaryWithin: string; summaryCheapest: string };
    common: { perMonth: string };
  };
}

export default function FilterSummaryBar({ count, cheapest, hasGeolocation, radiusKm, t }: Props) {
  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-4 pt-2 sm:pt-3">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-sm">
        <BarChart3 className="w-4 h-4 text-primary shrink-0" />
        <span className="text-foreground font-medium">
          {count.toLocaleString("da-DK")} {t.home.summaryInstitutions}
          {hasGeolocation && radiusKm ? ` ${t.home.summaryWithin} ${radiusKm} km` : ""}
          {cheapest ? ` — ${t.home.summaryCheapest}: ${formatDKK(cheapest)}${t.common.perMonth}` : ""}
        </span>
      </div>
    </div>
  );
}
