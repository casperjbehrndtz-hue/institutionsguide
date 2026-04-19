import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { formatDKK } from "@/lib/format";

export default function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const { institutions } = useData();
  const { recentIds } = useRecentlyViewed();

  const recentInsts = useMemo(() => {
    return recentIds
      .filter((id) => id !== excludeId)
      .map((id) => institutions.find((i) => i.id === id))
      .filter(Boolean)
      .slice(0, 5) as typeof institutions;
  }, [recentIds, institutions, excludeId]);

  if (recentInsts.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12 border-t border-border/70">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted/60 mb-5">
        Senest set
      </p>
      <div className="flex gap-0 overflow-x-auto scrollbar-hide -mx-4 sm:-mx-6 px-4 sm:px-6 divide-x divide-border/70">
        {recentInsts.map((inst) => (
          <Link
            key={inst.id}
            to={`/institution/${inst.id}`}
            className="min-w-[220px] max-w-[260px] shrink-0 pl-5 first:pl-0 pr-5 py-1 hover:text-accent transition-colors group"
          >
            <p className="font-display text-[15px] font-medium text-foreground leading-tight truncate group-hover:text-accent transition-colors">
              {inst.name}
            </p>
            <p className="text-xs text-muted mt-1 truncate">{inst.municipality}</p>
            {inst.category === "efterskole" && inst.yearlyPrice ? (
              <p className="text-xs font-mono text-muted mt-1 tabular-nums">
                {formatDKK(inst.yearlyPrice)}/år
              </p>
            ) : inst.monthlyRate != null ? (
              <p className="text-xs font-mono text-muted mt-1 tabular-nums">
                {formatDKK(inst.monthlyRate)}/md
              </p>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
