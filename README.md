# Institutionsguiden

Uafhængig sammenligningsside for danske vuggestuer, børnehaver, dagplejere, folkeskoler, SFO og efterskoler.
**[institutionsguiden.dk](https://www.institutionsguiden.dk)** · React 19 + Vite 8 + Supabase + Vercel.

---

## Hvad sitet er

- **10.000+ institutioner** med officielle data fra Børne- og Undervisningsministeriet, Danmarks Statistik, Den Nationale Trivselsmåling, kommunale tilsynsrapporter
- **Kommune-intelligens (MIL)** — volumen-vægtet kvalitetsindeks for alle 98 kommuner med Bayesian shrinkage og brugerdefinerede vægte
- **8.664 prerendrede sider** for fuld SEO-dækning (sitemap, schema.org, programmatic landing pages per kommune+kategori)
- **AI-genereret blog** via Anthropic Claude (selv-fodrende keyword-kø)

## Arkitektur

```
┌──────────────────────────────────────────────────────────┐
│ Vercel (frontend + edge middleware)                      │
│ ├── React SPA (Vite-built)                               │
│ ├── 8.664 prerendrede HTML-sider (postbuild)             │
│ └── middleware.ts — bot detection + SSR HTML for crawlers│
├──────────────────────────────────────────────────────────┤
│ Supabase                                                 │
│ ├── Postgres (blog_posts, seo_keywords, cron_runs, …)    │
│ ├── Edge Functions (Deno)                                │
│ │   ├── seo-generate    — AI blog generation (auto-seed) │
│ │   ├── blog-publish    — write blog post                │
│ │   ├── seo-refresh     — refresh existing articles      │
│ │   ├── seo-retrolink   — add internal links to old posts│
│ │   ├── cron-health     — monitoring endpoint            │
│ │   ├── institution-chat — AI chat per institution       │
│ │   └── generate-assessment — AI vurdering per institution│
│ └── Storage (assets, blog images)                        │
├──────────────────────────────────────────────────────────┤
│ Anthropic Claude API — all AI features                   │
├──────────────────────────────────────────────────────────┤
│ GitHub Actions (cron-driven jobs)                        │
│ ├── seo-generate.yml      — every 2 days                 │
│ ├── seo-refresh.yml       — weekly                       │
│ ├── seo-retrolink.yml     — biweekly                     │
│ ├── refresh-data.yml      — weekly                       │
│ ├── scrape-tilsyn.yml     — biweekly                     │
│ ├── cron-health.yml       — daily (alerting)             │
│ └── deploy-supabase.yml   — on push to functions/        │
└──────────────────────────────────────────────────────────┘
```

## Sådan kører du lokalt

```bash
# 1. Install
npm install

# 2. Set up env (copy .env.example → .env.local + fill in)
cp .env.example .env.local

# 3. Dev server (Vite + HMR)
npm run dev          # http://localhost:5173

# 4. Production build (with prerender)
npm run build        # → dist/  (8.664+ pages)
npm run preview      # serve dist/ on http://localhost:4173
```

### Påkrævede environment variables

```bash
# Frontend (Vite — must be VITE_-prefixed to be exposed to browser)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ…
VITE_GOOGLE_MAPS_KEY=AIza…           # Streetview thumbnails
VITE_POSTHOG_KEY=phc_…               # Analytics
VITE_SENTRY_DSN=https://…@sentry.io  # Error tracking (optional)

# Build-time scripts (also used by GitHub Actions)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ…       # ONLY in CI/build, never client

# Supabase Edge Functions (set via supabase secrets set)
ANTHROPIC_API_KEY=sk-ant-…           # Claude API for blog + chat + AI assessment
SEO_GENERATE_SECRET=…                # Bearer token for cron triggering
BLOG_PUBLISH_SECRET=…                # Bearer token for blog publish
```

## Test

```bash
npm run test:run            # 279 unit tests (vitest)
npm run test:e2e            # Playwright (auto-starts preview server)
npm run test:e2e:ui         # Playwright with UI

# Health-check (catches dead kommune pages, slug bugs, data gaps)
node scripts/health-check-kommuner.mjs
node scripts/health-check-kommuner.mjs --base=http://localhost:4173
```

## Deploy

**Frontend:** Auto-deploys via Vercel on push to `master`. Vercel runs `npm run build` which:
1. `tsc -b` — typecheck
2. `vite build` — bundle
3. `prebuild`: `generate-sitemap.mjs` + `generate-seo-data.mjs` + `build-postnummer-index.mjs`
4. `postbuild`: `prerender-articles.mjs` + `prerender-pages.mjs` (~8.664 pages)

**Supabase:** Auto-deploys via `.github/workflows/deploy-supabase.yml`:
- Detects changes in `supabase/functions/**` or `supabase/migrations/**`
- Runs `supabase db push` (migrations) and `supabase functions deploy <name>` (each changed function)
- Required secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_URL`

**Manual deploy:**
```bash
supabase functions deploy seo-generate
supabase db push
```

## Dataflow

Static institution data lives in `public/data/`:
- `vuggestue-data.json`, `boernehave-data.json`, `dagpleje-data.json`, `skole-data.json`, `sfo-data.json`
- `institution-stats.json`, `kommune-stats.json` — extended quality data
- `normering-data.json`, `parent-satisfaction.json`, `tilsynsrapporter.json`
- `postnummer-index.json` — generated at build time
- `seo-meta.json` — for middleware bot rendering

These are refreshed by `npm run refresh:all` (also runs as `refresh-data.yml` GitHub Action).

## Monitoring

`/cron-health` (Supabase Edge Function) reports per-job freshness:
```bash
curl https://xxxx.supabase.co/functions/v1/cron-health \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

Returns 200 when all jobs are fresh, 503 when any are stale (defined per-job in `cron-health/index.ts`).
GitHub Action `cron-health.yml` runs this daily at 09:00 UTC and emails on failure.

Sentry catches runtime errors (set `VITE_SENTRY_DSN`).
PostHog tracks the conversion funnel (set `VITE_POSTHOG_KEY`):
- `landing_view` → `instant_answer_search` → `result_clicked` → `compare_added` → `compare_completed`

## Key files

| File | What |
|---|---|
| `src/pages/HomePage.tsx` | Landing page (Instant Answer + map + MIL preview) |
| `src/components/home/InstantAnswer.tsx` | Hero search with category + sort + persistence |
| `src/components/home/KommuneQualityMap.tsx` | Choropleth-style kommune quality map |
| `src/lib/mi/` | Municipality Intelligence Layer (scoring, percentiles, presets) |
| `src/contexts/TrackContext.tsx` | MIL track + weights state with URL sync |
| `middleware.ts` | Edge middleware — bot detection + SSR HTML |
| `scripts/prerender-pages.mjs` | Postbuild prerender (8.664 pages) |
| `scripts/health-check-kommuner.mjs` | Pre-deploy verification |
| `supabase/functions/seo-generate/` | AI blog generation with auto-seed |
| `supabase/functions/cron-health/` | Cron monitoring endpoint |

## Branding

The brand name is **Institutionsguiden** (matches domain). The historical "Institutionsguide" form was retired in April 2026; do not reintroduce. SEOHead, Footer, Navbar all enforce this.

## Common tasks

**Add a new kommune-level metric to MIL:** Edit `src/lib/mi/metrics.ts`, add to `DAYCARE_METRICS` or `SCHOOL_METRICS`. Update preset weights in `src/lib/mi/presets.ts` if needed. Run tests.

**Add a blog topic:** Insert into `seo_keywords` table with `status='pending'`. The next cron run picks it up. If the queue runs dry, `seo-generate` auto-seeds 10 new keywords via Claude — see `seedKeywordQueue` in that function.

**Add a new prerendered page type:** Edit `scripts/prerender-pages.mjs`. Add the static page to `PAGES` array, or add a programmatic generator like `generateProgrammaticPages()`. Add the route to `src/App.tsx`. Add the route to `scripts/generate-sitemap.mjs`.

**Refresh institution data:** `npm run refresh:all`. Or wait for the weekly `refresh-data.yml` cron.

## License

Proprietary. © 2026 Institutionsguiden. Data is sourced from public Danish government APIs and is reproduced under their respective terms.
