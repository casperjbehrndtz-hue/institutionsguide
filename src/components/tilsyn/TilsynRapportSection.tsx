import { useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TilsynRapport } from "@/lib/types";

interface Props {
  reports: TilsynRapport[];
  institutionName: string;
}

type Verdict = TilsynRapport["overallVerdict"];

const VERDICT_CONFIG: Record<Verdict, {
  bg: string;
  text: string;
  dot: string;
  da: string;
  en: string;
}> = {
  tilfredsstillende: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-800 dark:text-green-300",
    dot: "bg-green-500",
    da: "Tilfredsstillende",
    en: "Satisfactory",
  },
  "delvist tilfredsstillende": {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-800 dark:text-amber-300",
    dot: "bg-amber-500",
    da: "Delvist tilfredsstillende",
    en: "Partly satisfactory",
  },
  "ikke tilfredsstillende": {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-800 dark:text-red-300",
    dot: "bg-red-500",
    da: "Ikke tilfredsstillende",
    en: "Not satisfactory",
  },
};

function VerdictBadge({ verdict, lang = "da" }: { verdict: Verdict; lang?: string }) {
  const c = VERDICT_CONFIG[verdict] ?? VERDICT_CONFIG.tilfredsstillende;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg} ${c.text}`} title={c.en}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {lang === "da" ? c.da : c.en}
    </span>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
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

function RapportCard({ report, lang }: { report: TilsynRapport; lang: string }) {
  const [expanded, setExpanded] = useState(false);
  const isDa = lang === "da";
  const hasDetails = (report.strengths.length > 0 || report.concerns.length > 0 || report.summary);

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <VerdictBadge verdict={report.overallVerdict} lang={lang} />
            {report.skaerpetTilsyn && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400">
                <AlertTriangle className="h-3 w-3" />
                {isDa ? "Skærpet tilsyn" : "Heightened supervision"}
              </span>
            )}
            {report.followUpRequired && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                <Info className="h-3 w-3" />
                {isDa ? "Opfølgning påkrævet" : "Follow-up required"}
              </span>
            )}
          </div>
          {report.tilsynDate && (
            <p className="text-sm text-muted">{formatDate(report.tilsynDate)}</p>
          )}
        </div>
        {report.sourceUrl && (
          <a
            href={report.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
            title={isDa ? "Se original rapport" : "See original report"}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>{isDa ? "Se rapport" : "See report"}</span>
          </a>
        )}
      </div>

      {/* Summary */}
      {report.summary && (
        <p className="text-sm leading-relaxed">{report.summary}</p>
      )}

      {/* Expandable details */}
      {hasDetails && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-primary hover:underline bg-transparent border-none p-0 cursor-pointer"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? (isDa ? "Skjul detaljer" : "Hide details") : (isDa ? "Vis detaljer" : "Show details")}
          </button>

          {expanded && (
            <div className="space-y-3 pt-1">
              {/* Strengths */}
              {report.strengths.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1 flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {isDa ? "Styrker" : "Strengths"}
                  </h4>
                  <ul className="list-disc list-inside text-sm space-y-0.5 text-muted">
                    {report.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Concerns */}
              {report.concerns.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {isDa ? "Opmærksomhedspunkter" : "Points of attention"}
                  </h4>
                  <ul className="list-disc list-inside text-sm space-y-0.5 text-muted">
                    {report.concerns.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function TilsynRapportSection({ reports, institutionName }: Props) {
  const { language } = useLanguage();
  const isDa = language === "da";

  if (!reports || reports.length === 0) return null;

  // Sort by date descending
  const sorted = [...reports].sort((a, b) => {
    if (!a.tilsynDate && !b.tilsynDate) return 0;
    if (!a.tilsynDate) return 1;
    if (!b.tilsynDate) return -1;
    return b.tilsynDate.localeCompare(a.tilsynDate);
  });

  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold">
        {isDa ? "Paedagogisk tilsyn" : "Pedagogical inspections"}
      </h3>
      <p className="text-xs text-muted">
        {isDa
          ? `${sorted.length} tilsynsrapport${sorted.length > 1 ? "er" : ""} for ${institutionName}`
          : `${sorted.length} inspection report${sorted.length > 1 ? "s" : ""} for ${institutionName}`}
      </p>
      <div className="space-y-3">
        {sorted.map((report, i) => (
          <RapportCard key={`${report.tilsynDate}-${i}`} report={report} lang={language} />
        ))}
      </div>
    </section>
  );
}
