# Byg Kommune-modul til Institutionsguiden.dk

> Ralph-loop prompt. Kør med `while :; do cat PROMPT.md | claude; done` fra feature-branch `feature/kommune-modul` (branchet fra `master`, ikke `main`).

---

## HARD GATE — Før du gør noget som helst

**Hvis `ANALYSIS.md` ikke findes i repo-root:**
- Din eneste handling i denne iteration er at oprette `ANALYSIS.md` ud fra `ANALYSIS_TEMPLATE.md`.
- Skriv intet andet. Lav ingen migrations, komponenter, ruter.
- Når `ANALYSIS.md` er udfyldt, opdatér `PROJECT_STATUS.md` med status "Afventer review af ANALYSIS.md" og skriv `AFVENTER CASPER`. Stop.

**Hvis `ANALYSIS.md` findes men er markeret `AFVENTER CASPER`:**
- Stop. Rør ikke ved noget.

**Hvis `ANALYSIS.md` findes og er godkendt (ingen `AFVENTER CASPER`):**
- Fortsæt efter fase-planen nedenfor.

---

## Kodebase-fakta (du skal IKKE genanalysere disse — de er givet)

Følgende er verificeret per 2026-04-20. Tag dem som sandhed og byg videre på dem. Hvis du opdager afvigelser, skriv det under "Afvigelser fra givne fakta" i `ANALYSIS.md` — men opfind ikke alternativer uden grund.

**Stack**
- React 19 + Vite 8 + TypeScript 5.9 strict + Tailwind 4
- React Router v7 med `lazyRetry()` wrapper (se `src/App.tsx`)
- Recharts 3 (allerede i bundle — brug den, tilføj ikke nyt graf-lib)
- Leaflet + react-leaflet + MarkerCluster (til kort)
- Supabase kun til reviews, blog, AI-vurderinger, prishistorik, tilsynsrapporter
- Sentry + PostHog + Umami til tracking

**Data-layer (KRITISK — læs nøje)**
- Kommune-nøgletal er **statisk JSON** i `public/data/`:
  - `kommune-stats.json` (takster, normering-aggregat, børnetal, sygefravær)
  - `normering-data.json` (historik per kommune/aldersgruppe/år i kompakt format `{m, ag, y, r}`)
  - `institution-stats.json`, `parent-satisfaction.json`, `tilsynsrapporter.json`
- Disse loades ved app-start via `src/contexts/DataContext.tsx`
- Supabase bruges **ikke** til nøgletal. Nye aggregater skal som udgangspunkt bygges som JSON-output via et script i `scripts/` der skrives til `public/data/`
- Undtagelse: hvis aggregatet er tungt (>2MB) eller skal serveres per-request, brug en Supabase edge-function. Dokumentér valget i `ANALYSIS.md`

**Routing**
- Kommune-siden hedder `/kommune/:name` (ikke `[navn]` — det er Next-syntax, ikke relevant her)
- `name` er dansk kommune-navn i URL-encoded form (`København`, `Aarhus`, `Bornholm`). Slug-funktionen (æ→ae, ø→oe, å→aa) bruges i sitemap men ikke i runtime-routing
- Nye ruter SKAL registreres i `src/App.tsx` med `lazyRetry()`

**SEO-pipeline (kritisk — misset i første udkast)**
- `scripts/prerender-pages.mjs` bygger ~1939 statiske HTML-filer ved `npm run postbuild`
- `scripts/generate-sitemap.mjs` genererer `public/sitemap.xml` ved `npm run prebuild`
- `dk-seo/middleware.ts` serverer bot-specifik HTML ved runtime
- **4 nye ruter × ~98 kommuner = 392 nye sider**. Alle tre pipeline-komponenter skal udvides — ikke kun sitemap
- Hver ny rute skal have: `SEOHead`, `JsonLd` (breadcrumb + passende schema), `Breadcrumbs`, `DataFreshness`

**Deploy**
- Vercel, auto-deploy fra `master` (ikke `main`)
- **Ingen eksisterende cron.** Data refreshes manuelt via `npm run refresh` / `scripts/refresh-all.mjs`. Hvis nightly regenerering er nødvendig, udvid `refresh-all.mjs` eller foreslå Vercel Cron i `ANALYSIS.md` med begrundelse

