-- =============================================================================
-- SEO BLOG SYSTEM FOR INSTITUTIONSGUIDE.DK
-- =============================================================================
-- Adapted from ParFinans SEO automation system.
-- Tables: blog_posts, seo_keywords, seo_performance, seo_discovered_keywords,
--         topic_clusters, internal_links
--
-- REQUIRED SUPABASE CONFIGURATION (set before cron jobs work):
--   ALTER DATABASE postgres SET "app.settings.supabase_url" = 'https://epkwhvrwcyhlbdvwwvfi.supabase.co';
--   ALTER DATABASE postgres SET "app.settings.seo_generate_secret" = 'your-secret';
--   SELECT pg_reload_conf();
--
-- Prerequisites: pg_net and pg_cron extensions must be enabled.
-- =============================================================================

-- ── 1. Blog posts table ──

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'da' CHECK (locale IN ('da', 'en')),
  title TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  content_html TEXT NOT NULL,
  module TEXT NOT NULL DEFAULT 'generel'
    CHECK (module IN ('dagtilbud', 'skole', 'normering', 'friplads', 'generel')),
  keyword TEXT,
  intent TEXT DEFAULT 'informational'
    CHECK (intent IN ('informational', 'transactional', 'navigational')),
  published_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(slug, locale)
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_module ON public.blog_posts(module);
CREATE INDEX IF NOT EXISTS idx_blog_posts_locale ON public.blog_posts(locale);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON public.blog_posts(published_at DESC);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
CREATE POLICY "blog_posts_public_read" ON public.blog_posts
  FOR SELECT USING (true);

-- ── 2. SEO keyword pipeline ──

CREATE TABLE IF NOT EXISTS public.seo_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'da' CHECK (locale IN ('da', 'en')),
  module TEXT NOT NULL CHECK (module IN ('dagtilbud', 'skole', 'normering', 'friplads', 'generel')),
  intent TEXT NOT NULL DEFAULT 'informational' CHECK (intent IN ('informational', 'transactional', 'navigational')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'published', 'failed')),
  blog_slug TEXT,
  source_urls TEXT[] DEFAULT '{}',
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  UNIQUE(keyword, locale)
);

ALTER TABLE public.seo_keywords ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_seo_keywords_status ON public.seo_keywords (status, created_at ASC) WHERE status = 'pending';
CREATE INDEX idx_seo_keywords_retry ON public.seo_keywords (status, processed_at, retry_count) WHERE status = 'failed';

-- ── 3. Seed Danish keyword bank — childcare & school topics ──

