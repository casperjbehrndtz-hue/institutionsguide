import { Link } from "react-router-dom";
import type { UnifiedInstitution } from "@/lib/types";
import { qualityBadge } from "@/lib/badges";

function formatPct(v: number | undefined): string {
  if (v === undefined) return "–";
  return `${v.toLocaleString("da-DK", { maximumFractionDigits: 1 })}%`;
}

function formatNum(v: number | undefined): string {
  if (v === undefined) return "–";
  return v.toLocaleString("da-DK", { maximumFractionDigits: 1 });
}

export default function SchoolRow({
  school,
  rank,
  nationalAverages,
}: {
  school: UnifiedInstitution;
  rank: number;
  nationalAverages: { trivsel: number; karakterer: number; fravaer: number };
}) {
  const q = school.quality;
  const badge = qualityBadge(q?.r);

  const colorClass = (val: number | undefined, natAvg: number, lowerBetter = false) => {
    if (val === undefined) return "text-muted";
    const diff = lowerBetter ? natAvg - val : val - natAvg;
    if (diff > 0.3) return "text-green-600";
    if (diff < -0.3) return "text-red-500";
    return "text-foreground";
  };

  return (
    <tr className={`border-b hover:bg-primary/5 transition-colors ${rank === 1 ? "bg-green-50 dark:bg-green-950/20" : ""}`}>
      <td className="py-3 pr-2 font-mono text-muted text-xs">{rank}</td>
      <td className="py-3 pr-4">
        <Link
          to={`/institution/${school.id}`}
          className="font-medium text-primary hover:underline"
        >
          {school.name}
        </Link>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted capitalize">{school.subtype}</span>
          {badge && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${badge.color}`}>
              {badge.label}
            </span>
          )}
        </div>
      </td>
      <td className="py-3 pr-2 font-mono text-center font-semibold">
        <div className="flex items-center justify-center gap-1.5">
          <div className="hidden sm:block w-10 h-1.5 bg-border/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/60 rounded-full"
              style={{ width: `${(q?.r ?? 0) / 5 * 100}%` }}
            />
          </div>
          {formatNum(q?.r)}
        </div>
      </td>
      <td className={`py-3 pr-2 font-mono text-center ${colorClass(q?.ts, nationalAverages.trivsel)}`}>
        {formatNum(q?.ts)}
      </td>
      <td className={`py-3 pr-2 font-mono text-center ${colorClass(q?.k, nationalAverages.karakterer)}`}>
        {formatNum(q?.k)}
      </td>
      <td className={`py-3 pr-2 font-mono text-center ${colorClass(q?.fp, nationalAverages.fravaer, true)}`}>
        {formatPct(q?.fp)}
      </td>
      <td className="py-3 font-mono text-center">
        {formatPct(q?.kp)}
      </td>
    </tr>
  );
}