**Backpressure (fra `AGENTS.md` — alle 5 skal være grønne før en fase lukkes)**
1. `npm run build` — zero errors, zero warnings
2. `npx tsc -b` — zero type errors
3. `npm run test:run` — alle tests passerer
4. Ingen `console.log` i `src/` (undtagen `.test.` filer)
5. Ingen nye chunks over 250KB (undtagen lazy vendor-chunks)

**Kendte begrænsninger**
- PDF-generering har **ingen eksisterende pattern** (IMPLEMENTATION_PLAN.md P5-6 er blocked). Du bygger fra scratch
- `Lighthouse` kan ikke måles pålideligt lokalt — fjern som stop-kriterium i Fase 4, kør først efter preview-deploy
- 14 filer er over 400 linjer. Tilføj ikke flere. Hvis en ny side nærmer sig 400 linjer, split proaktivt

---

## Tilladte nye dependencies

Kun disse to må tilføjes uden at spørge:

1. **`xlsx`** (sheetjs) — til XLSX-eksport
2. **ÉN** PDF-løsning efter dit valg. Dokumentér beslutningen i `ANALYSIS.md` med disse constraints:
   - Skal køre i Vercel Serverless (50MB deployment-grænse)
   - Dansk typografi, fonts må bundles eller fetches fra Google Fonts
   - Skal kunne lave A4 med paginering, sidetal, footer
   - Kandidater: `@react-pdf/renderer`, `pdfkit`, `puppeteer-core + @sparticuz/chromium`

Alt andet kræver `AFVENTER CASPER`.

---

## Produktets formål

Kommune-modulet skal besvare 5 spørgsmål for en given kommune:

1. Hvordan ligger kommunen på nøgletal vs. landsgennemsnit og peer-kommuner?
2. Hvilke af kommunens institutioner afviger markant fra resten?
3. Hvordan udvikler kommunen sig over tid?
4. Hvilke peer-kommuner kan vi lære af?
5. Hvordan eksporteres dette til byrådsbrug?

Dette er ikke et generisk dashboard. Det er et værktøj der besvarer præcist disse 5 spørgsmål godt. Hvis en komponent ikke bidrager til ét af de 5 svar, fjern den.

## Målgruppe og tone

**Brugere**: dagtilbudschefer, skolechefer, forvaltningskonsulenter i kommuner. Analytiske, tidspressede, skal kunne forsvare tallene foran politikere.

**Designreferencer** (match stilen — ikke genericitet):
- Danmarks Statistik publikationer (dst.dk rapporter)
- KL's analyser og faktaark (kl.dk)
- Indenrigsministeriets kommunefakta

**Designprincipper**:
- Forvaltnings-æstetik: dokumentlook, meget whitespace, ingen kort-skygger/gradients
- Typografi fremfor farve til hierarki. Fraunces til overskrifter, DM Sans til body (allerede i stacken)
- Alle tal skal have kildeangivelse og `DataFreshness`-badge synlig
- Ingen emoji, ingen dashboard-kitsch, ingen "↑ 12% stigning!" i farvet boks

## Scope for denne første version

**Ingen betaling, ingen login, ingen gating.** Modulet er åbent og indekserbart. Formålet er demo-kvalitet til salgsmøder.

Monetisering håndteres manuelt (faktura via e-mail) når kunder kommer. Stripe/abonnement bygges først ved 3+ betalende kunder.

Eksport er åben fra start. Strategisk valg: vi vil hellere have at kommuner bruger det og skaber interne referencer.

---

## Delt datakontrakt — bygges først

Før nogen side bygges, skriv `src/lib/kommune/metrics.ts` med denne kontrakt:

```ts
export interface KommuneMetrics {
  kommune: string;
  takster: { vuggestue: number | null; boernehave: number | null; dagpleje: number | null; sfo: number | null };
  normering: { vuggestue: number | null; boernehave: number | null; dagpleje: number | null };
  institutionCounts: { total: number; offentlig: number; privat: number; selvejende: number };
  kvalitet: { trivsel: number | null; karaktersnit: number | null } | null;
  sources: Record<string, { source: string; year: number; fetchedAt: string }>;
  nationalAvg: Partial<KommuneMetrics>; // samme struktur uden sources
  peerAvg: Partial<KommuneMetrics>;     // baseret på top-10 peers
}

export function getKommuneMetrics(name: string): KommuneMetrics;
```

