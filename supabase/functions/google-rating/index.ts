import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { handleCorsPreflightOrGetHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_MAPS_KEY = Deno.env.get("GOOGLE_MAPS_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Cache for 30 days
const CACHE_DAYS = 30;

interface GoogleRatingRow {
  institution_id: string;
  place_id: string | null;
  rating: number | null;
  review_count: number | null;
  maps_url: string | null;
  fetched_at: string;
}

Deno.serve(async (req) => {
  const { corsHeaders, preflightResponse } = handleCorsPreflightOrGetHeaders(req);
  if (preflightResponse) return preflightResponse;

  try {
    const { institution_id, name, address } = await req.json();

    if (!institution_id || !name) {
      return new Response(JSON.stringify({ error: "Missing institution_id or name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check cache first
    const { data: cached } = await supabase
      .from("google_ratings")
      .select("*")
      .eq("institution_id", institution_id)
      .single();

    if (cached) {
      const age = Date.now() - new Date(cached.fetched_at).getTime();
      const maxAge = CACHE_DAYS * 24 * 60 * 60 * 1000;
      if (age < maxAge) {
        return new Response(JSON.stringify({
          rating: cached.rating,
          review_count: cached.review_count,
          maps_url: cached.maps_url,
          cached: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Search Google Places for this institution
    const query = `${name} ${address || ""}`.trim();
    const searchUrl = `https://places.googleapis.com/v1/places:searchText`;

    const searchRes = await fetch(searchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_KEY,
        "X-Goog-FieldMask": "places.id,places.rating,places.userRatingCount,places.googleMapsUri",
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: "da",
        regionCode: "DK",
        maxResultCount: 1,
      }),
    });

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      console.error("Google Places API error:", searchRes.status, errText);
      return new Response(JSON.stringify({ error: "Google API error", detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchData = await searchRes.json();
    const place = searchData.places?.[0];

    const row: GoogleRatingRow = {
      institution_id,
      place_id: place?.id ?? null,
      rating: place?.rating ?? null,
      review_count: place?.userRatingCount ?? null,
      maps_url: place?.googleMapsUri ?? null,
      fetched_at: new Date().toISOString(),
    };

    // Upsert into cache
    await supabase
      .from("google_ratings")
      .upsert(row, { onConflict: "institution_id" });

    return new Response(JSON.stringify({
      rating: row.rating,
      review_count: row.review_count,
      maps_url: row.maps_url,
      cached: false,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("google-rating error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
