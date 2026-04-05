# specs/conversion-gating.md — Conversion & Gating Strategy

## Priority: #3

## Job to Be Done
Parents who find value in the free data should want to give their email to unlock the full report. The gate should feel like a natural progression, not a wall.

## Current Model
Email capture (no real auth). GatedSection + InstitutionGateModal components exist.

## Strategy: Show Value First, Gate the Depth

### What's FREE (visible to everyone, indexed by Google)
- Institution name, type, category, kommune
- Overall quality score (the ring)
- Basic metrics: normering ratio, price range, institution type
- Map location
- Kommune overview pages with institution lists
- Category pages with filters and sorting
- Blog/guide content
- Friplads calculator
- Prissammenligning overview

### What's GATED (email required)
- Full quality report: detailed breakdown of all scoring dimensions
- AI-powered assessment (områdevurdering)
- AI chat with institution-specific context
- Tilsynsrapporter (full text/summary)
- Historical price trends (chart)
- Personalized ranking based on family profile
- PDF report download
- Compare tool (side-by-side detailed)
- Review analysis (themes, sentiment)

### Gate UX Rules
1. Free content must be GENUINELY useful — not a teaser. The parent should learn something real before hitting the gate.
2. Gate trigger: when user tries to access depth (click "Se fuld rapport", "Start AI chat", "Download rapport")
3. Modal: clean, single email field, clear value proposition: "Få adgang til den fulde rapport for [institution name]"
4. Post-gate: immediate access, no email confirmation required (reduce friction)
5. Gate state persists in localStorage — once unlocked, stays unlocked
6. Show blurred/preview content behind gate to create desire (like Boliga's sold prices)
7. Never gate the basic data — that's what Google indexes and drives SEO traffic

### Conversion Tracking
- Track: page_view → scroll_depth → gate_impression → gate_submit → gated_content_viewed
- Track which gated features are most popular
- Track gate rejection rate (saw modal, closed without submitting)

### Cross-sell (after gate)
- ParFinans.dk nudge: "Skal I dele udgifterne til institution? →"
- Børneskat.dk nudge: "Spar skat på barnets opsparing →"
- NemtBudget.nu nudge: "Se hvad institutionen koster i dit budget →"
- Only show cross-sell AFTER the user has gotten value (on report page, not on gate modal)

### Acceptance Criteria
- [ ] Basic institution data visible without any gate
- [ ] Gate modal is clean, single field (email), with clear value prop
- [ ] Blurred/preview content visible behind gate on institution detail page
- [ ] Gate state persists in localStorage
- [ ] Cross-sell only appears on gated content pages, after value delivered
- [ ] Analytics events fire at each conversion step
- [ ] Mobile gate modal is full-screen, easy to complete
