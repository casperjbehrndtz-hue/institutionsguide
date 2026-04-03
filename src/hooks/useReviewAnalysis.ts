import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { LocalizedText } from "@/lib/institutionScore";
import type { SupabaseReview } from "@/hooks/useReviews";

export interface ReviewTheme {
  theme: LocalizedText;
  sentiment: "positive" | "negative" | "neutral";
  mentionCount: number;
}

export interface ReviewAnalysis {
  themes: ReviewTheme[];
  overallSentiment: "positive" | "mixed" | "negative";
  summary: LocalizedText;
}

export function useReviewAnalysis(institutionId: string, reviews: SupabaseReview[]) {
  const [analysis, setAnalysis] = useState<ReviewAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const reviewCountRef = useRef(0);

  useEffect(() => {
    if (!supabase || !institutionId || reviews.length < 3) {
      setAnalysis(null);
      setIsLoading(false);
      return;
    }

    // Avoid refetching if review count hasn't changed
    if (reviewCountRef.current === reviews.length && analysis) return;
    reviewCountRef.current = reviews.length;

    let cancelled = false;

    async function fetchAnalysis() {
      setIsLoading(true);

      try {
        const payload = {
          institution_id: institutionId,
          reviews: reviews.map((r) => ({
            id: r.id,
            rating: r.rating,
            title: r.title,
            body: r.body,
            pros: r.pros,
            cons: r.cons,
            author_name: r.author_name,
            dimension_ratings: r.dimension_ratings,
            created_at: r.created_at,
          })),
        };

        const { data, error } = await supabase!.functions.invoke(
          "analyze-reviews",
          { body: payload },
        );

        if (cancelled) return;

        if (error || !data) {
          setAnalysis(null);
        } else {
          setAnalysis({
            themes: data.themes as ReviewTheme[],
            overallSentiment: data.overallSentiment as ReviewAnalysis["overallSentiment"],
            summary: data.summary as LocalizedText,
          });
        }
      } catch {
        if (!cancelled) setAnalysis(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchAnalysis();
    return () => { cancelled = true; };
  }, [institutionId, reviews.length]);

  return { analysis, isLoading };
}
