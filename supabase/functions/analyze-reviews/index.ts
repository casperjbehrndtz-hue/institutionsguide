import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { getAIConfig, fetchAI, extractJSON, resolveModel } from "../_shared/ai-client.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const ALLOWED_ORIGINS = new Set([
  "https://institutionsguide.vercel.app",
  "https://www.institutionsguiden.dk",
  "https://www.institutionsguiden.dk",
  "http://localhost:5173",
  "http://localhost:8080",
]);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

interface ReviewInput {
  id: number;
  rating: number;
  title: string | null;
  body: string | null;
  pros: string | null;
  cons: string | null;
  author_name: string;
  dimension_ratings: Record<string, number> | null;
  created_at: string;
}

interface AnalyzeRequest {
  institution_id: string;
  reviews: ReviewInput[];
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check: require a Bearer token (Supabase anon key or JWT)
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ") || authHeader.length < 20) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Content-Length check: reject requests > 100KB
    const contentLength = parseInt(req.headers.get("Content-Length") ?? "0", 10);
    if (contentLength > 100 * 1024) {
      return new Response(JSON.stringify({ error: "Request too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: AnalyzeRequest = await req.json();

    // Require 3+ reviews
    if (!body.reviews || body.reviews.length < 3) {
      return new Response(JSON.stringify({ error: "At least 3 reviews required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Check cache
    const { data: cached } = await supabase
      .from("review_analyses")
      .select("data, expires_at")
      .eq("institution_id", body.institution_id)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (cached) {
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Build prompt
    const systemPrompt = `Du er en analyserobot der gennemgår forældreanmeldelser af danske børneinstitutioner og skoler.
Du modtager en samling anmeldelser og skal identificere tilbagevendende temaer, den generelle stemning, og en kort opsummering.

Svar KUN med valid JSON. Ingen markdown, ingen backticks, ingen forklaring udenfor JSON.

{
  "themes": [
    { "theme": { "da": "<tema på dansk>", "en": "<theme in English>" }, "sentiment": "positive" | "negative" | "neutral", "mentionCount": <antal> }
  ],
  "overallSentiment": "positive" | "mixed" | "negative",
  "summary": { "da": "<2-3 sætninger>", "en": "<2-3 sentences>" }
}

Regler:
- Identificér 3-8 temaer baseret på hvad forældrene faktisk nævner
- mentionCount = hvor mange anmeldelser der nævner temaet (minimum 2 for at inkludere)
- overallSentiment: "positive" hvis gennemsnit ≥ 3.5, "negative" hvis ≤ 2.5, ellers "mixed"
- summary skal være konkret og datadrevet — nævn specifikke styrker/svagheder
- Sortér temaer efter mentionCount (højest først)
- Temaer skal være specifikke (fx "Engageret personale", ikke bare "Personale")
- Skriv naturligt dansk — ikke robot-agtigt`;

    const reviewTexts = body.reviews.map((r, i) => {
      const parts = [`Anmeldelse ${i + 1} (${r.rating}/5):`];
      if (r.title) parts.push(`Titel: ${r.title}`);
      if (r.body) parts.push(r.body);
      if (r.pros) parts.push(`Fordele: ${r.pros}`);
      if (r.cons) parts.push(`Ulemper: ${r.cons}`);
      return parts.join("\n");
    });

    const userPrompt = `Analysér disse ${body.reviews.length} anmeldelser:\n\n${reviewTexts.join("\n\n---\n\n")}`;

    // 3. Call Claude API
    const aiConfig = getAIConfig();
    const response = await fetchAI(aiConfig.url, {
      method: "POST",
      headers: aiConfig.headers,
      body: JSON.stringify({
        model: resolveModel(),
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    }, 30_000);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const rawText = data.content[0].text.trim();
    const analysis = extractJSON(rawText);

    // 4. Store in cache (30 day TTL)
    const row = {
      institution_id: body.institution_id,
      data: analysis,
      review_count: body.reviews.length,
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    await supabase.from("review_analyses").upsert(row, { onConflict: "institution_id" });

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