INSERT INTO public.seo_keywords (keyword, module, intent, source_urls) VALUES
  -- Dagtilbud (vuggestue, børnehave, dagpleje)
  ('vuggestue vs dagpleje forskel pris', 'dagtilbud', 'informational', ARRAY['https://www.borger.dk', 'https://www.dst.dk']),
  ('hvad koster vuggestue 2026', 'dagtilbud', 'informational', ARRAY['https://www.dst.dk', 'https://www.kl.dk']),
  ('hvad koster børnehave 2026', 'dagtilbud', 'informational', ARRAY['https://www.dst.dk', 'https://www.kl.dk']),
  ('hvad koster dagpleje 2026', 'dagtilbud', 'informational', ARRAY['https://www.dst.dk']),
  ('billigste vuggestue i københavn', 'dagtilbud', 'transactional', ARRAY['https://www.kk.dk']),
  ('billigste børnehave i aarhus', 'dagtilbud', 'transactional', ARRAY['https://www.aarhus.dk']),
  ('privat vs kommunal børnehave pris', 'dagtilbud', 'informational', ARRAY['https://www.borger.dk', 'https://www.dst.dk']),
  ('venteliste vuggestue københavn', 'dagtilbud', 'informational', ARRAY['https://www.kk.dk']),
  ('hvornår skrive barn op til vuggestue', 'dagtilbud', 'informational', ARRAY['https://www.borger.dk']),
  ('dagpleje fordele ulemper', 'dagtilbud', 'informational', ARRAY['https://www.borger.dk']),
  ('privat dagpleje regler 2026', 'dagtilbud', 'informational', ARRAY['https://www.retsinformation.dk']),
  ('dyreste og billigste kommuner børnepasning', 'dagtilbud', 'informational', ARRAY['https://www.dst.dk', 'https://www.kl.dk']),

  -- Skole
  ('bedste folkeskole i københavn', 'skole', 'transactional', ARRAY['https://www.uddannelsesstatistik.dk']),
  ('bedste folkeskole i aarhus', 'skole', 'transactional', ARRAY['https://www.uddannelsesstatistik.dk']),
  ('privatskole vs folkeskole forskel', 'skole', 'informational', ARRAY['https://www.uvm.dk', 'https://www.borger.dk']),
  ('hvad koster privatskole 2026', 'skole', 'informational', ARRAY['https://www.dst.dk']),
  ('folkeskole kvalitet rangliste 2026', 'skole', 'informational', ARRAY['https://www.uddannelsesstatistik.dk']),
  ('sfo pris kommune 2026', 'skole', 'informational', ARRAY['https://www.dst.dk', 'https://www.kl.dk']),
  ('trivsel folkeskole hvad måles', 'skole', 'informational', ARRAY['https://www.uvm.dk']),
  ('karaktergennemsnit folkeskole kommune', 'skole', 'informational', ARRAY['https://www.uddannelsesstatistik.dk']),

  -- Normering
  ('normering børnehave 2026 regler', 'normering', 'informational', ARRAY['https://www.retsinformation.dk', 'https://www.uvm.dk']),
  ('minimumsnormering hvad betyder det', 'normering', 'informational', ARRAY['https://www.uvm.dk', 'https://www.bupl.dk']),
  ('normering vuggestue børn per voksen', 'normering', 'informational', ARRAY['https://www.uvm.dk']),
  ('bedste normering kommune 2026', 'normering', 'transactional', ARRAY['https://www.uvm.dk', 'https://www.kl.dk']),
  ('normering dagpleje regler', 'normering', 'informational', ARRAY['https://www.retsinformation.dk']),
  ('normering børnehave vs vuggestue forskel', 'normering', 'informational', ARRAY['https://www.uvm.dk']),

  -- Friplads
  ('fripladstilskud beregning 2026', 'friplads', 'transactional', ARRAY['https://www.borger.dk', 'https://www.kl.dk']),
  ('hvem kan få friplads børnehave', 'friplads', 'informational', ARRAY['https://www.borger.dk']),
  ('indkomstgrænse friplads 2026', 'friplads', 'informational', ARRAY['https://www.borger.dk', 'https://www.retsinformation.dk']),
  ('søskenderabat dagtilbud regler', 'friplads', 'informational', ARRAY['https://www.borger.dk', 'https://www.kl.dk']),
  ('friplads ansøgning hvordan', 'friplads', 'transactional', ARRAY['https://www.borger.dk']),
  ('økonomisk friplads vs socialpædagogisk friplads', 'friplads', 'informational', ARRAY['https://www.retsinformation.dk']),

  -- Generel
  ('hvad koster det at have barn i danmark 2026', 'generel', 'informational', ARRAY['https://www.dst.dk', 'https://www.borger.dk']),
  ('børnepasning priser alle kommuner', 'generel', 'informational', ARRAY['https://www.dst.dk', 'https://www.kl.dk']),
  ('skolevalg guide forældre', 'generel', 'informational', ARRAY['https://www.uvm.dk', 'https://www.borger.dk']),
  ('tilsynsrapport dagtilbud hvad er det', 'generel', 'informational', ARRAY['https://www.retsinformation.dk'])
ON CONFLICT DO NOTHING;

-- ── 4. SEO performance tracking (fed by Google Search Console API) ──

CREATE TABLE IF NOT EXISTS public.seo_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  avg_position DECIMAL(5,2) DEFAULT 0,
  ctr DECIMAL(5,4) DEFAULT 0,
  top_queries JSONB DEFAULT '[]'::jsonb,
  needs_refresh BOOLEAN DEFAULT false,
  refresh_reason TEXT,
  last_refreshed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_perf_needs_refresh
  ON public.seo_performance(needs_refresh) WHERE needs_refresh = true;
CREATE INDEX IF NOT EXISTS idx_seo_perf_position
  ON public.seo_performance(avg_position);

ALTER TABLE public.seo_performance ENABLE ROW LEVEL SECURITY;

-- ── 5. Discovered keywords from GSC ──

CREATE TABLE IF NOT EXISTS public.seo_discovered_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL UNIQUE,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  avg_position DECIMAL(5,2) DEFAULT 0,
  source_slug TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'queued', 'ignored', 'published')),
  suggested_module TEXT,
  discovered_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_discovered_status
  ON public.seo_discovered_keywords(status, impressions DESC);

ALTER TABLE public.seo_discovered_keywords ENABLE ROW LEVEL SECURITY;

-- ── 6. Topical authority clusters ──

CREATE TABLE IF NOT EXISTS public.topic_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar_slug TEXT NOT NULL,
  cluster_slug TEXT NOT NULL,
  anchor_text TEXT NOT NULL,
  reverse_anchor_text TEXT,
  relevance_score INT DEFAULT 80,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pillar_slug, cluster_slug)
);

