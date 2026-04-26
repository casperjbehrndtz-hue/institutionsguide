# ANALYSIS.md — Kommune-modul

> Udfyld denne fil KOMPLET før du skriver én linje feature-kode. Kopiér denne fil til `ANALYSIS.md` i repo-root og udfyld hver sektion. Sektioner markeret "REQUIRED" skal besvares — efterlad intet tomt. Hvis du ikke kan svare, skriv `AFVENTER CASPER` i PROJECT_STATUS.md og stop.

**Udfyldt af**: Claude Code (Ralph-loop)
**Dato**: [YYYY-MM-DD]
**Git branch**: feature/kommune-modul
**Commit på master ved start**: [commit SHA]

---

## 1. Afvigelser fra givne fakta (REQUIRED)

Prompten (`PROMPT.md`) angiver en række fakta om kodebasen. Bekræft eller korrigér hver. Hvis du opdager afvigelser — rapportér dem her, opfind ikke workarounds.

| Fakta i PROMPT.md | Status | Kommentar |
|---|---|---|
| React Router v7, rute `/kommune/:name` | [ ] Bekræftet / [ ] Afviger | |
| Kommune-data ligger i `public/data/kommune-stats.json` | [ ] Bekræftet / [ ] Afviger | |
| `prerender-pages.mjs` genererer ~1939 sider | [ ] Bekræftet / [ ] Afviger | |
| Deploy fra `master`, ikke `main` | [ ] Bekræftet / [ ] Afviger | |
| Ingen eksisterende cron | [ ] Bekræftet / [ ] Afviger | |
| Ingen eksisterende PDF-pattern | [ ] Bekræftet / [ ] Afviger | |
| Recharts 3 allerede installeret | [ ] Bekræftet / [ ] Afviger | |

---

## 2. Eksisterende kodebase-audit (REQUIRED)

### 2.1 Genbrugelige komponenter
List komponenter fra `src/components/` du vil genbruge 1:1:

| Komponent | Sti | Bruges til |
|---|---|---|
| SEOHead | `src/components/shared/SEOHead.tsx` | Meta-tags på alle 4 nye sider |
| JsonLd | `src/components/shared/JsonLd.tsx` | Breadcrumb + schema |
| Breadcrumbs | `src/components/shared/Breadcrumbs.tsx` | Navigation |
| DataFreshness | `src/components/shared/DataFreshness.tsx` | Kilde-badge øverst |
| ... | | |

### 2.2 Genbrugelige libs
Funktioner fra `src/lib/` du vil genbruge:

| Funktion | Sti | Bruges til |
|---|---|---|
| breadcrumbSchema | `src/lib/schema.ts` | JSON-LD på alle 4 sider |
| toSlug | `src/lib/slugs.ts` | URL-generering i sitemap |
| formatDKK | `src/lib/format.ts` | Takster i tabeller |
| ... | | |

### 2.3 Genbrugelige komponent-patterns
Hvor i koden finder du eksempler på:
- Tabeller: [fil:linje]
- Grafer med Recharts: [fil:linje]
- Loading states: [fil:linje]
- Error states: [fil:linje]
- Mobile-first layout: [fil:linje]

### 2.4 Hvad skal bygges fra scratch
| Komponent | Hvorfor ikke genbrug |
|---|---|
| PDF-export | Ingen eksisterende pattern |
| XLSX-export | Ingen eksisterende pattern |
| ... | |

---

## 3. Data-audit (REQUIRED)

### 3.1 Hvilke datakilder har vi allerede?
| Fil | Indhold | Seneste fetchedAt | Dækning |
|---|---|---|---|
| `public/data/kommune-stats.json` | Takster, normering-aggregat | | X/98 kommuner |
| `public/data/normering-data.json` | Normering-historik | | |
| `public/data/institution-stats.json` | | | |
| `public/data/parent-satisfaction.json` | | | |
| `public/data/tilsynsrapporter.json` | | | |
| `public/data/school-extra-stats.json` | | | |

### 3.2 Hvilke data mangler for at bygge modulet?
- [ ] Indbyggertal per kommune — findes i: [fil / mangler]
- [ ] Urbaniseringsgrad — findes i: [fil / mangler]
- [ ] Socioøkonomisk indeks fra DST — findes i: [fil / mangler]
- [ ] Historiske takster (ikke kun seneste) — findes i: [fil / mangler]
- [ ] Historisk antal institutioner per år — findes i: [fil / mangler]

### 3.3 Handlingsplan for manglende data
Hvis noget mangler, hvad er planen? (ny script i `scripts/`, alternativ datakilde, accept af hul)

### 3.4 Verificerede kommune-navne til tests (REQUIRED)
Åbn `public/data/kommune-stats.json` og find den præcise stavemåde for:
- Ballerup: `[eksakt string fra JSON]`
- Aarhus (eller Århus?): `[eksakt string fra JSON]`
- Bornholms Regionskommune (eller Bornholm?): `[eksakt string fra JSON]`

---

## 4. Forventede tal for de 3 test-kommuner (REQUIRED)

Disse tal låses her og bruges som regressionstest. Hent dem fra rådata — ikke fra regnemaskine. Når aggregat-scripts kører, SKAL output matche disse.

