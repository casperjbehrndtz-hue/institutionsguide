# specs/ux-design.md — UX & Design Excellence

## Priority: #2

## Job to Be Done
Institutionsguide.dk should feel like a premium, trustworthy product — not a side project. The design reference is the intersection of Boliga.dk (data density done right), Trustpilot (social proof + clean UI), and Sundhed.dk (institutional trust). It should feel like: "this is the official place to compare institutions in Denmark."

## Design Principles
1. **Data first, chrome second** — the numbers and insights should dominate, not UI decoration
2. **Scannable** — a parent with 2 minutes should get the answer they need
3. **Trust through transparency** — show data sources, dates, methodology
4. **Mobile-native** — most parents search on their phone during commute/lunch

## Requirements

### Visual Identity
- Consistent use of Fraunces (display/headings) + DM Sans (body) throughout — no fallbacks to system fonts visible
- Color system: define and enforce a consistent palette. Primary, secondary, accent, success, warning, error, neutral scale. No ad-hoc hex values in components.
- Spacing system: consistent use of Tailwind spacing scale. No magic numbers.
- Card design: all institution cards should look identical in structure (score, name, type, kommune, key metrics)
- Dark/light consideration: ensure all components have sufficient contrast

### Key Page Templates

#### Homepage
- Clear value proposition above fold: "Find den bedste institution til dit barn"
- Search/filter as the primary action (not a wall of text)
- Social proof: number of institutions, municipalities covered, user count
- Category entry points: vuggestue, børnehave, skole, SFO, fritidsklub, efterskole, gymnasium
- "Populære søgninger" or "Andre forældre kigger på" section

#### Institution Detail Page
- Score ring prominent but not overwhelming
- Key metrics visible without scrolling: normering, pris, tilsyn-status, Google rating
- Gate should feel natural: "Se den fulde rapport" — not a wall/paywall feeling
- Map showing location + nearby alternatives
- "Sammenlign med lignende" CTA
- Mobile: single column, collapsible sections, sticky CTA

#### Category/Kommune List Page
- Filter bar: always visible, not hidden behind hamburger
- Sort options clear: pris, score, normering, afstand
- Card grid responsive: 1 col mobile, 2 col tablet, 3 col desktop
- Infinite scroll or pagination (not "load more" button that loses scroll position)
- Map toggle: list view ↔ map view

#### Compare Page
- Side-by-side comparison table that works on mobile (horizontal scroll with sticky first column)
- Visual indicators: green/amber/red for each metric
- Clear winner indicators per category

### Interaction Patterns
- Loading: skeleton screens on all data-fetching pages (not spinners)
- Empty states: helpful message + action when no results match filters
- Error states: friendly Danish message + retry button
- Transitions: subtle fade-in on page load, no jarring layout shifts
- Scroll: smooth scroll to sections when clicking section nav

### Mobile-Specific
- Touch targets: minimum 44px on all interactive elements
- No horizontal overflow on any page at 375px
- Bottom sheet for filters on mobile instead of sidebar
- Swipe gestures on compare cards
- Camera/location for "Find institution nær mig"

### Accessibility
- All form inputs have visible labels
- All images have descriptive alt text
- Keyboard navigation works through entire flow
- Focus indicators visible
- Color is never the only indicator (always paired with icon/text)
- WCAG AA contrast on all text

### Acceptance Criteria
- [ ] No horizontal overflow at 375px on any page
- [ ] All interactive elements ≥ 44px touch target
- [ ] Skeleton screens on all async-loading pages
- [ ] Consistent card design across all list pages
- [ ] Filter bar visible (not hidden) on category/kommune pages
- [ ] Institution detail page: key metrics visible without scrolling on mobile
- [ ] Compare page works on mobile with horizontal scroll
- [ ] All images have alt text
- [ ] No ad-hoc hex colors — all from Tailwind theme