Sider, eksport OG tests importerer kun fra `metrics.ts`. Ingen sider må læse rå JSON direkte. Det garanterer drift-frit match mellem visning og eksport.

---

## De 4 nye sider

Ruterne tilføjes som `/kommune/:name/benchmark`, `/kommune/:name/afvigere`, `/kommune/:name/udvikling`, `/kommune/:name/peers`.

Hver side skal have:
- `SEOHead` (title maks 60 tegn, description 140-160)
- `JsonLd` med `breadcrumbSchema` + passende schema
- `Breadcrumbs` komponent (Forside → Kommuner → [Kommune] → [Side])
- `DataFreshness` badge øverst med seneste `fetchedAt`
- Mobile-first layout (kommunale chefer læser på telefon)

### 1. Benchmark (`/kommune/:name/benchmark`)

**Sektion A — Status i dag**
Tabel med nøgletal: kommunens værdi | landsgennemsnit | peer-gennemsnit | afvigelse i procent | retning (bedre/værre/neutral, baseret på hvad der er fagligt "bedre" pr. metrik — lavere takst er bedre, lavere børn-pr-voksen er bedre, højere karaktersnit er bedre, osv.).

Nøgletal minimum: normering (vuggestue + børnehave), takster (vuggestue + børnehave + SFO hvor relevant), antal institutioner, fordeling offentlig/privat/selvejende. Inkludér karakter/trivsel hvis data findes.

**Sektion B — Automatisk fortælling**
Template-genereret tekst (ikke LLM). Byg `src/lib/kommune/narrative.ts` med eksplicitte template-funktioner pr. retning. Dansk substantivbøjning er farlig — lav eksempler for positive, negative og neutrale afvigelser, og skriv vitest-tests der verificerer grammatikken.

Eksempel output:
> "Bornholms Regionskommune ligger 18% under peer-gennemsnittet på normering i vuggestuer (3,4 vs 4,1 børn pr. voksen) — det er blandt de 10 bedste i landet."

**Sektion C — Eksport**
Knapper til PDF og XLSX. Dokumentet er formatteret til byrådsbrug, ikke en CSV-dump. Både PDF og XLSX bruger `getKommuneMetrics()` — ingen separat data-path.

### 2. Afvigere (`/kommune/:name/afvigere`)

Liste over institutioner der afviger >1,5 SD fra kommune-gennemsnit på mindst ét nøgletal.

**Minimum-count-regel**: Outlier-analyse aktiveres kun hvis kommunen har ≥15 institutioner i den relevante kategori. Under 15: vis besked "For få institutioner til meningsfuld outlier-analyse" og lad sektionen være tom. Dokumentér tærsklen i `ANALYSIS.md` og juster hvis data-fordelingen taler imod 15.

For hver afviger:
- Institutionens navn (link til institutionsside)
- Hvilke metrikker den afviger på
- Retning + størrelse af afvigelsen

Filtre: positive/negative/alle, institutionstype. Sortering: mest afvigende først. Eksport XLSX.

### 3. Udvikling (`/kommune/:name/udvikling`)

Tidsserie-grafer i Recharts. Mindst 3 års historik hvor data findes.

Grafer:
- Normering over tid (per aldersgruppe)
- Takster over tid (indekseret til 100 i startåret for at vise relativ udvikling)
- Antal institutioner over tid med fordeling på type (stacked area)

Toggle på hver graf: overlejr landsgennemsnit / peer-gennemsnit. Hover viser præcis værdi + kilde.

Eksport PDF.

### 4. Peers (`/kommune/:name/peers`)

Top 5 peer-kommuner i tabel med similarity score (0-1) og kort begrundelse ("Lignende indbyggertal og urbaniseringsgrad").

Direkte sammenligning på 5 nøgletal i tabel. "Udvid til top 10"-knap.

