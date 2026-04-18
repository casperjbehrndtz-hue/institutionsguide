# Ralph Log

## Iteration 1 — 2026-04-08 09:51
**Tier**: 2 (Runtime bug)
**Opgave**: Fix rules-of-hooks violation — useMemo called after early return in CategoryPage.tsx
**Ændringer**: CategoryPage.tsx — moved activeFilterCount useMemo before loading/error early returns
**Verifikation**: tsc: ✓ | eslint: 31→30 errors | tests: 117/117 passed | build: not run
**Næste bedste opgave**: ESLint errors — fix no-explicit-any where obvious types exist

## Iteration 2 — 2026-04-08 09:53
**Tier**: 4 (ESLint errors)
**Opgave**: Replace `any` with proper types — TranslationStrings for t prop, ScoreResult, PercentileEntry, UnifiedInstitution, InstitutionStats
**Ændringer**: ActionBar, DetailsSection, PriceSection, QualityDataSection, InstitutionPage, usePercentiles — 6 files
**Verifikation**: tsc: ✓ | eslint: 31→20 errors | tests: 117/117 passed

## Iteration 3 — 2026-04-08 09:55
**Tier**: 4 (ESLint errors)
**Opgave**: Replace `any` with proper types in useComparisonRows (SchoolExtraStats, SFOStats) and PrissammenligningPage ({} as Record<> instead of {} as any)
**Ændringer**: useComparisonRows.ts, PrissammenligningPage.tsx
**Verifikation**: tsc: ✓ | eslint: 20→15 errors | tests: 117/117 passed

## Iteration 4 — 2026-04-08 09:56
**Tier**: 4 (ESLint errors)
**Opgave**: Extract normalizeSearch to shared lib (DRY + fixes only-export-components), fix inline function error in FindPage, wrap setState in queueMicrotask for Supabase hooks
**Ændringer**: Created src/lib/normalizeSearch.ts, updated MunicipalityCombobox, SearchFilterBar, useFilteredInstitutions, FindPage, useMunicipalityPriceTrend, usePriceHistory
**Verifikation**: tsc: ✓ | eslint: 15→11 errors | tests: 117/117 passed

## Iteration 5 — 2026-04-08 10:00
**Tier**: 5 (ESLint warnings)
**Opgave**: Fix 5 exhaustive-deps warnings — add missing deps, remove unnecessary deps, remove unused vars
**Ændringer**: InstitutionChat, InstitutionMap, GuidePage
**Verifikation**: tsc: ✓ | eslint: 11 errors, 3 warnings (was 8) | tests: 117/117 passed

## Iteration 6 — 2026-04-08 10:02
**Tier**: 7 (Large files)
**Opgave**: Extract ComparisonCard and CompareRow from VsPage.tsx
**Ændringer**: Created src/components/vs/ComparisonCard.tsx and CompareRow.tsx, VsPage.tsx 493→377 lines
**Verifikation**: tsc: ✓ | eslint: 11 errors, 3 warnings | tests: 117/117 passed

## Iteration 7 — 2026-04-08 10:03
**Tier**: 7 (Large files)
**Opgave**: Extract ValueScatterChart from BestValuePage.tsx
**Ændringer**: Created src/components/charts/ValueScatterChart.tsx, BestValuePage.tsx 490→384 lines
**Verifikation**: tsc: ✓ | eslint: 11 errors, 3 warnings | tests: 117/117 passed

## Iteration 8 — 2026-04-08 10:05
**Tier**: 7 (Large files)
**Opgave**: Extract map helper components and useDarkMode from InstitutionMap.tsx
**Ændringer**: Created MapHelpers.tsx + hooks/useDarkMode.ts, InstitutionMap.tsx 482→372 lines
**Verifikation**: tsc: ✓ | eslint: 11 errors, 3 warnings | tests: 117/117 passed

## Iteration 9 — 2026-04-08 10:07
**Tier**: 7 (Large files)
**Opgave**: Extract category card data from HomePage
**Ændringer**: Created src/lib/homeCategoryCards.ts, HomePage.tsx 493→482 lines
**Verifikation**: tsc: ✓ | eslint: 11 errors, 3 warnings | tests: 117/117 | build: ✓ (1939 pages)

---

### Iteration 12 — TIER 7: NormeringKommunePage.tsx (468→399 lines)
**Ændringer**: Extracted NormeringTrendChart.tsx, removed unused AGE_GROUP_LABELS/AGE_GROUP_COLORS
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 117/117

---

### Iteration 13 — TIER 7: HomePage.tsx (482→446 lines)
**Ændringer**: Extracted useCategoryStats.ts, usePopularData.ts hooks
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 117/117

### Iteration 14 — TIER 7: FindPage.tsx (463→402 lines)
**Ændringer**: Extracted finderPresets.ts (PRESETS data + Preset interface)
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 117/117

### Iteration 15 — TIER 7: NormeringPage.tsx (432→374 lines)
**Ændringer**: Reused NormeringTrendChart, removed unused AGE_GROUP_COLORS
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 117/117

### Iteration 16 — TIER 7: FripladsPage.tsx (424→274 lines)
**Ændringer**: Extracted FripladsCalculatorForm.tsx (income slider, toggles, selectors)
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 117/117

### Iteration 17 — TIER 7: GymnasiumPage.tsx (420→345 lines)
**Ændringer**: Extracted GymnasiumCard.tsx, MunicipalityBreakdown.tsx, removed unused Link import
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 117/117

---

### Iteration 18 — TIER 8: Tests for normalizeSearch, format, slugs, geo
**Ændringer**: 4 new test files, 29 new tests
**Verifikation**: tests: 146/146

### Iteration 19 — TIER 8: Tests for totalCostCalculator, personalizedPrice
**Ændringer**: 2 new test files, 12 new tests
**Verifikation**: tests: 158/158

### Iteration 20 — TIER 8: Tests for badges
**Ændringer**: 1 new test file, 17 new tests
**Verifikation**: tests: 175/175

### Iteration 21 — TIER 9: Accessibility fixes
**Ændringer**: aria-label on chat toggle, role="dialog" on FavoritesPage modal
**Verifikation**: tsc: ✓ | tests: 175/175

### Iteration 22 — TIER 4: Eliminate all ESLint errors
**Ændringer**: Created src/global.d.ts with PostHogLike interface, replaced (window as any).posthog in 6 files, removed stale eslint-disable
**Verifikation**: ESLint: 0 errors, 2 warnings | tsc: ✓ | tests: 175/175 | build: ✓ (1939 pages)

### Iteration 23 — TIER 8: Tests for childcare rates data
**Ændringer**: 1 new test file, 6 new tests (data integrity: 98 municipalities, no dupes, positive rates)
**Verifikation**: tests: 181/181

---

### Iteration 24 — TIER 8: Tests for dataVersions and institutionGate
**Ændringer**: 2 new test files, 14 new tests (date formatting, gate unlock/expiry)
**Verifikation**: tests: 195/195

### Iteration 25 — TIER 8: Tests for guideEngine
**Ændringer**: 1 new test file, 10 new tests (recommendation scoring, age routing, tie-breaking)
**Verifikation**: tests: 205/205

### Iteration 26 — TIER 13: Standardize JsonLd usage
**Ændringer**: Replaced inline `<script>` JSON-LD with shared `<JsonLd>` in 4 ranking pages
**Verifikation**: tsc: ✓ | tests: 205/205

---

### Iteration 28 — TIER 9: Search input semantics
**Ændringer**: Changed 8 search inputs from type="text" to type="search" in 7 files (SearchFilterBar, CategoryPage, HeroSection, NotFoundPage, PrissammenligningPage, NormeringPage, GymnasiumPage)
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 211/211

### Iteration 29 — TIER 8: Tests for schema.ts
**Ændringer**: 1 new test file, 13 new tests (institutionSchema, faqSchema, breadcrumbSchema, websiteSchema, itemListSchema)
**Verifikation**: tests: 224/224

### Iteration 30 — TIER 5: Eliminate last 2 ESLint warnings
**Ændringer**: useAssessment.ts + useReviewAnalysis.ts — used refs to properly express deps
**Verifikation**: ESLint: **0 errors, 0 warnings** | tsc: ✓ | tests: 224/224

### Iteration 31 — TIER 8: Tests for getPercentileLabel
**Ændringer**: Added 6 tests to insights.test.ts (Danish + English labels)
**Verifikation**: tests: 226/226

### Iteration 32 — TIER 10: Sticky table headers on ranking pages
**Ændringer**: Added sticky thead on CheapestPage, BestSchoolPage, BestValuePage, PrissammenligningPage, NormeringPage
**Verifikation**: tsc: ✓ | tests: 226/226

### Iteration 33 — TIER 10: Back-to-top button
**Ændringer**: Created BackToTop.tsx, added to Layout — floating button appears after 600px scroll
**Verifikation**: tsc: ✓ | tests: 226/226

### Iteration 34 — TIER 10: Improved institution cards with quality badges
**Ændringer**: CategoryMunicipalityPage + KommunePage — cards now show quality score (X/5), hover shadow, better layout
**Verifikation**: tsc: ✓ | tests: 226/226

### Iteration 35 — TIER 10: Visual price/score bars in ranking tables
**Ændringer**: CheapestPage price bar, BestSchoolPage score bar — visual indicators in table cells
**Verifikation**: tsc: ✓ | tests: 226/226 | build: ✓ (1939 pages)

