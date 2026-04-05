# specs/performance-code.md — Performance & Code Quality

## Priority: #5

## Requirements

### Performance
- Lighthouse Performance ≥ 90 on homepage, category pages, institution pages
- Lighthouse Accessibility ≥ 90 on all page types
- No initial-load chunk over 250KB
- Lazy-load all route components (already done via lazyRetry — verify all routes)
- Lazy-load Leaflet map (only on pages that use it)
- Lazy-load Recharts (only on pages with charts)
- Images: lazy loading, proper sizing, WebP where possible
- Pre-rendered pages should have meaningful content in the HTML (not just a spinner)

### Code Quality
- No files over 400 lines — split into focused components
- No duplicated logic between pages (extract to hooks/utils)
- TypeScript strict: no `any` types in core logic (scoring, pricing, data transforms)
- Consistent error handling: ErrorBoundary wraps all routes
- No console.log in production code
- No commented-out code blocks
- No unused imports or dead code

### Testing
- Core scoring logic (institutionScore.ts, preferenceScore.ts) must have tests
- Friplads calculator must have tests (financial calculations)
- Data transforms (format.ts, geo.ts) should have tests
- Test coverage increasing with each Ralph iteration

### Acceptance Criteria
- [ ] Lighthouse Performance ≥ 90 on / route
- [ ] Lighthouse Accessibility ≥ 90 on / route
- [ ] No initial-load chunk over 250KB
- [ ] Zero console.log in src/ (excluding test files)
- [ ] Zero `any` types in scoring/pricing modules
- [ ] Core scoring logic has test coverage
- [ ] No files over 400 lines