### 4.1 Ballerup
| Nøgletal | Værdi | Kilde (fil + felt) |
|---|---|---|
| Vuggestue-takst | | `kommune-stats.json: kommuner.Ballerup.vuggestueTakst` |
| Børnehave-takst | | |
| Normering vuggestue | | |
| Antal institutioner total | | |
| Forventede top-5 peers | [liste] | Begrundelse baseret på similarity-variable |

### 4.2 Aarhus
| Nøgletal | Værdi | Kilde |
|---|---|---|
| ... | | |

### 4.3 Bornholms Regionskommune
| Nøgletal | Værdi | Kilde |
|---|---|---|
| ... | | |

---

## 5. Arkitekturbeslutninger (REQUIRED)

### 5.1 Data-layer pr. aggregat
| Aggregat | Valg | Begrundelse |
|---|---|---|
| `kommune-metrics` (seneste nøgletal) | [ ] Udvid eksisterende `kommune-stats.json` / [ ] Nyt JSON-script / [ ] Supabase-view | |
| `kommune-metrics-history` | | |
| `kommune-peers` (top 10 peers) | | |
| `institution-outliers` | | |

### 5.2 PDF-bibliotek (REQUIRED)
**Valg**: [ ] @react-pdf/renderer / [ ] pdfkit / [ ] puppeteer-core+@sparticuz/chromium / [ ] andet

**Begrundelse**:
- Bundle-størrelse: [MB]
- Vercel Serverless-kompatibel: [ja/nej]
- Dansk typografi / diakritiske tegn: [ja/nej]
- A4 + paginering + sidetal: [hvordan]
- Fordele:
- Ulemper:

### 5.3 Peer-matching vægte
Brug hypoteserne fra PROMPT.md som start. Hvis socioøkonomisk indeks mangler, foreslå normaliseret alternativ her:

| Variabel | Vægt | Kilde i data |
|---|---|---|
| Indbyggertal | 0.25 | |
| Urbaniseringsgrad | 0.20 | |
| Socioøkonomisk indeks | 0.25 | |
| Antal institutioner | 0.15 | |
| Andel private/selvejende | 0.15 | |

### 5.4 Outlier-tærskel
Minimum antal institutioner før outlier-analyse aktiveres: **15** (eller foreslå andet tal + begrundelse fra data-fordeling).

Distribution: hvor mange af de 98 kommuner har ≥15 institutioner i hver kategori?
| Kategori | Kommuner ≥15 inst. | Kommuner <15 inst. |
|---|---|---|
| Vuggestue | | |
| Børnehave | | |
| Dagpleje | | |
| Skole | | |

### 5.5 Nightly regenerering
[ ] Tilføj til `scripts/refresh-all.mjs` (manuel kørsel) — anbefalet
[ ] Opsæt Vercel Cron — kræver Vercel Pro og `AFVENTER CASPER`
[ ] Opsæt Supabase Cron — kun hvis aggregater flyttes til Supabase

---

## 6. Build-pipeline-ændringer (REQUIRED)

### 6.1 Nye ruter i `src/App.tsx`
```tsx
const KommuneBenchmarkPage = lazyRetry(() => import("@/pages/KommuneBenchmarkPage"));
// ... osv
<Route path="/kommune/:name/benchmark" element={<KommuneBenchmarkPage />} />
// ... osv
```

### 6.2 Tilføjelser til `scripts/prerender-pages.mjs`
Nuværende: ~1939 sider. Nyt: +~392 sider (4 × ~98 kommuner). List præcist hvor i filen du tilføjer logikken.

### 6.3 Tilføjelser til `scripts/generate-sitemap.mjs`
Nuværende: ~8500 URLs. Nyt: +~392 URLs. List præcist hvor i filen du tilføjer logikken.

### 6.4 Verifikation
Efter ændringer: `npm run build` skal producere den forventede antal HTML-filer. Forventet stigning: ~392 filer.

---

## 7. Afhængigheder og risici

### 7.1 Nye deps jeg vil tilføje
| Dep | Version | Type | Størrelse impact |
|---|---|---|---|
| xlsx | ^0.18.x | runtime | ~550KB (lazy-load) |
| [PDF-lib] | | | |

### 7.2 Risici
- [ ] Vercel Serverless 50MB-grænse ved PDF-generering
- [ ] Bundle-size for `xlsx` — skal lazy-loades kun på eksport-knap
- [ ] Danske substantivbøjninger i template-fortælling
- [ ] Outlier-analyse giver støj på kommuner med 15-20 institutioner
- [ ] Peer-matching-vægte kan give ulogiske resultater (valideres i Fase 1)

---

## 8. Konklusion (REQUIRED)

### 8.1 Hvad kan genbruges 1:1
- [liste]

### 8.2 Hvad skal udvides
- [liste]

### 8.3 Hvad skal bygges fra bunden
- [liste]

### 8.4 Åbne spørgsmål til Casper
Hvis denne liste ikke er tom, skriv `AFVENTER CASPER` i `PROJECT_STATUS.md` og stop loopen.

- [ ] [spørgsmål]
- [ ] [spørgsmål]

### 8.5 Klar til Fase 1?
- [ ] Alle REQUIRED-sektioner udfyldt
- [ ] Ingen åbne spørgsmål til Casper
- [ ] 3 test-kommuners forventede tal er noteret
- [ ] PDF-lib valgt og begrundet
- [ ] Data-layer-beslutning taget for alle 4 aggregater

Når alle 5 checkboxes er tikket: fortsæt til Fase 1.
