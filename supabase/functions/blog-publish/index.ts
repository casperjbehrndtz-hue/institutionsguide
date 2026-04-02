import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { handleCorsPreflightOrGetHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const { corsHeaders, preflightResponse } = handleCorsPreflightOrGetHeaders(req);
  if (preflightResponse) return preflightResponse;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Authenticate
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  const secret = Deno.env.get("BLOG_PUBLISH_SECRET") || Deno.env.get("SEO_GENERATE_SECRET");

  if (!secret || token !== secret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { slug, title, content_html, meta_title, meta_description, module, keyword, intent } = body;

    if (!slug || !title || !content_html) {
      return new Response(JSON.stringify({ error: "Missing required fields: slug, title, content_html" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate slug format
    if (!/^[a-z0-9æøå][a-z0-9æøå-]{1,199}$/.test(slug)) {
      return new Response(JSON.stringify({ error: "Invalid slug format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: existing } = await supabase
      .from("blog_posts")
      .select("id, published_at")
      .eq("slug", slug)
      .maybeSingle();

    const postData = {
      slug,
      title,
      meta_title: meta_title || title,
      meta_description: meta_description || "",
      content_html,
      module: module || "generel",
      keyword: keyword || "",
      intent: intent || "informational",
      ...(existing?.published_at ? {} : { published_at: new Date().toISOString() }),
    };

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from("blog_posts")
        .update(postData)
        .eq("id", existing.id)
        .select("id, slug")
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from("blog_posts")
        .insert(postData)
        .select("id, slug")
        .single();
      if (error) throw error;
      result = data;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        url: `https://institutionsguiden.dk/blog/${result.slug}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("blog-publish error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
