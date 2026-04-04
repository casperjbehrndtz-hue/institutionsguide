import { Link } from "react-router-dom";
import type { UnifiedInstitution } from "@/lib/types";
import type { ScoreResult } from "@/lib/institutionScore";

interface ComparisonRow {
  inst: UnifiedInstitution;
  score: number | null;
  trivsel: number | null;
  fravaer: number | null;
  karakter: number | null;
  dist: number;
  highlight?: boolean;
}

interface Props {
  current: UnifiedInstitution;
  currentScore: ScoreResult;
  nearby: ComparisonRow[];
  language: "da" | "en";
}

const SCORE_COLOR = (s: number) =>
  s >= 7 ? "#0d7c5f" : s >= 5 ? "#b8860b" : "#c0392b";

export default function ComparisonTable({ current, currentScore, nearby, language: lang }: Props) {
  if (nearby.length === 0) return null;

  const q = current.quality;
  const rows: ComparisonRow[] = [
    {
      inst: current,
      score: currentScore.overall != null ? Math.round(currentScore.overall / 10 * 10) / 10 : null,
      trivsel: q?.ts ?? null,
      fravaer: q?.fp ?? null,
      karakter: q?.k ?? null,
      dist: 0,
      highlight: true,
    },
    ...nearby.slice(0, 4),
  ];

  const isSchool = current.category === "skole";

  return (
    <div className="bg-bg-card rounded-2xl border border-border/50 p-6 sm:p-8 shadow-sm">
      <h2 className="font-display text-xl font-medium text-foreground mb-1">
        {lang === "da" ? "Sammenlign med nærliggende" : "Compare with nearby"}
      </h2>
      <p className="text-[13px] text-muted mb-6">
        {lang === "da"
          ? `De nærmeste sammenlignelige institutioner`
          : `The nearest comparable institutions`}
      </p>
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60">
              <th className="text-left py-2.5 px-2 text-[11px] text-muted uppercase tracking-wider font-semibold">
                {lang === "da" ? "Institution" : "Institution"}
              </th>
              <th className="text-right py-2.5 px-2 text-[11px] text-muted uppercase tracking-wider font-semibold">Score</th>
              {isSchool && <>
                <th className="hidden sm:table-cell text-right py-2.5 px-2 text-[11px] text-muted uppercase tracking-wider font-semibold">
                  {lang === "da" ? "Trivsel" : "Well-being"}
                </th>
                <th className="hidden sm:table-cell text-right py-2.5 px-2 text-[11px] text-muted uppercase tracking-wider font-semibold">
                  {lang === "da" ? "Fravær" : "Absence"}
                </th>
                <th className="hidden sm:table-cell text-right py-2.5 px-2 text-[11px] text-muted uppercase tracking-wider font-semibold">
                  {lang === "da" ? "Karakter" : "Grades"}
                </th>
              </>}
              <th className="text-right py-2.5 px-2 text-[11px] text-muted uppercase tracking-wider font-semibold" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.inst.id}
                className={`border-b border-border/30 transition-colors ${r.highlight ? "bg-[#0d7c5f]/[0.03]" : "hover:bg-border/20"}`}
              >
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    {r.highlight && <div className="w-[3px] h-5 rounded bg-[#0d7c5f] shrink-0" />}
                    <div>
                      <div className={`text-sm ${r.highlight ? "font-semibold" : "font-normal"} text-foreground`}>
                        {r.inst.name}
                      </div>
                      {!r.highlight && r.dist > 0 && (
                        <div className="text-[11px] text-muted mt-0.5">{r.dist.toFixed(1)} km</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-2 text-right">
                  {r.score != null ? (
                    <span className="font-mono font-medium" style={{ color: SCORE_COLOR(r.score) }}>
                      {r.score.toLocaleString("da-DK")}
                    </span>
                  ) : (
                    <span className="text-muted">&mdash;</span>
                  )}
                </td>
                {isSchool && <>
                  <td className="hidden sm:table-cell py-3 px-2 text-right font-mono text-muted">
                    {r.trivsel?.toLocaleString("da-DK") ?? "—"}
                  </td>
                  <td className="hidden sm:table-cell py-3 px-2 text-right font-mono text-muted">
                    {r.fravaer != null ? `${r.fravaer.toLocaleString("da-DK")}%` : "—"}
                  </td>
                  <td className="hidden sm:table-cell py-3 px-2 text-right font-mono text-muted">
                    {r.karakter?.toLocaleString("da-DK") ?? "—"}
                  </td>
                </>}
                <td className="py-3 px-2 text-right">
                  {!r.highlight && (
                    <Link
                      to={`/institution/${r.inst.id}`}
                      className="text-xs text-muted hover:text-primary transition-colors"
                    >
                      {lang === "da" ? "Se" : "View"} &rarr;
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
