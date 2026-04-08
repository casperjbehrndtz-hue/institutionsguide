import { Link } from "react-router-dom";
import { formatDKK } from "@/lib/format";
import MetricIcon from "@/components/shared/MetricIcon";
import type { UnifiedInstitution } from "@/lib/types";
import type { ScoreResult } from "@/lib/institutionScore";

function scoreBadgeColor(overall: number | null): string {
  if (overall == null) return "bg-border/30 text-muted";
  if (overall >= 65) return "bg-[#E1F5EE] text-[#085041] dark:bg-[#085041]/30 dark:text-[#34D399]";
  if (overall >= 45) return "bg-[#FAEEDA] text-[#633806] dark:bg-[#633806]/30 dark:text-[#FBBF24]";
  return "bg-[#FCEBEB] text-[#791F1F] dark:bg-[#791F1F]/30 dark:text-[#F87171]";
}

function gradeLabel(grade: string | null, lang: "da" | "en"): string {
  if (grade == null) return lang === "da" ? "Ingen data" : "No data";
  const labels: Record<string, { da: string; en: string }> = {
    A: { da: "Fremragende", en: "Excellent" },
    B: { da: "God", en: "Good" },
    C: { da: "Middel", en: "Average" },
    D: { da: "Under middel", en: "Below average" },
    E: { da: "Lav", en: "Low" },
  };
  return labels[grade]?.[lang] ?? grade;
}

const MEDAL_STYLES: Record<number, { bg: string; border: string; icon: string }> = {
  1: { bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-300 dark:border-amber-700", icon: "🥇" },
  2: { bg: "bg-gray-50 dark:bg-gray-800/30", border: "border-gray-300 dark:border-gray-600", icon: "🥈" },
  3: { bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-300 dark:border-orange-700", icon: "🥉" },
};

export default function RankedCard({
  entry,
  rank,
  language,
}: {
  entry: { inst: UnifiedInstitution; score: ScoreResult };
  rank: number;
  language: "da" | "en";
}) {
  const { inst, score } = entry;
  const badgeColor = scoreBadgeColor(score.overall);
  const keyMetrics = score.metrics.slice(0, 3);
  const medal = MEDAL_STYLES[rank];

  return (
    <div className={`card p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${medal ? `${medal.bg} ${medal.border}` : ""}`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
          {medal ? medal.icon : rank}
        </span>
        <div className="min-w-0">
          <Link
            to={`/institution/${inst.id}`}
            className="font-semibold text-primary hover:underline block truncate"
          >
            {inst.name}
          </Link>
          <p className="text-xs text-muted truncate">
            {inst.ownership
              ? `${inst.ownership.charAt(0).toUpperCase()}${inst.ownership.slice(1)}`
              : ""}
            {inst.ownership && inst.address ? " — " : ""}
            {inst.address}
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            {inst.monthlyRate != null && (
              <span className="text-xs text-muted">
                {formatDKK(inst.monthlyRate)}/md.
              </span>
            )}
            {keyMetrics.map((m) => (
              <span key={m.key} className="inline-flex items-center gap-1 text-xs text-muted">
                <MetricIcon name={m.icon} className="w-3 h-3" /> {m.value}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={`text-xs px-2 py-1 rounded ${badgeColor}`}>
          {gradeLabel(score.grade, language)}
        </span>
        <span className="font-mono font-bold text-primary">
          {score.overall != null ? `${score.overall}/100` : "—"}
        </span>
      </div>
    </div>
  );
}
