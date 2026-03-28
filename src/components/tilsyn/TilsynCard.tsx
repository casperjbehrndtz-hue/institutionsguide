import { ExternalLink } from "lucide-react";
import TilsynBadge from "./TilsynBadge";

type Rating = "godkendt" | "godkendt_bemærkninger" | "skærpet" | null;

export interface TilsynReport {
  date: string;
  type: string;
  rating: Rating;
  summary: string;
  reportUrl?: string;
  strengths?: string[];
  improvements?: string[];
}

interface Props {
  report: TilsynReport;
}

/** Format a date string as "12. mar 2025" */
function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("da-DK", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/** Danish labels for report type */
function typeLabel(type: string): { da: string; en: string } {
  if (type === "uanmeldt") return { da: "Uanmeldt tilsyn", en: "Unannounced inspection" };
  return { da: "Anmeldt tilsyn", en: "Announced inspection" };
}

export default function TilsynCard({ report }: Props) {
  const tl = typeLabel(report.type);

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <TilsynBadge rating={report.rating} />
            <span
              className="text-xs text-muted"
              title={tl.en}
            >
              {tl.da}
            </span>
          </div>
          <p className="text-sm text-muted">
            {formatDate(report.date)}
          </p>
        </div>
        {report.reportUrl && (
          <a
            href={report.reportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
            title="Open original report / Åbn original rapport"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Se rapport</span>
          </a>
        )}
      </div>

      {/* Summary */}
      {report.summary && (
        <p className="text-sm leading-relaxed">{report.summary}</p>
      )}

      {/* Strengths */}
      {report.strengths && report.strengths.length > 0 && (
        <div>
          <h4
            className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1"
            title="Strengths"
          >
            Styrker
          </h4>
          <ul className="list-disc list-inside text-sm space-y-0.5 text-muted">
            {report.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Areas for improvement */}
      {report.improvements && report.improvements.length > 0 && (
        <div>
          <h4
            className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1"
            title="Areas for improvement"
          >
            Udviklingsområder
          </h4>
          <ul className="list-disc list-inside text-sm space-y-0.5 text-muted">
            {report.improvements.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
