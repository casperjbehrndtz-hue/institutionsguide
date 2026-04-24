interface TierInfo {
  label: string;
  shortLabel: string;
  color: string;
  description: string;
}

const TIERS: { threshold: number; tier: TierInfo }[] = [
  { threshold: 90, tier: { label: "Top 10% i Danmark",   shortLabel: "Top 10%",    color: "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border-emerald-600/30", description: "Blandt de 10% bedste institutioner nationalt" } },
  { threshold: 75, tier: { label: "Top 25% i Danmark",   shortLabel: "Top 25%",    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", description: "Blandt de 25% bedste institutioner nationalt" } },
  { threshold: 55, tier: { label: "Over middel",         shortLabel: "Over middel", color: "bg-primary/10 text-primary border-primary/30",                                description: "Ligger over landsmedianen" } },
  { threshold: 45, tier: { label: "Middel",              shortLabel: "Middel",     color: "bg-border text-foreground/70 border-border",                                  description: "Ligger tæt på landsmedianen" } },
  { threshold: 25, tier: { label: "Under middel",        shortLabel: "Under middel", color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",   description: "Ligger under landsmedianen" } },
  { threshold: 0,  tier: { label: "Bund 25% i Danmark",  shortLabel: "Bund 25%",   color: "bg-red-600/10 text-red-700 dark:text-red-400 border-red-600/30",            description: "Blandt de 25% laveste i landet" } },
];

export function percentileToTier(percentile: number): TierInfo {
  for (const { threshold, tier } of TIERS) {
    if (percentile >= threshold) return tier;
  }
  return TIERS[TIERS.length - 1].tier;
}

interface Props {
  percentile: number | null;
  variant?: "pill" | "compact";
  showTooltip?: boolean;
}

/**
 * Descriptive quality tier based on national percentile. Uses plain Danish
 * language (Top 10%, Over middel, …) rather than letter grades — institutions
 * have not been "graded"; this is their rank against peers.
 */
export default function GradeBadge({ percentile, variant = "pill", showTooltip = true }: Props) {
  if (percentile == null || !Number.isFinite(percentile)) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border border-border bg-muted/10 text-muted"
        title={showTooltip ? "Ikke nok data til ranking" : undefined}
      >
        Ikke rangeret
      </span>
    );
  }
  const t = percentileToTier(percentile);
  const padding = variant === "compact" ? "px-1.5 py-0.5" : "px-2.5 py-1";
  const text = variant === "compact" ? t.shortLabel : t.label;
  return (
    <span
      className={`inline-flex items-center text-[11px] font-semibold uppercase tracking-wide rounded-full border ${padding} ${t.color}`}
      title={showTooltip ? `${t.description} (percentil ${percentile.toFixed(0)}/100)` : undefined}
    >
      {text}
    </span>
  );
}