### Iteration 36 — TIER 10: #1 row highlighting in ranking tables
**Ændringer**: CheapestPage, BestSchoolPage, BestValuePage — top row gets green highlight
**Verifikation**: tsc: ✓ | tests: 226/226

### Iteration 37 — TIER 10: ScrollReveal on CheapestPage and CategoryMunicipalityPage
**Ændringer**: Added fade-in animations to hero and stats sections
**Verifikation**: tsc: ✓ | tests: 226/226 | build: ✓ (1939 pages)

### Iteration 50 — TIER 10: Key stats dashboard on BestDagtilbudPage
**Ændringer**: BestDagtilbudPage — 4-column stat row (bedste score/gns. score/total/gns. pris) with AnimatedNumber
**Verifikation**: tsc: ✓ | tests: 226/226

### Iteration 49 — TIER 10: Key stats dashboard on BestSchoolPage
**Ændringer**: BestSchoolPage — 4-column stat row (bedste score/gns. score/folkeskoler/friskoler) with AnimatedNumber
**Verifikation**: tsc: ✓ | tests: 226/226

### Iteration 48 — TIER 10: ScrollReveal on NormeringKommunePage
**Ændringer**: NormeringKommunePage — hero + stat cards wrapped in ScrollReveal
**Verifikation**: tsc: ✓ | tests: 226/226

### Iteration 47 — TIER 10: Quick stats dashboard on CheapestPage
**Ændringer**: CheapestPage — 4-column stat row (billigste/median/gennemsnit/landsgennemsnit) with AnimatedNumber
**Verifikation**: tsc: ✓ | tests: 226/226

### Iteration 46 — TIER 10: Price indicator tags on KommunePage cards
**Ændringer**: KommunePage — each institution card shows "Under gns."/"Tæt på gns."/"Over gns." tag color-coded by price vs. category average
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

### Iteration 45 — TIER 10: ScrollReveal on VsPage
**Ændringer**: VsPage — hero and comparison cards wrapped in ScrollReveal with stagger
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

