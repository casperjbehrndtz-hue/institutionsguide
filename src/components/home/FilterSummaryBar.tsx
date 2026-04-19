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
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-3 sm:pt-4 pb-1">
      <p className="text-sm text-muted">
        <span className="tabular-nums font-medium text-foreground">{count.toLocaleString("da-DK")}</span>{" "}
        {t.home.summaryInstitutions}
        {hasGeolocation && radiusKm ? (
          <>
            {" "}
            {t.home.summaryWithin} <span className="tabular-nums font-medium text-foreground">{radiusKm}</span> km
          </>
        ) : null}
        {cheapest ? (
          <>
            {" — "}
            {t.home.summaryCheapest}:{" "}
            <span className="tabular-nums font-medium text-foreground">
              {formatDKK(cheapest)}
              {t.common.perMonth}
            </span>
          </>
        ) : null}
      </p>
    </div>
  );
}
