import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightOrGetHeaders } from "../_shared/cors.ts";

const BLOG_TABLE = "blog_posts";
const CLUSTER_TABLE = "topic_clusters";
const LINKS_TABLE = "internal_links";
const URL_PREFIX = "/blog";
const MAX_ARTICLES_PER_RUN = 10;
const MIN_INCOMING_LINKS = 3;

interface InsertionPoint {
  index: number;
  type: "paragraph" | "read_also" | "before_disclaimer";
}

interface LinkResult {
  source: string;
  target: string;
  anchor: string;
  type: string;
}

function findInsertionPoint(html: string, targetKeywords: string[]): InsertionPoint | null {
  const paragraphs = html.match(/<p>[\s\S]*?<\/p>/gi) || [];
  for (const p of paragraphs) {
    const pText = p.toLowerCase().replace(/<[^>]*>/g, "");
    const matchCount = targetKeywords.filter((kw) => pText.includes(kw.toLowerCase())).length;
    if (matchCount >= 1) {
      const insertIdx = html.indexOf(p) + p.length;
      return { index: insertIdx, type: "paragraph" };
    }
  }

  const readAlsoIdx = html.indexOf("Læs også");
  if (readAlsoIdx !== -1) {
    const ulEnd = html.indexOf("</ul>", readAlsoIdx);
    if (ulEnd !== -1) return { index: ulEnd, type: "read_also" };
  }

  const disclaimerIdx = html.indexOf("informationsformål");
  if (disclaimerIdx !== -1) {
    const pBefore = html.lastIndexOf("<p>", disclaimerIdx);
    if (pBefore !== -1) return { index: pBefore, type: "before_disclaimer" };
  }

  return null;
}

function injectLink(html: string, point: InsertionPoint, targetSlug: string, anchorText: string): string {
  const link = `<a href="${URL_PREFIX}/${targetSlug}">${anchorText}</a>`;

  if (point.type === "paragraph") {
    const insertion = `\n<p>Læs også: ${link}</p>`;
    return html.slice(0, point.index) + insertion + html.slice(point.index);
  }
  if (point.type === "read_also") {
    const insertion = `\n<li>${link}</li>`;
    return html.slice(0, point.index) + insertion + html.slice(point.index);
  }
  if (point.type === "before_disclaimer") {
    const insertion = `<p>Læs også: ${link}</p>\n`;
    return html.slice(0, point.index) + insertion + html.slice(point.index);
  }
  return html;
}

function getKeywordWords(keyword: string): string[] {
  return keyword.toLowerCase().split(/[\s,;]+/).filter((w) => w.length > 2);
}

function computeOverlap(wordsA: string[], wordsB: string[]): number {
  const setB = new Set(wordsB);
  return wordsA.filter((w) => setB.has(w)).length;
}

