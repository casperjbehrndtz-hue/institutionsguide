# IMPLEMENTATION_PLAN.md — Institutionsguide.dk

<!-- Generated and maintained by Ralph. Do not edit while Ralph is running. -->

## Status: Active — Generated 2026-04-05

## Backpressure Status (all green)
- `npm run build` — 0 errors, 0 warnings, 1939 pages pre-rendered
- `npx tsc -b` — 0 type errors
- `console.log` grep — 0 hits
- `TODO/FIXME/HACK` grep — 0 hits
- Bundle: react-vendor 220KB (known acceptable), chart-vendor 436KB (lazy), map-vendor 187KB (lazy)

---

## Gap Analysis Summary

### 1. SEO (specs/seo-dominance.md) — HIGHEST PRIORITY

**Done:**
- SEOHead on all pages except PrivacyPage, TermsPage
- Canonical URLs + og:title/description/url/image + hreflang da/x-default on all SEOHead pages
- JsonLd on 14 pages: HomePage (WebSite+SearchAction, FAQ), InstitutionPage (ChildCare/School + BreadcrumbList), CategoryPage (BreadcrumbList + ItemList), KommunePage (BreadcrumbList + ItemList), BlogPost (BlogPosting), BlogIndex (ItemList), GymnasiumPage, NormeringPage, NormeringKommunePage (+ FAQ), PrissammenligningPage, BestSchoolPage, BestDagtilbudPage, BestValuePage, CheapestPage
- Visible Breadcrumbs on 18 pages (most content pages)
- Sitemap.xml with ~8500 URLs
- RelatedSearches component on category/kommune pages
- 1939 pre-rendered pages with unique titles + descriptions

**Missing:**
- ~~**P0-SEO-1**: CategoryMunicipalityPage JSON-LD~~ ✅ DONE — BreadcrumbList + ItemList added
- ~~**P0-SEO-2**: PrivacyPage + TermsPage SEOHead~~ ✅ DONE
- ~~**P1-SEO-3**: 9 pages + BlogPost missing BreadcrumbList JSON-LD~~ ✅ DONE
- ~~**P1-SEO-4**: 6 pages missing visible Breadcrumbs~~ ✅ DONE
- ~~**P1-SEO-5**: CategoryMunicipalityPage contextual intro text~~ ✅ DONE
- **P1-SEO-6**: og:image is same static SVG on all pages — no page-specific images
- **P2-SEO-7**: No title/description length validation (dynamic titles can exceed 60/155 chars)
- **P2-SEO-8**: Blog template missing table of contents for long articles
- ~~**P2-SEO-9**: BlogPost BreadcrumbList JSON-LD~~ ✅ DONE (covered in P1-1)
- **P2-SEO-10**: No "Similar institutions" internal linking component on detail pages

### 2. UX/Design (specs/ux-design.md)

**Done:**
- Fraunces + DM Sans fonts properly configured and used everywhere
- Color system consistent (CSS variables: primary, accent, success, warning, destructive, muted)
- Card design consistent (.card class in index.css, used everywhere)
- Filter bar visible + sticky on category pages
- Score ring on institution pages
- Map toggle on category pages
- Skeleton screens on 10 pages
- Mobile responsive layout with 375px support
- Dark mode support
- ErrorBoundary wraps all routes
- All images have alt text
- Touch targets mostly ≥44px
- No horizontal overflow at 375px
- Compare page has responsive tables + charts

**Missing:**
- ~~**P1-UX-1**: Skeleton loading screens~~ ✅ DONE — 7 spinner pages replaced; 6 others use static data or already had skeletons
- **P2-UX-2**: Gate modal close button touch target too small (p-1.5 ≈ 32px, needs 44px)
- **P2-UX-3**: Gate modal not full-screen on mobile (max-w-md on all breakpoints)
- **P2-UX-4**: 2 ad-hoc dark mode hex values in InstitutionGateModal.tsx

### 3. Conversion/Gating (specs/conversion-gating.md)

**Done:**
- InstitutionGateModal with single email field + clear value prop
- GatedSection with blur effect + "Lås op med email" CTA
- Gate state persists in localStorage (7-day expiry)
- Post-gate immediate access (no email confirmation)
- Cross-sell consent checkbox in gate modal
- Free vs gated content split exists
- SuiteBar with ParFinans/Børneskat/NemtBudget links (in footer)

