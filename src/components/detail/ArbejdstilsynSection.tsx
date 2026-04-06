import { useState, useEffect } from "react";
import { ShieldAlert, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";

interface ATDecision {
  inspection_date: string;
  decision_type: string;
  problem_area: string;
  description: string;
  status: string;
}

interface Props {
  institutionId: string;
  institutionName: string;
}

const STATUS_COLORS: Record<string, string> = {
  aktiv: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  efterkommet: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  frafaldet: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export default function ArbejdstilsynSection({ institutionId }: Props) {
  const { language: lang } = useLanguage();
  const [decisions, setDecisions] = useState<ATDecision[]>([]);
  const [loading, setLoading] = useState(!!supabase);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    supabase
      .from("arbejdstilsyn")
      .select("inspection_date, decision_type, problem_area, description, status")
      .eq("institution_id", institutionId)
      .order("inspection_date", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setDecisions(data ?? []);
        setLoading(false);
      });
  }, [institutionId]);

  if (loading) return null;
  if (decisions.length === 0) {
    return (
      <div className="card p-4 flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">
            {lang === "da" ? "Ingen aktive påbud" : "No active orders"}
          </p>
          <p className="text-[10px] text-muted">
            {lang === "da"
              ? "Arbejdstilsynet har ingen aktive afgørelser for denne institution"
              : "The Danish Working Environment Authority has no active decisions for this institution"}
          </p>
        </div>
      </div>
    );
  }

  const activeCount = decisions.filter((d) => d.status === "aktiv").length;
  const shown = expanded ? decisions : decisions.slice(0, 2);

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert className={`w-5 h-5 shrink-0 ${activeCount > 0 ? "text-red-500" : "text-amber-500"}`} />
        <h2 className="font-display text-lg font-semibold">
          {lang === "da" ? "Arbejdsmiljø" : "Work Environment"}
        </h2>
        {activeCount > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium">
            {activeCount} {lang === "da" ? "aktive" : "active"}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {shown.map((d, i) => (
          <div key={i} className="border border-border rounded-lg p-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-medium text-foreground">{d.decision_type}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[d.status] ?? STATUS_COLORS.frafaldet}`}>
                {d.status}
              </span>
            </div>
            <p className="text-xs text-muted">{d.problem_area}</p>
            {d.description && <p className="text-[10px] text-muted mt-1">{d.description}</p>}
            <p className="text-[10px] text-muted mt-1">
              {new Date(d.inspection_date).toLocaleDateString("da-DK")}
            </p>
          </div>
        ))}
      </div>

      {decisions.length > 2 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-primary hover:underline mt-2"
        >
          {expanded
            ? (lang === "da" ? "Vis færre" : "Show less")
            : `${lang === "da" ? "Vis alle" : "Show all"} (${decisions.length})`}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      )}

      <p className="text-[10px] text-muted mt-3">
        {lang === "da"
          ? "Kilde: Arbejdstilsynets Tilsynsindblik (seneste 6 måneder)"
          : "Source: Danish Working Environment Authority (last 6 months)"}
      </p>
    </div>
  );
}
