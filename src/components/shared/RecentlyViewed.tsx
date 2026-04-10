import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Clock, Baby, Users, Home, GraduationCap, BookOpen, Trophy, School, MapPin, type LucideIcon } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { formatDKK } from "@/lib/format";

const CATEGORY_ICON: Record<string, LucideIcon> = {
  vuggestue: Baby,
  boernehave: Users,
  dagpleje: Home,
  skole: GraduationCap,
  sfo: BookOpen,
  fritidsklub: Trophy,
  efterskole: School,
};

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
    <section className="max-w-4xl mx-auto px-4 py-6">
      <h2 className="font-display text-lg font-bold text-foreground mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted" />
        Senest set
      </h2>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {recentInsts.map((inst) => (
          <Link
            key={inst.id}
            to={`/institution/${inst.id}`}
            className="card p-3 min-w-[200px] max-w-[240px] shrink-0 hover:bg-primary/5 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              {(() => { const Icon = CATEGORY_ICON[inst.category] || MapPin; return <Icon className="w-4 h-4 text-muted shrink-0" />; })()}
              <p className="font-medium text-sm text-foreground truncate">{inst.name}</p>
            </div>
            <p className="text-xs text-muted truncate">{inst.municipality}</p>
            {inst.category === "efterskole" && inst.yearlyPrice ? (
              <p className="text-xs font-mono text-primary mt-1">
                {formatDKK(inst.yearlyPrice)}/år
              </p>
            ) : inst.monthlyRate != null ? (
              <p className="text-xs font-mono text-primary mt-1">
                {formatDKK(inst.monthlyRate)}/md
              </p>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
