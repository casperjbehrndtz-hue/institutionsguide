// One-shot migration runner for 011_kommune_intelligens_summaries.sql.
// Invoked once with service-role auth, then removed in a follow-up commit.
// Uses the auto-injected SUPABASE_DB_URL (Supabase Functions runtime).

import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS kommune_intelligens_summaries (
  municipality TEXT NOT NULL,
  track TEXT NOT NULL CHECK (track IN ('daycare', 'school')),
  summary TEXT NOT NULL,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  watchouts JSONB NOT NULL DEFAULT '[]'::jsonb,
  metrics_snapshot JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  PRIMARY KEY (municipality, track)
);

CREATE INDEX IF NOT EXISTS idx_ki_summaries_expires
  ON kommune_intelligens_summaries (expires_at);

ALTER TABLE kommune_intelligens_summaries ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kommune_intelligens_summaries' AND policyname = 'Public read access') THEN
    CREATE POLICY "Public read access" ON kommune_intelligens_summaries FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kommune_intelligens_summaries' AND policyname = 'Service role upsert') THEN
    CREATE POLICY "Service role upsert" ON kommune_intelligens_summaries FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kommune_intelligens_summaries' AND policyname = 'Service role update') THEN
    CREATE POLICY "Service role update" ON kommune_intelligens_summaries FOR UPDATE USING (auth.role() = 'service_role');
  END IF;
END
$do$;
`;

Deno.serve(async (req) => {
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;
  if (auth !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!dbUrl) {
    return new Response(JSON.stringify({ error: "SUPABASE_DB_URL not set" }), { status: 500 });
  }

  const sql = postgres(dbUrl, { max: 1, prepare: false });
  try {
    await sql.unsafe(MIGRATION_SQL);
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'kommune_intelligens_summaries'
    `;
    return new Response(JSON.stringify({ ok: true, tables }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500, headers: { "Content-Type": "application/json" } });
  } finally {
    await sql.end();
  }
});
