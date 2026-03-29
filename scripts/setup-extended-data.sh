#!/usr/bin/env bash
set -euo pipefail

# Setup script for Institutionsguide extended data sources
# Handles migration 006 instructions + tilsyn data seeding

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "============================================="
echo "  Institutionsguide — Extended Data Setup"
echo "============================================="
echo ""

# -----------------------------------------------
# Step 1: Migration 006 — extended data sources
# -----------------------------------------------
echo "--- Step 1: Migration 006 (extended data sources) ---"
echo ""
echo "  This migration creates three new tables:"
echo "    - institution_stats  (normering, uddannelse, BTU data)"
echo "    - arbejdstilsyn      (Arbejdstilsynets afgoerelser)"
echo "    - kommune_stats      (kommunale noegletal)"
echo ""
echo "  HOW TO RUN:"
echo "    1. Go to Supabase Dashboard -> SQL Editor"
echo "    2. Open and paste the contents of:"
echo "       supabase/migrations/006_extended_data_sources.sql"
echo "    3. Click 'Run' and verify all statements succeed"
echo ""
echo "  Migration file location:"
echo "    $PROJECT_ROOT/supabase/migrations/006_extended_data_sources.sql"
echo ""

# Check if migration 003 (tilsynsrapporter) is mentioned as a prerequisite
echo "  NOTE: Migration 003 (tilsynsrapporter) must already be applied."
echo "  If the tilsynsrapporter table does not exist yet, run:"
echo "    supabase/migrations/003_tilsynsrapporter.sql first."
echo ""

read -rp "  Have you run migration 006 in the SQL Editor? (y/N) " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo ""
  echo "  Skipping migration — run this script again after applying migration 006."
  echo ""
  exit 0
fi

echo ""
echo "  Migration 006 confirmed."
echo ""

# -----------------------------------------------
# Step 2: Verify environment variables
# -----------------------------------------------
echo "--- Step 2: Verifying environment ---"

if [ ! -f "$PROJECT_ROOT/.env" ]; then
  echo "  ERROR: .env file not found at $PROJECT_ROOT/.env"
  echo "  Copy .env.example and fill in your Supabase credentials."
  exit 1
fi

# Source env file to check required vars
set +u
source <(grep -E '^(SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=' "$PROJECT_ROOT/.env")
set -u

if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "  ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env"
  echo "  Required env vars (from .env.example):"
  echo "    SUPABASE_URL="
  echo "    SUPABASE_SERVICE_ROLE_KEY="
  exit 1
fi

echo "  SUPABASE_URL is set"
echo "  SUPABASE_SERVICE_ROLE_KEY is set"
echo ""

# -----------------------------------------------
# Step 3: Check tilsyn output files
# -----------------------------------------------
echo "--- Step 3: Checking tilsyn output data ---"

TILSYN_OUTPUT="$SCRIPT_DIR/tilsyn/output"

if [ ! -d "$TILSYN_OUTPUT" ]; then
  echo "  ERROR: Tilsyn output directory not found at $TILSYN_OUTPUT"
  echo "  Run the tilsyn scraper first to generate data."
  exit 1
fi

TILSYN_FILES=$(find "$TILSYN_OUTPUT" -maxdepth 1 -name "*-tilsyn.json" | wc -l)
echo "  Found $TILSYN_FILES tilsyn JSON file(s) in output/"

if [ "$TILSYN_FILES" -eq 0 ]; then
  echo "  WARNING: No *-tilsyn.json files found. Seed script may have nothing to insert."
fi

echo ""

# -----------------------------------------------
# Step 4: Seed tilsynsrapporter
# -----------------------------------------------
echo "--- Step 4: Seeding tilsynsrapporter ---"
echo ""

cd "$PROJECT_ROOT"
node --env-file=.env scripts/tilsyn/seed-real-tilsyn.mjs

echo ""

# -----------------------------------------------
# Summary
# -----------------------------------------------
echo "============================================="
echo "  Setup Complete"
echo "============================================="
echo ""
echo "  What was done:"
echo "    [x] Migration 006 applied (institution_stats, arbejdstilsyn, kommune_stats)"
echo "    [x] Tilsynsrapporter seeded from scraped data"
echo ""
echo "  Tables now available:"
echo "    - tilsynsrapporter     (from migration 003)"
echo "    - institution_stats    (from migration 006)"
echo "    - arbejdstilsyn        (from migration 006)"
echo "    - kommune_stats        (from migration 006)"
echo ""
echo "  Next steps:"
echo "    - Run fetch-institution-stats.mjs to populate institution_stats"
echo "    - Run fetch-arbejdstilsyn.mjs to populate arbejdstilsyn"
echo "    - Run fetch-dst-kommune-stats.mjs to populate kommune_stats"
echo ""