CREATE INDEX IF NOT EXISTS idx_topic_clusters_pillar ON public.topic_clusters(pillar_slug);
CREATE INDEX IF NOT EXISTS idx_topic_clusters_cluster ON public.topic_clusters(cluster_slug);

ALTER TABLE public.topic_clusters ENABLE ROW LEVEL SECURITY;

-- ── 7. Internal link tracking ──

CREATE TABLE IF NOT EXISTS public.internal_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_slug TEXT NOT NULL,
  target_slug TEXT NOT NULL,
  anchor_text TEXT NOT NULL,
  link_type TEXT DEFAULT 'contextual' CHECK (link_type IN ('contextual', 'cluster', 'related', 'cta')),
  auto_injected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_slug, target_slug)
);

CREATE INDEX IF NOT EXISTS idx_internal_links_target ON public.internal_links(target_slug);

ALTER TABLE public.internal_links ENABLE ROW LEVEL SECURITY;

-- ── 8. Seed pillar/cluster relationships ──

INSERT INTO public.topic_clusters (pillar_slug, cluster_slug, anchor_text, reverse_anchor_text, relevance_score) VALUES
  -- Pillar: Dagtilbud-guide
  ('guide-dagtilbud-valg', 'vuggestue-vs-dagpleje-forskel-pris', 'guide til valg af dagtilbud', 'vuggestue vs dagpleje', 95),
  ('guide-dagtilbud-valg', 'privat-vs-kommunal-boernehave-pris', 'guide til valg af dagtilbud', 'privat vs kommunal børnehave', 90),
  ('guide-dagtilbud-valg', 'hvornaar-skrive-barn-op-vuggestue', 'guide til valg af dagtilbud', 'hvornår skrive barn op', 85),
  ('guide-dagtilbud-valg', 'dagpleje-fordele-ulemper', 'guide til valg af dagtilbud', 'dagpleje fordele og ulemper', 90),
  -- Pillar: Skolevalg
  ('skolevalg-guide-foraeldre', 'privatskole-vs-folkeskole-forskel', 'guide til skolevalg', 'privatskole vs folkeskole', 95),
  ('skolevalg-guide-foraeldre', 'folkeskole-kvalitet-rangliste-2026', 'guide til skolevalg', 'folkeskole rangliste', 90),
  ('skolevalg-guide-foraeldre', 'trivsel-folkeskole-hvad-maales', 'guide til skolevalg', 'trivselsmålinger i folkeskolen', 85),
  -- Pillar: Normering
  ('normering-guide-foraeldre', 'minimumsnormering-hvad-betyder-det', 'guide til normering', 'minimumsnormering forklaret', 95),
  ('normering-guide-foraeldre', 'normering-vuggestue-boern-per-voksen', 'guide til normering', 'normering i vuggestuer', 90),
  ('normering-guide-foraeldre', 'bedste-normering-kommune-2026', 'guide til normering', 'kommuner med bedst normering', 85),
  -- Pillar: Friplads
  ('friplads-guide-komplet', 'fripladstilskud-beregning-2026', 'komplet guide til friplads', 'beregn fripladstilskud 2026', 95),
  ('friplads-guide-komplet', 'soeskenderabat-dagtilbud-regler', 'komplet guide til friplads', 'søskenderabat regler', 85),
  ('friplads-guide-komplet', 'oekonomisk-friplads-vs-socialpaedagogisk', 'komplet guide til friplads', 'typer af friplads', 90)
ON CONFLICT DO NOTHING;

-- ── 9. Cron jobs ──

-- Generate one article per day at 06:00 UTC
SELECT cron.schedule(
  'seo-generate-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/seo-generate',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.seo_generate_secret')
    ),
    body := '{"mode": "auto"}'::jsonb
  );
  $$
);

-- Fetch GSC performance daily at 07:00 UTC
SELECT cron.schedule(
  'seo-analytics-daily',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/seo-analytics',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.seo_generate_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{"action":"full_sync"}'::jsonb
  );
  $$
);

-- Auto-refresh underperforming content weekly (Sundays 08:00 UTC)
SELECT cron.schedule(
  'seo-refresh-weekly',
  '0 8 * * 0',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/seo-refresh',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.seo_generate_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{"action":"auto_refresh"}'::jsonb
  );
  $$
);

-- Retroactive internal linking (daily 06:30 UTC, after generation)
SELECT cron.schedule(
  'seo-retrolink-daily',
  '30 6 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/seo-retrolink',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.seo_generate_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{"action":"auto_link"}'::jsonb
  );
  $$
);
