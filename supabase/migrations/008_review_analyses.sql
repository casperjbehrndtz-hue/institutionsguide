-- Cache table for AI-generated review sentiment/theme analyses
-- One row per institution, upserted on each analysis run, 30 day TTL

CREATE TABLE IF NOT EXISTS review_analyses (
  institution_id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  review_count INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days')
);

-- Index for cache expiry lookups
CREATE INDEX IF NOT EXISTS idx_review_analyses_expires ON review_analyses (expires_at);

-- RLS: allow public reads, only service role writes
ALTER TABLE review_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON review_analyses
  FOR SELECT USING (true);
