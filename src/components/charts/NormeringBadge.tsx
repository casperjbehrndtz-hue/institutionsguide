interface NormeringBadgeProps {
  municipality: string;
  ageGroup: string;
  ratio: number;
  year: number;
  previousRatio?: number;
}

const AGE_GROUP_LABELS: Record<string, string> = {
  dagpleje: "Dagpleje",
  "0-2": "0-2 år",
  "3-5": "3-5 år",
};

function formatRatio(ratio: number): string {
  return ratio.toFixed(1).replace(".", ",");
}

export default function NormeringBadge({
  municipality,
  ageGroup,
  ratio,
  year,
  previousRatio,
}: NormeringBadgeProps) {
  let trendArrow: string | null = null;
  let trendColor = "";

  if (previousRatio !== undefined && previousRatio !== ratio) {
    if (ratio < previousRatio) {
      // Lower ratio = fewer children per adult = better
      trendArrow = "\u2193";
      trendColor = "text-green-600 dark:text-green-400";
    } else {
      trendArrow = "\u2191";
      trendColor = "text-red-600 dark:text-red-400";
    }
  }

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 inline-flex items-center gap-2 text-sm">
      <span className="font-medium text-foreground">
        Normering{ageGroup ? ` (${AGE_GROUP_LABELS[ageGroup] ?? ageGroup})` : ""}:
      </span>
      <span className="font-semibold text-foreground">
        {formatRatio(ratio)} børn/voksen
      </span>
      <span className="text-muted">({year})</span>
      {trendArrow && (
        <span className={`font-bold ${trendColor}`} title={`Tidligere: ${formatRatio(previousRatio!)}`}>
          {trendArrow}
        </span>
      )}
    </div>
  );
}
