const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const ALLOWED_ORIGINS = new Set([
  "https://institutionsguiden.dk",
  "https://www.institutionsguiden.dk",
  "https://institutionsguide.vercel.app",
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

    // Content-Length check: reject requests > 50KB
    const contentLength = parseInt(req.headers.get("Content-Length") ?? "0", 10);
    if (contentLength > 50 * 1024) {
      return new Response(JSON.stringify({ error: "Request too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { institution_id, question, context } = await req.json();

    if (!institution_id || !question || !context) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context string from institution data
    const contextLines: string[] = [`Institution: ${context.name}`];
    contextLines.push(`Type: ${context.category}`);
    contextLines.push(`Kommune: ${context.municipality}`);
    if (context.score != null) contextLines.push(`Samlet score: ${context.score}/100 (karakter: ${context.grade})`);
    if (context.monthly_rate != null) {
      contextLines.push(`Månedspris: ${context.monthly_rate} kr.`);
      if (context.municipality_avg_price != null) {
        contextLines.push(`Kommunegennemsnit pris: ${Math.round(context.municipality_avg_price)} kr.`);
      }
    }
    if (context.yearly_price != null) contextLines.push(`Årspris: ${context.yearly_price} kr.`);
    if (context.ownership) contextLines.push(`Ejerskab: ${context.ownership}`);
    if (context.normering_ratio != null) contextLines.push(`Normering: ${context.normering_ratio} børn/voksen (${context.normering_age_group})`);
    if (context.pct_paedagoger != null) contextLines.push(`Andel uddannede pædagoger: ${context.pct_paedagoger}%`);
    if (context.parent_satisfaction != null) contextLines.push(`Forældretilfredshed (BTU): ${context.parent_satisfaction}/5`);
    if (context.antal_boern != null) contextLines.push(`Indskrevne børn: ${context.antal_boern}`);
    if (context.trivsel != null) contextLines.push(`Trivsel: ${context.trivsel}`);
    if (context.karakterer != null) contextLines.push(`Karaktergennemsnit: ${context.karakterer}`);
    if (context.fravaer_pct != null) contextLines.push(`Fravær: ${context.fravaer_pct}%`);
    if (context.kompetencedaekning_pct != null) contextLines.push(`Kompetencedækning: ${context.kompetencedaekning_pct}%`);
    if (context.klassestorrelse != null) contextLines.push(`Klassestørrelse: ${context.klassestorrelse} elever`);
    if (context.undervisningseffekt) contextLines.push(`Undervisningseffekt: ${context.undervisningseffekt}`);
    if (context.address) contextLines.push(`Adresse: ${context.address}`);

    // Detect if this is the initial insight request (long question about overall assessment)
    const isInsightRequest = question.length > 100;
    const maxTokens = isInsightRequest ? 600 : 400;

    const systemPrompt = `Du er en erfaren rådgiver for danske forældre der vælger institution til deres barn.

${isInsightRequest ? `Du skal give en DYBDEGÅENDE indsigt om institutionen. Fokusér på:
- Hvad tallene BETYDER i praksis (ikke bare gentag dem)
- Kontekst: hvordan klarer institutionen sig sammenlignet med lignende?
- Hvad er vigtigt for en forælder at vide som IKKE er umiddelbart synligt i tallene?
- Giv et ærligt, nuanceret billede — både styrker og svagheder
- Afslut med et konkret råd om hvem institutionen passer godt til

Skriv 4-6 sætninger. Brug afsnit for læsbarhed. Vær konkret og handlingsorienteret.` : `Svar kort og præcist (maks 3-4 sætninger). Brug konkrete tal fra dataen.
Hvis du ikke har data nok til at svare, sig det ærligt.`}

Svar på samme sprog som spørgsmålet. Skriv aldrig som en AI-chatbot — skriv som en kyndig rådgiver.`;

    const userMessage = `Data om institutionen:\n${contextLines.join("\n")}\n\nSpørgsmål: ${question}`;

    // Call Claude API with 30s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let response: Response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        }),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      if ((fetchErr as Error).name === "AbortError") {
        throw new Error("Claude API timeout after 30s");
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const answer = data.content[0].text.trim();

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