### Iteration 44 — TIER 10: Remove all emojis from UI
**Ændringer**: RankedCard (border-accent instead of medal emojis), BestSchoolPage, BestValuePage (same), MatchCard (#1/#2/#3 instead of emojis), NotFoundPage (text-only category links)
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

### Iteration 43 — User feedback: professional Danske Bank-style design
**Feedback gemt**: Design skal være professionelt og Danske Bank-agtigt, ingen emojis, intet AI-slop

### Iteration 42 — TIER 10: Animated institution count on hero sections
**Ændringer**: HeroSection (homepage), CategoryPage, KommunePage — institution count animates from 0 on scroll
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

### Iteration 41 — TIER 10: Price position bars on institution cards
**Ændringer**: CategoryMunicipalityPage — each card now shows a color-coded bar (green/yellow/red) indicating where the price falls in the range
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

### Iteration 40 — TIER 10: Annual savings callout on CheapestPage
**Ændringer**: CheapestPage — prominent green card showing "Potentiel besparelse: X kr./år" with AnimatedNumber count-up
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

### Iteration 39 — TIER 10: Gold/silver/bronze medal styling on ranking pages
**Ændringer**: RankedCard, BestSchoolPage, BestValuePage — top 3 entries show medal emojis + colored bg (amber/gray/orange)
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

### Iteration 38 — TIER 10: AnimatedNumber count-up on stat cards
**Ændringer**: Created AnimatedNumber.tsx (IntersectionObserver + rAF with ease-out cubic), applied to stat cards on CategoryMunicipalityPage (4 price stats), KommunePage (4 rate cards), PrissammenligningPage (4 national averages), BestValuePage (2 stat cards)
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

---

### Iteration 84 — TIER 8: Tests for fripladsFaqData
**Ændringer**: 1 new test file, 3 new tests (DA/EN item count, q/a presence)
**Verifikation**: tests: 254/254 across 24 files

### Iteration 83 — TIER 9: role=search on hero search bar
**Ændringer**: HeroSection — search container now has role="search" for screen readers
**Verifikation**: tsc: ✓ | tests: 251/251

### Iteration 82 — TIER 10: Consistent section separators + max-w-5xl
**Ændringer**: PopularSearches, UseCases, HomeToolsSection — border-t border-border/30, HomeToolsSection widened to max-w-5xl
**Verifikation**: tsc: ✓ | tests: 251/251

### Iteration 80 — TIER 8: Tests for faqData
**Ændringer**: 1 new test file, 4 new tests (DA/EN count match, q/a presence)
**Verifikation**: tests: 251/251 across 23 files

### Iteration 79 — TIER 8: Tests for finderPresets
**Ændringer**: 1 new test file, 5 new tests (preset structure, unique IDs, positive weights, school/daycare coverage)
**Verifikation**: tests: 247/247 across 22 files

### Iteration 77 — TIER 10: Homepage redesign — professional premium layout
**Ændringer**: Major homepage overhaul:
- homeCategoryCards.ts: Skoler/Vuggestuer/Børnehaver as 3 featured (was Skoler/Efterskoler), metric field added
- CategoryCards.tsx: Redesigned with accent bars, stat rows, rounded-2xl, larger spacing
- HeroSection.tsx: Trust stats as 3 separated columns, more breathing room (py-20), larger search
- PopularSearches.tsx: Now 6 cards incl. cheapest vuggestuer/børnehaver
- UseCases.tsx: 4-column grid with icons (prices, schools, normering, friplads)
- usePopularData.ts: Added cheapestVuggestue + cheapestBoernehave data
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 247/247 | build: ✓ (1939 pages)

### Iteration 76 — TIER 9: scope=col on all remaining table headers
**Ændringer**: BestValuePage, NormeringPage, VsPage, GuideResults, ComparisonTable, TotalCostComparison + role="table" on 3 missing tables + dark mode fix on ComparePage remove button
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226→242/242

### Iteration 75 — TIER 10: DataFreshness on GuidePage
**Ændringer**: GuidePage — added DataFreshness component
**Verifikation**: tsc: ✓ | tests: 242/242

### Iteration 74 — TIER 9: Dark mode fix ComparePage remove button
**Ændringer**: ComparePage — hover:bg-red-100 → + dark:hover:bg-red-950/30
**Verifikation**: tsc: ✓ | tests: 242/242

### Iteration 73 — TIER 7: Extract PriceAnalysis from CheapestPage (413→373)
**Ændringer**: Created src/components/cheapest/PriceAnalysis.tsx, reduced CheapestPage
**Verifikation**: tsc: ✓ | tests: 242/242

### Iteration 72 — TIER 8: Tests for bedsteCategories + categoryConstants
**Ændringer**: 2 new test files, 16 new tests (category validation, label completeness)
**Verifikation**: tests: 242/242 across 21 files

### Iteration 71 — TIER 9: scope=col + role=table on remaining tables
**Ændringer**: BestValuePage, NormeringPage, VsPage, GuideResults, ComparisonTable, TotalCostComparison — added scope="col" and role="table"
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

### Iteration 70 — TIER 9: Table accessibility (role=table, scope=col)
**Ændringer**: BestSchoolPage, BestValuePage, CheapestPage, NormeringPage, VsPage — added role="table" and scope="col" to table headers
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

### Iteration 69 — TIER 7: Extract SchoolRow from BestSchoolPage
**Ændringer**: Created src/components/ranking/SchoolRow.tsx, BestSchoolPage 426→361 lines
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

### Iteration 68 — TIER 7: Extract bedste category constants
**Ændringer**: Created src/lib/bedsteCategories.ts, BestDagtilbudPage 446→412 lines
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

### Iteration 67 — TIER 10: ShareButton on GymnasiumPage
**Ændringer**: GymnasiumPage — ShareButton in hero section
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

### Iteration 66 — TIER 10: ShareButton on CategoryPage
**Ændringer**: CategoryPage — ShareButton in hero section
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

### Iteration 65 — TIER 10: ShareButton on KommunePage
**Ændringer**: KommunePage — ShareButton in hero section
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

### Iteration 64 — TIER 10: ShareButton on FripladsPage
**Ændringer**: FripladsPage — ShareButton in hero section
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

### Iteration 63 — TIER 10: AnimatedNumber + ShareButton on NormeringPage
**Ændringer**: NormeringPage — hero kommune count animates, ShareButton added
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

### Iteration 62 — TIER 10: ShareButton on CategoryMunicipalityPage
**Ændringer**: CategoryMunicipalityPage — ShareButton in hero section
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

### Iteration 61 — TIER 10: ScrollReveal on BlogIndex hero
**Ændringer**: BlogIndex — hero section wrapped in ScrollReveal
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

### Iteration 60 — TIER 10: ScrollReveal on AboutPage
**Ændringer**: Data sources, FAQ, and contact sections wrapped in ScrollReveal
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

### Iteration 59 — TIER 10: Row numbering on NormeringPage kommune table
**Ændringer**: Added # column + row index to normering kommune ranking table
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

### Iteration 58 — TIER 10: AnimatedNumber on GymnasiumPage hero count
**Ændringer**: GymnasiumPage — hero institution count animates from 0 on scroll
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

### Iteration 57 — TIER 10: Row numbering on PrissammenligningPage table
**Ændringer**: Added # column header + row index numbers to the municipality comparison table
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

### Iteration 56 — TIER 9: Dark mode hover states for favorite buttons
**Ændringer**: ActionBar, InstitutionDetail, InstitutionListCard, FavoritesPage — hover:bg-red-50 → + dark:hover:bg-red-950/30
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

### Iteration 55 — TIER 9: Dark mode fixes for colored info cards
**Ændringer**: CheapestPage fripladstip card (bg-blue-50→dark:bg-blue-950/30), InstitutionSidebar tilsyn badge (amber dark variants), link hover color
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

### Iteration 54 — TIER 10: ShareButton on VsPage + dark mode fix
**Ændringer**: VsPage — ShareButton in hero, price winner card dark mode colors (bg-green-950/30, border-green-800, text-green-300)
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

### Iteration 53 — TIER 10: ScrollReveal on ComparePage and FindPage
**Ændringer**: ComparePage — bar chart + comparison table sections; FindPage — methodology CTA
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

### Iteration 52 — TIER 10: ScrollReveal on HomePage below-fold sections
**Ændringer**: PopularSearches, UseCases, HomeToolsSection, HomeFAQ, SEOLinks, EmailCapture wrapped in ScrollReveal
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

### Iteration 51 — TIER 10: ShareButton on ranking/comparison pages
**Ændringer**: Added ShareButton (Web Share API + clipboard fallback) to hero sections on CheapestPage, BestSchoolPage, BestValuePage, BestDagtilbudPage, PrissammenligningPage, NormeringKommunePage
**Verifikation**: tsc: ✓ | eslint: ✓ | tests: 226/226

---

## Running totals (v1: iteration 1-84)
- **ESLint**: 31 errors, 8 warnings → **0 errors, 0 warnings**
- **Files over 400 lines**: 14 → 7
- **Build**: 1,939 → 8,563 pre-rendered pages
- **Tests**: 117 → **268** across 26 files (was 6 files)
- **Accessibility**: aria-labels, dialog roles, type="search", sticky headers, scope=col, role=table, role=search
- **UX**: Back-to-top, sticky headers, quality badges, price/score bars, #1 highlighting, ScrollReveal (14+ pages), AnimatedNumber, ShareButton (10+ pages), row numbering, DataFreshness, homepage redesign
- **Dark mode**: Full pass on info cards, favorite buttons, winner cards, category cards
- **Type safety**: PostHog global type declaration, zero `any` in core logic
- **Consistency**: All JSON-LD uses shared `<JsonLd>` component

---

# RALPH v2 — Starter fra iteration 85

## v2 Baseline (2026-04-10)
```
Build:     0 errors, 8563 pages
TSC:       0 errors
ESLint:    0 errors, 0 warnings
Tests:     268/268 (26 filer)
Files>400: 7 (InstitutionPage 474, HomePage 447, BestDagtilbudPage 412, PrissammenligningPage 411, CategoryPage 405, CategoryMunicipalityPage 405, NormeringKommunePage 404)
```

v2 fokus: produkt-kvalitet > kode-kvalitet. Tænk som en forælder, ikke bare en developer.

### Iteration 85 — TIER 13: InstitutionPage.tsx (474→399 lines)
**Opgave**: Extract helpers + use shared Breadcrumbs on the most important page type
**Hvorfor**: 7,113 pre-rendered detail pages — cleaner code enables faster product iteration
**Ændringer**: Created lib/institutionPageHelpers.ts (buildChatContext, buildInstitutionFaqs, categoryPath), replaced inline breadcrumb with shared Breadcrumbs component, simplified tilsyn hooks
**Verifikation**: tsc: ✓ | tests: 268/268 | build: ✓ (8563 pages)
**Produkteffekt**: Consistent breadcrumb UX across all pages (mobile-responsive truncation now applies to institution pages too)
**Næste**: Continue TIER 13 — HomePage.tsx (447 lines) is next largest

### Iteration 86 — TIER 13: HomePage.tsx (447→395 lines)
**Opgave**: Extract MobileViewToggle, FilterSummaryBar, HomeDiscovery + deduplicate map props
**Hvorfor**: HomePage is landing page — cleaner structure enables faster UX iteration
**Ændringer**: 3 new components, deduplicated InstitutionMap props
**Verifikation**: tsc: ✓ | tests: 268/268 | build: ✓ (8563 pages)
**Produkteffekt**: No user-facing change, but structure now allows independent iteration on discovery sections
**Næste**: TIER 13 — remaining files >400 lines (BestDagtilbudPage 412, PrissammenligningPage 411, CategoryPage 405, CategoryMunicipalityPage 405, NormeringKommunePage 404)

### Iteration 87 — PRODUKT-BUGS: Quality-first + broken links + gymnasium cleanup
**Opgave**: Fix 6 product bugs found during systematic scan
**Hvorfor**: User explicitly demanded product bugs > code refactoring. Quality-first principle.
**Ændringer**:
1. PopularSearches.tsx: Replaced "Billigste vuggestuer/børnehaver" lists with "Find den bedste" quality-first link cards
2. usePopularData.ts: Removed unused cheapestVuggestue/cheapestBoernehave data
3. InstitutionPage.tsx: Always show "Anmeldelser" tab (was hidden when 0 reviews — contradicted always-visible ReviewSection)
4. CategoryPage.tsx + useFilterParams.ts: Default sort changed from "price" to "name" for quality-first UX
5. Navbar.tsx + Footer.tsx: Removed gymnasium links (0 data — sends users to empty page)
6. PopularSearches.tsx: Fixed broken /bedste-skoler links → /skole (404 bug)
7. sitemap-static.xml: Removed broken /bedste-skoler URL, duplicate municipality entries (Københavns, Bornholms Regionskommune, Vesthimmerlands), Christiansø
8. NotFoundPage.tsx: Added efterskole to 404 category shortcuts
**Verifikation**: tsc: ✓ | tests: 279/279 | 5 commits pushed
**Produkteffekt**: No more 404s from homepage links, quality-first messaging throughout, gymnasium hidden, reviews tab always visible
**Næste**: Continue scanning for product bugs

### Iteration 88 — PRODUKT-BUG: Outdated FAQ + systematic scan
**Opgave**: Fix outdated FAQ + comprehensive product scan
**Ændringer**:
1. faqData.ts: Fixed outdated FAQ claiming normering data isn't available (it is — on /normering page and institution profiles)
**Scanned and verified (no bugs found)**:
- EfterskoleDetails.tsx: Correctly shows profiles, class levels, available spots, edkUrl
- HeroImage.tsx: Shows efterskolerne.dk images with fallback to Street View
- InstitutionDetail.tsx: yearlyPrice shown correctly for efterskoler
- PriceSection.tsx: Dual weekly/yearly price display for efterskoler, handles undefined gracefully
- KommunePage.tsx: Correctly hides empty categories (gymnasium shows nothing)
- ScrollToTop.tsx: Proper scroll restoration on browser back
- ErrorBoundary: exists and wraps app
- DataContext: Promise.all parallel loading, graceful failure handling
- ComparePage, GuidePage, FindPage: All functional
- robots.txt, sitemaps: Correctly configured
- Build: 0 errors, clean output
- **Missing PWA icons**: icon-192.png and icon-512.png referenced in manifest.json don't exist (noted, requires design asset)
**Verifikation**: tsc: ✓ | tests: 279/279 | build: ✓
**Næste**: Look for performance issues, SEO meta improvements, or UX friction points

### Iteration 89 — PRIORITET 2: Efterskoler discoverability
**Produkt-scan**: Navigation-check — followed parent journey "find en efterskole". Efterskoler buried in secondary "other" row on homepage, absent from SEOLinks, absent from UseCases.
**Opgave**: Promote efterskoler to primary featured cards on homepage + add SEO discovery link
**Hvorfor**: Parents searching for efterskoler couldn't easily find them from the homepage — buried below the fold in a small secondary card
**Ændringer**:
1. homeCategoryCards.ts: Moved efterskole from "other" to "featured" array with quality metric "Profiler, priser og ledige pladser"
2. CategoryCards.tsx: Updated grid from 3-col to 4-col for featured, 4-col to 3-col for secondary; added yearly price display for efterskole in featured cards
3. SEOLinks.tsx: Added "Find den rette efterskole" link pointing to /efterskole
4. homeCategoryCards.test.ts: Updated test expectations (4 featured, 3 other)
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: En forælder der lander på forsiden ser nu efterskoler som en af de 4 primære kategorier — ikke gemt i en lille sekundær række
**Næste**: Product scan for remaining UX issues, check meta descriptions, or look at SEO improvements

### Iteration 90 — PRIORITET 3: Quality-first SEO meta descriptions (batch)
**Produkt-scan**: Tekst-check — read meta descriptions across CategoryPage, KommunePage, CategoryMunicipalityPage. Found vuggestue/boernehave/dagpleje leading with "priser" not quality.
**Opgave**: Update SEO meta descriptions to lead with normering/kvalitet, prices as supplement
**Hvorfor**: Google search results showed "Se priser, adresser og kontaktinfo" — gives wrong impression. Quality first.
**Ændringer**:
1. categoryConstants.ts: Updated vuggestue/boernehave/dagpleje/efterskole meta descriptions DA+EN to lead with normering/kvalitetsdata
2. KommunePage.tsx: Changed municipality page meta to "Sammenlign normering, kvalitet og priser"
3. CategoryMunicipalityPage.tsx: Changed title from "Priser og sammenligning" to "Sammenlign kvalitet og priser", desc leads with normering
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Google-resultater viser nu kvalitetsdata først — bygger troværdighed før klik
**Næste**: Check for missing JSON-LD, internal linking gaps, or navigation issues

### Iteration 91 — PRIORITET 2: Quality-first category descriptions (batch DA+EN)
**Produkt-scan**: Tekst-check — read on-page category descriptions shown under headings. Found vuggestue/boernehave/dagpleje leading with prices, dagpleje framed as "billigere alternativ", efterskole missing "ledige pladser".
**Opgave**: Update DA+EN category descriptions to quality-first messaging
**Hvorfor**: Forældre der lander på en kategoriside ser "Se priser" som det første — giver forkert signal om hvad produktet handler om
**Ændringer**:
1. translations/da.ts: Updated vuggestue, boernehave, dagpleje, efterskole category descriptions to lead with normering/kvalitet
2. translations/en.ts: Same updates in English
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Kategori-sider viser nu "Se normering, kvalitetsdata, priser" — kvalitet før pris
**Næste**: Check for performance issues or more product bugs

### Iteration 92 — PRIORITET 3: Quality-first homepage meta + link/consistency check
**Produkt-scan**: Data-check — verified hero subtitle uses dynamic count. Tekst-check — HomePage meta said "Se priser, kvalitetsdata" (price first). Konsistens-check — "98 kommuner" consistent across all files. Link-check — all navbar links verified OK.
**Opgave**: Fix homepage meta description + verify consistency
**Hvorfor**: Google snippet showed "Se priser" before "kvalitetsdata" — wrong priority signal
**Ændringer**:
1. HomePage.tsx: Swapped meta description to "Se normering, kvalitetsdata, priser" (DA) and added quality mention to EN
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Google-snippet for forsiden viser nu kvalitet før pris
**Næste**: Look at internal linking (municipality pages → category pages) or check for missing features

### Iteration 93 — PRIORITET 3: Quality-first remaining meta descriptions
**Produkt-scan**: Navigation-check — followed "forælder søger bedste børnehave i Odense" journey. BestDagtilbudPage exists, quality-first title, but description had "Se priser, normering" (price first). Also verified: SimilarInstitutions rendered on detail pages, all pages lazy-loaded.
**Opgave**: Fix BestDagtilbudPage meta to "Se normering, kvalitet og priser"
**Hvorfor**: Konsistens med quality-first princip på alle sider
**Ændringer**:
1. BestDagtilbudPage.tsx: Swapped "priser, normering og kvalitet" → "normering, kvalitet og priser"
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Alle "bedste"-sider viser nu kvalitet først i Google-snippets
**Næste**: Look for product features that would make parents' lives easier — maybe improve the find/match tool or add better filtering

### Iteration 94 — PRIORITET 1: Missing PWA icons (404 fix)
**Produkt-scan**: Link-check — verified all footer links route correctly. Then checked manifest.json referenced icon-192.png and icon-512.png which DON'T EXIST → 404s in production, broken PWA install.
**Opgave**: Generate missing PWA icons from existing favicon.svg
**Hvorfor**: Browsers requesting manifest icons get 404 → broken "Add to Home Screen", Lighthouse PWA penalty
**Ændringer**:
1. Generated public/icon-192.png (2.7KB) from favicon.svg using sharp-cli
2. Generated public/icon-512.png (8.9KB) from favicon.svg using sharp-cli
3. manifest.json: Kept as-is (already referenced these files)
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓ | icons visually verified
**Foraelder-effekt**: PWA install now works — parents can add Institutionsguide to home screen with proper icon
**Næste**: Check for more 404s, look at Lighthouse performance, or find product UX issues

### Iteration 95 — PRIORITET 2: index.html quality-first + noscript completeness
**Produkt-scan**: Tom-side-check on GymnasiumPage (OK, proper empty state). Then read index.html — found 3 issues:
1. Static meta description: "Se priser, kvalitetsdata" (price first)
2. OG description: "med priser og kvalitetsdata" (price first)
3. Noscript only listed 5 of 7 categories (missing fritidsklub + efterskole)
**Opgave**: Fix all three in index.html
**Hvorfor**: Crawlers and noscript users see the static HTML — must be quality-first and complete
**Ændringer**:
1. index.html: meta description → "Se normering, kvalitetsdata, priser"
2. index.html: OG description → "kvalitetsdata, normering og priser"
3. index.html: noscript section now lists all 7 categories
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Social media deling og Google snippets viser kvalitet først; noscript brugere kan finde alle kategorier
**Næste**: Check for remaining product issues — maybe look at performance, bundle size, or user flows

### Iteration 96 — PRIORITET 3: Missing blog sitemap in sitemap index
**Produkt-scan**: Konsistens-check — verified sitemap.xml against actual sitemap files. Found sitemap-blog.xml exists with 8 blog URLs but was NOT included in sitemap.xml index!
**Opgave**: Add sitemap-blog.xml to sitemap index
**Hvorfor**: 8 blog posts were invisible to search engines — zero SEO value from content marketing
**Ændringer**:
1. sitemap.xml: Added sitemap-blog.xml entry with lastmod 2026-04-10
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Blog posts (skolevalg guide, normering forklaring, etc.) vil nu blive indekseret af Google — forældre der googler disse emner kan finde os
**Næste**: Check for more SEO gaps or product UX issues

### Iteration 97 — PRIORITET 2: Quality-first KommunePage layout
**Produkt-scan**: Navigation-check — followed parent journey to a kommune page. Normering chart was buried below rates overview and map. Rates (prices) was the first content section.
**Opgave**: Move normering chart above rates overview on KommunePage
**Hvorfor**: A parent landing on "Aarhus Kommune" page sees prices first — should see quality (normering) first
**Ændringer**:
1. KommunePage.tsx: Moved NormeringChart section to appear right after header, before rates overview
2. KommunePage.tsx: Removed duplicate normering chart from lower position
3. KommunePage.tsx: Updated ShareButton title to "Institutioner, normering og priser"
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Forældre der lander på en kommune-side ser nu normering (børn pr. voksen) som det første — ikke priser
**Næste**: Look for more product UX improvements or check other high-traffic pages

### Iteration 98 — PRIORITET 2: Quality-first CategoryMunicipalityPage subtitle
**Produkt-scan**: Tekst-check — read CategoryMunicipalityPage (e.g. /vuggestue/koebenhavn). Subtitle only mentioned "gennemsnitlige månedlige takst" (price). Section heading said "Prisstatistik".
**Opgave**: Update subtitle and heading to quality-first framing
**Hvorfor**: Parent landing on "Vuggestuer i København" sees price stats as main message — should emphasize comparing quality
**Ændringer**:
1. CategoryMunicipalityPage.tsx: Subtitle changed from "Den gennemsnitlige månedlige takst er X kr" to "Sammenlign kvalitet og priser (gns. X kr/md)"
2. CategoryMunicipalityPage.tsx: Section heading changed from "Prisstatistik" to "Priser" (cleaner), with EN translation
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Subtitle nu signalerer "sammenlign kvalitet og priser" i stedet for bare at fremhæve prisen
**Næste**: Look for more product improvements — maybe check institution list cards or the compare flow

### Iteration 99 — SCAN ONLY: InstitutionListCard + bundle analysis
**Produkt-scan**: 
1. Konsistens-check: InstitutionListCard shows quality metrics strip (normering, trivsel, karakter, fravær) below name with price in top-right. Acceptable balance — both visible.
2. ESLint: 0 warnings, 0 errors.
3. Bundle analysis: build in 624ms. Largest chunks: chart-vendor 436KB, react-vendor 220KB, map-vendor 187KB, supabase 184KB — all properly code-split. No page chunk over 45KB except InstitutionPage (110KB, justified by complexity).
**Opgave**: None — audit only, no bugs found
**Verifikation**: build: ✓ (8,563 pages) | eslint: clean
**Næste**: Self-assessment at iteration 100

### Selvvurdering — Iteration 100

**Seneste 10 iterationer (89-99)**:
- Iter 89: Efterskoler promoted to featured homepage cards + SEO link (PRIORITET 2)
- Iter 90: Quality-first SEO meta descriptions for category pages (PRIORITET 3)
- Iter 91: Quality-first category descriptions DA+EN translations (PRIORITET 2)
- Iter 92: Quality-first homepage meta + consistency check (PRIORITET 3)
- Iter 93: Quality-first BestDagtilbudPage meta (PRIORITET 3)
- Iter 94: Missing PWA icons — generated icon-192.png + icon-512.png (PRIORITET 1)
- Iter 95: Quality-first index.html + noscript completeness (PRIORITET 2)
- Iter 96: Missing blog sitemap in index — 8 URLs not indexed (PRIORITET 3)
- Iter 97: KommunePage normering chart moved above rates (PRIORITET 2)
- Iter 98: CategoryMunicipalityPage quality-first subtitle (PRIORITET 2)
- Iter 99: Audit only — bundle analysis, ESLint, card review

**Fordeling**: 1 prioritet-1 bug, 5 prioritet-2 UX, 4 prioritet-3 SEO, 1 audit/scan
**Foraelder-impact**: HØJ — 
- Efterskoler are now discoverable (was buried in secondary row)
- All meta descriptions lead with quality, not price (affects Google snippets for thousands of pages)
- PWA icons work (parents can add to home screen)
- Blog posts now indexed (8 content pages were invisible to Google)
- Kommune pages show normering before prices

**Selvkritik**: Good balance this round. 0 polish tasks. The quality-first sweep was thorough and covered all major surfaces (meta, OG, translations, subtitles, page layout). However, I could have done more structural product work — adding normering data to CategoryMunicipalityPage (currently only shows prices despite meta claiming normering). That's a bigger feature though.

**Kursændring for næste 10 iterationer**:
1. Focus on missing features that parents would notice (normering data on more pages, better efterskole filtering)
2. Look for broken user flows or dead ends
3. Consider performance improvements (InstitutionPage is 110KB)
4. Check for any remaining price-first anti-patterns in the UI

### Iteration 101 — PRIORITET 2: Better breadcrumb internal linking
**Produkt-scan**: Navigation-check — on institution detail page, breadcrumb "Municipality" linked to generic /kommune/X (all categories). A parent viewing a børnehave wants to see other børnehaver in same kommune, not all institutions.
**Opgave**: Update institution page breadcrumb to link municipality to category+municipality page
**Hvorfor**: A parent on "Solsikken Børnehave" in Aarhus clicks "Aarhus" in breadcrumb — should see /boernehave/aarhus (other børnehaver), not /kommune/aarhus (everything)
**Ændringer**:
1. InstitutionPage.tsx: Breadcrumb municipality href changed from /kommune/X to /category/municipality-slug
2. InstitutionPage.tsx: JSON-LD breadcrumb updated to match
3. Added toSlug import from @/lib/slugs
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Clicking municipality name in breadcrumb now shows relevant institutions (same category) instead of all institutions
**Næste**: Look for more internal linking improvements or product UX gaps

### Iteration 102 — PRIORITET 2: Fix hardcoded Danish strings in CategoryMunicipalityPage
**Produkt-scan**: Tekst-check — found 10+ hardcoded Danish strings in CategoryMunicipalityPage that don't translate to English: "Gennemsnit", "Billigste", "Dyreste", "Landsgennemsnit", "over/under", "Andre institutionstyper i", "nærliggende kommuner", "Forside", "Alle X i Y"
**Opgave**: Add English translations for all user-visible text
**Hvorfor**: English users see Danish text for price stats, headings, breadcrumbs, and related links
**Ændringer**:
1. CategoryMunicipalityPage.tsx: Added language === "da" ? "X" : "Y" for all 10+ hardcoded strings
2. Fixed breadcrumb "Forside" → "Home" for JSON-LD and visual breadcrumbs
3. Fixed price comparison paragraph with full EN translation
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: English-speaking parents can now read all content on municipality category pages
**Næste**: Check other pages for similar i18n issues

### Iteration 103 — PRIORITET 5: i18n breadcrumb fix for PrivacyPage
**Produkt-scan**: Tekst-check — scanned all pages for hardcoded "Forside" breadcrumbs. Found 12 instances across 9 files. 8 pages don't have useLanguage (Danish-only), 1 (PrivacyPage) has it.
**Opgave**: Fix PrivacyPage breadcrumb translations
**Hvorfor**: English users see "Forside" and "Privatlivspolitik" instead of "Home" and "Privacy policy"
**Ændringer**:
1. PrivacyPage.tsx: Breadcrumb labels now use language-conditional rendering
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: English users see proper English breadcrumbs on privacy page
**Næste**: Stop doing i18n polish (PRIORITET 5), switch to product-impactful work

### Iteration 104 — PRIORITET 3: Better internal linking in MunicipalityRanking
**Produkt-scan**: Navigation-check — on category pages (e.g. /vuggestue), the municipality ranking table linked to /kommune/X (generic). A parent viewing vuggestuer and clicking "Aarhus" in the ranking should see /vuggestue/aarhus (vuggestuer in Aarhus), not all institutions.
**Opgave**: Update MunicipalityRanking links to point to category+municipality pages
**Hvorfor**: Better UX (see relevant institutions) + better SEO (internal linking to specific pages)
**Ændringer**:
1. MunicipalityRanking.tsx: Changed link from /kommune/X to /category/municipality-slug using toSlug
2. Added toSlug import
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Clicking a municipality in the category ranking table now shows relevant category, not everything
**Næste**: Continue looking for product improvements or user flow optimizations

### Iteration 105 — PRIORITET 1: Normering data on CategoryMunicipalityPage
**Produkt-scan**: Data-check — meta description claimed "Se normering, kvalitetsdata" but page only showed prices. False SEO promise on ~400 pages.
**Opgave**: Add normering (staff ratio) display to CategoryMunicipalityPage for dagtilbud categories
**Hvorfor**: Parents see "Se normering" in Google but land on a page that only shows prices — broken expectation
**Ændringer**:
1. CategoryMunicipalityPage.tsx: Added normering computation using useData().normering with category→ageGroup mapping
2. New normering section above price stats showing børn pr. voksen with link to /normering/kommune
3. Intro text now mentions normering ratio for the municipality
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Parents now see actual normering data on municipality category pages — meta description no longer overpromises
**Næste**: Look for more false promises in meta, or scan for product flow issues

### Iteration 106 — PRIORITET 3: i18n for CategoryMunicipalityPage components
**Produkt-scan**: Tekst-check — InstitutionPriceCard had 3 hardcoded Danish strings ("Billigst", "Dyrest", "Pris ikke tilgængelig") visible to English users. IntroText paragraph entirely Danish. 404 state Danish.
**Opgave**: Translate remaining hardcoded strings in CategoryMunicipalityPage and its InstitutionPriceCard child
**Hvorfor**: English-speaking parents saw Danish on institution cards and contextual text
**Ændringer**:
1. InstitutionPriceCard.tsx: Added useLanguage, translated 3 strings
2. CategoryMunicipalityPage.tsx: IntroText now bilingual (ownership, normering, price comparison)
3. CategoryMunicipalityPage.tsx: 404 state translated
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: English users now see fully translated municipality category pages including cards and contextual analysis
**Næste**: Scan for more product flow issues or UX friction

### Iteration 107 — PRIORITET 2: Geographic nearby municipalities
**Produkt-scan**: Navigation-check — "Nærliggende kommuner" section on 3 pages showed alphabetically adjacent municipalities (Aalborg → Aarhus), not geographically nearby ones. Misleading for parents.
**Opgave**: Replace alphabetical proximity with geographic centroid-based distance
**Hvorfor**: A parent in Aalborg seeing "Aarhus" as nearby is confusing — actual nearby municipalities are Brønderslev, Jammerbugt, Rebild, etc.
**Ændringer**:
1. Created src/hooks/useNearbyMunicipalities.ts — computes centroids from institution lat/lng, sorts by haversine distance
2. CategoryMunicipalityPage.tsx: Replaced 15-line alphabetical logic with hook call
3. BestDagtilbudPage.tsx: Same replacement
4. BestSchoolPage.tsx: Same replacement
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: "Nærliggende kommuner" now shows actual neighbors — parents in Aalborg see Brønderslev, Jammerbugt, Rebild
**Næste**: Look for more product issues or broken user flows

### Iteration 108 — PRIORITET 3: CheapestPage cross-linking + breadcrumb fix
**Produkt-scan**: Navigation-check — CheapestPage "Se også" section only linked to other price-comparison pages, not quality rankings. Breadcrumb municipality link went to generic /kommune/ instead of category-specific page.
**Opgave**: Add quality ranking cross-link, fix breadcrumb
**Hvorfor**: Parent comparing prices should easily discover quality rankings; breadcrumb should lead to relevant content
**Ændringer**:
1. CheapestPage.tsx: Added "Bedste [category] i [municipality]" as first link in "Se også"
2. CheapestPage.tsx: Breadcrumb municipality link → /{cat}/{toSlug(munName)}
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Parents on cheapest page can now easily find quality rankings; breadcrumb navigation is contextually relevant
**Næste**: Continue scanning for product improvements

### Iteration 109 — PRIORITET 3: Breadcrumb fixes + CheapestPage quality cross-link (batch)
**Produkt-scan**: Navigation-check — BestDagtilbudPage and BestSchoolPage breadcrumbs linked municipality to generic /kommune/ instead of category-specific page. CheapestPage "Se også" only linked to price pages, not quality.
**Opgave**: Fix breadcrumb links + add quality cross-link from CheapestPage
**Hvorfor**: Contextual navigation should lead to relevant content; parents comparing prices should discover quality rankings
**Ændringer**:
1. BestDagtilbudPage.tsx: Breadcrumb municipality → /{cat}/{toSlug(munName)}
2. BestSchoolPage.tsx: Breadcrumb municipality → /skole/{toSlug(munName)}
3. CheapestPage.tsx (iteration 108): Added "Bedste" cross-link + fixed breadcrumb
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Breadcrumbs on ranking pages now lead to contextually relevant pages; price-focused parents discover quality rankings
**Næste**: Check for performance issues or remaining product gaps

### Selvvurdering — Iteration 110

**Seneste 10 iterationer (100-109)**:
- Iter 101: Breadcrumb internal linking on InstitutionPage (PRIORITET 2)
- Iter 102: i18n fix for CategoryMunicipalityPage — 10+ strings (PRIORITET 2)
- Iter 103: i18n fix for PrivacyPage breadcrumbs (PRIORITET 5)
- Iter 104: Internal linking in MunicipalityRanking → category pages (PRIORITET 3)
- Iter 105: Normering data on CategoryMunicipalityPage — fulfilled meta promise (PRIORITET 1)
- Iter 106: i18n for IntroText + InstitutionPriceCard (PRIORITET 3)
- Iter 107: Geographic nearby municipalities via centroid + haversine (PRIORITET 2)
- Iter 108: Cross-link quality from CheapestPage + breadcrumb fix (PRIORITET 3)
- Iter 109: Breadcrumb fixes on BestDagtilbudPage + BestSchoolPage (PRIORITET 3)
- Iter 110: Self-assessment

**Fordeling**: 1 prioritet-1 feature, 3 prioritet-2 UX, 5 prioritet-3 navigation/i18n, 1 prioritet-5 polish
**Foraelder-impact**: HØJ —
- Normering data now shown on ~400 municipality category pages (was falsely promised in meta)
- "Nearby municipalities" now geographic (was alphabetical — completely misleading)
- Quality ranking cross-linked from price pages
- Breadcrumbs lead to contextually relevant pages across all ranking pages
- English users can read all text on municipality category pages + cards

**Selvkritik**: Good mix of high-impact features (normering, geographic nearby) and navigation improvements. The normering addition (iter 105) was the biggest single-iteration impact — fixing a false SEO promise on hundreds of pages. The geographic nearby fix (iter 107) eliminated actively misleading information. However, I spent 2 iterations on lower-priority i18n (103, 106) when there were higher-impact options available.

**Kursændring for næste 10 iterationer**:
1. Check for remaining product-level issues: pages that overpromise in meta, broken user flows
2. Look at efterskole experience — profile filtering, available spots display
3. Consider adding normering to institution list cards on CategoryMunicipalityPage
4. Check if the guide/finder tool produces good results
5. Look for accessibility improvements (keyboard nav, ARIA)

### Iteration 111 — PRIORITET 2: Enable quality sort/filter for efterskoler
**Produkt-scan**: Navigation-check — on /efterskole, sort only showed name/price/municipality. Quality-related sorts (rating, grades, absence) were hidden because efterskole was in DAYCARE_CATEGORIES. Quality filter dropdown also hidden.
**Opgave**: Remove efterskole from DAYCARE_CATEGORIES, add to quality filter visibility
**Hvorfor**: Efterskoler are school-type institutions with quality data — parents should be able to sort by rating and filter by quality level
**Ændringer**:
1. SearchFilterBar.tsx: Removed "efterskole" from DAYCARE_CATEGORIES → quality sorts visible
2. SearchFilterBar.tsx: Added "efterskole" to quality filter visibility check (desktop + mobile bottom sheet)
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Parents browsing efterskoler can now sort by rating, grades, absence and filter by quality level (over/under middel)
**Næste**: Check for more efterskole UX improvements or other product issues

### Iteration 112 — PRIORITET 2: Default sort by rating for efterskoler
**Produkt-scan**: Konsistens-check — /skole defaulted to rating sort but /efterskole defaulted to name sort.
**Ændringer**: CategoryPage.tsx: defaultSortKey now includes "efterskole" → "rating"
**Verifikation**: tsc: ✓ | tests: 279/279 | push: ✓
**Foraelder-effekt**: Parents landing on /efterskole see highest-rated first

### Iteration 113 — PRIORITET 2: TotalCostPage in navigation
**Produkt-scan**: Navigation-check — /samlet-pris calculator was only reachable from homepage SEO links. Not in navbar or footer.
**Opgave**: Add /samlet-pris to navbar and footer
**Ændringer**:
1. Navbar.tsx: Added to TOOL_LINKS
2. Footer.tsx: Added link in tools section
3. translations: Added totalCost key DA/EN
**Verifikation**: tsc: ✓ | tests: 279/279 | push: ✓
**Foraelder-effekt**: Parents can find total cost calculator from any page
**Næste**: Continue looking for navigation gaps or product issues

### Iteration 114 — PRIORITET 3: Sitemap + quality-first meta + i18n class levels (batch)
**Produkt-scan**: SEO-check — /metode missing from sitemap. Tekst-check — SFO/fritidsklub meta descriptions still price-first. VsPage meta "Se priser" first. EfterskoleDetails + InstitutionListCard had hardcoded Danish "klasse"/"kl." for class levels.
**Opgave**: Add /metode to sitemap, fix quality-first meta for remaining pages, translate class levels
**Hvorfor**: /metode page was invisible to search engines. SFO/fritidsklub were the last holdouts of price-first meta. English users saw Danish "kl." on efterskole cards.
**Ændringer**:
1. sitemap-static.xml: Added /metode with priority 0.6
2. categoryConstants.ts: SFO + fritidsklub meta → "Se kvalitetsdata, priser"
3. da.ts: SFO + fritidsklub category descriptions → quality-first
4. VsPage.tsx: Meta "Se priser, antal og forskelle" → "Se kvalitet, priser og forskelle"
5. InstitutionListCard.tsx: "kl." → language-conditional "kl."/"gr."
6. EfterskoleDetails.tsx: "klasse" → language-conditional "klasse"/"grade"
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: All meta descriptions now quality-first (sweep complete). /metode indexed. English users see proper class level labels.

### Iteration 115 — PRIORITET 1: Efterskole profile filter chips
**Produkt-scan**: Navigation-check — parents browsing /efterskole had no way to filter by profile (sport, musik, kunst, etc.). Data shows 238/241 efterskoler have profiles across 8 types.
**Opgave**: Add clickable profile filter chips on /efterskole category page
**Hvorfor**: Parents looking for a sport-efterskole or musik-efterskole must currently scroll through 241 results — no filtering possible
**Ændringer**:
1. CategoryPage.tsx: Added EFTERSKOLE_PROFILES constant with 8 profile types (DA+EN labels)
2. CategoryPage.tsx: Added profileFilter state + profileFiltered useMemo
3. CategoryPage.tsx: Profile chip bar shown between filter bar and view toggle when category is "efterskole"
4. CategoryPage.tsx: Updated all downstream refs (distanceSorted, AnimatedNumber, itemListSchema, useEffect) to use profileFiltered
5. CategoryPage.tsx: Clear all filter handler resets profileFilter
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Parents can now filter efterskoler by profile type with one click — e.g. see only sport-efterskoler or musik-efterskoler

### Iteration 116 — PRIORITET 2: Quality metrics on InstitutionPriceCard (CategoryMunicipalityPage)
**Produkt-scan**: Link-check (alle OK) + konsistens-check — InstitutionPriceCard on ~400 CategoryMunicipalityPages was price-dominant (price bar, no quality metrics). InstitutionListCard on main category pages showed trivsel/karakter/fravær but InstitutionPriceCard did not.
**Opgave**: Add quality metrics strip to InstitutionPriceCard, positioned ABOVE the price line (quality-first)
**Hvorfor**: Parents on /vuggestue/koebenhavn etc. only saw prices — no trivsel, karakter, or fravær per institution. Violated quality-first principle on hundreds of pages.
**Ændringer**:
1. InstitutionPriceCard.tsx: Added quality metrics strip (trivsel, karakter, fravær, kompetence) between name and price
2. InstitutionPriceCard.tsx: Refactored language === "da" to isDa variable for consistency
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Parents on ~400 municipality category pages now see quality data per institution before price — trivsel, karakter, fravær, kompetence where available
**Næste**: Check more product issues — maybe data-check or navigation-check on other pages

### Iteration 117 — PRIORITET 2: KommunePage geographic nearby + quality metrics (batch)
**Produkt-scan**: Konsistens-check — KommunePage used alphabetical ±3 for "nearby municipalities" while CategoryMunicipalityPage used geographic distance (fixed in iter 107). Also, institution cards on KommunePage had no quality metrics (trivsel, karakter, fravær) — only price.
**Opgave**: Replace alphabetical nearby with geographic useNearbyMunicipalities hook + add quality metrics strip to institution cards
**Hvorfor**: "Nærliggende kommuner" showed alphabetically adjacent names — completely misleading (e.g. Albertslund "near" Allerød). Institution cards were price-only with no quality context.
**Ændringer**:
1. KommunePage.tsx: Replaced alphabetical nearbyMunicipalities with useNearbyMunicipalities hook (geographic)
2. KommunePage.tsx: Added quality metrics strip (trivsel, karakter, fravær) above price on institution cards
3. KommunePage.tsx: Added import for useNearbyMunicipalities
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Parents on 98 kommune pages now see geographically nearby municipalities + quality data per institution before price
**Næste**: Continue product scanning — check other pages for consistency issues

### Iteration 118 — PRIORITET 1: Fix broken nearby links on BestDagtilbudPage
**Produkt-scan**: Konsistens-check — BestDagtilbudPage did not pass category to useNearbyMunicipalities (unlike BestSchoolPage which correctly passes "skole"). This caused "nearby municipality" links to point to municipalities without that category → "Side ikke fundet" error.
**Opgave**: Add category filter to useNearbyMunicipalities call on BestDagtilbudPage
**Hvorfor**: Parents clicking "nearby municipality" links on bedste-vuggestue/bedste-dagpleje pages could land on 404 pages — broken user flow
**Ændringer**: BestDagtilbudPage.tsx: useNearbyMunicipalities(institutions, munName) → useNearbyMunicipalities(institutions, munName, cat)
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Nearby municipality links on ~400 "bedste" pages now only show municipalities that actually have institutions in the relevant category
**Næste**: Continue scanning for broken links and product issues

### Iteration 119 — PRIORITET 3: Category-specific meta descriptions on InstitutionPage
**Produkt-scan**: Tekst-check — InstitutionPage meta description said "beregn fripladstilskud" for ALL categories including skoler and efterskoler where friplads doesn't apply. Misleading SEO on ~8,000+ institution pages.
**Opgave**: Make meta description category-aware
**Hvorfor**: Parents Googling a school see "beregn fripladstilskud" in the snippet — irrelevant and reduces click-through trust
**Ændringer**: InstitutionPage.tsx: Meta description now category-specific:
- Skoler: "Se trivsel, karaktersnit, fravær og kvalitetsvurdering"
- Efterskoler: "Se profiler, kvalitetsdata og sammenlign med andre efterskoler"
- Dagtilbud: "Se vurdering, kvalitetsdata og beregn fripladstilskud" (unchanged)
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Google snippets for ~1,600 skoler and ~241 efterskoler now show relevant CTA text matching actual page content
**Næste**: Continue product/SEO scanning

### Selvvurdering — Iteration 120
**Seneste 5 iterationer (116-119)**:
- Iter 116: Quality metrics on InstitutionPriceCard — quality before price on ~400 municipality pages (PRIORITET 2)
- Iter 117: KommunePage geographic nearby + quality metrics on cards (PRIORITET 2)
- Iter 118: Fix broken nearby links on BestDagtilbudPage — category filter missing (PRIORITET 1)
- Iter 119: Category-specific meta descriptions on InstitutionPage — 8,000+ pages (PRIORITET 3)

**Fordeling**: 1 prioritet-1 bug fix, 2 prioritet-2 UX, 1 prioritet-3 SEO, 0 polish
**Foraelder-impact**: HØJ —
- Fixed a broken user flow (BestDagtilbudPage nearby links → 404)
- Quality data now visible on ~500 pages where it was missing (KommunePage + CategoryMunicipalityPage cards)
- Geographic nearby on KommunePage (was alphabetical — actively misleading)
- 8,000+ institution pages now have accurate meta descriptions matching actual content
**Selvkritik**: Good focus on high-impact issues. Every change affects hundreds to thousands of pages. The BestDagtilbudPage fix (iter 118) was a genuine P1 broken link bug. No polish or code-only changes.
**Kursændring for næste iterationer**:
1. Check VsPage and CheapestPage for similar issues
2. Look for more broken user flows (empty states, dead-end pages)
3. Consider accessibility improvements (keyboard nav, screen reader, ARIA)
4. Check if guide/find tools produce good results
5. Look for internal linking opportunities between related pages

### Iteration 120 — PRIORITET 1: Fix incorrect friplads threshold on CheapestPage
**Produkt-scan**: Data-check — CheapestPage had hardcoded "609.700 kr." as friplads upper threshold. FRIPLADS_CONSTANTS.upperThreshold is 677.500 kr. Old value was from a previous year. Wrong data shown to parents.
**Opgave**: Replace hardcoded amount with FRIPLADS_CONSTANTS.upperThreshold
**Hvorfor**: Parents on ~300 cheapest-X pages saw incorrect income threshold for fripladstilskud — could cause them to think they don't qualify when they actually do
**Ændringer**: CheapestPage.tsx: Imported FRIPLADS_CONSTANTS, replaced "609.700 kr." with dynamic constant
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Parents now see correct 2026 friplads income threshold (677.500 kr.) on all cheapest pages
**Næste**: Scan for more hardcoded values that should be dynamic, or other data issues

### Iteration 121 — PRIORITET 2: Dynamic friplads thresholds in FAQ
**Produkt-scan**: Data-check — scanned for hardcoded friplads amounts. Found faqData.ts had hardcoded "677.500 kr." and "218.100 kr." which happen to be correct now but would go stale on next year's update.
**Opgave**: Replace hardcoded amounts with FRIPLADS_CONSTANTS references
**Hvorfor**: Single source of truth — when friplads thresholds are updated in friplads.ts, FAQ automatically reflects correct values
**Ændringer**: faqData.ts: Imported FRIPLADS_CONSTANTS, replaced hardcoded amounts in both DA and EN FAQs
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Prevents future incorrect income thresholds in FAQ. Currently correct but now future-proof.
**Næste**: Look for more data quality issues or user flow improvements

### Iteration 122 — PRIORITET 3: DataFreshness badge on HomePage
**Produkt-scan**: Trust-check — HomePage (the most visited landing page) was missing the DataFreshness badge that all other data pages show. Parents seeing "Data opdateret: [date]" builds trust.
**Opgave**: Add DataFreshness component to HomePage
**Hvorfor**: Homepage is the first impression — showing when data was last updated signals that the platform is actively maintained
**Ændringer**: HomePage.tsx: Added DataFreshness import + component before GeoModals
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Parents on the homepage now see when data was last updated — trust signal
**Næste**: Continue looking for product improvements — check for accessibility or conversion opportunities

### Iteration 123 — PRIORITET 2: i18n for InstitutionGateModal (conversion-critical)
**Produkt-scan**: Tekst-check — InstitutionGateModal (the email gate for unlocking institution profiles) was entirely in Danish. English users saw Danish text in the conversion modal. This is the conversion-critical path for email capture.
**Opgave**: Add full EN/DA i18n support to InstitutionGateModal
**Hvorfor**: English-speaking parents (expats, internationals) couldn't understand the gate modal — likely caused gate_rejection events and lost conversions
**Ændringer**:
1. InstitutionGateModal.tsx: Imported useLanguage hook
2. FREE_ITEMS/GATED_ITEMS now bilingual objects
3. All user-facing strings (header, subtitle, validation errors, consent, submit button, aria labels) now language-conditional
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: English-speaking parents now see the gate modal in English — directly impacts conversion for international families
**Næste**: Continue with more product/UX improvements

### Iteration 124 — PRIORITET 2: i18n for GatedSection overlay
**Produkt-scan**: Tekst-check — GatedSection (blurred overlay prompting email unlock on institution pages) had hardcoded Danish text. Part of the conversion-critical gating flow.
**Opgave**: Add EN/DA i18n to GatedSection
**Hvorfor**: English users saw "Lås op med email" and "Gratis — intet kreditkort" in Danish — confusing for conversion
**Ændringer**: GatedSection.tsx: Added useLanguage hook, translated overlay text and aria-label
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: English-speaking parents now see localized unlock prompts throughout the gating flow
**Næste**: Look for more untranslated components or product issues

### Iteration 125 — PRIORITET 2: i18n for TilsynRapportSection
**Produkt-scan**: Tekst-check — TilsynRapportSection had hardcoded Danish strings in RapportCard (verdict badges, report links, detail toggles, strengths/concerns headings, status labels). VerdictBadge already had EN translations in config but wasn't using lang prop.
**Opgave**: Full i18n for TilsynRapportSection including RapportCard and VerdictBadge
**Hvorfor**: English-speaking parents viewing inspection reports saw mixed Danish UI labels — inconsistent with the already-translated gate flow
**Ændringer**:
1. RapportCard: Added `lang` prop, created `isDa` variable
2. Translated: "Skærpet tilsyn"/"Heightened supervision", "Opfølgning påkrævet"/"Follow-up required", "Se rapport"/"See report", "Vis detaljer"/"Show details", "Skjul detaljer"/"Hide details", "Styrker"/"Strengths", "Opmærksomhedspunkter"/"Points of attention"
3. VerdictBadge: Now receives lang prop from parent
4. TilsynRapportSection: Passes language to RapportCard
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: English-speaking parents now see fully translated inspection report sections
**Næste**: Scan for more product issues — check VsPage, CheapestPage, or accessibility

### Iteration 126 — PRIORITET 2: Fix alphabetical "nearby" municipalities in RelatedSearches
**Produkt-scan**: Link-check — RelatedSearches.tsx still used alphabetical ±3 index logic for nearby municipalities, even though KommunePage, BestSchoolPage, BestDagtilbudPage, and CategoryMunicipalityPage had all been switched to geographic useNearbyMunicipalities hook. This meant "related searches" on EVERY page using RelatedSearches showed alphabetically adjacent municipalities instead of geographically nearby ones.
**Opgave**: Replace alphabetical nearby logic with useNearbyMunicipalities hook
**Hvorfor**: Parents in e.g. Albertslund saw "related" links to Allerød (alphabetical neighbor, ~30km away) instead of Brøndby, Glostrup, Hvidovre (actual geographic neighbors). Misleading for parents choosing nearby alternatives.
**Ændringer**:
1. RelatedSearches.tsx: Imported useNearbyMunicipalities hook
2. Replaced 10-line alphabetical ±3 useMemo with single hook call
3. Hook already handles category filtering and limit, removed redundant .slice(0, 4)
4. Removed unused `municipalities` from useData destructuring
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Parents now see genuinely nearby municipalities in "related searches" across all pages — more useful for exploring real alternatives
**Næste**: Continue scanning for product issues — check for data correctness, missing empty states, or conversion improvements

### Iteration 127 — PRIORITET 2: Fix DataFreshness always showing Danish
**Produkt-scan**: Konsistens-check — DataFreshness component defaulted to `lang="da"` when prop was omitted. 15 out of 20 pages using DataFreshness didn't pass the lang prop, meaning English users saw "Data opdateret" instead of "Data updated" on most pages. Inconsistent with pages that did pass lang.
**Opgave**: Make DataFreshness read language from LanguageContext automatically
**Hvorfor**: English-speaking parents saw Danish "Data opdateret" badge on 15 of 20 pages — inconsistent and breaks the trust signal for international users
**Ændringer**: DataFreshness.tsx: Added useLanguage hook, uses context language as default, lang prop still works as override
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: English users now see "Data updated" consistently across all pages
**Næste**: Scan for more product issues — check DataAttribution for same pattern, or look for conversion/SEO improvements

### Iteration 128 — PRIORITET 2: Batch i18n for DataAttribution + DataSourceBadges
**Produkt-scan**: Konsistens-check — DataAttribution ("Datakilder:") and DataSourceBadges ("Pris verificeret", "Kvalitetsdata", "Normeringsdata") had all-Danish strings. These trust-signal components appear on institution detail pages and programmatic SEO pages — English users saw Danish labels for data source attribution.
**Opgave**: Add useLanguage to both shared trust-signal components
**Hvorfor**: English users seeing "Datakilder:" and "Pris verificeret" undermines the trust signal these components provide — if you can't read the source labels, they're meaningless
**Ændringer**:
1. DataAttribution.tsx: Added useLanguage, translated "Datakilder"/"Data sources", ministry names, "Sidst opdateret"/"Last updated"
2. DataSourceBadges.tsx: Added useLanguage, translated badge labels (Pris verificeret/Price verified, Kvalitetsdata/Quality data, Normeringsdata/Staff ratio data)
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: English users now see translated data attribution and source badges across all pages
**Næste**: Must do PRIORITET 1-3 task next (done 2 i18n in a row). Check for data bugs, broken flows, or conversion issues

### Iteration 129 — PRIORITET 2: Orphaned gymnasium page — no navigation links
**Produkt-scan**: Navigation-check — The /gymnasium route existed in App.tsx with full functionality (GymnasiumPage with filters, sorting, municipality breakdown) but had ZERO inbound links from any navigation element. Navbar, footer, homepage — none linked to it. The page was completely undiscoverable through normal browsing.
**Opgave**: Add gymnasium to navbar and footer
**Hvorfor**: Parents looking for gymnasium data had no way to find it through the site. The page was effectively invisible despite being fully built — wasted development effort and missed user value.
**Ændringer**:
1. Navbar.tsx: Added gymnasium to CATEGORY_LINKS array with DA/EN labels
2. Footer.tsx: Added gymnasium link to categories section using t.categories.gymnasium translation
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Parents can now discover and navigate to the gymnasium comparison page from the main nav and footer
**Næste**: Continue scanning for product issues — check homepage for gymnasium mention, check for missing internal links, or look at SEO

### Iteration 130 — PRIORITET 2: Add gymnasium to homepage category cards
**Produkt-scan**: Navigation-check — Following up on iteration 129, checked homepage for gymnasium. The homepage category cards (getCategoryCards) listed 7 categories but NOT gymnasium. With navbar/footer already linking to /gymnasium, the homepage was the remaining gap.
**Opgave**: Add gymnasium to homepage "other" category cards
**Hvorfor**: Parents browsing the homepage couldn't see gymnasium as an option in the category grid. Navbar had the link but the main discovery surface (homepage) didn't.
**Ændringer**:
1. homeCategoryCards.ts: Added Landmark icon import, added gymnasium card to "other" array with teal color
2. homeCategoryCards.test.ts: Updated test to expect 4 other cards including gymnasium
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Parents see gymnasium as an available category on the homepage
**Næste**: Scan for other product issues — check SEOLinks/PopularSearches for gymnasium, look for data bugs or conversion improvements

### Iteration 131 — PRIORITET 3: Add gymnasium to sitemap + llms.txt
**Produkt-scan**: SEO-check — Following gymnasium integration (iterations 129-130), checked sitemap and llms.txt. Both were missing the /gymnasium URL. Search engines and LLM crawlers couldn't discover the page through these channels.
**Opgave**: Add gymnasium to sitemap-static.xml and llms.txt
**Hvorfor**: Without sitemap presence, Google crawl discovery of /gymnasium depends entirely on internal link crawling. Adding to sitemap ensures direct indexing.
**Ændringer**:
1. sitemap-static.xml: Added /gymnasium with priority 0.8, weekly changefreq
2. llms.txt: Added gymnasium to intro text and categories list with type detail (STX, HHX, HTX, HF, EUX)
**Verifikation**: tsc: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Search engines can now discover and index the gymnasium page directly
**Næste**: Move on from gymnasium integration. Scan for other product issues — data correctness, mobile UX, or conversion improvements

### Iteration 132 — PRIORITET 1 BLOKERENDE: Fix broken production deploy
**Produkt-scan**: User reported Vercel deploy failures. Build error: `src/pages/CheapestPage.tsx(24,1): error TS6133: 'dataVersions' is declared but its value is never read.` Production has been BROKEN since iteration 120 (friplads fix) because unused import wasn't removed. Root cause: I was using `tsc --noEmit` for verification, but Vercel uses `tsc -b` which resolves tsconfig.app.json with `noUnusedLocals: true`.
**Opgave**: Remove unused import and fix verification command
**Hvorfor**: PRODUCTION WAS DOWN. All deploys since iteration 120 have failed. 8+ failed deploy notifications.
**Ændringer**: CheapestPage.tsx: Removed unused `import { dataVersions } from "@/lib/dataVersions"`
**Verifikation**: tsc -b: ✓ (0 errors) | tests: 279/279 | push: ✓
**LESSON LEARNED**: Use `tsc -b` not `tsc --noEmit` for verification — matches Vercel build pipeline
**Foraelder-effekt**: Site deploys again. All changes since iteration 120 are now live.
**Næste**: Continue scanning but use `tsc -b` for all future verification

### Iteration 133 — PRIORITET 2: Fix homepage category grid layout for 4 secondary cards
**Produkt-scan**: Navigation-check — After adding gymnasium as 4th secondary category on homepage (iteration 130), the grid used grid-cols-3 which created an unbalanced layout: 3 cards on row 1, lonely gymnasium card on row 2. Looks unprofessional.
**Opgave**: Fix grid to accommodate 4 cards cleanly
**Hvorfor**: A lonely card on its own row signals an afterthought or mistake to parents visiting the homepage — undermines the professional Danske Bank/Boliga aesthetic
**Ændringer**: CategoryCards.tsx: Changed secondary grid from `grid-cols-3` to `grid-cols-2 sm:grid-cols-4` — 2x2 on mobile, 4 across on desktop
**Verifikation**: tsc -b: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Homepage secondary categories look balanced and intentional across all screen sizes
**Næste**: Continue scanning for product issues — check for other layout problems, missing features, or conversion improvements

### Iteration 134 — PRIORITET 2: Add gymnasium to SearchFilterBar category pills + quality filter
**Produkt-scan**: Navigation-check — SearchFilterBar.tsx (used on /alle and homepage search) listed 8 category pills but NOT gymnasium. Also, CATEGORY_LABELS for autocomplete suggestion badges was missing gymnasium. Quality filter dropdown was hidden for gymnasium despite having quality data (grades, trivsel).
**Opgave**: Add gymnasium to CATEGORIES array, CATEGORY_LABELS, and quality filter visibility condition
**Hvorfor**: Parents browsing all institutions couldn't filter to gymnasium via category pills. When searching, gymnasium results showed raw "gymnasium" instead of formatted label. Quality filter was unavailable for gymnasium.
**Ændringer**: SearchFilterBar.tsx: Added gymnasium to CATEGORY_LABELS, CATEGORIES array, and quality filter condition (3 locations — desktop, mobile bottom sheet prop)
**Verifikation**: tsc -b: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Parents can now filter to gymnasium from the search bar, see proper labels in autocomplete, and use quality filters for gymnasium results
**Næste**: Scan for more product issues — data-check, broken flows, or accessibility improvements

### Iteration 135 — PRIORITET 2: Default gymnasium sort to grades (quality-first)
**Produkt-scan**: Konsistens-check — GymnasiumPage defaulted to sort by "name" while /skole and /efterskole default to "rating". Parents landing on /gymnasium saw alphabetical list instead of quality-ranked. Violated quality-first principle.
**Opgave**: Change GymnasiumPage default sort from "name" to "grades" (karaktersnit)
**Hvorfor**: Parents searching for gymnasiums want to see the best-rated first, not alphabetical — consistent with skole/efterskole behavior
**Ændringer**: GymnasiumPage.tsx: `useState<SortKey>("name")` → `useState<SortKey>("grades")`
**Verifikation**: tsc -b: ✓ (0 errors) | tests: 279/279 | push: ✓
**Foraelder-effekt**: Parents on /gymnasium now see highest-rated gymnasiums first
**Næste**: Continue product scanning — look for data quality, accessibility, or conversion issues