Sektion "Hvad kan vi lære?": automatisk identifikation af peers der scorer markant bedre på specifikke nøgletal, med links til deres kommune-sider. "Markant bedre" = >10% forskel på en metrik hvor peeren er i top-25% nationalt.

---

## Peer-matching algoritme

Peer-kommuner defineres via vægtet similarity. Vægte nedenfor er **hypoteser** — valider dem på Ballerup, Aarhus og Bornholms Regionskommune (verificér de præcise stavemåder i `kommune-stats.json` før tests skrives) i Fase 1 og juster hvis peers ikke giver forvaltningsmæssig mening.

Kandidat-vægte:
- Indbyggertal (vægt 0.25)
- Urbaniseringsgrad (vægt 0.20)
- Socioøkonomisk indeks fra Danmarks Statistik (vægt 0.25)
- Antal institutioner (vægt 0.15)
- Andel private/selvejende institutioner (vægt 0.15)

Tjek i Fase 0 om socioøkonomisk indeks findes i `public/data/`. Hvis ikke: flag det i `ANALYSIS.md`, brug tilgængelige variable, og normalisér vægtene.

Implementér som ren TypeScript-funktion (ikke SQL — vi arbejder på JSON-data):
```ts
export function computePeers(kommune: string, topN?: number): Peer[];
```
Placér i `src/lib/kommune/peers.ts`. Vitest-tests skal verificere at Ballerup har andre storkøbenhavnske kommuner i top 5, at Aarhus har andre store byer, og at Bornholms Regionskommune har andre ø-kommuner — hvis ikke, er vægtene forkerte.

---

## Datagrundlag og aggregater

Baseret på Fase 0-analyse: beslut per aggregat om det bygges som JSON-script eller Supabase-view. Forventet default er JSON-script.

Kandidater:
- `kommune-metrics.json` (seneste nøgletal per kommune) — nyt
- `kommune-metrics-history.json` (historik) — udvider eksisterende `kommune-stats.json`?
- `kommune-peers.json` (top 10 peers per kommune, genereret via `computePeers()`) — nyt
- `institution-outliers.json` (afvigere per kommune, genereret via outlier-detection) — nyt

For hver beslutning: ny `scripts/build-*.mjs` + tilføj til `refresh-all.mjs`.

---

## Tekniske krav

- Match eksisterende stack, ingen nye tunge dependencies udover de 2 godkendte
- TypeScript strict mode (allerede slået til)
- Alle nye sider SEO-optimerede med korrekte meta-tags og JSON-LD
- Sider tilføjet til `prerender-pages.mjs` + `generate-sitemap.mjs`
- Mobile-first (kommunale brugere tjekker fra telefon)
- Accessibility WCAG AA
- Ingen konsollog, ingen TODOs i committed kode

---

## Eksport

**PDF**: bygges fra bunden (ingen eksisterende pattern). Dokumentér dit lib-valg i `ANALYSIS.md`. Designet til print: A4, paginering, sidetal, footer med dato og "Kilde: Institutionsguiden.dk". Data hentes via `getKommuneMetrics()`.

**XLSX**: via `xlsx` (sheetjs). Separate ark:
- `Nøgletal` — kommunens værdier vs lands- og peer-gennemsnit
- `Afvigere` — institution outliers
- `Udvikling` — tidsseriedata (én kolonne pr. år)
- `Peers` — top 10 peers med similarity scores
- `Om dataene` — metadata, kildeangivelser, hentedato

---

## Arbejdsproces — fase-plan

Opdatér `PROJECT_STATUS.md` efter hver fase. Alle 5 backpressure-punkter skal være grønne før en fase markeres færdig.

### Fase 0: Analyse (OBLIGATORISK)
1. Udfyld `ANALYSIS.md` fra template
2. Valider 3 test-kommuners præcise stavemåder i `public/data/kommune-stats.json`
3. Tjek om socioøkonomisk indeks findes — hvis ikke, dokumentér
4. Beslut PDF-lib og dokumentér begrundelse
5. Beslut data-layer per nyt aggregat (JSON-script vs Supabase)
6. Skriv forventede peer-resultater for de 3 test-kommuner
7. Skriv `AFVENTER CASPER` og stop hvis der er åbne blokkere

