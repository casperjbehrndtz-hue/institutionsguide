# PROMPT_plan.md — Institutionsguide.dk Planning Mode

0a. Study `specs/*` with subagents to learn what Institutionsguide should be.
0b. Study @AGENTS.md for build/test commands and stack knowledge.
0c. Study @IMPLEMENTATION_PLAN.md if it exists.
0d. Study the application source code in `src/*` with subagents.

1. Run backpressure to find current issues:
   - `npm run build` — note errors/warnings
   - `npx tsc -b` — note type errors
   - Check bundle sizes in build output
   - `grep -r "console.log" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test."` — count hits
   - `grep -rn "TODO\|FIXME\|HACK\|any " src/ --include="*.ts" --include="*.tsx" | head -30` — note issues
   - Check for duplicate/missing meta titles across routes
   - Check JSON-LD output on key page types
   - Check mobile responsiveness at 375px on key pages

2. Do gap analysis: compare `specs/*` against actual code. For each spec, list what's done, what's missing, what's broken. Be SPECIFIC — file names, line numbers, exact issues.

   Priority order for the plan:
   1. SEO (specs/seo-dominance.md) — highest priority, most items here
   2. UX/Design (specs/ux-design.md) — second priority
   3. Conversion (specs/conversion-gating.md) — third priority
   4. Data quality (specs/data-quality.md) — fourth priority
   5. Performance/Code (specs/performance-code.md) — fifth priority

3. Create/update @IMPLEMENTATION_PLAN.md:
   - Each task: what to do, which files, acceptance criteria, backpressure verification
   - Prioritized: P0 (broken/SEO-critical), P1 (high impact UX/SEO), P2 (conversion/data), P3 (polish/code)
   - SEO tasks should dominate P0 and P1 — this is the growth lever

4. Update @AGENTS.md if you learned anything new. Keep it under 60 lines.

IMPORTANT: Plan only. Do NOT implement anything. Do NOT commit.

ULTIMATE GOAL: Make Institutionsguide.dk the definitive platform for comparing Danish childcare and schools. The #1 Google result for every "[institutionstype] i [kommune]" query in Denmark. A product that feels authoritative, trustworthy, and genuinely useful to parents — good enough that they willingly give their email for the full report.
