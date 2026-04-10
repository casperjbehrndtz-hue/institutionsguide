import { useMemo } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Baby, Users, Home, GraduationCap, BookOpen, Trophy, School, MapPin, type LucideIcon } from "lucide-react";
import { useData } from "@/contexts/DataContext";
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

interface Props {
  municipality: string;
  excludeId?: string;
  category?: string;
}

/**
 * Shows "popular" institutions based on data richness signals:
 * institutions with quality scores, reviews, or low prices bubble up.
 * Not based on actual view counts — uses data completeness as a proxy.
 */
export default function PopularInMunicipality({ municipality, excludeId, category }: Props) {
  const { institutions } = useData();

  const popular = useMemo(() => {
    let pool = institutions.filter(
      (i) => i.municipality === municipality && i.id !== excludeId
    );
    if (category) {
      pool = pool.filter((i) => i.category === category);
    }

    // Score by data richness + quality
    const scored = pool.map((inst) => {
      let score = 0;
      if (inst.monthlyRate != null) score += 1;
      if (inst.quality?.r !== undefined) score += 2;
      if (inst.quality?.r !== undefined && inst.quality.r >= 3.5) score += 1;
      if (inst.imageUrl) score += 0.5;
      return { inst, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 4).map((s) => s.inst);
  }, [institutions, municipality, excludeId, category]);

  if (popular.length === 0) return null;

  return (
    <div className="card p-5">
      <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-accent" />
        Populære i {municipality}
      </h2>
      <div className="space-y-2">
        {popular.map((inst) => (
          <Link
            key={inst.id}
            to={`/institution/${inst.id}`}
            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-primary/5 transition-colors"
          >
            {(() => { const Icon = CATEGORY_ICON[inst.category] || MapPin; return <Icon className="w-5 h-5 text-muted shrink-0" />; })()}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{inst.name}</p>
              <p className="text-xs text-muted">{inst.address}</p>
            </div>
            {inst.category === "efterskole" && inst.yearlyPrice ? (
              <span className="font-mono text-xs font-bold text-primary shrink-0">
                {formatDKK(inst.yearlyPrice)}/år
              </span>
            ) : inst.monthlyRate != null ? (
              <span className="font-mono text-xs font-bold text-primary shrink-0">
                {formatDKK(inst.monthlyRate)}/md
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
