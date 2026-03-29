-- Extended data sources for Institutionsguide
-- Adds institution quality stats, arbejdstilsyn, and kommune-level context data
-- Run this in Supabase SQL Editor

-- =============================================================================
-- 1. institution_stats — per-institution quality data (normering, uddannelse, BTU)
-- =============================================================================
CREATE TABLE IF NOT EXISTS institution_stats (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  institution_id TEXT NOT NULL,                    -- matches our internal ID (e.g., "G18062")
  year INTEGER NOT NULL,                           -- statistikår
  normering_0_2 NUMERIC(4,2),                     -- børn pr. voksen for 0-2-årige
  normering_3_5 NUMERIC(4,2),                     -- børn pr. voksen for 3-5-årige
  pct_paedagoger NUMERIC(5,2),                    -- % personale med pædagoguddannelse
  pct_paed_assistenter NUMERIC(5,2),              -- % personale med pædagogisk assistentuddannelse
  pct_uden_paed_udd NUMERIC(5,2),                 -- % personale uden pædagogisk uddannelse
  antal_boern INTEGER,                             -- antal indskrevne børn
  parent_satisfaction NUMERIC(3,1),                -- forældretilfredshed 1-5 (fra BTU)
  parent_satisfaction_year INTEGER,                -- årstal for BTU-undersøgelse
  source TEXT DEFAULT 'uddannelsesstatistik',       -- datakilde
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (institution_id, year)
);

-- =============================================================================
-- 2. arbejdstilsyn — Arbejdstilsynets afgørelser pr. institution (via CVR)
-- =============================================================================
CREATE TABLE IF NOT EXISTS arbejdstilsyn (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  institution_id TEXT,                             -- vores interne ID (nullable, matched via CVR)
  cvr TEXT NOT NULL,                               -- CVR-nummer
  company_name TEXT,                               -- virksomhedsnavn fra Tilsynsindblik
  inspection_date DATE,                            -- tilsynsdato
  decision_type TEXT,                              -- 'strakspåbud', 'påbud', 'afgørelse uden påbud', 'rådgivningspåbud'
  problem_area TEXT,                               -- f.eks. 'Psykisk arbejdsmiljø', 'Ergonomisk arbejdsmiljø'
  description TEXT,                                -- beskrivelse af afgørelsen
  status TEXT,                                     -- 'aktiv', 'efterkommet', 'frafaldet'
  source TEXT DEFAULT 'tilsynsindblik',             -- datakilde
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (cvr, inspection_date, decision_type, problem_area)
);

-- =============================================================================
-- 3. kommune_stats — kommunale nøgletal for dagtilbud
-- =============================================================================
CREATE TABLE IF NOT EXISTS kommune_stats (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  municipality TEXT NOT NULL,                      -- kommunenavn (f.eks. "København")
  municipality_code TEXT,                          -- kommunekode (f.eks. "0101")
  year INTEGER NOT NULL,                           -- statistikår
  avg_sygefravær_dage NUMERIC(4,1),               -- gns. sygefraværsdage for pædagogisk personale
  pct_paedagoger_kommune NUMERIC(5,2),            -- % pædagoger i kommunen
  pct_medhjælpere_kommune NUMERIC(5,2),           -- % medhjælpere i kommunen
  udgift_pr_barn INTEGER,                          -- udgift pr. 0-13-årig på dagtilbud i DKK
  sprogvurdering_pct_udfordret NUMERIC(5,2),      -- % børn med sproglige udfordringer
  dagpleje_takst INTEGER,                          -- årlig dagplejetakst i DKK
  vuggestue_takst INTEGER,                         -- årlig vuggestuetakst i DKK
  boernehave_takst INTEGER,                        -- årlig børnehavetakst i DKK
  sfo_takst INTEGER,                               -- årlig SFO-takst i DKK
  source TEXT DEFAULT 'dst',                       -- datakilde (Danmarks Statistik)
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (municipality, year)
);

-- =============================================================================
-- 4. Indexes for efficient querying
-- =============================================================================

-- institution_stats
CREATE INDEX IF NOT EXISTS idx_inst_stats_institution
  ON institution_stats (institution_id, year DESC);

CREATE INDEX IF NOT EXISTS idx_inst_stats_year
  ON institution_stats (year DESC);

-- arbejdstilsyn
CREATE INDEX IF NOT EXISTS idx_arbejdstilsyn_institution
  ON arbejdstilsyn (institution_id)
  WHERE institution_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_arbejdstilsyn_cvr
  ON arbejdstilsyn (cvr);

CREATE INDEX IF NOT EXISTS idx_arbejdstilsyn_date
  ON arbejdstilsyn (inspection_date DESC);

-- kommune_stats
CREATE INDEX IF NOT EXISTS idx_kommune_stats_municipality
  ON kommune_stats (municipality, year DESC);

CREATE INDEX IF NOT EXISTS idx_kommune_stats_year
  ON kommune_stats (year DESC);

-- =============================================================================
-- 5. Row Level Security (RLS) — public read, service-role write
-- =============================================================================

-- institution_stats
ALTER TABLE institution_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON institution_stats
  FOR SELECT USING (true);

CREATE POLICY "Service role insert" ON institution_stats
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role update" ON institution_stats
  FOR UPDATE USING (auth.role() = 'service_role');

-- arbejdstilsyn
ALTER TABLE arbejdstilsyn ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON arbejdstilsyn
  FOR SELECT USING (true);

CREATE POLICY "Service role insert" ON arbejdstilsyn
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role update" ON arbejdstilsyn
  FOR UPDATE USING (auth.role() = 'service_role');

-- kommune_stats
ALTER TABLE kommune_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON kommune_stats
  FOR SELECT USING (true);

CREATE POLICY "Service role insert" ON kommune_stats
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role update" ON kommune_stats
  FOR UPDATE USING (auth.role() = 'service_role');
