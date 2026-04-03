import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

interface InstitutionContext {
  institution_id: string;
  name: string;
  category: string;
  municipality: string;
  monthly_rate: number | null;
  municipality_avg_price: number | null;
  ownership: string | null;
  normering_ratio: number | null;
  normering_age_group: string | null;
  // School quality
  trivsel: number | null;
  karakterer: number | null;
  fravaer_pct: number | null;
  kompetencedaekning_pct: number | null;
  klassestorrelse: number | null;
  undervisningseffekt: string | null;
  // Computed
  score: number;
  grade: string;
  // Nearby
  nearby: { name: string; distance_km: number; category: string; monthly_rate: number | null }[];
  // Comparative context — dagtilbud
  normering_municipality_avg?: number | null;
  normering_national_avg?: number | null;
  normering_percentile?: number | null;
  staff_education_pct?: number | null;
  staff_education_municipality_avg?: number | null;
  staff_education_national_avg?: number | null;
  staff_education_percentile?: number | null;
  parent_satisfaction?: number | null;
  parent_satisfaction_municipality_avg?: number | null;
  parent_satisfaction_national_avg?: number | null;
  parent_satisfaction_percentile?: number | null;
  price_percentile?: number | null;
  // Comparative context — schools
  trivsel_municipality_avg?: number | null;
  trivsel_national_avg?: number | null;
  trivsel_percentile?: number | null;
  karakterer_municipality_avg?: number | null;
  karakterer_national_avg?: number | null;
  karakterer_percentile?: number | null;
  fravaer_municipality_avg?: number | null;
  fravaer_national_avg?: number | null;
  fravaer_percentile?: number | null;
  kompetencedaekning_municipality_avg?: number | null;
  kompetencedaekning_national_avg?: number | null;
  kompetencedaekning_percentile?: number | null;
  klassestorrelse_municipality_avg?: number | null;
  klassestorrelse_national_avg?: number | null;
  klassestorrelse_percentile?: number | null;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check: require anon key as Bearer token
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ") || authHeader.slice(7) !== SUPABASE_ANON_KEY) {
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

    const ctx: InstitutionContext = await req.json();

    // 1. Check cache
    const { data: cached } = await supabase
      .from("assessments")
      .select("*")
      .eq("institution_id", ctx.institution_id)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Build prompt
    const systemPrompt = buildSystemPrompt(ctx);
    const userPrompt = buildUserPrompt(ctx);

    // 3. Call Claude API with 30s timeout
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
          max_tokens: 1200,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
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
    let rawText = data.content[0].text.trim();
    // Strip markdown code fences if Claude wraps the JSON
    if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    // 4. Parse JSON response
    const assessment = JSON.parse(rawText);

