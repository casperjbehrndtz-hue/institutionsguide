import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { handleCorsPreflightOrGetHeaders } from "../_shared/cors.ts";
import { getAIConfig, resolveModel, fetchAI, extractJSON } from "../_shared/ai-client.ts";

// Module → page path mapping for internal links / CTAs
const MODULE_PATHS: Record<string, { path: string; label: string; site: string }> = {
  dagtilbud: { path: "/", label: "Institutionsguide", site: "https://institutionsguiden.dk" },
  skole: { path: "/skole", label: "Skoleguiden", site: "https://institutionsguiden.dk" },
  normering: { path: "/normering", label: "Normeringstabellen", site: "https://institutionsguiden.dk" },
  friplads: { path: "/friplads", label: "Fripladsberegneren", site: "https://institutionsguiden.dk" },
  generel: { path: "/", label: "Institutionsguide.dk", site: "https://institutionsguiden.dk" },
  parfinans: { path: "/", label: "ParFinans", site: "https://parfinans.dk" },
  budget: { path: "/", label: "NemtBudget", site: "https://nemtbudget.nu" },
  boerneskat: { path: "/", label: "Børneskat", site: "https://børneskat.dk" },
};

// Suite cross-links for all articles
const SUITE_LINKS = [
  { label: "Institutionsguiden", url: "https://institutionsguiden.dk", desc: "Sammenlign 5.000+ vuggestuer, børnehaver og skoler" },
  { label: "ParFinans", url: "https://parfinans.dk", desc: "Gratis personlig økonomi for danske familier" },
  { label: "NemtBudget", url: "https://nemtbudget.nu", desc: "Simpelt budget-overblik for din husstand" },
  { label: "Børneskat", url: "https://børneskat.dk", desc: "Skattefri børneopsparing" },
];

// Authoritative Danish source labels for citations
const SOURCE_LABELS: Record<string, string> = {
  "borger.dk": "Borger.dk",
  "dst.dk": "Danmarks Statistik (dst.dk)",
  "kl.dk": "KL — Kommunernes Landsforening (kl.dk)",
  "uvm.dk": "Børne- og Undervisningsministeriet (uvm.dk)",
  "retsinformation.dk": "Retsinformation.dk",
  "uddannelsesstatistik.dk": "Uddannelsesstatistik.dk",
  "bupl.dk": "BUPL",
  "kk.dk": "Københavns Kommune (kk.dk)",
  "aarhus.dk": "Aarhus Kommune (aarhus.dk)",
  "skat.dk": "Skattestyrelsen (skat.dk)",
};

