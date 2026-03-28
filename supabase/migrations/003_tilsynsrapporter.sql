-- Tilsynsrapporter (Inspection Reports) for Institutionsguide
-- Stores pædagogisk tilsyn data scraped from municipal sources
-- Run this in Supabase SQL Editor

-- =============================================================================
-- 1. Tilsynsrapporter table
-- =============================================================================
CREATE TABLE IF NOT EXISTS tilsynsrapporter (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  institution_id TEXT NOT NULL,               -- matches our internal ID (e.g., "G18062")
  municipality TEXT NOT NULL,                 -- kommune name (e.g., "København")
  report_date DATE,                           -- date the inspection was conducted
  report_year INTEGER NOT NULL,               -- year of the inspection (e.g., 2025)
  report_url TEXT,                            -- link to original PDF/HTML report
  report_type TEXT NOT NULL DEFAULT 'anmeldt' -- 'anmeldt' (announced) or 'uanmeldt' (unannounced)
    CHECK (report_type IN ('anmeldt', 'uanmeldt')),
  overall_rating TEXT,                        -- 'godkendt', 'godkendt_bemærkninger', 'skærpet', null
    CHECK (overall_rating IS NULL OR overall_rating IN ('godkendt', 'godkendt_bemærkninger', 'skærpet')),
  summary TEXT,                               -- short summary of findings
  strengths TEXT[],                           -- array of noted strengths
  areas_for_improvement TEXT[],               -- array of development areas
  raw_text TEXT,                              -- full extracted text from PDF (for search)
  source TEXT DEFAULT 'scraper',              -- data source identifier
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate reports for same institution, year, and type
  UNIQUE (institution_id, report_year, report_type)
);

-- =============================================================================
-- 2. Indexes for efficient querying
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_tilsyn_institution
  ON tilsynsrapporter (institution_id, report_year DESC);

CREATE INDEX IF NOT EXISTS idx_tilsyn_municipality
  ON tilsynsrapporter (municipality, report_year DESC);

CREATE INDEX IF NOT EXISTS idx_tilsyn_rating
  ON tilsynsrapporter (overall_rating)
  WHERE overall_rating IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tilsyn_year
  ON tilsynsrapporter (report_year DESC);

-- =============================================================================
-- 3. Row Level Security (RLS) — public read, service-role write
-- =============================================================================
ALTER TABLE tilsynsrapporter ENABLE ROW LEVEL SECURITY;

-- Anyone can read tilsyn data (public-facing)
CREATE POLICY "Public read access" ON tilsynsrapporter
  FOR SELECT USING (true);

-- Only service role can insert (used by scraper scripts)
CREATE POLICY "Service role insert" ON tilsynsrapporter
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Only service role can update (used by scraper scripts)
CREATE POLICY "Service role update" ON tilsynsrapporter
  FOR UPDATE USING (auth.role() = 'service_role');