    // 5. Store in cache
    const row = {
      institution_id: ctx.institution_id,
      score: ctx.score,
      grade: ctx.grade,
      headline: assessment.headline,
      summary: assessment.summary,
      pros: assessment.pros,
      cons: assessment.cons,
      recommendation: assessment.recommendation,
      generated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    await supabase.from("assessments").upsert(row);

    return new Response(JSON.stringify(row), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildSystemPrompt(ctx: InstitutionContext): string {
  const isSchool = ctx.category === "skole";

  return `Du er en datadrevet rådgiver for danske forældre der vælger ${isSchool ? "skole" : "daginstitution"}.
Du modtager strukturerede data om én institution og dens nærområde, inkl. percentiler, kommunegennemsnit og landsgennemsnit.
Din opgave er at vurdere institutionen objektivt baseret på de tilgængelige data. Skriv faktuelt og præcist — aldrig som en AI-chatbot, aldrig med fyldord.

Svar KUN med valid JSON. Ingen markdown, ingen backticks, ingen forklaring udenfor JSON.

{
  "headline": {"da": "<maks 6 ord>", "en": "<max 6 words>"},
  "summary": {"da": "<2-3 sætninger>", "en": "<2-3 sentences>"},
  "pros": [{"da": "<fordel>", "en": "<strength>"}, ...],
  "cons": [{"da": "<opmærksomhedspunkt>", "en": "<concern>"}, ...],
  "recommendation": {"da": "<2-3 sætninger, handlingsorienteret>", "en": "<2-3 sentences>"}
}

Regler for fordele og ulemper — vær SPECIFIK og datadrevet:
Gode eksempler:
- "Normering på 3.1 er markant bedre end kommunens gennemsnit på 3.4 — i top 25% nationalt"
- "Forældretilfredshed på 3.9 ligger over landsgennemsnittet på 3.7 (72. percentil)"
- "Karaktersnit på 8.2 placerer skolen i top 15% nationalt og over kommunens gennemsnit på 7.1"
Dårlige eksempler: "God normering" (for vagt), "Hyggelig institution" (subjektivt)

- 2-4 pros, 1-3 cons (altid mindst én con)
- Brug ALTID de medfølgende percentiler og gennemsnit til at sætte tal i kontekst
- Referér til kommunegennemsnit OG landsgennemsnit når data er tilgængeligt
- Nævn percentilplacering i naturligt sprog (fx "top 10% nationalt", "over medianen", "i nederste kvartil")
- Cons skal være reelle, ikke konstruerede. Hvis data mangler, nævn det IKKE
- headline: kort, præcis (fx "Stærkt fagligt valg" eller "Billig, men høj normering")
- recommendation: hjælp forælderen med at HANDLE — hvem passer det til, hvad skal de være opmærksomme på, konkret råd (fx "skriv op tidligt", "besøg først")
${isSchool ? `
Data du kan vurdere på (percentiler og gennemsnit medfølger i datablokken):
- Trivsel: 3.5-4.3 skala
- Karakterer: 2-12 skala
- Fravær: lavere er bedre
- Kompetencedækning: andel timer med kvalificeret lærer, mål 95%+
- Klassestørrelse: lavere er generelt bedre
- Undervisningseffekt (socioøkonomisk reference): "Over niveau" = skolen løfter eleverne, "Under niveau" = modsat` : `
Data du kan vurdere på (percentiler og gennemsnit medfølger i datablokken):
- Normering: børn per voksen — lavere er bedre
- Andel pædagoguddannede: højere er bedre
- Forældretilfredshed: 1-5 skala, højere er bedre
- Pris: sammenlign med kommunegennemsnittet + percentil
- Ejerskab: kommunal (direkte tilsyn), selvejende (uafhængig drift), privat (egne pædagogiske valg)`}`;
}

/** Format a comparative line: "Label: value (kommunegennemsnit: X, landsgennemsnit: Y, Z. percentil)" */
function compareLine(
  label: string,
  value: string,
  munAvg: number | null | undefined,
  natAvg: number | null | undefined,
  percentile: number | null | undefined,
  unit = "",
): string {
  const parts: string[] = [];
  if (munAvg != null) parts.push(`kommunegennemsnit: ${munAvg}${unit}`);
  if (natAvg != null) parts.push(`landsgennemsnit: ${natAvg}${unit}`);
  if (percentile != null) parts.push(`${percentile}. percentil`);
  if (parts.length > 0) {
    return `${label}: ${value} (${parts.join(", ")})`;
  }
  return `${label}: ${value}`;
}

function buildUserPrompt(ctx: InstitutionContext): string {
  const lines: string[] = [`Vurder denne institution:`];
  lines.push(`Navn: ${ctx.name}`);
  lines.push(`Type: ${ctx.category}`);
  lines.push(`Kommune: ${ctx.municipality}`);
  lines.push(`Samlet score: ${ctx.score}/100 (grade: ${ctx.grade})`);

  if (ctx.monthly_rate != null) {
    const priceParts: string[] = [];
    if (ctx.municipality_avg_price != null) priceParts.push(`kommunegennemsnit: ${Math.round(ctx.municipality_avg_price)} kr.`);
    if (ctx.price_percentile != null) priceParts.push(`${ctx.price_percentile}. percentil i kommunen`);
    if (priceParts.length > 0) {
      lines.push(`Månedspris: ${ctx.monthly_rate} kr. (${priceParts.join(", ")})`);
    } else {
      lines.push(`Månedspris: ${ctx.monthly_rate} kr.`);
    }
  }

  if (ctx.ownership) lines.push(`Ejerskab: ${ctx.ownership}`);

  // Normering with comparative context
  if (ctx.normering_ratio != null) {
    lines.push(compareLine(
      `Normering (${ctx.normering_age_group})`,
      `${ctx.normering_ratio} børn/voksen`,
      ctx.normering_municipality_avg,
      ctx.normering_national_avg,
      ctx.normering_percentile,
    ));
  }

  // Staff education with comparative context
  if (ctx.staff_education_pct != null) {
    lines.push(compareLine(
      "Andel pædagoguddannede",
      `${ctx.staff_education_pct}%`,
      ctx.staff_education_municipality_avg,
      ctx.staff_education_national_avg,
      ctx.staff_education_percentile,
      "%",
    ));
  }

  // Parent satisfaction with comparative context
  if (ctx.parent_satisfaction != null) {
    lines.push(compareLine(
      "Forældretilfredshed",
      `${ctx.parent_satisfaction}`,
      ctx.parent_satisfaction_municipality_avg,
      ctx.parent_satisfaction_national_avg,
      ctx.parent_satisfaction_percentile,
    ));
  }

  // School quality metrics with comparative context
  if (ctx.trivsel != null) {
    lines.push(compareLine(
      "Trivsel",
      `${ctx.trivsel}`,
      ctx.trivsel_municipality_avg,
      ctx.trivsel_national_avg,
      ctx.trivsel_percentile,
    ));
  }
  if (ctx.karakterer != null) {
    lines.push(compareLine(
      "Karaktergennemsnit",
      `${ctx.karakterer}`,
      ctx.karakterer_municipality_avg,
      ctx.karakterer_national_avg,
      ctx.karakterer_percentile,
    ));
  }
  if (ctx.fravaer_pct != null) {
    lines.push(compareLine(
      "Fravær",
      `${ctx.fravaer_pct}%`,
      ctx.fravaer_municipality_avg,
      ctx.fravaer_national_avg,
      ctx.fravaer_percentile,
      "%",
    ));
  }
  if (ctx.kompetencedaekning_pct != null) {
    lines.push(compareLine(
      "Kompetencedækning",
      `${ctx.kompetencedaekning_pct}%`,
      ctx.kompetencedaekning_municipality_avg,
      ctx.kompetencedaekning_national_avg,
      ctx.kompetencedaekning_percentile,
      "%",
    ));
  }
  if (ctx.klassestorrelse != null) {
    lines.push(compareLine(
      "Klassestørrelse",
      `${ctx.klassestorrelse} elever`,
      ctx.klassestorrelse_municipality_avg,
      ctx.klassestorrelse_national_avg,
      ctx.klassestorrelse_percentile,
      " elever",
    ));
  }
  if (ctx.undervisningseffekt) lines.push(`Undervisningseffekt: ${ctx.undervisningseffekt}`);

  if (ctx.nearby.length > 0) {
    lines.push(`\nNaboinstitutioner:`);
    for (const n of ctx.nearby.slice(0, 5)) {
      const parts = [n.name, `${n.distance_km.toFixed(1)} km`];
      if (n.monthly_rate) parts.push(`${n.monthly_rate} kr./md.`);
      lines.push(`  - ${parts.join(", ")}`);
    }
  }

  return lines.join("\n");
}
