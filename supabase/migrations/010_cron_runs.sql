-- 010_cron_runs.sql
-- Tracks every scheduled job execution so we can detect silent failures.
-- Each cron worker writes one row per run (success or failure) and
-- cron-health alerts when a job hasn't produced output in N days.

CREATE TABLE IF NOT EXISTS cron_runs (
  id BIGSERIAL PRIMARY KEY,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'noop')),
  output_count INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  message TEXT,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cron_runs_job_ran_at ON cron_runs (job_name, ran_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_runs_status ON cron_runs (status, ran_at DESC) WHERE status = 'failure';

-- Cleanup old rows (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_cron_runs()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM cron_runs WHERE ran_at < NOW() - INTERVAL '90 days';
END;
$$;