function getSourceLabel(url: string): string {
  for (const [domain, label] of Object.entries(SOURCE_LABELS)) {
    if (url.includes(domain)) return label;
  }
  return url;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

// ─── REAL DATA INJECTION ─────────────────────────────────────────────────
// Fetches actual stats from our JSON data files to inject into AI prompts
// This prevents the AI from hallucinating numbers

const DATA_BASE = "https://institutionsguiden.dk/data";

interface DataContext {
  summary: string;
  tables: string;
}

async function fetchRealData(keyword: string, module: string): Promise<DataContext> {
  const kw = keyword.toLowerCase();
  const lines: string[] = [];
  const tables: string[] = [];

  try {
    // Detect which municipality is mentioned
    const municipalityMatch = kw.match(/(?:i|fra|til)\s+([a-zæøå]+(?:\s+[a-zæøå]+)?)/i);
    const targetMun = municipalityMatch?.[1]?.replace(/^\w/, c => c.toUpperCase());

    // Fetch relevant data based on module/keyword
    if (module === "dagtilbud" || module === "friplads" || kw.includes("vuggestue") || kw.includes("børnehave") || kw.includes("dagpleje")) {
      const cats = ["vuggestue", "boernehave", "dagpleje"].filter(c =>
        !kw.includes("vuggestue") && !kw.includes("børnehave") && !kw.includes("dagpleje") || kw.includes(c.replace("oe", "ø"))
      );
      const fetchCats = cats.length > 0 ? cats : ["vuggestue", "boernehave", "dagpleje"];

      for (const cat of fetchCats) {
        try {
          const res = await fetch(`${DATA_BASE}/${cat}-data.json`, { signal: AbortSignal.timeout(5000) });
          if (!res.ok) continue;
          const data = await res.json();
          const institutions = data.i || [];

          // Aggregate by municipality
          const munPrices = new Map<string, number[]>();
          for (const inst of institutions) {
            if (inst.m && inst.mr && inst.mr > 0) {
              if (!munPrices.has(inst.m)) munPrices.set(inst.m, []);
              munPrices.get(inst.m)!.push(inst.mr);
            }
          }

          const allPrices = institutions.map((i: { mr?: number }) => i.mr).filter((p: number | undefined): p is number => p != null && p > 0);
          const avg = allPrices.length > 0 ? Math.round(allPrices.reduce((a: number, b: number) => a + b, 0) / allPrices.length) : 0;
          const min = allPrices.length > 0 ? Math.min(...allPrices) : 0;
          const max = allPrices.length > 0 ? Math.max(...allPrices) : 0;
          const catLabel = cat === "boernehave" ? "børnehave" : cat;

          lines.push(`FAKTA ${catLabel}: ${institutions.length} institutioner på landsplan. Gennemsnitspris: ${avg.toLocaleString("da-DK")} kr./md. Billigste: ${min.toLocaleString("da-DK")} kr./md. Dyreste: ${max.toLocaleString("da-DK")} kr./md.`);

          // Top 5 billigste kommuner
          const munAvgs = [...munPrices.entries()]
            .map(([m, prices]) => ({ m, avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) }))
            .sort((a, b) => a.avg - b.avg);

          if (munAvgs.length > 0) {
            const top5 = munAvgs.slice(0, 5);
            const bottom5 = munAvgs.slice(-5).reverse();
            tables.push(`Billigste kommuner (${catLabel}): ${top5.map(m => `${m.m}: ${m.avg.toLocaleString("da-DK")} kr./md.`).join(", ")}`);
            tables.push(`Dyreste kommuner (${catLabel}): ${bottom5.map(m => `${m.m}: ${m.avg.toLocaleString("da-DK")} kr./md.`).join(", ")}`);
          }

          // If specific municipality mentioned, get exact data
          if (targetMun) {
            const munInsts = institutions.filter((i: { m?: string }) => i.m?.toLowerCase() === targetMun.toLowerCase());
            if (munInsts.length > 0) {
              const munPriceList = munInsts.map((i: { mr?: number }) => i.mr).filter((p: number | undefined): p is number => p != null && p > 0);
              const munAvg = munPriceList.length > 0 ? Math.round(munPriceList.reduce((a: number, b: number) => a + b, 0) / munPriceList.length) : 0;
              const munMin = munPriceList.length > 0 ? Math.min(...munPriceList) : 0;
              lines.push(`${catLabel} i ${targetMun}: ${munInsts.length} stk. Gns. pris: ${munAvg.toLocaleString("da-DK")} kr./md. Billigste: ${munMin.toLocaleString("da-DK")} kr./md.`);

              // List top institutions with real names
              const sorted = munInsts.filter((i: { mr?: number }) => i.mr && i.mr > 0).sort((a: { mr: number }, b: { mr: number }) => a.mr - b.mr).slice(0, 5);
              if (sorted.length > 0) {
                tables.push(`Top ${catLabel} i ${targetMun} (billigste): ${sorted.map((i: { n: string; mr: number }) => `${i.n}: ${i.mr.toLocaleString("da-DK")} kr./md.`).join(", ")}`);
              }
            }
          }
        } catch { /* skip category */ }
      }
    }

    if (module === "skole" || kw.includes("skole") || kw.includes("folkeskole") || kw.includes("karakter") || kw.includes("trivsel")) {
      try {
        const res = await fetch(`${DATA_BASE}/skole-data.json`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          const schools = (data.s || []).filter((s: { t?: string }) => s.t !== "u" && s.t !== "e");

          const withGrades = schools.filter((s: { q?: { k?: number } }) => s.q?.k != null && s.q.k > 0);
          const withTrivsel = schools.filter((s: { q?: { ts?: number } }) => s.q?.ts != null && s.q.ts > 0);

          if (withGrades.length > 0) {
            const avgGrade = withGrades.reduce((sum: number, s: { q: { k: number } }) => sum + s.q.k, 0) / withGrades.length;
            lines.push(`FAKTA skoler: ${schools.length} skoler i alt. ${withGrades.length} med karakterdata. Landsgennemsnit karakter: ${avgGrade.toFixed(1).replace(".", ",")}`);

            // Top 5 schools nationally
            const topSchools = [...withGrades].sort((a: { q: { k: number } }, b: { q: { k: number } }) => b.q.k - a.q.k).slice(0, 5);
            tables.push(`Top 5 skoler (karaktersnit): ${topSchools.map((s: { n: string; q: { k: number }; m: string }) => `${s.n} (${s.m?.replace(" Kommune", "")}): ${s.q.k.toFixed(1).replace(".", ",")}`).join(", ")}`);
          }

          if (withTrivsel.length > 0) {
            const avgTrivsel = withTrivsel.reduce((sum: number, s: { q: { ts: number } }) => sum + s.q.ts, 0) / withTrivsel.length;
            lines.push(`Landsgennemsnit trivsel: ${avgTrivsel.toFixed(1).replace(".", ",")} (skala 1-5). ${withTrivsel.length} skoler med data.`);
          }

          // Municipality-specific school data
          if (targetMun) {
            const munSchools = schools.filter((s: { m?: string }) => s.m?.toLowerCase().includes(targetMun.toLowerCase()));
            if (munSchools.length > 0) {
              const munWithGrades = munSchools.filter((s: { q?: { k?: number } }) => s.q?.k != null && s.q.k > 0)
                .sort((a: { q: { k: number } }, b: { q: { k: number } }) => b.q.k - a.q.k);
              lines.push(`Skoler i ${targetMun}: ${munSchools.length} i alt, ${munWithGrades.length} med karakterdata.`);
              if (munWithGrades.length > 0) {
                const top = munWithGrades.slice(0, 5);
                tables.push(`Top skoler i ${targetMun}: ${top.map((s: { n: string; q: { k: number; ts?: number; fp?: number } }) =>
                  `${s.n}: snit ${s.q.k.toFixed(1).replace(".", ",")}${s.q.ts ? `, trivsel ${s.q.ts.toFixed(1).replace(".", ",")}` : ""}${s.q.fp ? `, fravær ${s.q.fp.toFixed(1).replace(".", ",")}%` : ""}`
                ).join("; ")}`);
              }
            }
          }
        }
      } catch { /* skip */ }
    }

    if (module === "normering" || kw.includes("normering") || kw.includes("børn pr") || kw.includes("børn per")) {
      try {
        const res = await fetch(`${DATA_BASE}/normering-data.json`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          const entries = data.m || data;
          if (Array.isArray(entries)) {
            lines.push(`FAKTA normering: Data for ${entries.length} kommuner.`);
            const with02 = entries.filter((e: { n02?: number }) => e.n02 != null && e.n02 > 0);
            const with35 = entries.filter((e: { n35?: number }) => e.n35 != null && e.n35 > 0);
            if (with02.length > 0) {
              const avg02 = with02.reduce((s: number, e: { n02: number }) => s + e.n02, 0) / with02.length;
              const best02 = [...with02].sort((a: { n02: number }, b: { n02: number }) => a.n02 - b.n02).slice(0, 5);
              lines.push(`Normering 0-2 år: Landsgennemsnit ${avg02.toFixed(1).replace(".", ",")} børn pr. voksen.`);
              tables.push(`Bedste normering 0-2 år: ${best02.map((e: { m: string; n02: number }) => `${e.m}: ${e.n02.toFixed(1).replace(".", ",")} børn/voksen`).join(", ")}`);
            }
            if (with35.length > 0) {
              const avg35 = with35.reduce((s: number, e: { n35: number }) => s + e.n35, 0) / with35.length;
              lines.push(`Normering 3-5 år: Landsgennemsnit ${avg35.toFixed(1).replace(".", ",")} børn pr. voksen.`);
            }
          }
        }
      } catch { /* skip */ }
    }
  } catch { /* non-critical — AI can still write without data */ }

  return {
    summary: lines.length > 0 ? lines.join("\n") : "Ingen data hentet — brug generelle tal med forbehold.",
    tables: tables.length > 0 ? tables.join("\n") : "",
  };
}

