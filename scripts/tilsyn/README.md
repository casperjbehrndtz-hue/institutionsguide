# Tilsynsrapporter — Datakilder for 10 største kommuner

Research udført marts 2026. Oversigt over hvor kommunerne offentliggør tilsynsrapporter for dagtilbud (vuggestuer, børnehaver, dagpleje).

---

## 1. København

- **URL**: https://www.kk.dk/borger/pasning-og-skole/kvalitet-og-tilsyn/paedagogisk-tilsyn-i-dagtilbud
- **PDF-system**: `https://iwtilsynpdf.kk.dk/pdf/{id}.pdf` — individuelle rapporter med numerisk ID
- **Format**: PDF (struktureret, ensartet skabelon)
- **Frekvens**: Årligt i alle daginstitutioner
- **Type**: Anmeldt pædagogisk tilsyn udført af pædagogiske konsulenter
- **Scraping-vurdering**: GOD — PDFer har forudsigelige URLs med numeriske IDer (f.eks. 2258, 6374). Kan itereres.
- **Eksempler**:
  - https://iwtilsynpdf.kk.dk/pdf/2258.pdf (Kennedygården 2025)
  - https://iwtilsynpdf.kk.dk/pdf/6374.pdf (Børnehuset i Svinget 2025)
  - https://iwtilsynpdf.kk.dk/pdf/2250.pdf (Rosengården 2025)

## 2. Aarhus

- **URL**: https://aarhus.dk/borger/pasning-skole-og-uddannelse/kvalitet-i-boern-og-unges-hverdag/tilsyn-i-boern-og-unge/tilsyn-i-dagtilbud/
- **Kvalitetsrapporter**: https://aarhus.dk/borger/pasning-skole-og-uddannelse/kvalitet-i-boern-og-unges-hverdag/kvalitetsrapporter/
- **Format**: PDF, tilgængelig på afdelingers hjemmesider
- **Frekvens**: Årligt — uanmeldte observationer (3 timer) med ITERS-3/ECERS-3 skalaer
- **Type**: Uanmeldt, observationsbaseret med certificerede konsulenter
- **Scraping-vurdering**: MIDDEL — rapporter ligger på individuelle afdelingers Aula-sider. Kræver navigation.
- **Note**: ~300 dagtilbud; vurdering i 3 kategorier

## 3. Odense

- **URL**: https://www.odense.dk/borger/familie-boern-og-unge/dagtilbud
- **Tilsyn**: https://www.odense.dk/dagtilbud/boerneinstitutioner/centrum-syd/om-institution-centrum-syd/tilsyn
- **Format**: PDF/HTML på institutioners individuelle sider
- **Frekvens**: Årligt — to observatører besøger institutionen
- **Type**: Både løbende (af institutionsleder) og upartisk årligt tilsyn
- **Scraping-vurdering**: MIDDEL — rapporter på individuelle institutionssider under odense.dk/dagtilbud/

## 4. Aalborg

- **URL**: https://www.aalborg.dk/om-kommunen/tilsyn-og-servicegrundlag/tilsyn/boern-og-unge/tilsynsrapporter-for-daginstitutioner/
- **Tilsynsportal**: https://tilsyn.aalborg.dk/tilsyn-paa-boerne-og-ungeomraadet/tilsynsrapporter-for-daginstitutioner
- **Format**: PDF, centraliseret liste
- **Frekvens**: Årligt, skiftevis anmeldt og uanmeldt
- **Type**: Pædagogisk tilsyn af tilsynskonsulenter
- **Scraping-vurdering**: GOD — centraliseret portal med liste over alle rapporter. Senest opdateret jan. 2026.

## 5. Esbjerg

- **URL**: https://www.esbjerg.dk/boern-og-unge/boernepasning
- **Institutioner**: https://boernepasning.esbjerg.dk/daginstitutioner
- **Rapporter**: Ligger under individuelle institutioners "rapporter-og-dokumenter" sider
  - Eksempel: https://boernepasning.esbjerg.dk/daginstitutioner/galaksen/rapporter-og-dokumenter
- **Format**: PDF
- **Frekvens**: Løbende, både anmeldt og uanmeldt
- **Type**: Pædagogisk og driftsmæssigt tilsyn
- **Scraping-vurdering**: MIDDEL — struktureret URL-mønster (`boernepasning.esbjerg.dk/daginstitutioner/{navn}/rapporter-og-dokumenter`)

