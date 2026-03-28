-- Price History Infrastructure for Institutionsguide
-- "Boliga model": accumulate price snapshots over time to build proprietary historical data
-- Run this in Supabase SQL Editor to create the tables

-- =============================================================================
-- 1. Price snapshots — monthly/annual rates per institution over time
-- =============================================================================
CREATE TABLE IF NOT EXISTS price_snapshots (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  institution_id TEXT NOT NULL,        -- matches our internal ID (e.g., "G18062")
  category TEXT NOT NULL,              -- vuggestue, boernehave, dagpleje, skole, sfo
  municipality TEXT NOT NULL,          -- kommune name
  monthly_rate INTEGER,                -- monthly rate in DKK (null if unknown)
  annual_rate INTEGER,                 -- annual rate in DKK (null if unknown)
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT DEFAULT 'dst',           -- data source identifier
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate snapshots for same institution on same date
  UNIQUE (institution_id, snapshot_date)
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_price_snapshots_institution
  ON price_snapshots (institution_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_price_snapshots_municipality
  ON price_snapshots (municipality, category, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_price_snapshots_date
  ON price_snapshots (snapshot_date);

-- =============================================================================
-- 2. Normering snapshots — children-per-staff ratios over time
--    Supports both kommune-level (from BUVM API) and institution-level (future)
-- =============================================================================
CREATE TABLE IF NOT EXISTS normering_snapshots (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  municipality TEXT NOT NULL,           -- kommune name (always present)
  institution_id TEXT,                  -- G-number, NULL for kommune-level data
  age_group TEXT NOT NULL,              -- 'dagpleje', '0-2', '3-5'
  children_per_staff NUMERIC(4,2),     -- the ratio (e.g. 2.8, 5.6)
  children_count INTEGER,              -- number of children (if available)
  staff_count NUMERIC(5,1),            -- number of staff (if available)
  year INTEGER NOT NULL,               -- data year (2017-2023+)
  source TEXT DEFAULT 'buvm',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (municipality, COALESCE(institution_id, ''), age_group, year)
);

CREATE INDEX IF NOT EXISTS idx_normering_municipality
  ON normering_snapshots (municipality, age_group, year DESC);

CREATE INDEX IF NOT EXISTS idx_normering_institution
  ON normering_snapshots (institution_id, year DESC)
  WHERE institution_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_normering_year
  ON normering_snapshots (year, age_group);

-- =============================================================================
-- 3. Row Level Security (RLS) — public read, service-role write
-- =============================================================================
ALTER TABLE price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE normering_snapshots ENABLE ROW LEVEL SECURITY;

-- Anyone can read price data (public-facing graphs)
CREATE POLICY "Public read access" ON price_snapshots
  FOR SELECT USING (true);

CREATE POLICY "Public read access" ON normering_snapshots
  FOR SELECT USING (true);

-- Only service role can insert/update (used by seed scripts)
CREATE POLICY "Service role write" ON price_snapshots
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role write" ON normering_snapshots
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
