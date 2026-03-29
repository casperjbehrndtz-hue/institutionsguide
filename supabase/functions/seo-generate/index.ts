import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { handleCorsPreflightOrGetHeaders } from "../_shared/cors.ts";
import { getAIConfig, resolveModel, fetchAI } from "../_shared/ai-client.ts";

// Module → page path mapping for internal links / CTAs
const MODULE_PATHS: Record<string, { path: string; label: string }> = {
  dagtilbud: { path: "/", label: "Institutionsguide" },
  skole: { path: "/skole", label: "Skoleguiden" },
  normering: { path: "/normering", label: "Normeringstabellen" },
  friplads: { path: "/friplads", label: "Fripladsberegneren" },
  generel: { path: "/", label: "Institutionsguide.dk" },
};

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
    return new Response(JSON.stringify({ error: "GOOGLE_API_KEY not configured" }), {
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

─── COMPLIANCE-REGLER ──────────────────────────────────────────────────────

1. ALDRIG giv konkret finansiel rådgivning.
2. Henvis til autoritative kilder — nævn dem i teksten, men lav IKKE clickable links til eksterne sider.
3. Alle priser og tal skal være korrekte for 2026 (eller seneste tilgængelige data).
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

Modul: ${keywordRow.module} (link til ${modulePath.label}: ${modulePath.path})
Søgeintent: ${keywordRow.intent}
Autoritative kilder: ${sourceLabels || "borger.dk, dst.dk, uvm.dk"}

${clusterContext ? `TOPICAL AUTHORITY CLUSTER-LINKS (DU SKAL inkludere disse):\n${clusterContext}\n` : ""}
${internalLinks ? `RELATEREDE ARTIKLER (link internt med <a href="...">):\n${internalLinks}\n` : ""}

VIGTIGT:
- Start med <div class="answer-box"> med direkte svar
- Inkluder mindst én HTML <table> med data/priser
- Inkluder en "Kilder" sektion med nummererede referencer
- Inkluder CTA der opfordrer til at bruge ${modulePath.label}
- CTA-link: <a href="${modulePath.path}">${modulePath.label}</a>
- Cross-link til suite: <a href="https://parfinans.dk">ParFinans</a>, <a href="https://nemtbudget.nu">NemtBudget</a>, <a href="https://xn--brneskat-54a.dk">Børneskat.dk</a>
- Afslut med "Læs også" med 2-3 relaterede artikellinks
- Afslut med disclaimer som allersidste afsnit
- Returner KUN valid JSON med alle felter inkl. "schemas"`;

    const aiResponse = await fetchAI(ai.url, {
      method: "POST",
      headers: ai.headers,
      body: JSON.stringify({
        model: resolveModel("google/gemini-2.5-flash-lite"),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4000,
        response_format: { type: "json_object" },
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
    const rawContent = aiResult.choices?.[0]?.message?.content ?? "";

    // Extract JSON
    let articleJson: Record<string, unknown>;
    try {
      articleJson = JSON.parse(rawContent);
    } catch {
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/) || rawContent.match(/(\{[\s\S]*\})/);
      if (!jsonMatch) {
        await supabase
          .from("seo_keywords")
          .update({ status: "failed", error_message: "AI did not return valid JSON", processed_at: new Date().toISOString() })
          .eq("id", keywordRow.id);
        throw new Error("AI did not return valid JSON");
      }
      try {
        articleJson = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } catch {
        await supabase
          .from("seo_keywords")
          .update({ status: "failed", error_message: "AI returned malformed JSON", processed_at: new Date().toISOString() })
          .eq("id", keywordRow.id);
        throw new Error("AI returned malformed JSON");
      }
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
    const articleUrl = `https://institutionsguide.dk/blog/${blogResult.slug}`;
    try {
      await fetch(`https://api.indexnow.org/indexnow?url=${encodeURIComponent(articleUrl)}&key=a563611ec50b9a5e31fdadcde3e13e1c`);
    } catch { /* non-critical */ }

    return new Response(
      JSON.stringify({
        ok: true,
        keyword: keywordRow.keyword,
        url: articleUrl,
        slug: blogResult.slug,
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