Deno.serve(async (req) => {
  const { corsHeaders, preflightResponse } = handleCorsPreflightOrGetHeaders(req);
  if (preflightResponse) return preflightResponse;

  const adminKey = req.headers.get("x-admin-key") || req.headers.get("authorization")?.replace("Bearer ", "");
  const seoSecret = Deno.env.get("SEO_GENERATE_SECRET");

  if (!adminKey || adminKey !== seoSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: { action?: string } = {};
  try { body = await req.json(); } catch { body = { action: "auto_link" }; }
  const action = body.action || "auto_link";

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // ─── STATUS ──────────────────────────────────────────────────────────────
  if (action === "status") {
    const { data: allArticles } = await supabase.from(BLOG_TABLE).select("slug");
    const { count: totalLinks } = await supabase.from(LINKS_TABLE).select("*", { count: "exact", head: true });
    const { data: clusters } = await supabase.from(CLUSTER_TABLE).select("pillar_slug, cluster_slug");

    const slugs = (allArticles || []).map((a: { slug: string }) => a.slug);
    const starved: string[] = [];
    for (const slug of slugs) {
      const { count } = await supabase.from(LINKS_TABLE).select("*", { count: "exact", head: true }).eq("target_slug", slug);
      if ((count || 0) < MIN_INCOMING_LINKS) starved.push(slug);
    }

    let clusterLinked = 0;
    for (const c of clusters || []) {
      const { count } = await supabase.from(LINKS_TABLE).select("*", { count: "exact", head: true }).eq("source_slug", c.cluster_slug).eq("target_slug", c.pillar_slug);
      if ((count || 0) > 0) clusterLinked++;
    }

    return json({
      total_articles: slugs.length,
      link_starved_articles: starved.length,
      starved_slugs: starved.slice(0, 20),
      total_internal_links: totalLinks || 0,
      cluster_total: (clusters || []).length,
      cluster_linked: clusterLinked,
      cluster_coverage_pct: (clusters || []).length > 0 ? Math.round((clusterLinked / (clusters || []).length) * 100) : 0,
    });
  }

  // ─── AUTO_LINK ───────────────────────────────────────────────────────────
  if (action === "auto_link") {
    const linked: LinkResult[] = [];
    let skipped = 0;
    let errors = 0;

    const { data: articles, error: artErr } = await supabase
      .from(BLOG_TABLE)
      .select("slug, title, keyword, content_html");

    if (artErr || !articles) {
      return json({ error: "Failed to fetch articles", detail: artErr?.message }, 500);
    }

    // Find link-starved articles
    const starved: typeof articles = [];
    for (const art of articles) {
      const { count } = await supabase.from(LINKS_TABLE).select("*", { count: "exact", head: true }).eq("target_slug", art.slug);
      if ((count || 0) < MIN_INCOMING_LINKS) starved.push(art);
    }

    const targets = starved.slice(0, MAX_ARTICLES_PER_RUN);

    const { data: clusters } = await supabase
      .from(CLUSTER_TABLE)
      .select("pillar_slug, cluster_slug, anchor_text, reverse_anchor_text");

    for (const target of targets) {
      try {
        const targetWords = getKeywordWords(target.keyword || "");

        // Cluster relationships
        const relatedFromClusters: { slug: string; anchor: string; type: string }[] = [];
        for (const c of clusters || []) {
          if (c.cluster_slug === target.slug && c.pillar_slug) {
            relatedFromClusters.push({ slug: c.pillar_slug, anchor: c.anchor_text || target.title, type: "cluster" });
          }
          if (c.pillar_slug === target.slug && c.cluster_slug) {
            relatedFromClusters.push({ slug: c.cluster_slug, anchor: c.reverse_anchor_text || target.title, type: "cluster" });
          }
        }

        // Semantic overlap
        const scored = articles
          .filter((a) => a.slug !== target.slug)
          .map((a) => ({ ...a, overlap: computeOverlap(targetWords, getKeywordWords(a.keyword || "")) }))
          .filter((a) => a.overlap > 0)
          .sort((a, b) => b.overlap - a.overlap)
          .slice(0, 5);

        const sources = [
          ...relatedFromClusters.map((r) => ({ slug: r.slug, anchor: r.anchor, linkType: r.type })),
          ...scored.map((s) => ({ slug: s.slug, anchor: target.title, linkType: "contextual" })),
        ];

        for (const source of sources) {
          const { count: existing } = await supabase.from(LINKS_TABLE).select("*", { count: "exact", head: true }).eq("source_slug", source.slug).eq("target_slug", target.slug);
          if ((existing || 0) > 0) { skipped++; continue; }

          const sourceArt = articles.find((a) => a.slug === source.slug);
          if (!sourceArt?.content_html) { skipped++; continue; }

          const point = findInsertionPoint(sourceArt.content_html, targetWords);
          if (!point) { skipped++; continue; }

          const updatedHtml = injectLink(sourceArt.content_html, point, target.slug, source.anchor);

          const { error: updateErr } = await supabase.from(BLOG_TABLE).update({ content_html: updatedHtml }).eq("slug", source.slug);
          if (updateErr) { errors++; continue; }

          sourceArt.content_html = updatedHtml;

          const { error: insertErr } = await supabase.from(LINKS_TABLE).insert({
            source_slug: source.slug,
            target_slug: target.slug,
            anchor_text: source.anchor,
            link_type: source.linkType,
            auto_injected: true,
          });
          if (insertErr) { errors++; continue; }

          linked.push({ source: source.slug, target: target.slug, anchor: source.anchor, type: source.linkType });
        }
      } catch (err) {
        console.error(`Error processing target ${target.slug}:`, err);
        errors++;
      }
    }

    // Ensure bidirectional cluster links
    for (const c of clusters || []) {
      try {
        const pillarArt = articles.find((a) => a.slug === c.pillar_slug);
        const clusterArt = articles.find((a) => a.slug === c.cluster_slug);

        if (clusterArt?.content_html && !clusterArt.content_html.includes(`/${c.pillar_slug}`)) {
          const point = findInsertionPoint(clusterArt.content_html, getKeywordWords(pillarArt?.keyword || c.pillar_slug));
          if (point) {
            const updatedHtml = injectLink(clusterArt.content_html, point, c.pillar_slug, c.anchor_text || pillarArt?.title || c.pillar_slug);
            await supabase.from(BLOG_TABLE).update({ content_html: updatedHtml }).eq("slug", c.cluster_slug);
            clusterArt.content_html = updatedHtml;

            const { count: ex } = await supabase.from(LINKS_TABLE).select("*", { count: "exact", head: true }).eq("source_slug", c.cluster_slug).eq("target_slug", c.pillar_slug);
            if ((ex || 0) === 0) {
              await supabase.from(LINKS_TABLE).insert({ source_slug: c.cluster_slug, target_slug: c.pillar_slug, anchor_text: c.anchor_text || c.pillar_slug, link_type: "cluster", auto_injected: true });
            }
            linked.push({ source: c.cluster_slug, target: c.pillar_slug, anchor: c.anchor_text || "", type: "cluster" });
          }
        }

        if (pillarArt?.content_html && !pillarArt.content_html.includes(`/${c.cluster_slug}`)) {
          const point = findInsertionPoint(pillarArt.content_html, getKeywordWords(clusterArt?.keyword || c.cluster_slug));
          if (point) {
            const updatedHtml = injectLink(pillarArt.content_html, point, c.cluster_slug, c.reverse_anchor_text || clusterArt?.title || c.cluster_slug);
            await supabase.from(BLOG_TABLE).update({ content_html: updatedHtml }).eq("slug", c.pillar_slug);
            pillarArt.content_html = updatedHtml;

            const { count: ex } = await supabase.from(LINKS_TABLE).select("*", { count: "exact", head: true }).eq("source_slug", c.pillar_slug).eq("target_slug", c.cluster_slug);
            if ((ex || 0) === 0) {
              await supabase.from(LINKS_TABLE).insert({ source_slug: c.pillar_slug, target_slug: c.cluster_slug, anchor_text: c.reverse_anchor_text || c.cluster_slug, link_type: "cluster", auto_injected: true });
            }
            linked.push({ source: c.pillar_slug, target: c.cluster_slug, anchor: c.reverse_anchor_text || "", type: "cluster" });
          }
        }
      } catch (err) {
        console.error(`Error processing cluster ${c.cluster_slug}:`, err);
        errors++;
      }
    }

    return json({ linked: linked.length, skipped, errors, details: linked });
  }

  return json({ error: `Unknown action: ${action}` }, 400);
});
