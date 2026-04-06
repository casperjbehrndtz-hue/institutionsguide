import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface GoogleRating {
  rating: number;
  review_count: number;
  maps_url: string | null;
}

const cache = new Map<string, GoogleRating | null>();

export function useGoogleRating(
  institutionId: string | undefined,
  name: string | undefined,
  address: string | undefined,
): { rating: GoogleRating | null; loading: boolean } {
  const [rating, setRating] = useState<GoogleRating | null>(
    institutionId ? cache.get(institutionId) ?? null : null,
  );
  const [loading, setLoading] = useState(!cache.has(institutionId ?? ""));

  useEffect(() => {
    if (!institutionId || !name || !supabase) {
      queueMicrotask(() => setLoading(false));
      return;
    }

    // Already cached in memory
    if (cache.has(institutionId)) {
      queueMicrotask(() => {
        setRating(cache.get(institutionId) ?? null);
        setLoading(false);
      });
      return;
    }

    let cancelled = false;

    async function fetchRating() {
      // 1. Try reading from Supabase cache first (fast, no API cost)
      const { data: cached } = await supabase!
        .from("google_ratings")
        .select("rating, review_count, maps_url, fetched_at")
        .eq("institution_id", institutionId)
        .single();

      if (cached?.rating != null) {
        const age = Date.now() - new Date(cached.fetched_at).getTime();
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        if (age < maxAge) {
          const result: GoogleRating = {
            rating: cached.rating,
            review_count: cached.review_count,
            maps_url: cached.maps_url,
          };
          cache.set(institutionId!, result);
          if (!cancelled) {
            setRating(result);
            setLoading(false);
          }
          return;
        }
      }

      // 2. Call edge function to fetch from Google (costs API credit)
      try {
        const res = await supabase!.functions.invoke("google-rating", {
          body: { institution_id: institutionId, name, address },
        });

        if (res.data?.rating != null) {
          const result: GoogleRating = {
            rating: res.data.rating,
            review_count: res.data.review_count,
            maps_url: res.data.maps_url,
          };
          cache.set(institutionId!, result);
          if (!cancelled) {
            setRating(result);
          }
        } else {
          cache.set(institutionId!, null);
        }
      } catch {
        cache.set(institutionId!, null);
      }

      if (!cancelled) setLoading(false);
    }

    fetchRating();
    return () => { cancelled = true; };
  }, [institutionId, name, address]);

  return { rating, loading };
}
