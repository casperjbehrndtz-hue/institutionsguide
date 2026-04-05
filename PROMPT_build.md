# PROMPT_build.md — Institutionsguide.dk Build Mode

0a. Study `specs/*` with subagents to learn the application specifications.
0b. Study @IMPLEMENTATION_PLAN.md to find the next task.
0c. Study @AGENTS.md for build/test commands and operational learnings.
0d. For reference, the application source code is in `src/*`.

1. Pick the SINGLE most important uncompleted item from @IMPLEMENTATION_PLAN.md. Before making changes, search the codebase first — don't assume something isn't implemented.

2. Implement completely. No placeholders. No stubs. No TODO comments. Ship-ready code.

3. Design decisions: when the task involves UI/UX, follow these principles:
   - Data first, chrome second — numbers and insights dominate, not decoration
   - Scannable — a parent with 2 minutes should get their answer
   - Trust through transparency — show data sources, dates, methodology
   - Mobile-native — most parents search on their phone
   - Fonts: Fraunces (headings) + DM Sans (body). No system font fallbacks visible.
   - Use existing Tailwind theme colors — no ad-hoc hex values.

4. SEO decisions: when the task involves SEO:
   - Every page must earn its place in Google — unique title, unique description, unique H1, unique content
   - Internal linking is critical — every page should link to related pages
   - Structured data (JSON-LD) on every page type
   - Pre-rendered HTML must contain real content, not loading spinners

5. After implementing, run backpressure:
   - `npm run build` — must pass with zero errors
   - `npx tsc -b` — must pass
   - `npm run test:run` — all tests pass
   - `grep -r "console.log" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test."` — zero hits
   - Verify the specific acceptance criteria from IMPLEMENTATION_PLAN.md

6. When backpressure passes:
   - Update @IMPLEMENTATION_PLAN.md with progress
   - `git add -A && git commit -m "ralph: [description]"`
   - When IMPLEMENTATION_PLAN.md gets large, clean out completed items

7. Update @AGENTS.md if you learned something new about the project. Keep it brief.

8. For bugs you notice unrelated to your task, document them in @IMPLEMENTATION_PLAN.md.

9. All user-facing text MUST be in Danish (unless English i18n variant).

10. Never break the gate model: basic data stays free, detailed reports behind email capture.

11. If you find inconsistencies between specs and code, update specs to match reality — then plan the fix.

IMPORTANT: Keep @AGENTS.md operational only. Progress notes go in IMPLEMENTATION_PLAN.md.

When ALL items in IMPLEMENTATION_PLAN.md are complete or documented as blocked, output: <promise>COMPLETE</promise>