### Fase 1: Data-fundament
1. Skriv `src/lib/kommune/metrics.ts` — `getKommuneMetrics()` med fuld typekontrakt
2. Skriv `src/lib/kommune/peers.ts` — `computePeers()` + vitest-tests på Ballerup/Aarhus/Bornholm
3. Skriv `src/lib/kommune/outliers.ts` — outlier-detection + minimum-count-regel
4. Skriv `src/lib/kommune/narrative.ts` — template-fortælling + vitest-tests for grammatikvarianter
5. Skriv script(s) til at generere nye JSON-aggregater, tilføj til `scripts/refresh-all.mjs`
6. Verifikationstest: tal for Ballerup, Aarhus og Bornholms Regionskommune matcher forventningerne fra `ANALYSIS.md`

### Fase 2: Sider
1. `/kommune/:name/benchmark` end-to-end for én kommune
2. Manuel verifikation: værdier på siden matcher rådata i stikprøve
3. `/kommune/:name/afvigere`
4. `/kommune/:name/udvikling`
5. `/kommune/:name/peers`
6. Registrér alle 4 ruter i `src/App.tsx`
7. Udvid `prerender-pages.mjs` med 4 × antal-kommuner nye sider
8. Udvid `generate-sitemap.mjs` tilsvarende
9. Kør `npm run build` og verificér at prerender genererer alle nye sider

### Fase 3: Eksport
1. PDF-generator via valgt lib, data fra `getKommuneMetrics()`
2. XLSX-generator via `xlsx`, data fra `getKommuneMetrics()`
3. Automatisk test: eksport-tal matcher værdier på siden for de 3 test-kommuner
4. Manuel test: åbn PDF + XLSX for Ballerup, Aarhus, Bornholms Regionskommune — ser de forvaltnings-præsentable ud?

### Fase 4: Polering
1. Accessibility (WCAG AA) — manuel tastaturnavigation + screen reader-tjek
2. Mobile layout — test på 375px bredde
3. Skriv `/for-kommuner` landing page
4. Skriv `/om-dataene` med metodebeskrivelse (peer-vægte, outlier-tærskel, kilder)
5. Preview-deploy på Vercel, kør Lighthouse dér (ikke lokalt)

---

## Stop-kriterier (alle 5 skal holde før en fase lukkes)

- Alle backpressure-punkter grønne (build, tsc, tests, console.log, chunk-størrelser)
- Tal på sider matcher rådata (stikprøve på Ballerup, Aarhus, Bornholms Regionskommune)
- Chrome, Safari, Firefox: siderne renderer og er brugbare
- Mobile layout fungerer på 375px
- Eksport-tal matcher site-tal

Fejler ét: loop tilbage og fix. Mark aldrig en fase færdig med åbne fejl.

---

## Hvad der IKKE skal bygges nu

- Betaling, Stripe, abonnementer
- Auth, login, magic links
- AI-genereret analysetekst (template-baseret er det rigtige valg)
- Team-funktioner / deling med kolleger
- Dyb kommune-systemintegration (SSO, dataudveksling)
- Lighthouse-performance-audit som stop-kriterium (defer til preview)
- WebP-billedekonvertering (ingen billeder i modulet)

Disse kommer når der er betalende kunder. Ikke før.

---

## PROJECT_STATUS.md format

```
# Kommune-modul status

Aktuelt: [Fase X, trin Y]
Sidste handling: [kort beskrivelse]
Næste handling: [kort beskrivelse]
Blokkere: [problemer der kræver Casper, eller "ingen"]
Backpressure: [build/tsc/test/console/chunks — 5x ✅ eller hvilke fejler]
Færdig:
 - ...
 - ...
```

Hvis blokkere kræver beslutning: skriv `AFVENTER CASPER` øverst og stop loopen.

---

## Kvalitetsprincip

Dette skal demoes for KL og sælges til kommuner. Ingen TODOs i koden. Ingen "kommer senere"-kommentarer. Hvis noget ikke er færdigt, er fasen ikke færdig.

Tvivl? Læs koden først. Spørg kun Casper hvis koden ikke giver svar — via `AFVENTER CASPER` i `PROJECT_STATUS.md`.
