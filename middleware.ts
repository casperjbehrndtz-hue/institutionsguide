import { createMiddleware, createArticleFetcher, defaultMatcherConfig } from "./src/lib/dk-seo/middleware";

// ── Blog fetcher for Institutionsguide ──
const fetchBlog = createArticleFetcher({
  table: "blog_posts",
  select: "title,meta_title,meta_description,content_html,published_at,updated_at,keyword",
  siteName: "Institutionsguide",
  siteUrl: "https://institutionsguiden.dk",
  urlPrefix: "/blog",
  parentLabel: "Blog",
  fields: { metaTitle: "meta_title", metaDescription: "meta_description", content: "content_html", publishedAt: "published_at", updatedAt: "updated_at", keyword: "keyword" },
});

// ── Middleware ──
export default createMiddleware({
  siteUrl: "https://institutionsguiden.dk",
  siteName: "Institutionsguide",
  defaultOgImage: "/og-image.png",
  supabaseUrl: "https://epkwhvrwcyhlbdvwwvfi.supabase.co",

  organization: {
    name: "Institutionsguide",
    url: "https://institutionsguiden.dk",
    logo: "https://institutionsguiden.dk/og-image.png",
    description: "Danmarks mest komplette institutionsoversigt. Sammenlign priser, kvalitet og normeringer for 8.500+ institutioner i alle 98 kommuner.",
    foundingDate: "2025",
  },

  ecosystemLinks: [
    { name: "ParFinans", url: "https://www.parfinans.dk", description: "Fair fordeling af fællesudgifter for par. Beregn med præcis dansk skat." },
    { name: "NemtBudget", url: "https://nemtbudget.nu", description: "Beregn dit personlige rådighedsbeløb gratis på 3 minutter." },
    { name: "Børneskat.dk", url: "https://xn--brneskat-54a.dk", description: "Skatteeffektiv investering til dit barn via frikortet." },
  ],

  footerTagline: "Institutionsguide.dk — Danmarks mest komplette institutionsoversigt. Officielle data for 8.500+ institutioner.",

  routes: {
    "/": {
      title: "Institutionsguide — Sammenlign vuggestuer, børnehaver og skoler i hele Danmark",
      description: "Officielle data for 8.500+ institutioner i alle 98 kommuner. Sammenlign priser, kvalitetsdata, normeringer og beregn friplads. Helt gratis.",
      ogTitle: "Institutionsguide — Danmarks mest komplette institutionsoversigt",
      ogDescription: "Sammenlign 8.500+ vuggestuer, børnehaver, dagplejere og skoler. Priser, kvalitetsdata og normeringer for alle 98 kommuner.",
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Institutionsguide",
          url: "https://institutionsguiden.dk",
          description: "Sammenlign priser, kvalitetsdata og normeringer for 8.500+ institutioner i alle 98 kommuner.",
          applicationCategory: "EducationalApplication",
          operatingSystem: "Web",
          inLanguage: "da",
          isAccessibleForFree: true,
          offers: { "@type": "Offer", price: "0", priceCurrency: "DKK" },
        },
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Institutionsguide",
          url: "https://institutionsguiden.dk",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://institutionsguiden.dk/?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        },
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            { "@type": "Question", name: "Hvad koster en vuggestue i Danmark?", acceptedAnswer: { "@type": "Answer", text: "Prisen for en kommunal vuggestueplads varierer fra ca. 2.500 til 4.200 kr./md. afhængigt af kommune. De billigste kommuner er typisk i Vest- og Nordjylland, mens hovedstadsområdet er dyrest. Se aktuelle priser for din kommune på Institutionsguide." } },
            { "@type": "Question", name: "Hvordan beregner man friplads?", acceptedAnswer: { "@type": "Answer", text: "Friplads (økonomisk fripladstilskud) beregnes ud fra husstandens samlede indkomst. I 2026 gives fuld friplads ved indkomst under ca. 202.400 kr./år. Tilskuddet aftrappes gradvist op til ca. 609.600 kr./år. Enlige forældre og familier med flere børn kan få ekstra tilskud." } },
            { "@type": "Question", name: "Hvad er normering i en vuggestue?", acceptedAnswer: { "@type": "Answer", text: "Normering angiver forholdet mellem antal børn per voksen. Minimumsnormeringen i Danmark kræver ca. 3 børn per voksen i vuggestuer og ca. 6 børn per voksen i børnehaver. Den faktiske normering varierer mellem kommuner og institutioner." } },
          ],
        },
      ],
    },
    "/vuggestue": {
      title: "Vuggestuer i Danmark — Priser, kvalitet og sammenligning | Institutionsguide",
      description: "Find og sammenlign vuggestuer (0-2 år) i alle 98 kommuner. Se priser, ejerskab og beregn friplads.",
      ogTitle: "Vuggestuer i Danmark — Sammenlign priser og kvalitet",
      ogDescription: "Find vuggestuer i din kommune. Se månedlige priser, normeringer og beregn evt. friplads.",
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: "Vuggestuer", url: "/vuggestue" },
      ],
    },
    "/boernehave": {
      title: "Børnehaver i Danmark — Priser, kvalitet og sammenligning | Institutionsguide",
      description: "Sammenlign børnehaver (3-5 år) i hele landet. Se kommunale, selvejende og private børnehaver med priser.",
      ogTitle: "Børnehaver i Danmark — Sammenlign priser og kvalitet",
      ogDescription: "Find børnehaver i din kommune. Sammenlign priser, ejerskab og normeringer.",
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: "Børnehaver", url: "/boernehave" },
      ],
    },
    "/dagpleje": {
      title: "Dagplejere i Danmark — Priser og sammenligning | Institutionsguide",
      description: "Find dagplejere (0-2 år) i din kommune. Ofte billigere end vuggestue med højere voksen-barn-ratio.",
      ogTitle: "Dagplejere i Danmark — Find og sammenlign",
      ogDescription: "Find dagplejere i din kommune. Se priser og sammenlign med vuggestuer.",
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: "Dagplejere", url: "/dagpleje" },
      ],
    },
    "/skole": {
      title: "Skoler i Danmark — Kvalitetsdata, karakterer og trivsel | Institutionsguide",
      description: "Sammenlign folkeskoler og privatskoler med kvalitetsdata: trivsel, karaktergennemsnit, fravær og kompetencedækning.",
      ogTitle: "Skoler i Danmark — Sammenlign kvalitet og karakterer",
      ogDescription: "Find skoler med kvalitetsdata. Trivsel, karakterer, fravær og kompetencedækning for alle skoler.",
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: "Skoler", url: "/skole" },
      ],
    },
    "/sfo": {
      title: "SFO i Danmark — Priser og sammenligning | Institutionsguide",
      description: "Find SFO (6-9 år) i din kommune. Se priser og sammenlign forskellige muligheder.",
      ogTitle: "SFO i Danmark — Find og sammenlign",
      ogDescription: "Find SFO-tilbud i din kommune. Se priser og sammenlign.",
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: "SFO", url: "/sfo" },
      ],
    },
    "/fritidsklub": {
      title: "Fritidsklubber i Danmark — Priser og sammenligning | Institutionsguide",
      description: "Find fritidsklubber (10-14 år) i din kommune. Se priser og sammenlign muligheder.",
      ogTitle: "Fritidsklubber i Danmark — Find og sammenlign",
      ogDescription: "Find fritidsklubber i din kommune. Se priser og sammenlign.",
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: "Fritidsklubber", url: "/fritidsklub" },
      ],
    },
    "/efterskole": {
      title: "Efterskoler i Danmark — Sammenlign 119+ efterskoler | Institutionsguide",
      description: "Sammenlign efterskoler i hele Danmark. Se profiler, priser og kontaktinfo for alle efterskoler.",
      ogTitle: "Efterskoler i Danmark — Sammenlign alle efterskoler",
      ogDescription: "Find og sammenlign 119+ efterskoler. Priser, profiler og kontaktinfo.",
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: "Efterskoler", url: "/efterskole" },
      ],
    },
    "/normering": {
      title: "Normeringer i Danmark — Børn per voksen i alle kommuner | Institutionsguide",
      description: "Se normeringer (børn per voksen) for vuggestuer, børnehaver og dagplejer i alle 98 kommuner. Officielle data fra Danmarks Statistik.",
      ogTitle: "Normeringer — Børn per voksen i alle kommuner",
      ogDescription: "Se faktiske normeringer for alle kommuner. Hvor mange børn per voksen i din institution?",
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: "Normeringer", url: "/normering" },
      ],
    },
    "/friplads": {
      title: "Fripladstilskud beregner — Beregn din friplads | Institutionsguide",
      description: "Beregn dit fripladstilskud (økonomisk friplads) baseret på husstandsindkomst. Se hvad du sparer på daginstitution.",
      ogTitle: "Fripladstilskud beregner — Se hvad du sparer",
      ogDescription: "Beregn friplads ud fra din indkomst. Se besparelse på vuggestue, børnehave eller SFO.",
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: "Friplads", url: "/friplads" },
      ],
    },
    "/prissammenligning": {
      title: "Prissammenligning — Institutionspriser i alle kommuner | Institutionsguide",
      description: "Sammenlign priser for vuggestuer, børnehaver, dagplejere og SFO på tværs af alle 98 kommuner.",
      ogTitle: "Prissammenligning — Institutionspriser i alle kommuner",
      ogDescription: "Se og sammenlign institutionspriser for alle 98 kommuner i Danmark.",
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: "Prissammenligning", url: "/prissammenligning" },
      ],
    },
    "/sammenlign": {
      title: "Sammenlign institutioner side om side | Institutionsguide",
      description: "Sammenlign op til 4 institutioner side om side. Se priser, kvalitetsdata og kontaktinfo.",
      ogTitle: "Sammenlign institutioner side om side",
      ogDescription: "Sammenlign op til 4 institutioner. Priser, kvalitet og kontaktinfo.",
    },
    "/guide": {
      title: "Guide til valg af institution — Institutionsguide",
      description: "Komplet guide til at vælge den rigtige daginstitution eller skole for dit barn. Trin-for-trin vejledning.",
      ogTitle: "Guide til valg af institution",
      ogDescription: "Trin-for-trin guide til at vælge vuggestue, børnehave eller skole.",
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: "Guide", url: "/guide" },
      ],
    },
    "/metode": {
      title: "Metode og datakilder — Institutionsguide",
      description: "Læs om vores datakilder, metode og opdateringsfrekvens. Data fra Undervisningsministeriet, Danmarks Statistik og kommunerne.",
      ogTitle: "Metode og datakilder",
      ogDescription: "Vores data kommer fra officielle kilder: Undervisningsministeriet, Danmarks Statistik og kommunerne.",
    },
    "/blog": {
      title: "Blog — Institutionsguide",
      description: "Artikler om daginstitutioner, skoler, normeringer og priser i Danmark. Guides og indsigter for forældre.",
      ogTitle: "Blog — Institutionsguide",
      ogDescription: "Artikler og guides om daginstitutioner og skoler i Danmark.",
    },
    "/om": {
      title: "Om Institutionsguide — Institutionsguide",
      description: "Institutionsguide er Danmarks mest komplette oversigt over daginstitutioner og skoler. Del af ParFinans-familien.",
    },
    "/privatliv": {
      title: "Privatlivspolitik — Institutionsguide",
      description: "Læs Institutionsguides privatlivspolitik. Vi respekterer dit privatliv og bruger minimal tracking.",
    },
    "/vilkaar": {
      title: "Vilkår og betingelser — Institutionsguide",
      description: "Læs vilkår og betingelser for brug af Institutionsguide.",
    },
    "/bedste-vaerdi": {
      title: "Bedste værdi — Institutioner med bedst pris-kvalitet | Institutionsguide",
      description: "Find institutioner med den bedste kombination af pris og kvalitet i din kommune.",
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: "Bedste værdi", url: "/bedste-vaerdi" },
      ],
    },
    "/samlet-pris": {
      title: "Samlet pris — Beregn institutionsudgifter over tid | Institutionsguide",
      description: "Beregn den samlede pris for daginstitution fra vuggestue til SFO. Se hvad det koster over hele perioden.",
      breadcrumbs: [
        { name: "Institutionsguide", url: "/" },
        { name: "Samlet pris", url: "/samlet-pris" },
      ],
    },
    "/find": {
      title: "Find institution nær dig — Institutionsguide",
      description: "Find den nærmeste vuggestue, børnehave eller skole baseret på din adresse. Se afstand og priser.",
    },
    "/favoritter": {
      title: "Mine favoritter — Institutionsguide",
      description: "Se dine gemte favoritinstitutioner. Sammenlign og del med din partner.",
    },
  },

  dynamicRoutes: [
    {
      prefix: "/blog/",
      fetch: fetchBlog,
      fallback: { title: "Artikel — Institutionsguide", description: "Læs denne artikel om daginstitutioner og skoler i Danmark." },
    },
  ],

  pageContent: {
    "/": `
<h2>Find den rigtige institution til dit barn</h2>
<p>Institutionsguide samler officielle data for 8.500+ vuggestuer, børnehaver, dagplejere, skoler, SFO'er, fritidsklubber og efterskoler i alle 98 kommuner. Sammenlign priser, kvalitetsdata og normeringer — helt gratis.</p>

<h3>Hvad du kan</h3>
<ul>
  <li><strong>Sammenlign priser:</strong> Se hvad vuggestue, børnehave og SFO koster i din kommune vs. resten af landet.</li>
  <li><strong>Se kvalitetsdata:</strong> Skolers trivsel, karaktergennemsnit, fravær og kompetencedækning fra Undervisningsministeriet.</li>
  <li><strong>Normeringer:</strong> Se børn per voksen i din kommune — officielle tal fra Danmarks Statistik.</li>
  <li><strong>Beregn friplads:</strong> Se om du er berettiget til økonomisk fripladstilskud ud fra din indkomst.</li>
  <li><strong>Find nær dig:</strong> Brug din adresse og find de nærmeste institutioner med afstand.</li>
</ul>

<h3>Kategorier</h3>
<ul>
  <li><a href="https://institutionsguiden.dk/vuggestue">Vuggestuer</a> (0-2 år)</li>
  <li><a href="https://institutionsguiden.dk/boernehave">Børnehaver</a> (3-5 år)</li>
  <li><a href="https://institutionsguiden.dk/dagpleje">Dagplejere</a> (0-2 år)</li>
  <li><a href="https://institutionsguiden.dk/skole">Skoler</a> (6-16 år)</li>
  <li><a href="https://institutionsguiden.dk/sfo">SFO</a> (6-9 år)</li>
  <li><a href="https://institutionsguiden.dk/fritidsklub">Fritidsklubber</a> (10-14 år)</li>
  <li><a href="https://institutionsguiden.dk/efterskole">Efterskoler</a> (14-18 år)</li>
</ul>

<h3>Officielle datakilder</h3>
<p>Alle data stammer fra officielle kilder: Undervisningsministeriet (Uddannelsesstatistik), Danmarks Statistik og kommunernes egne hjemmesider. Data opdateres løbende.</p>`,

    "/vuggestue": `
<h2>Vuggestuer i Danmark</h2>
<p>Find og sammenlign vuggestuer (0-2 år) i alle 98 kommuner. Se kommunale, selvejende og private vuggestuer med månedlige priser, normeringer og kontaktinfo.</p>
<p>Prisen for en kommunal vuggestueplads varierer typisk fra ca. 2.500 til 4.200 kr./md. afhængigt af kommune. Brug fripladstilskud-beregneren for at se om du kan få rabat.</p>`,

    "/boernehave": `
<h2>Børnehaver i Danmark</h2>
<p>Sammenlign børnehaver (3-5 år) i hele landet. Se kommunale, selvejende og private børnehaver med priser og kontaktinfo.</p>
<p>En børnehaveplads koster typisk 1.800-3.200 kr./md. afhængigt af kommune og ejerform.</p>`,

    "/dagpleje": `
<h2>Dagplejere i Danmark</h2>
<p>Find dagplejere (0-2 år) i din kommune. Dagpleje er ofte billigere end vuggestue og tilbyder mindre grupper (max 4-5 børn) i et hjemligt miljø.</p>`,

    "/skole": `
<h2>Skoler i Danmark</h2>
<p>Sammenlign folkeskoler og privatskoler med officielle kvalitetsdata fra Undervisningsministeriet: trivsel, karaktergennemsnit ved afgangsprøven, fravær, kompetencedækning og undervisningseffekt.</p>
<p>Skoler markeret "Over gennemsnit" klarer sig bedre end forventet baseret på elevernes socioøkonomiske baggrund.</p>`,

    "/sfo": `
<h2>SFO i Danmark</h2>
<p>Find SFO-tilbud (6-9 år) i din kommune. Se priser og sammenlign forskellige muligheder for pasning efter skole.</p>`,

    "/fritidsklub": `
<h2>Fritidsklubber i Danmark</h2>
<p>Find fritidsklubber (10-14 år) i din kommune. Se priser og sammenlign muligheder for større børn.</p>`,

    "/efterskole": `
<h2>Efterskoler i Danmark</h2>
<p>Sammenlign 119+ efterskoler i hele Danmark. Se profiler, priser og kontaktinfo. Efterskoler tilbyder et alternativt skoleår for unge 14-18 år med fokus på fællesskab og personlig udvikling.</p>`,

    "/normering": `
<h2>Normeringer — Børn per voksen</h2>
<p>Se normeringer (børn per voksen) for vuggestuer, børnehaver og dagplejer i alle 98 kommuner. Officielle data fra Danmarks Statistik.</p>
<p>Minimumsnormeringen kræver ca. 3 børn per voksen i vuggestuer og ca. 6 børn per voksen i børnehaver. Se hvordan din kommune klarer sig.</p>`,

    "/friplads": `
<h2>Fripladstilskud beregner</h2>
<p>Beregn dit fripladstilskud baseret på husstandsindkomst. I 2026 gives fuld friplads ved indkomst under ca. 202.400 kr./år. Tilskuddet aftrappes gradvist op til ca. 609.600 kr./år.</p>
<p>Enlige forældre og familier med flere børn kan få ekstra tilskud. Brug beregneren til at se din besparelse.</p>`,

    "/prissammenligning": `
<h2>Prissammenligning — Institutionspriser i alle kommuner</h2>
<p>Sammenlign priser for vuggestuer, børnehaver, dagplejere og SFO på tværs af alle 98 kommuner. Se hvilke kommuner der er billigst og dyrest.</p>`,

    "/blog": `
<h2>Blog — Institutionsguide</h2>
<p>Artikler og guides om daginstitutioner, skoler, normeringer og priser i Danmark. Gratis indsigter for forældre.</p>`,
  },

  footerNav: `
      <a href="https://institutionsguiden.dk/vuggestue">Vuggestuer</a> ·
      <a href="https://institutionsguiden.dk/boernehave">Børnehaver</a> ·
      <a href="https://institutionsguiden.dk/skole">Skoler</a> ·
      <a href="https://institutionsguiden.dk/normering">Normeringer</a> ·
      <a href="https://institutionsguiden.dk/friplads">Friplads</a> ·
      <a href="https://institutionsguiden.dk/blog">Blog</a>`,
});

export const config = defaultMatcherConfig;