## 6. Randers

- **URL**: https://www.randers.dk/borger/boern-unge-og-familie/dagtilbud-og-pasning/tilsyn/
- **Format**: PDF, tilgængelig centralt på tilsynssiden + individuelle institutioner
- **Frekvens**: Årligt (jan-okt tilsynsperiode), samlet rapport til politisk niveau ultimo året
- **Type**: Pædagogisk tilsyn af pædagogfaglige konsulenter
- **Scraping-vurdering**: GOD — samlet tilsynsside med links til alle rapporter
- **Note**: Rapporter for 2025 allerede publiceret for mange institutioner

## 7. Kolding

- **URL**: https://www.kolding.dk/borger/familier-og-boern/dagtilbud
- **Tilsynsretningslinjer**: https://www.kolding.dk/borger/familie-boern/boernepasning/politikker-strategier-projekter-boernepasning/retningslinjer-for-paedagogisk-tilsyn
- **Format**: PDF (kvalitetsrapporter der skal offentliggøres jf. ny tilsynslov)
- **Frekvens**: Årlige dialogmøder i alle institutioner
- **Type**: Pædagogisk tilsyn med kvalitetsrapporter
- **Scraping-vurdering**: SVÆR — rapporter spredt, ikke centraliseret portal

## 8. Horsens

- **URL**: https://horsens.dk/familie/boernogunge/dagtilbud
- **Tilsyn**: https://dagtilbud.horsens.dk/langmark/dagtilbud-langmark/kvalitet-og-politikker/paedagogisk-tilsyn
- **Institutionsportal**: https://dagtilbud.horsens.dk/
- **Format**: PDF på institutioners hjemmesider
- **Frekvens**: Årligt + forældretilfredshedsundersøgelse hvert 2. år
- **Type**: Kommunalt tilsyn + kvalitetsrapporter
- **Scraping-vurdering**: MIDDEL — struktureret portal på dagtilbud.horsens.dk med institution-specifikke undersider

## 9. Vejle

- **URL**: https://www.vejle.dk/borger/mit-liv/boern-og-familie/boernepasning/
- **Tilsynsrapporter**: Publiceres på individuelle institutioners hjemmesider
  - Eksempel: https://bguhrhoej.vejle.dk/tilsyn-og-undersoegelser/tilsynsrapporter/
- **Format**: PDF
- **Frekvens**: Hvert 2. år
- **Type**: Observationsbaseret (2 timer observation + 2 timer feedback)
- **Scraping-vurdering**: MIDDEL — rapporter på individuelle institutionssider, URL-mønster: `{institution}.vejle.dk/tilsyn-og-undersoegelser/tilsynsrapporter/`

## 10. Roskilde

- **URL**: https://www.roskilde.dk/da-dk/service-og-selvbetjening/borger/familie-og-born/dagtilbud/kommunen-forer-tilsyn-med-dagtilbuddene/
- **Format**: PDF på individuelle dagtilbuds hjemmesider
- **Frekvens**: Minimum årligt
- **Type**: Anmeldt og uanmeldt; bruger KIDS-materiale til vurdering
- **Scraping-vurdering**: MIDDEL — rapporter decentraliseret på institutionernes egne sider
- **Note**: Bruger kategorier som "skærpet tilsyn" ved bekymringer

---

## Prioriteret scraping-rækkefølge

1. **København** — Bedst struktureret: PDFer med numeriske IDer på iwtilsynpdf.kk.dk
2. **Aalborg** — Centraliseret tilsynsportal med alle rapporter samlet
3. **Randers** — Samlet tilsynsside med direkte links
4. **Esbjerg** — Struktureret URL-mønster for rapporter
5. **Aarhus** — Stort volumen (~300 institutioner), men rapporter spredt på Aula-sider
6. **Horsens** — Portal-baseret, middel tilgængelighed
7. **Odense** — Individuelle institutionssider
8. **Vejle** — Institution-specifikke subdomæner
9. **Roskilde** — Decentraliseret
10. **Kolding** — Mest spredt, ingen central portal

## Fælles vurderingskategorier

De fleste kommuner bruger varianter af:
- **Godkendt** (grøn) — kvaliteten er tilfredsstillende
- **Godkendt med bemærkninger** (gul) — kvaliteten har udviklingsområder
- **Skærpet tilsyn** / **Ikke godkendt** (rød) — alvorlige bekymringer, kræver handlingsplan
