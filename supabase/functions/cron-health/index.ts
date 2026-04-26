import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { handleCorsPreflightOrGetHeaders } from "../_shared/cors.ts";

interface JobExpectation {
  job_name: string;
  /** Maximum acceptable hours between successful runs (with output_count > 0) */
  staleAfterHours: number;
  /** What this job does — used in alerts */
  description: string;
}

const JOB_EXPECTATIONS: JobExpectation[] = [
  { job_name: "seo-generate", staleAfterHours: 96, description: "Blog article generation (cron every 2 days)" },
  { job_name: "refresh-data", staleAfterHours: 8 * 24, description: "Refresh institution + kommune stats (weekly)" },
  { job_name: "scrape-tilsyn", staleAfterHours: 14 * 24, description: "Scrape kommunale tilsynsrapporter (biweekly)" },
  { job_name: "seo-refresh", staleAfterHours: 8 * 24, description: "Refresh existing blog articles" },
  { job_name: "seo-retrolink", staleAfterHours: 14 * 24, description: "Backfill internal links in older articles" },
];

interface JobStatus {
  job_name: string;
  description: string;
  last_success: string | null;
  last_run: string | null;
  hours_since_success: number | null;
  expected_max_hours: number;
  stale: boolean;
  failure_count_7d: number;
}

Deno.serve(async (req) => {
  const { corsHeaders, preflightResponse } = handleCorsPreflightOrGetHeaders(req);
  if (preflightResponse) return preflightResponse;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  const statuses: JobStatus[] = [];
  for (const exp of JOB_EXPECTATIONS) {
    const { data: lastSuccess } = await supabase
      .from("cron_runs")
      .select("ran_at")
      .eq("job_name", exp.job_name)
      .eq("status", "success")
      .gt("output_count", 0)
      .order("ran_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: lastRun } = await supabase
      .from("cron_runs")
      .select("ran_at")
      .eq("job_name", exp.job_name)
      .order("ran_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { count: failureCount } = await supabase
      .from("cron_runs")
      .select("id", { count: "exact", head: true })
      .eq("job_name", exp.job_name)
      .eq("status", "failure")
      .gte("ran_at", sevenDaysAgo);

    const hoursSinceSuccess = lastSuccess
      ? (now - new Date(lastSuccess.ran_at).getTime()) / (1000 * 60 * 60)
      : null;

    statuses.push({
      job_name: exp.job_name,
      description: exp.description,
      last_success: lastSuccess?.ran_at ?? null,
      last_run: lastRun?.ran_at ?? null,
      hours_since_success: hoursSinceSuccess !== null ? Math.round(hoursSinceSuccess) : null,
      expected_max_hours: exp.staleAfterHours,
      stale: hoursSinceSuccess === null || hoursSinceSuccess > exp.staleAfterHours,
      failure_count_7d: failureCount ?? 0,
    });
  }

  const stale = statuses.filter((s) => s.stale);
  const overall = stale.length === 0 ? "ok" : "degraded";

  return new Response(
    JSON.stringify({ overall, checked_at: new Date().toISOString(), jobs: statuses, alerts: stale }, null, 2),
    {
      status: stale.length === 0 ? 200 : 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
