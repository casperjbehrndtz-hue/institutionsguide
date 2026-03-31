import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, MapPin } from "lucide-react";
import type { ScoredInstitution } from "@/lib/preferenceScore";

interface Props {
  result: ScoredInstitution;
  rank: number;
  language: "da" | "en";
}

function scoreColor(score: number): string {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 55) return "bg-amber-500";
  if (score >= 35) return "bg-orange-500";
  return "bg-red-400";
}

function rankBadge(rank: number): string | null {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

function dimPillColor(score: number): string {
  if (score >= 70) return "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (score >= 40) return "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300";
}

export default function MatchCard({ result, rank, language }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { institution: inst, matchPct, dimensions, distanceKm } = result;
  const badge = rankBadge(rank);

  return (
    <div className={`rounded-xl border bg-bg-card shadow-sm transition-all hover:shadow-md ${rank <= 3 ? "border-primary/20" : "border-border"}`}>
      <div className="flex items-start gap-3 p-3 sm:p-4">
        {/* Rank + score */}
        <div className="shrink-0 flex flex-col items-center gap-0.5 w-12">
          <span className="text-lg">{badge ?? `#${rank}`}</span>
          <div className={`text-xs font-bold text-white px-2 py-0.5 rounded-full ${scoreColor(matchPct)}`}>
            {matchPct}%
          </div>
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <Link
            to={`/institution/${inst.id}`}
            className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
          >
            {inst.name}
          </Link>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted">
            <span>{inst.city}, {inst.municipality}</span>
            {distanceKm != null && (
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="w-3 h-3" />
                {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1).replace(".", ",")} km`}
              </span>
            )}
            {inst.subtype && inst.subtype !== "folkeskole" && (
              <span className="text-primary/70 font-medium">{inst.subtype}</span>
            )}
          </div>

          {/* Top dimension highlights */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {dimensions.slice(0, 4).map((d) => (
              <span
                key={d.key}
                className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium ${dimPillColor(d.normalizedScore)}`}
              >
                {d.icon} {d.formattedValue}
              </span>
            ))}
          </div>
        </div>

        {/* Expand button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 p-1.5 rounded-lg hover:bg-muted/10 text-muted transition-colors"
          aria-label={expanded ? "Skjul detaljer" : "Vis hvorfor"}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded dimension breakdown */}
      {expanded && (
        <div className="border-t border-border/50 px-4 py-3 space-y-2 animate-fade-in">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">
            {language === "da" ? "Detaljeret vurdering" : "Detailed assessment"}
          </p>
          {dimensions.map((d) => (
            <div key={d.key} className="flex items-center gap-2">
              <span className="text-sm w-5 text-center">{d.icon}</span>
              <span className="text-xs text-muted w-28 sm:w-36 truncate">
                {language === "da" ? d.label.da : d.label.en}
              </span>
              <div className="flex-1 h-2 bg-border/30 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    d.normalizedScore >= 70
                      ? "bg-emerald-500"
                      : d.normalizedScore >= 40
                        ? "bg-amber-500"
                        : "bg-red-400"
                  }`}
                  style={{ width: `${d.normalizedScore}%` }}
                />
              </div>
              <span className="text-xs font-mono text-foreground w-16 text-right shrink-0">
                {d.formattedValue}
              </span>
            </div>
          ))}
          <Link
            to={`/institution/${inst.id}`}
            className="inline-block text-xs text-primary hover:underline mt-1"
          >
            {language === "da" ? "Se fuld profil →" : "View full profile →"}
          </Link>
        </div>
      )}
    </div>
  );
}
