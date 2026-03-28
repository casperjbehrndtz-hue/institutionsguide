-- AI-generated institution assessments (cached)
-- Stores Claude API output with 7-day TTL

CREATE TABLE IF NOT EXISTS assessments (
  institution_id TEXT PRIMARY KEY,
  score NUMERIC NOT NULL,                -- 0-100 deterministic score (from client)
  grade TEXT NOT NULL CHECK (grade IN ('A','B','C','D','E')),
  headline JSONB NOT NULL,               -- {"da": "...", "en": "..."}
  summary JSONB NOT NULL,                -- {"da": "...", "en": "..."}
  pros JSONB NOT NULL,                   -- [{"da": "...", "en": "..."}, ...]
  cons JSONB NOT NULL,                   -- [{"da": "...", "en": "..."}, ...]
  recommendation JSONB NOT NULL,         -- {"da": "...", "en": "..."}
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

-- Fast lookup for cache checks
CREATE INDEX IF NOT EXISTS idx_assessments_expires
  ON assessments (institution_id, expires_at DESC);

-- RLS: public read, service-role write
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON assessments
  FOR SELECT USING (true);

CREATE POLICY "Service role upsert" ON assessments
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role update" ON assessments
  FOR UPDATE USING (auth.role() = 'service_role');
