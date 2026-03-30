# Project Status — Institutionsguide.dk

**Last updated**: 2026-03-30

## Overview
Danish childcare & school comparison platform. SPA built with React 19 + Vite 8 + TypeScript + Tailwind CSS 4, deployed on Vercel. Supabase backend for reviews, blog, AI assessments.

## Categories (7)
| Category | Count | Data Quality | Notes |
|---|---|---|---|
| Vuggestue | ~1,200 | Prices, normering | Full coverage |
| Boernehave | ~2,500 | Prices, normering | Full coverage |
| Dagpleje | ~1,800 | Prices | Full coverage |
| Skole | ~1,600 | Quality data (trivsel, karakterer, fravær, kompetence) | STIL + UVM |
| SFO | ~1,200 | Prices | Full coverage |
| Fritidsklub | ~200 | Basic info | No price data from most municipalities |
| Efterskole | 241 | Prices (92%), profiles (99%), student counts (93%) | Enriched from efterskolerne.dk |

## Architecture
- **Data**: Static JSON in `public/data/`, loaded by `DataContext.tsx`
- **Routing**: 30 routes, SPA with `react-router-dom`
- **Search**: Client-side filtering with 250ms debounce, accent-tolerant (æøå)
- **Maps**: Leaflet with marker clustering
- **SEO**: JSON-LD schemas, SSR-like meta via `react-helmet-async`, sitemap generator
- **Security**: Full CSP, HSTS, X-Frame-Options, Permissions-Policy in `vercel.json`

## Recent Changes
- 2026-03-30: Quality review — debounce, CSP fix, broken links, category completeness
- 2026-03-29: Efterskole integration with efterskolerne.dk API enrichment
- 2026-03-28: Fritidsklub category launch
- 2026-03-27: Homepage redesign with video hero

## Known Limitations
- No SSR/SSG — relies on client-side rendering; SEO depends on Googlebot JS execution
- FAQ and income thresholds hardcoded in HomePage
- `institutionScore` scoring model incomplete for fritidsklub/efterskole
- Normering data varies by municipality publication format