Deno.serve(async (req) => {
  const { corsHeaders, preflightResponse } = handleCorsPreflightOrGetHeaders(req);
  if (preflightResponse) return preflightResponse;

  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Authenticate
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  const seoSecret = Deno.env.get("SEO_GENERATE_SECRET");

  if (!seoSecret || token !== seoSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // === GET: Queue status endpoint ===
  if (req.method === "GET") {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [
      { count: pendingCount },
      { count: publishedCount },
      { count: failedCount },
      { count: generatingCount },
      { data: lastGenerated },
      { count: retryableCount },
    ] = await Promise.all([
      supabase.from("seo_keywords").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("seo_keywords").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("seo_keywords").select("id", { count: "exact", head: true }).eq("status", "failed"),
      supabase.from("seo_keywords").select("id", { count: "exact", head: true }).eq("status", "generating"),
      supabase.from("seo_keywords").select("keyword, blog_slug, processed_at").eq("status", "published").order("processed_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("seo_keywords").select("id", { count: "exact", head: true }).eq("status", "failed").lt("retry_count", 3).lt("processed_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    ]);

    return new Response(
      JSON.stringify({
        queue: {
          pending: pendingCount ?? 0,
          generating: generatingCount ?? 0,
          published: publishedCount ?? 0,
          failed: failedCount ?? 0,
          retryable: retryableCount ?? 0,
        },
        last_generated: lastGenerated ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let ai: ReturnType<typeof getAIConfig>;
  try {
    ai = getAIConfig();
  } catch {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const { mode, keyword: explicitKeyword } = body;

    if (mode === "reset-failed") {
      const { count, error } = await supabase
        .from("seo_keywords")
        .update({ status: "pending", error_message: null, retry_count: 0 })
        .eq("status", "failed")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return new Response(
        JSON.stringify({ ok: true, reset: count }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === STEP 1: Pick keyword ===
    let keywordRow: {
      id: string;
      keyword: string;
      module: string;
      intent: string;
      source_urls: string[];
      locale: string;
    };

    if (mode === "manual" && explicitKeyword) {
      const { data: existing } = await supabase
        .from("seo_keywords")
        .select("id, keyword, module, intent, source_urls, locale")
        .eq("keyword", explicitKeyword)
        .maybeSingle();

      if (existing) {
        keywordRow = existing;
      } else {
        const { data: created, error } = await supabase
          .from("seo_keywords")
          .insert({
            keyword: explicitKeyword,
            module: body.module || "generel",
            intent: body.intent || "informational",
            source_urls: body.source_urls || [],
          })
          .select("id, keyword, module, intent, source_urls, locale")
          .single();
        if (error) throw error;
        keywordRow = created;
      }
    } else {
      // Auto mode: pick next pending keyword
      const { data: next, error } = await supabase
        .from("seo_keywords")
        .select("id, keyword, module, intent, source_urls, locale")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      let picked = next;

      // Retry failed keywords (max 3 retries, at least 24h since last attempt)
      if (!picked) {
        const retryThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: retryable, error: retryErr } = await supabase
          .from("seo_keywords")
          .select("id, keyword, module, intent, source_urls, locale")
          .eq("status", "failed")
          .lt("retry_count", 3)
          .lt("processed_at", retryThreshold)
          .order("processed_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (retryErr) throw retryErr;
        picked = retryable;
      }

      if (!picked) {
        return new Response(
          JSON.stringify({ ok: true, message: "No pending keywords in queue" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      keywordRow = picked;
    }

    // Mark as generating
    const { data: currentRow } = await supabase
      .from("seo_keywords")
      .select("retry_count, status")
      .eq("id", keywordRow.id)
      .single();
    const isRetry = currentRow?.status === "failed";
    await supabase
      .from("seo_keywords")
      .update({
        status: "generating",
        error_message: null,
        ...(isRetry ? { retry_count: (currentRow?.retry_count ?? 0) + 1 } : {}),
      })
      .eq("id", keywordRow.id);

    // === STEP 2: Gather context ===

    const { data: relatedPosts } = await supabase
      .from("blog_posts")
      .select("slug, title, module")
      .eq("module", keywordRow.module)
      .limit(15);

    const internalLinks = (relatedPosts || [])
      .map((p: { slug: string; title: string }) => `- "${p.title}" → /blog/${p.slug}`)
      .join("\n");

    const { data: clusterLinks } = await supabase
      .from("topic_clusters")
      .select("pillar_slug, cluster_slug, anchor_text, reverse_anchor_text")
      .or(`pillar_slug.eq.${slugify(keywordRow.keyword)},cluster_slug.eq.${slugify(keywordRow.keyword)}`);

    const clusterContext = (clusterLinks || [])
      .map((c: { cluster_slug: string; pillar_slug: string; anchor_text: string; reverse_anchor_text: string }) => {
        const isPillar = c.cluster_slug === slugify(keywordRow.keyword);
        return isPillar
          ? `- PILLAR: Link OP til "${c.anchor_text}" → /blog/${c.pillar_slug}`
          : `- CLUSTER: Link NED til "${c.reverse_anchor_text}" → /blog/${c.cluster_slug}`;
      })
      .join("\n");

    const sourceLabels = (keywordRow.source_urls || [])
      .map((url: string) => getSourceLabel(url))
      .join(", ");

    const modulePath = MODULE_PATHS[keywordRow.module] || MODULE_PATHS.generel;

    // === STEP 2.5: Fetch REAL data from our database ===
    const realData = await fetchRealData(keywordRow.keyword, keywordRow.module);

    // Build suite cross-links (exclude current product)
    const crossLinks = SUITE_LINKS
      .filter(s => !modulePath.site.includes(s.url.replace("https://", "")))
      .map(s => `- <a href="${s.url}">${s.label}</a> — ${s.desc}`)
      .join("\n");

    // === STEP 3: Generate article via AI ===

    const systemPrompt = `Du er chefredaktør på Institutionsguide.dk — Danmarks mest komplette guide til børnepasning, skoler og dagtilbud. Du skriver en artikel til vores blog-sektion, rettet mod forældre der skal vælge institution til deres barn.

─── AI OVERVIEW & FEATURED SNIPPET OPTIMERING ─────────────────────────────

**Answer Box (KRITISK — dette fanger Google AI Overviews):**
- Start ALTID artiklen med en <div class="answer-box"> der indeholder et direkte, faktuelt svar på søgeintentionen i MAX 50 ord
- Formater som: <div class="answer-box"><p><strong>[Direkte svar med konkret tal/fakta]</strong></p></div>

─── ENTITY-FIRST WRITING (Googles NLP) ────────────────────────────────────

- Skriv i subjekt-prædikat-objekt mønstre: "Den gennemsnitlige vuggestuepris i København er 3.850 kr./md." — IKKE "I København betaler man en vis pris"
- NÆVN konkrete entities: Børne- og Undervisningsministeriet, dagtilbudsloven, borger.dk, Danmarks Statistik
- Brug DefinedTerm-mønster: "<dfn>Minimumsnormering</dfn> kræver mindst 1 voksen per 3 børn i vuggestuer"

─── GOOGLES RANKING-SIGNALER I 2026 ───────────────────────────────────────

**E-E-A-T:** Skriv som en der HAR erfaring — brug "da vi sammenlignede", "i vores data", "det overraskede os"
**PAA:** Afslut med 4-5 FAQ-spørgsmål i <div class="faq-answer"> wrappers.
**Helpful Content:** Inkluder MINDST én HTML <table> med data. Nævn common mistakes.

─── TABEL & DATA (VIGTIGT for rich results) ──────────────────────────────

- Inkluder MINDST én HTML <table> med relevante priser, normeringer eller sammenligninger
- Tabeller fanger Google rich results og AI Overviews

─── KILDER & CITATIONS ────────────────────────────────────────────────────

- ALTID inkluder en "Kilder" sektion som NÆSTSIDSTE element (før disclaimer):
  <section class="references"><h3>Kilder</h3><ol><li>kilde</li></ol></section>
- Referer til kilder i teksten: "(kilde: dst.dk, 2026)"

─── DATA-REGLER (KRITISK — BRUG RIGTIGE TAL) ─────────────────────────────

Du får RIGTIGE data fra vores database nedenfor. BRUG DEM.
- ALDRIG opfind tal, priser, karakterer, normeringer eller institutionsnavne.
- Alle tal i tabeller SKAL komme fra den medfølgende data-kontekst.
- Hvis du ikke har data for en specifik kommune/institution, skriv "Se opdaterede tal på [værktøj]" i stedet for at gætte.
- Du MÅ gerne bruge generelle fakta om lovgivning, regler og rettigheder.

─── COMPLIANCE-REGLER ──────────────────────────────────────────────────────

1. ALDRIG giv konkret finansiel rådgivning.
2. Henvis til autoritative kilder — nævn dem i teksten, men lav IKKE clickable links til eksterne sider.
3. Alle priser og tal SKAL matche den medfølgende data-kontekst. Opfind ALDRIG tal.
4. Artiklen SKAL være original.
5. ALTID inkluder disclaimer som ALLERSIDSTE afsnit:
   "<p><em>Denne artikel er udelukkende til informationsformål. Priser og regler kan variere mellem kommuner og ændre sig over tid. Kontakt din kommune for aktuelle priser og ventelister.</em></p>"

─── SKRIVESTIL ─────────────────────────────────────────────────────────────

- Dansk, direkte, personlig — som en erfaren forælder der hjælper en ny forælder
- ALDRIG: "Det er vigtigt at...", "Man bør overveje...", "I denne artikel vil vi..."
- Brug "faktisk", "overraskende nok", "de fleste glemmer", "her er hvad vi fandt"
- Korte afsnit (2-3 sætninger). Brug lister.
- Minimum 1.200 ord, ideelt 1.300-1.500 ord.

─── STRUKTUR (følg NØJAGTIGT) ───────────────────────────────────────────

<div class="answer-box"><p><strong>[Direkte svar — max 50 ord]</strong></p></div>

## [H2 entity-statement]
[300-400 ord med tal, <dfn>-tags, kildeangivelser]

<table>[Prissammenligning eller data]</table>

## [H2 uddybning / alternativt perspektiv]
[250-350 ord]

## [H2 common mistake]
[200-250 ord]

## Ofte stillede spørgsmål
<div class="faq-item"><h3>[Spørgsmål 1]</h3><div class="faq-answer">[Svar]</div></div>
<div class="faq-item"><h3>[Spørgsmål 2]</h3><div class="faq-answer">[Svar]</div></div>
<div class="faq-item"><h3>[Spørgsmål 3]</h3><div class="faq-answer">[Svar]</div></div>
<div class="faq-item"><h3>[Spørgsmål 4]</h3><div class="faq-answer">[Svar]</div></div>

[CTA til Institutionsguide]
[Læs også]
<section class="references"><h3>Kilder</h3><ol>[Nummererede kilder]</ol></section>
[Disclaimer]

─── FORMAT ─────────────────────────────────────────────────────────────────

Returner præcis dette JSON-objekt og INTET andet:
{
  "title": "SEO-optimeret titel (50-65 tegn)",
  "meta_title": "Meta-titel med keyword og power word (max 60 tegn)",
  "meta_description": "Overbevisende meta-beskrivelse med keyword, tal og CTA (120-155 tegn)",
  "content_html": "Fuld artikel som ren HTML. Start med answer-box div.",
  "slug": "url-venlig-slug-med-keyword",
  "schemas": ["FAQPage"]
}`;

    const userPrompt = `Skriv en SEO-optimeret artikel om: "${keywordRow.keyword}"

Modul: ${keywordRow.module} (link til ${modulePath.label}: ${modulePath.site}${modulePath.path})
Søgeintent: ${keywordRow.intent}
Autoritative kilder: ${sourceLabels || "borger.dk, dst.dk, uvm.dk"}

═══════════════════════════════════════════════════════════════
RIGTIGE DATA FRA VORES DATABASE (BRUG DISSE TAL — OPFIND IKKE):
═══════════════════════════════════════════════════════════════
${realData.summary}

${realData.tables ? `TABEL-DATA (brug i HTML <table>):\n${realData.tables}` : ""}
═══════════════════════════════════════════════════════════════

${clusterContext ? `TOPICAL AUTHORITY CLUSTER-LINKS (DU SKAL inkludere disse):\n${clusterContext}\n` : ""}
${internalLinks ? `RELATEREDE ARTIKLER (link internt med <a href="...">):\n${internalLinks}\n` : ""}

SUITE CROSS-LINKS (inkluder mindst 1-2 i artiklen):
${crossLinks}

VIGTIGT:
- Start med <div class="answer-box"> med direkte svar BASERET PÅ RIGTIGE TAL ovenfor
- Inkluder mindst én HTML <table> med data fra den medfølgende database-kontekst
- ALDRIG opfind tal — brug KUN de data du har fået
- Inkluder en "Kilder" sektion med nummererede referencer
- Inkluder CTA der opfordrer til at bruge ${modulePath.label}
- CTA-link: <a href="${modulePath.site}${modulePath.path}">${modulePath.label}</a>
- Afslut med "Læs også" med 2-3 relaterede artikellinks
- Afslut med disclaimer som allersidste afsnit
- Returner KUN valid JSON med alle felter inkl. "schemas"`;

    const aiResponse = await fetchAI(ai.url, {
      method: "POST",
      headers: ai.headers,
      body: JSON.stringify({
        model: resolveModel(),
        system: systemPrompt,
        messages: [
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4096,
      }),
    });

    if (!aiResponse.ok) {
      const errStatus = aiResponse.status;
      await supabase
        .from("seo_keywords")
        .update({ status: "failed", error_message: `AI error: ${errStatus}`, processed_at: new Date().toISOString() })
        .eq("id", keywordRow.id);

      return new Response(
        JSON.stringify({ error: `AI error: ${errStatus}` }),
        { status: errStatus === 429 ? 429 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await aiResponse.json();
    const rawContent = aiResult.content?.[0]?.text ?? "";

    // Extract JSON — Claude sometimes wraps JSON in markdown or text
    let articleJson: Record<string, unknown>;
    try {
      articleJson = extractJSON(rawContent);
    } catch {
      await supabase
        .from("seo_keywords")
        .update({ status: "failed", error_message: "AI did not return valid JSON", processed_at: new Date().toISOString() })
        .eq("id", keywordRow.id);
      throw new Error("AI did not return valid JSON");
    }

    if (!articleJson.title || !articleJson.content_html) {
      await supabase
        .from("seo_keywords")
        .update({ status: "failed", error_message: "Missing title or content_html", processed_at: new Date().toISOString() })
        .eq("id", keywordRow.id);
      throw new Error("AI response missing required fields");
    }

    // === STEP 4: Validate compliance ===
    const contentLower = (articleJson.content_html as string).toLowerCase();
    const hasDisclaimer = contentLower.includes("informationsformål") || contentLower.includes("kontakt din kommune");
    if (!hasDisclaimer) {
      articleJson.content_html += `\n<p><em>Denne artikel er udelukkende til informationsformål. Priser og regler kan variere mellem kommuner og ændre sig over tid. Kontakt din kommune for aktuelle priser og ventelister.</em></p>`;
    }

    const finalSlug = articleJson.slug
      ? (articleJson.slug as string).replace(/[^a-z0-9æøå-]/g, "").slice(0, 120)
      : slugify(keywordRow.keyword);

    // === STEP 5: Publish to blog_posts ===
    const postData = {
      slug: finalSlug,
      title: (articleJson.title as string).slice(0, 500),
      meta_title: ((articleJson.meta_title || articleJson.title) as string).slice(0, 200),
      meta_description: ((articleJson.meta_description || "") as string).slice(0, 300),
      content_html: articleJson.content_html as string,
      module: keywordRow.module,
      keyword: keywordRow.keyword.slice(0, 200),
      intent: keywordRow.intent,
      locale: keywordRow.locale || "da",
      published_at: new Date().toISOString(),
    };

    const { data: existingPost } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("slug", finalSlug)
      .maybeSingle();

    let blogResult;
    if (existingPost) {
      const { data, error } = await supabase
        .from("blog_posts")
        .update({ ...postData, published_at: undefined })
        .eq("id", existingPost.id)
        .select("id, slug")
        .single();
      if (error) throw error;
      blogResult = data;
    } else {
      const { data, error } = await supabase
        .from("blog_posts")
        .insert(postData)
        .select("id, slug")
        .single();
      if (error) throw error;
      blogResult = data;
    }

    // === STEP 6: Update keyword status ===
    await supabase
      .from("seo_keywords")
      .update({
        status: "published",
        blog_slug: blogResult.slug,
        processed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", keywordRow.id);

    // === STEP 7: Ping IndexNow ===
    const articleUrl = `${modulePath.site}/blog/${blogResult.slug}`;
    try {
      const indexNowKey = Deno.env.get("INDEXNOW_KEY") || "";
      await fetch(`https://api.indexnow.org/indexnow?url=${encodeURIComponent(articleUrl)}&key=${indexNowKey}`);
    } catch { /* non-critical */ }

    // === STEP 8: AI keyword expansion — self-sustaining queue ===
    let newKeywords: string[] = [];
    try {
      const expansionResponse = await fetchAI(ai.url, {
        method: "POST",
        headers: ai.headers,
        body: JSON.stringify({
          model: resolveModel(),
          system: `Du er en dansk SEO-ekspert for børnepasning, skoler og dagtilbud. Generer nye long-tail søgeord som danske forældre ville søge på Google. Fokuser på:
- Spørgsmål forældre stiller (hvad, hvordan, hvornår, hvor meget)
- Sammenligninger (X vs Y)
- Lokale søgninger (bedste X i Y kommune)
- Prisrelaterede søgninger
- Aktuelle regler og satser (2026)

Cross-suite emner er også velkomne:
- Familieøkonomi (relevant for ParFinans/NemtBudget)
- Børneopsparing og skat (relevant for Børneskat)
- Budgettering med børn

Returner KUN et JSON-array med 5 keyword-strenge. Ingen duplikater af: "${keywordRow.keyword}"`,
          messages: [{ role: "user", content: `Jeg har lige skrevet en artikel om: "${keywordRow.keyword}" (modul: ${keywordRow.module}).

Giv mig 5 nye relaterede søgeord som danske forældre ville søge, og som vi endnu ikke har dækket. Mix mellem informational og transactional intent. Mindst 1 skal være cross-suite (familieøkonomi/børneopsparing).

Returner KUN: ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]` }],
          max_tokens: 300,
        }),
      });

      if (expansionResponse.ok) {
        const expResult = await expansionResponse.json();
        const expRaw = expResult.content?.[0]?.text ?? "";
        const match = expRaw.match(/\[[\s\S]*?\]/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed)) newKeywords = parsed.filter((k: unknown) => typeof k === "string" && k.length > 5);
        }
      }
    } catch { /* non-critical — don't fail the article publish */ }

    // Insert discovered keywords into queue
    if (newKeywords.length > 0) {
      const MODULE_GUESS: Record<string, string> = {
        børnehave: "dagtilbud", vuggestue: "dagtilbud", dagpleje: "dagtilbud",
        skole: "skole", folkeskole: "skole", privatskole: "skole", sfo: "skole",
        normering: "normering", "børn per": "normering", "børn pr": "normering",
        friplads: "friplads", fripladstilskud: "friplads", søskenderabat: "friplads",
        budget: "generel", opsparing: "generel", økonomi: "generel", skat: "generel",
      };

      const keywordsToInsert = newKeywords.map((kw: string) => {
        const kwLower = kw.toLowerCase();
        let module = "generel";
        for (const [term, mod] of Object.entries(MODULE_GUESS)) {
          if (kwLower.includes(term)) { module = mod; break; }
        }
        const intent = kwLower.includes("bedste") || kwLower.includes("billigste") || kwLower.includes("beregn")
          ? "transactional" : "informational";
        return { keyword: kw, module, intent, source_urls: [] as string[] };
      });

      await supabase
        .from("seo_keywords")
        .upsert(keywordsToInsert, { onConflict: "keyword,locale", ignoreDuplicates: true });
    }

    // === STEP 9: Auto-generate Google autocomplete keywords ===
    let autocompleteKeywords: string[] = [];
    try {
      const baseTerms = keywordRow.keyword.split(" ").slice(0, 3).join(" ");
      const acResponse = await fetch(
        `https://suggestqueries.google.com/complete/search?client=firefox&hl=da&gl=dk&q=${encodeURIComponent(baseTerms)}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (acResponse.ok) {
        const acData = await acResponse.json();
        if (Array.isArray(acData[1])) {
          autocompleteKeywords = (acData[1] as string[])
            .filter((s: string) => s !== keywordRow.keyword && s.length > 10)
            .slice(0, 5);
        }
      }
    } catch { /* non-critical */ }

    if (autocompleteKeywords.length > 0) {
      const acInserts = autocompleteKeywords.map((kw: string) => ({
        keyword: kw,
        module: keywordRow.module,
        intent: "informational" as const,
        source_urls: [] as string[],
      }));
      await supabase
        .from("seo_keywords")
        .upsert(acInserts, { onConflict: "keyword,locale", ignoreDuplicates: true });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        keyword: keywordRow.keyword,
        url: articleUrl,
        slug: blogResult.slug,
        new_keywords_queued: newKeywords.length + autocompleteKeywords.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("seo-generate error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
