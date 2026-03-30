import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type DimensionKey = "personale" | "mad" | "lokaler" | "udearealer" | "kommunikation";
export type DimensionRatings = Partial<Record<DimensionKey, number>>;

export const REVIEW_DIMENSIONS: { key: DimensionKey; da: string; en: string }[] = [
  { key: "personale", da: "Personale", en: "Staff" },
  { key: "mad", da: "Mad og måltider", en: "Food & meals" },
  { key: "lokaler", da: "Lokaler og indretning", en: "Facilities" },
  { key: "udearealer", da: "Udearealer", en: "Outdoor areas" },
  { key: "kommunikation", da: "Kommunikation", en: "Communication" },
];

export interface SupabaseReview {
  id: number;
  institution_id: string;
  author_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  pros: string | null;
  cons: string | null;
  child_age_group: string | null;
  dimension_ratings: DimensionRatings | null;
  verified: boolean;
  approved: boolean;
  created_at: string;
}

export function useReviews(institutionId: string) {
  const [reviews, setReviews] = useState<SupabaseReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchReviews() {
      try {
        const { data, error: fetchError } = await supabase!
          .from("reviews")
          .select("*")
          .eq("institution_id", institutionId)
          .eq("approved", true)
          .order("created_at", { ascending: false });

        if (cancelled) return;

        if (fetchError) {
          setError(fetchError.message);
        } else {
          setReviews((data as SupabaseReview[]) || []);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to fetch reviews");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchReviews();

    return () => {
      cancelled = true;
    };
  }, [institutionId]);

  return { reviews, loading, error };
}

interface SubmitReviewData {
  institution_id: string;
  author_name: string;
  rating: number;
  title?: string;
  body?: string;
  pros?: string;
  cons?: string;
  child_age_group?: string;
  dimension_ratings?: DimensionRatings;
}

export function useSubmitReview() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (data: SubmitReviewData) => {
    setError(null);
    setSubmitting(true);

    if (!supabase) {
      // Fallback: store locally
      try {
        const existing = JSON.parse(localStorage.getItem("ig_pending_reviews") || "[]");
        existing.push({ ...data, created_at: new Date().toISOString() });
        localStorage.setItem("ig_pending_reviews", JSON.stringify(existing));
        setSubmitted(true);
      } catch {
        setError("Could not save review locally");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      const dimensionRatings = data.dimension_ratings && Object.keys(data.dimension_ratings).length > 0
        ? data.dimension_ratings
        : null;

      const { error: insertError } = await supabase.from("reviews").insert({
        institution_id: data.institution_id,
        author_name: data.author_name,
        rating: data.rating,
        title: data.title || null,
        body: data.body || null,
        pros: data.pros || null,
        cons: data.cons || null,
        child_age_group: data.child_age_group || null,
        dimension_ratings: dimensionRatings,
      });

      if (insertError) {
        setError(insertError.message);
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setSubmitted(false);
    setError(null);
  }, []);

  return { submit, submitting, submitted, error, reset };
}
