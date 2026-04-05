# specs/seo-dominance.md — SEO & Discoverability

## Priority: #1 — This is the most important spec.

## Job to Be Done
Parents searching Google for "bedste vuggestue i [kommune]", "billigste børnehave [by]", "normering daginstitution [kommune]", or "sammenlign skoler [område]" should find Institutionsguide.dk on page 1.

## Current State
- 1939 pre-rendered pages exist
- Sitemap generated at build
- SEOHead + JsonLd components exist
- Blog system exists

## Requirements

### Technical SEO (Ralph can fix)
- Every route MUST have unique, descriptive `<title>` (max 60 chars) and `<meta description>` (max 155 chars)
- Titles must follow pattern: "[Primary keyword] — Institutionsguide.dk" (not generic)
- Canonical URLs on all pages — no duplicate content
- Open Graph tags (og:title, og:description, og:image, og:url) on ALL pages
- JSON-LD: LocalBusiness or ChildCare schema on institution pages, FAQPage on guide pages, BreadcrumbList on all pages, WebSite with SearchAction on homepage
- Internal linking: every institution page links to its kommune page, every kommune page links to its category pages, every guide/blog links to relevant tool pages
- Breadcrumbs visible on all pages (not just in JSON-LD)
- 404 page with helpful navigation + search
- hreflang tags for da/en versions
- Image alt texts on all images (map thumbnails, charts, etc.)
- Core Web Vitals: LCP < 2.5s, CLS < 0.1, INP < 200ms

### Programmatic SEO Pages (Ralph can optimize existing)
- Kommune landing pages: "/[kategori]/[kommune]" — must have unique intro text, not just a list
- Category pages: "/[kategori]" — must have descriptive content above the fold
- Institution pages: "/institution/[slug]" — must have complete structured data
- Comparison pages: "/sammenlign/[type]" — must target "billigste vs bedste" queries
- Each pre-rendered page should have unique H1, unique meta description, and at least 1 paragraph of contextual text

### Content Structure (Ralph optimizes the template/code, not the content itself)
- Blog/guide page templates should have: proper heading hierarchy (H1 > H2 > H3), table of contents for long articles, related articles section, CTA to the tool
- Internal link components: "Populær i denne kommune", "Lignende institutioner", "Se også"

### Acceptance Criteria
- [ ] Zero pages with duplicate or missing meta titles
- [ ] JSON-LD validates on Google Rich Results Test for all page types
- [ ] Breadcrumbs visible and in JSON-LD on all pages
- [ ] All pre-rendered pages have unique H1
- [ ] Internal linking: every institution → kommune, every kommune → category
- [ ] og:image set on all pages (use a default if no specific image)
- [ ] hreflang da/en on all pages
- [ ] No orphan pages (every page reachable from navigation or internal links)
