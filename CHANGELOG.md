# Changelog

## 2026-03-30 — Quality Review & Polish

### FASE 2: Homepage
- **Fix**: Broken `børneskat.dk` link — Danish characters don't resolve in href; changed to `boerneskat.dk` (also in BlogPost.tsx)
- **Fix**: Quality filter incorrectly filtered out non-school institutions when category was "alle"
- **Perf**: Added 250ms search debounce in `useFilterParams` — prevents filtering 10K+ institutions on every keystroke
- **Fix**: `hasActiveFilter` now uses immediate `searchInput` so filter UI appears instantly while typing

### FASE 3: Listing & Filters
- **Fix**: Missing category labels for Fritidsklub and Efterskole in search autocomplete suggestions
- **Fix**: School-only sort options (rating, grades, absence) now hidden for Fritidsklub and Efterskole categories

### FASE 4: Profile / Detail Pages
- **Fix**: Hero image on InstitutionPage now gracefully falls back to Street View if efterskolerne.dk image fails to load
- **Fix**: Same image fallback added to InstitutionListCard thumbnails

### FASE 5-7: Navigation, Security & Edge Cases
- **Fix**: CSP `img-src` missing `https://www.efterskolerne.dk` — efterskole images were blocked by Content Security Policy
- **Fix**: Footer missing Fritidsklub and Efterskole category links
- **Fix**: Removed orphaned `</div>` in InstitutionPage after HeroImage refactor

### Unfixable / Out of Scope
- Distance sort uses `Math.hypot` (fast Euclidean approximation) while radius filter uses `haversineKm` — intentional trade-off for performance; ordering is identical at Danish latitudes
- FAQ data and income thresholds are hardcoded in HomePage — would need a CMS or Supabase table; current approach is simpler for a solo founder
- `institutionScore` doesn't handle all new categories — returns `noDataResult` gracefully, low priority
