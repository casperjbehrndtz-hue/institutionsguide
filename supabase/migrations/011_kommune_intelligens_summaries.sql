-- AI-generated kommune-intelligens summaries (cached)
-- One row per (municipality, track) -- pre-generated to keep the
-- /kommune-intelligens/:kommune page snappy + free of runtime LLM cost.

CREATE TABLE IF NOT EXISTS kommune_intelligens_summaries (
  municipality TEXT NOT NULL,
  track TEXT NOT NULL CHECK (track IN ('daycare', 'school')),
  summary TEXT NOT NULL,                 -- 120-180 word Danish narrative
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,  -- ["Lav normering …", "Høj trivsel …"]
  watchouts JSONB NOT NULL DEFAULT '[]'::jsonb,  -- ["Højt fravær …"]
  metrics_snapshot JSONB NOT NULL,       -- raw inputs used (audit trail)
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  PRIMARY KEY (municipality, track)
);

CREATE INDEX IF NOT EXISTS idx_ki_summaries_expires
  ON kommune_intelligens_summaries (expires_at);

ALTER TABLE kommune_intelligens_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON kommune_intelligens_summaries
  FOR SELECT USING (true);

CREATE POLICY "Service role upsert" ON kommune_intelligens_summaries
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role update" ON kommune_intelligens_summaries
  FOR UPDATE USING (auth.role() = 'service_role');
