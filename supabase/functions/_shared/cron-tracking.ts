// Shared helper to record cron job execution outcomes for monitoring.
// Each scheduled function should call this at the END of its run.

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

interface RecordOptions {
  jobName: string;
  status: "success" | "failure" | "noop";
  outputCount?: number;
  durationMs?: number;
  message?: string;
}

export async function recordCronRun(supabase: SupabaseClient, opts: RecordOptions): Promise<void> {
  try {
    await supabase.from("cron_runs").insert({
      job_name: opts.jobName,
      status: opts.status,
      output_count: opts.outputCount ?? 0,
      duration_ms: opts.durationMs ?? null,
      message: opts.message ?? null,
    });
  } catch (err) {
    // Never fail the cron job because of monitoring; just log.
    console.error(`[cron-tracking] Failed to record run for ${opts.jobName}:`, err);
  }
}