**Missing:**
- ~~**P2-CONV-1**: Gate conversion analytics~~ ✅ DONE — 4 custom PostHog events added
- **P2-CONV-2**: Cross-sell nudges only in footer/SuiteBar — not strategically placed after gate unlock on report pages
- **P3-CONV-3**: Gate modal not full-screen on mobile

### 4. Data Quality (specs/data-quality.md)

**Done:**
- DataFreshness + DataAttribution components exist and work
- institutionScore.ts computes composite scores with MetricScore breakdown
- /metode page explains scoring methodology
- Build succeeds without Supabase credentials (graceful null fallback)
- Missing values handled with conditional rendering / "–" fallback

**Missing:**
- ~~**P1-DATA-1**: DataFreshness on all data-driven pages~~ ✅ DONE — now on 18/28 pages (all data-driven ones)

### 5. Performance/Code (specs/performance-code.md)

**Done:**
- All routes lazy-loaded via lazyRetry()
- Leaflet lazy-loaded on map pages only
- Recharts lazy-loaded on chart pages only
- ErrorBoundary wraps all routes
- Zero console.log in production
- No `any` types in scoring/pricing core (only in analytics window casts)
- No commented-out code blocks

**Missing:**
- **P2-CODE-1**: 19 files over 400 lines (worst: GuidePage 918, InstitutionPage 911, HomePage 841, institutionScore.ts 839)
- ~~**P2-CODE-2**: Core test coverage~~ ✅ DONE — 5 test files, 74 tests total
- **P3-CODE-3**: Lighthouse audit needed (Performance ≥ 90, Accessibility ≥ 90)

---

## Prioritized Task List

### P0 — SEO-Critical (fix first)

#### ~~P0-1: Add JSON-LD to CategoryMunicipalityPage~~ ✅ DONE
Added BreadcrumbList (Forside → Kategori → Kommune → Page) + ItemList (top 10 institutions) JSON-LD to both the React component (`CategoryMunicipalityPage.tsx`) and the prerender script (`prerender-pages.mjs`). Verified in `dist/vuggestue/koebenhavn/index.html`.

#### ~~P0-2: Add SEOHead to PrivacyPage and TermsPage~~ ✅ DONE
Added SEOHead with unique title, description, canonical URL, and OG tags to both PrivacyPage (`/privatliv`) and TermsPage (`/vilkaar`).

### P1 — High Impact SEO + UX

#### ~~P1-1: Add JSON-LD BreadcrumbList to 9 remaining content pages~~ ✅ DONE
Added BreadcrumbList JSON-LD to all 10 pages: VsPage, ComparePage, FindPage, FripladsPage, GuidePage, MetodePage, TotalCostPage, AboutPage, FavoritesPage, and BlogPost.

#### ~~P1-2: Add visible Breadcrumbs to 6 pages missing them~~ ✅ DONE
Added Breadcrumbs component to CategoryPage, FindPage, GymnasiumPage, AboutPage, PrivacyPage, and TermsPage.

#### ~~P1-3: Add contextual intro text to CategoryMunicipalityPage~~ ✅ DONE
Added dynamically generated intro paragraph with ownership mix (kommunale vs private/selvejende) and price comparison to national average. Unique per category/municipality combination.

#### ~~P1-4: Add skeleton loading screens to pages with spinners~~ ✅ DONE
Replaced spinner loading states with skeleton screens on 7 pages: CategoryMunicipalityPage, CheapestPage, VsPage, NormeringKommunePage, FindPage, FavoritesPage, BlogPost. The remaining 6 pages (TotalCostPage, FripladsPage, GuidePage, ComparePage, AboutPage) use static data with no loading state; BlogIndex already had inline skeleton-style loading.

#### ~~P1-5: Add DataFreshness to 11 data-driven pages missing it~~ ✅ DONE
Added DataFreshness component to CategoryMunicipalityPage, CheapestPage, VsPage, KommunePage, BestValuePage, NormeringKommunePage, TotalCostPage, PrissammenligningPage, ComparePage, FindPage, and FripladsPage.

#### ~~P1-6: Add core test coverage~~ ✅ DONE
Added 3 test files with 40 new tests (74 total): friplads.test.ts (income thresholds, sibling discounts, age-based rates), institutionScore.test.ts (school/dagtilbud scoring, grade boundaries), preferenceScore.test.ts (ranking, distance filtering, data completeness).

### P2 — Conversion + Data + Code Polish

#### ~~P2-1: Implement gate conversion analytics~~ ✅ DONE
Added 4 PostHog custom events: gate_impression (modal opens), gate_email_submitted (form submitted), gate_unlocked (access granted), gated_content_viewed (after unlock on InstitutionPage).

