import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    // 3. Call Claude API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
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
    });

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
Du modtager strukturerede data om én institution og dens nærområde.
Din opgave er at vurdere institutionen ærligt og nuanceret — som en betroet ven der tilfældigvis kender alt til ${isSchool ? "skoler" : "børnepasning"} i Danmark.

Svar KUN med valid JSON. Ingen markdown, ingen backticks, ingen forklaring udenfor JSON.

{
  "headline": {"da": "<maks 6 ord>", "en": "<max 6 words>"},
  "summary": {"da": "<2-3 sætninger>", "en": "<2-3 sentences>"},
  "pros": [{"da": "<fordel>", "en": "<strength>"}, ...],
  "cons": [{"da": "<opmærksomhedspunkt>", "en": "<concern>"}, ...],
  "recommendation": {"da": "<2-3 sætninger, handlingsorienteret>", "en": "<2-3 sentences>"}
}

Regler for fordele og ulemper — vær SPECIFIK og datadrevet:
Gode eksempler: "Normering på 3.1 er markant bedre end kommunens gennemsnit på 3.4"
Dårlige eksempler: "God normering" (for vagt), "Hyggelig institution" (subjektivt)

- 2-4 pros, 1-3 cons (altid mindst én con)
- Brug konkrete tal fra dataen — sammenlign med kommunegennemsnit
- Cons skal være reelle, ikke konstruerede. Hvis data mangler, nævn det IKKE
- headline: kort, præcis (fx "Stærkt fagligt valg" eller "Billig, men høj normering")
- recommendation: hjælp forælderen med at HANDLE — hvem passer det til, hvad skal de være opmærksomme på, konkret råd (fx "skriv op tidligt", "besøg først")
${isSchool ? `
Data du kan vurdere på:
- Trivsel: 3.5-4.3 skala, landsgennemsnit ~3.85
- Karakterer: 2-12 skala, landsgennemsnit ~7.0
- Fravær: lavere er bedre, landsgennemsnit ~6.5%
- Kompetencedækning: andel timer med kvalificeret lærer, mål 95%+
- Klassestørrelse: landsgennemsnit ~21 elever
- Undervisningseffekt (socioøkonomisk reference): "Over niveau" = skolen løfter eleverne, "Under niveau" = modsat` : `
Data du kan vurdere på:
- Normering 0-2 år: anbefalet ≤3.0, landsgennemsnit ~3.3
- Normering 3-5 år: anbefalet ≤6.0, landsgennemsnit ~6.4
- Pris: sammenlign med kommunegennemsnittet
- Ejerskab: kommunal (direkte tilsyn), selvejende (uafhængig drift), privat (egne pædagogiske valg)`}`;
}

function buildUserPrompt(ctx: InstitutionContext): string {
  const lines: string[] = [`Vurder denne institution:`];
  lines.push(`Navn: ${ctx.name}`);
  lines.push(`Type: ${ctx.category}`);
  lines.push(`Kommune: ${ctx.municipality}`);
  lines.push(`Samlet score: ${ctx.score}/100 (grade: ${ctx.grade})`);

  if (ctx.monthly_rate != null) {
    lines.push(`Månedspris: ${ctx.monthly_rate} kr.`);
    if (ctx.municipality_avg_price != null) {
      lines.push(`Kommunegennemsnit pris: ${Math.round(ctx.municipality_avg_price)} kr.`);
    }
  }

  if (ctx.ownership) lines.push(`Ejerskab: ${ctx.ownership}`);

  if (ctx.normering_ratio != null) {
    lines.push(`Normering: ${ctx.normering_ratio} børn/voksen (${ctx.normering_age_group})`);
  }

  if (ctx.trivsel != null) lines.push(`Trivsel: ${ctx.trivsel}`);
  if (ctx.karakterer != null) lines.push(`Karaktergennemsnit: ${ctx.karakterer}`);
  if (ctx.fravaer_pct != null) lines.push(`Fravær: ${ctx.fravaer_pct}%`);
  if (ctx.kompetencedaekning_pct != null) lines.push(`Kompetencedækning: ${ctx.kompetencedaekning_pct}%`);
  if (ctx.klassestorrelse != null) lines.push(`Klassestørrelse: ${ctx.klassestorrelse} elever`);
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
