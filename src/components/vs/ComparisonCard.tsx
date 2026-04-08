import { Link } from "react-router-dom";
import { formatDKK } from "@/lib/format";
import type { CategorySlug } from "@/lib/slugs";
import type { UnifiedInstitution } from "@/lib/types";

export interface CategoryStats {
  count: number;
  withPrice: number;
  avgPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  cheapest: UnifiedInstitution | null;
  ownerships: Record<string, number>;
}

export function ComparisonCard({
  label,
  stats,
  cat,
  munName,
  munSlug,
}: {
  label: string;
  stats: CategoryStats;
  cat: CategorySlug;
  munName: string;
  munSlug: string;
}) {
  return (
    <div className="card p-5">
      <h3 className="font-display text-lg font-bold text-foreground mb-3">
        {label}
      </h3>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Antal</dt>
          <dd className="font-mono font-semibold">{stats.count}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Gennemsnitspris</dt>
          <dd className="font-mono font-semibold">
            {stats.avgPrice ? formatDKK(stats.avgPrice) + "/md" : "–"}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Billigste</dt>
          <dd className="font-mono text-green-600">
            {stats.minPrice ? formatDKK(stats.minPrice) + "/md" : "–"}
          </dd>
        </div>
        {stats.cheapest && (
          <div className="flex justify-between">
            <dt className="text-muted text-xs">Billigste institution</dt>
            <dd className="text-xs text-primary truncate max-w-[150px]">
              {stats.cheapest.name}
            </dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-muted">Dyreste</dt>
          <dd className="font-mono text-red-500">
            {stats.maxPrice ? formatDKK(stats.maxPrice) + "/md" : "–"}
          </dd>
        </div>
        {Object.keys(stats.ownerships).length > 0 && (
          <div className="pt-2 border-t">
            <dt className="text-muted mb-1">Ejerskab</dt>
            <dd className="flex flex-wrap gap-1">
              {Object.entries(stats.ownerships).map(([ow, count]) => (
                <span
                  key={ow}
                  className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded capitalize"
                >
                  {ow}: {count}
                </span>
              ))}
            </dd>
          </div>
        )}
      </dl>
      <Link
        to={`/${cat}/${munSlug}`}
        className="block mt-4 text-center text-sm text-primary hover:underline"
      >
        Se alle {label.toLowerCase()} i {munName}
      </Link>
    </div>
  );
}
