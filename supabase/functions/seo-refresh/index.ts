import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { handleCorsPreflightOrGetHeaders } from "../_shared/cors.ts";
import { getAIConfig, resolveModel, fetchAI, extractJSON } from "../_shared/ai-client.ts";

const INDEXNOW_KEY = Deno.env.get("INDEXNOW_KEY") || "";
const SITE_URL = "https://institutionsguide.dk";
const MAX_ARTICLES_PER_RUN = 3;
const DELAY_BETWEEN_AI_CALLS_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function pingIndexNow(url: string): Promise<void> {
  try {
    await fetch(`https://api.indexnow.org/indexnow?url=${encodeURIComponent(url)}&key=${INDEXNOW_KEY}`);
  } catch { /* non-critical */ }
}

Deno.serve(async (req) => {
  const { corsHeaders, preflightResponse } = handleCorsPreflightOrGetHeaders(req);
  if (preflightResponse) return preflightResponse;

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  const seoSecret = Deno.env.get("SEO_GENERATE_SECRET");

  if (!seoSecret || token !== seoSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let ai: ReturnType<typeof getAIConfig>;
  try {
    ai = getAIConfig();
  } catch {
    return new Response(JSON.stringify({ error: "No AI API key configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "auto_refresh";

    // ── STATUS ──
    if (action === "status") {
      const { data: rows, error } = await supabase
        .from("seo_performance")
        .select("refresh_reason")
        .eq("needs_refresh", true);

      if (error) throw error;

      const breakdown: Record<string, number> = {};
      for (const row of rows || []) {
        const reason = row.refresh_reason || "unknown";
        breakdown[reason] = (breakdown[reason] || 0) + 1;
      }

      return new Response(
        JSON.stringify({ total_needing_refresh: (rows || []).length, by_reason: breakdown }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── AUTO REFRESH ──
    if (action === "auto_refresh") {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: candidates, error: fetchErr } = await supabase
        .from("seo_performance")
        .select("*")
        .eq("needs_refresh", true)
        .or(`last_refreshed_at.is.null,last_refreshed_at.lt.${sevenDaysAgo}`)
        .limit(MAX_ARTICLES_PER_RUN);

      if (fetchErr) throw fetchErr;

      if (!candidates || candidates.length === 0) {
        return new Response(
          JSON.stringify({ ok: true, message: "No articles need refresh", refreshed: [] }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results: { slug: string; reason: string; action_taken: string }[] = [];

      for (let i = 0; i < candidates.length; i++) {
        const perf = candidates[i];
        const slug = perf.slug;
        const reason = perf.refresh_reason || "unknown";

        if (i > 0) await sleep(DELAY_BETWEEN_AI_CALLS_MS);

        try {
          // ── low_ctr_high_position: Rewrite meta title & description ──
          if (reason === "low_ctr_high_position") {
            const { data: post } = await supabase
              .from("blog_posts")
              .select("id, title, meta_title, meta_description")
              .eq("slug", slug)
              .single();

            if (!post) { results.push({ slug, reason, action_taken: "skipped: post not found" }); continue; }

            const queries = (perf.top_queries || []).map((q: { query: string }) => q.query).join(", ");
            const prompt = `Du er en CTR-optimeringsekspert for en dansk børnepasningsguide. En artikel ranker på Google position ${perf.avg_position || "?"} for disse queries: ${queries}.
Nuværende titel: "${post.meta_title || post.title}"
Nuværende meta-beskrivelse: "${post.meta_description || ""}"

Generer 5 alternative titler og 3 alternative meta-beskrivelser der øger klikraten.

Regler:
- Titler: max 60 tegn, inkluder primært keyword, brug power words (Gratis, Guide, 2026, Komplet, Sammenlign)
- Meta-beskrivelser: max 155 tegn, inkluder CTA og tal
- Dansk sprog, naturlig tone

Returner JSON: {"titles": ["...", ...], "descriptions": ["...", ...]}`;

            const aiResponse = await fetchAI(ai.url, {
              method: "POST",
              headers: ai.headers,
              body: JSON.stringify({
                model: resolveModel(),
                messages: [{ role: "user", content: prompt }],
                max_tokens: 1000,
              }),
            });

            if (!aiResponse.ok) { results.push({ slug, reason, action_taken: `ai_error: ${aiResponse.status}` }); continue; }

            const aiData = await aiResponse.json();
            const raw = aiData.content?.[0]?.text ?? "";
            const parsed = extractJSON(raw) as { titles?: string[]; descriptions?: string[] };

            const newTitle = parsed.titles?.[0]?.slice(0, 60);
            const newDesc = parsed.descriptions?.[0]?.slice(0, 155);

            if (newTitle || newDesc) {
              await supabase
                .from("blog_posts")
                .update({
                  ...(newTitle ? { meta_title: newTitle } : {}),
                  ...(newDesc ? { meta_description: newDesc } : {}),
                })
                .eq("id", post.id);
            }

            results.push({ slug, reason, action_taken: `meta_updated: title="${newTitle}", desc="${newDesc}"` });
          }

          // ── declining_position: Expand content ──
          else if (reason === "declining_position") {
            const { data: post } = await supabase
              .from("blog_posts")
              .select("id, content_html, keyword")
              .eq("slug", slug)
              .single();

            if (!post) { results.push({ slug, reason, action_taken: "skipped: post not found" }); continue; }

            const queries = (perf.top_queries || []).map((q: { query: string }) => q.query).join(", ");

            const { data: related } = await supabase
              .from("blog_posts")
              .select("slug, title")
              .neq("slug", slug)
              .limit(5);
            const relatedLinks = (related || []).map((r: { slug: string; title: string }) => `<a href="/blog/${r.slug}">${r.title}</a>`).join(", ");

            const prompt = `Du er SEO-indholdsekspert for en dansk børnepasningsguide. En artikel om "${post.keyword || slug}" falder i ranking.
Top queries: ${queries}

Skriv en ny sektion (300 ord, H2 + paragraphs) der:
- Besvarer de mest relevante queries direkte
- Inkluderer konkrete tal og eksempler om dagtilbud/skoler
- Linker til relaterede artikler: ${relatedLinks}

Returner JSON: {"section_html": "<h2>...</h2><p>...</p>"}`;

            const aiResponse = await fetchAI(ai.url, {
              method: "POST",
              headers: ai.headers,
              body: JSON.stringify({
                model: resolveModel(),
                messages: [{ role: "user", content: prompt }],
                max_tokens: 1500,
              }),
            });

            if (!aiResponse.ok) { results.push({ slug, reason, action_taken: `ai_error: ${aiResponse.status}` }); continue; }

            const aiData = await aiResponse.json();
            const raw = aiData.content?.[0]?.text ?? "";
            const parsed = extractJSON(raw) as { section_html?: string };

            if (parsed.section_html) {
              let html = post.content_html || "";
              const faqIdx = html.indexOf("<h2>Ofte stillede spørgsmål");
              if (faqIdx !== -1) {
                html = html.slice(0, faqIdx) + parsed.section_html + "\n" + html.slice(faqIdx);
              } else {
                html += "\n" + parsed.section_html;
              }
              await supabase.from("blog_posts").update({ content_html: html }).eq("id", post.id);
            }

            results.push({ slug, reason, action_taken: "content_expanded" });
          }

          // ── stale_content: Refresh dates and stats ──
          else if (reason === "stale_content") {
            const { data: post } = await supabase
              .from("blog_posts")
              .select("id, content_html")
              .eq("slug", slug)
              .single();

            if (!post) { results.push({ slug, reason, action_taken: "skipped: post not found" }); continue; }

            const prompt = `Du er SEO-indholdsekspert for en dansk børnepasningsguide. Opdater denne artikel:
1. Erstat årstal-referencer fra 2025 til 2026 hvor det giver mening
2. Opdater eventuelle priser/satser til 2026-niveau
3. Tilføj "<p><strong>Opdateret 2026:</strong> Denne artikel er gennemgået og opdateret med de seneste tal og regler.</p>" som det allerførste

Nuværende HTML:
${(post.content_html || "").slice(0, 6000)}

Returner JSON: {"content_html": "...opdateret HTML"}`;

            const aiResponse = await fetchAI(ai.url, {
              method: "POST",
              headers: ai.headers,
              body: JSON.stringify({
                model: resolveModel(),
                messages: [{ role: "user", content: prompt }],
                max_tokens: 4096,
              }),
            });

            if (!aiResponse.ok) { results.push({ slug, reason, action_taken: `ai_error: ${aiResponse.status}` }); continue; }

            const aiData = await aiResponse.json();
            const raw = aiData.content?.[0]?.text ?? "";
            const parsed = extractJSON(raw) as { content_html?: string };

            if (parsed.content_html) {
              await supabase.from("blog_posts").update({ content_html: parsed.content_html }).eq("id", post.id);
            }

            results.push({ slug, reason, action_taken: "content_refreshed" });
          }

          // ── zero_impressions: Ping IndexNow ──
          else if (reason === "zero_impressions") {
            const articleUrl = `${SITE_URL}/blog/${slug}`;
            await pingIndexNow(articleUrl);

            const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
            if (perf.created_at && perf.created_at < sixtyDaysAgo) {
              await supabase
                .from("seo_keywords")
                .update({ status: "needs_review" })
                .eq("blog_slug", slug);
              results.push({ slug, reason, action_taken: "indexnow_pinged, keyword_flagged_for_review" });
            } else {
              results.push({ slug, reason, action_taken: "indexnow_pinged" });
            }
          } else {
            results.push({ slug, reason, action_taken: "unknown_reason_skipped" });
            continue;
          }

          await supabase
            .from("seo_performance")
            .update({ last_refreshed_at: new Date().toISOString(), needs_refresh: false })
            .eq("slug", slug);

          if (reason !== "zero_impressions") {
            await pingIndexNow(`${SITE_URL}/blog/${slug}`);
          }

        } catch (err) {
          console.error(`Error refreshing ${slug}:`, err);
          results.push({ slug, reason, action_taken: `error: ${err instanceof Error ? err.message : "unknown"}` });
        }
      }

      return new Response(
        JSON.stringify({ ok: true, refreshed: results }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("seo-refresh error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
