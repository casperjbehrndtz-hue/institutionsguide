import { Database, ShieldCheck, BarChart3 } from "lucide-react";
import { dataVersions } from "@/lib/dataVersions";

interface DataSourceBadgesProps {
  category: string;
  hasQuality?: boolean;
  hasNormering?: boolean;
  hasPrice?: boolean;
}

export default function DataSourceBadges({ category, hasQuality, hasNormering, hasPrice }: DataSourceBadgesProps) {
  const isSchool = category === "skole" || category === "efterskole";

  const badges: { icon: typeof Database; label: string; source: string }[] = [];

  if (hasPrice) {
    badges.push({
      icon: Database,
      label: "Pris verificeret",
      source: `Danmarks Statistik (${dataVersions.prices.year})`,
    });
  }

  if (isSchool && hasQuality) {
    badges.push({
      icon: BarChart3,
      label: "Kvalitetsdata",
      source: `Undervisningsministeriet (${dataVersions.schoolQuality.schoolYear})`,
    });
  }

  if (!isSchool && hasNormering) {
    badges.push({
      icon: ShieldCheck,
      label: "Normeringsdata",
      source: "BUVM",
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <span
          key={badge.label}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted"
          title={badge.source}
        >
          <badge.icon className="w-3 h-3 text-primary" />
          <span>{badge.label}</span>
          <span className="text-muted/60">·</span>
          <span className="text-muted/80">{badge.source}</span>
        </span>
      ))}
    </div>
  );
}
