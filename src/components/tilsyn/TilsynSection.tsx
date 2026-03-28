import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import TilsynCard from "./TilsynCard";
import type { TilsynReport } from "./TilsynCard";

interface Props {
  institutionId: string;
  institutionName: string;
}

interface TilsynRow {
  report_date: string | null;
  report_year: number;
  report_type: string;
  overall_rating: string | null;
  summary: string | null;
  report_url: string | null;
  strengths: string[] | null;
  areas_for_improvement: string[] | null;
}

type LoadState = "loading" | "loaded" | "empty" | "error";

export default function TilsynSection({ institutionId, institutionName }: Props) {
  const { language } = useLanguage();
  const isDa = language === "da";
  const [reports, setReports] = useState<TilsynReport[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;

    async function fetchTilsyn() {
      // Graceful fallback if Supabase is not configured
      if (!supabase) {
        setState("empty");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("tilsynsrapporter")
          .select(
            "report_date, report_year, report_type, overall_rating, summary, report_url, strengths, areas_for_improvement"
          )
          .eq("institution_id", institutionId)
          .order("report_year", { ascending: false })
          .limit(5);

        if (cancelled) return;

        if (error) {
          // Table might not exist yet — treat as empty, not error
          setState("empty");
          return;
        }

        if (!data || data.length === 0) {
          setState("empty");
          return;
        }

        const mapped: TilsynReport[] = (data as TilsynRow[]).map((row) => ({
          date: row.report_date ?? `${row.report_year}-01-01`,
          type: row.report_type,
          rating: row.overall_rating as TilsynReport["rating"],
          summary: row.summary ?? "",
          reportUrl: row.report_url ?? undefined,
          strengths: row.strengths ?? undefined,
          improvements: row.areas_for_improvement ?? undefined,
        }));

        setReports(mapped);
        setState("loaded");
      } catch {
        if (!cancelled) setState("empty");
      }
    }

    fetchTilsyn();
    return () => {
      cancelled = true;
    };
  }, [institutionId]);

  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold">
        {isDa ? "Tilsynsrapporter" : "Inspection reports"}
      </h3>

      {state === "loading" && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {isDa ? "Henter tilsynsdata..." : "Loading inspection data..."}
        </div>
      )}

      {state === "empty" && (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <p className="text-sm text-muted">
            {isDa ? "Tilsynsdata for" : "Inspection data for"}{" "}
            <span className="font-medium text-foreground">
              {institutionName}
            </span>{" "}
            {isDa ? "kommer snart." : "coming soon."}
          </p>
          <p className="text-xs text-muted mt-1">
            {isDa
              ? "Vi arbejder på at indsamle tilsynsrapporter fra kommunerne."
              : "We are working on collecting inspection reports from municipalities."}
          </p>
        </div>
      )}

      {state === "error" && (
        <p className="text-sm text-destructive">
          {isDa ? "Kunne ikke hente tilsynsdata. Prøv igen senere." : "Could not load inspection data. Try again later."}
        </p>
      )}

      {state === "loaded" && (
        <div className="space-y-3">
          {reports.map((report, i) => (
            <TilsynCard key={`${report.date}-${report.type}-${i}`} report={report} />
          ))}
        </div>
      )}
    </section>
  );
}