#### P2-2: Cross-sell nudges on gated report pages
**What**: After gate unlock, show contextual links to ParFinans/Børneskat/NemtBudget on the institution report (not on free content). SuiteBar component already has the link logic.
**Files**: `src/pages/InstitutionPage.tsx`, potentially extract from `src/components/shared/SuiteBar.tsx`
**Acceptance**: Cross-sell cards appear below report content only after unlock.
**Verify**: Visual check after unlocking gate

#### P2-3: Gate modal mobile optimization
**What**: Make gate modal full-screen on mobile (sm breakpoint). Fix close button touch target (currently ~32px, needs 44px).
**Files**: `src/components/shared/InstitutionGateModal.tsx`
**Acceptance**: Modal fills viewport on mobile (<640px). Close button has min-w/h 44px.
**Verify**: Visual check at 375px

#### P2-4: Blog template — table of contents + related articles
**What**: Add auto-generated table of contents for posts with >3 headings. Add related articles section at bottom.
**Files**: `src/pages/BlogPost.tsx`
**Acceptance**: Long posts show ToC; all posts show related articles.
**Verify**: Visual check on a blog post

#### P2-5: Title/description length validation
**What**: Add truncation logic in SEOHead to enforce max 60 char titles and 155 char descriptions. Log warning if truncated.
**Files**: `src/components/shared/SEOHead.tsx`
**Acceptance**: No title >60 chars, no description >155 chars in rendered HTML.
**Verify**: `npm run build`, spot-check pre-rendered HTML

#### P2-6: Refactor large files (>400 lines)
**What**: Split the 19 files exceeding 400 lines. Extract sub-components, move calculation helpers to utils.
**Priority targets**: GuidePage (918→wizard steps), InstitutionPage (911→sections), HomePage (841→hero/FAQ/sections), institutionScore.ts (839→school/dagtilbud modules), TotalCostPage (694), FripladsPage (622), DataContext (614→smaller contexts), CategoryPage (607)
**Acceptance**: No file over 400 lines.
**Verify**: `find src/ -name "*.tsx" -o -name "*.ts" | xargs wc -l | sort -rn | head -5` shows max ≤ 400

### P3 — Polish

#### P3-1: "Similar institutions" internal linking on detail pages
**What**: Add a section to InstitutionPage showing 3-5 nearby or same-category institutions in the same kommune. Improves internal linking and SEO.
**Files**: `src/pages/InstitutionPage.tsx` or new component
**Acceptance**: Detail pages show linked similar institutions.
**Verify**: Visual check on any institution page

#### P3-2: Dynamic og:image per page type
**What**: Generate or select page-specific og:image (e.g., category icon, municipality name). Currently all pages use static `/og-image.svg`.
**Files**: `src/components/shared/SEOHead.tsx`, potentially API route or build-time generation
**Acceptance**: Different og:image for at least institution, category, and kommune page types.
**Verify**: Check og:image meta tag on different page types

#### P3-3: NotFoundPage search + navigation
**What**: Add search bar and popular category/kommune links to 404 page for user recovery.
**Files**: `src/pages/NotFoundPage.tsx`
**Acceptance**: 404 page has search input + category links.
**Verify**: Visual check on /nonexistent-page

#### P3-4: Lighthouse audit and optimization
**What**: Run Lighthouse on /, /vuggestue, /institution/[slug]. Target Performance ≥ 90, Accessibility ≥ 90.
**Files**: Various (depends on findings)
**Acceptance**: Lighthouse scores ≥ 90 on key page types.
**Verify**: `npx lighthouse` on key URLs

---

## Implementation Order

1. **P0-1 + P0-2** — Fix critical SEO gaps (JSON-LD on money pages, SEOHead on legal pages)
2. **P1-1 + P1-2** — Complete JSON-LD and breadcrumb coverage across all pages
3. **P1-3** — Add contextual intro text to CategoryMunicipalityPage
4. **P1-4** — Skeleton screens everywhere
5. **P1-5** — DataFreshness consistency
6. **P1-6** — Test coverage for core logic
7. **P2-1 through P2-6** — Conversion tracking, cross-sell, modal polish, file splitting
8. **P3-1 through P3-4** — Internal linking, og:image, 404, Lighthouse

Each task verified against backpressure before moving to next:
```bash
npm run build          # zero errors
npx tsc -b             # zero type errors
npm run test:run       # all tests pass
```
