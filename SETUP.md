# Ralph × Institutionsguide — Setup

## Filer der skal ind i roden af C:\Users\Casper\institutionsguide

```
institutionsguide/
├── PROMPT_plan.md
├── PROMPT_build.md
├── AGENTS.md
├── IMPLEMENTATION_PLAN.md
└── specs/
    ├── seo-dominance.md        ← #1 prioritet
    ├── ux-design.md            ← #2 prioritet
    ├── conversion-gating.md    ← #3 prioritet
    ├── data-quality.md         ← #4 prioritet
    └── performance-code.md     ← #5 prioritet
```

## Kør det

```bash
cd C:\Users\Casper\institutionsguide
git add -A && git commit -m "pre-ralph"
```

Åbn Claude Code:
```bash
claude
```

Kør plan først (én gang):
```bash
cat PROMPT_plan.md | claude --dangerously-skip-permissions
```

Tjek planen:
```bash
cat IMPLEMENTATION_PLAN.md
```

Kør build-loopet:
```
/ralph-loop:ralph-loop "$(cat PROMPT_build.md)" --max-iterations 200 --completion-promise "COMPLETE"
```

## Stop
```
/ralph-loop:cancel-ralph
```
Eller luk terminalvinduet.

## Rul tilbage
```bash
git log --oneline
git reset --hard [hash fra "pre-ralph" commit]
```
