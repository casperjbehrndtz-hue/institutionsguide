import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useReviews } from "@/hooks/useReviews";
import StarRating from "@/components/shared/StarRating";

interface ReviewSummaryV2Props {
  institutionId: string;
  onWriteReview?: () => void;
}

export default function ReviewSummaryV2({ institutionId, onWriteReview }: ReviewSummaryV2Props) {
  const { language } = useLanguage();
  const { reviews, loading } = useReviews(institutionId);

  const labels = {
    da: {
      title: "Anmeldelser",
      reviewCount: "anmeldelser",
      writeReview: "Skriv en anmeldelse",
      noReviews: "Ingen anmeldelser endnu",
      beFirst: "Vær den første til at anmelde denne institution.",
    },
    en: {
      title: "Reviews",
      reviewCount: "reviews",
      writeReview: "Write a review",
      noReviews: "No reviews yet",
      beFirst: "Be the first to review this institution.",
    },
  };

  const l = labels[language as keyof typeof labels] || labels.da;

  const summary = useMemo(() => {
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;

    for (const review of reviews) {
      distribution[review.rating] = (distribution[review.rating] || 0) + 1;
      sum += review.rating;
    }

    return {
      averageRating: reviews.length > 0 ? Math.round((sum / reviews.length) * 10) / 10 : 0,
      totalReviews: reviews.length,
      distribution: distribution as Record<1 | 2 | 3 | 4 | 5, number>,
    };
  }, [reviews]);

  if (loading) {
    return (
      <div className="card p-5 animate-pulse">
        <div className="h-6 bg-border rounded w-32 mb-4" />
        <div className="h-12 bg-border rounded w-20 mb-2" />
        <div className="h-4 bg-border rounded w-24" />
      </div>
    );
  }

  if (summary.totalReviews === 0) {
    return (
      <div className="card p-5">
        <h2 className="font-display text-lg font-semibold mb-3">{l.title}</h2>
        <p className="text-sm text-muted mb-1">{l.noReviews}</p>
        <p className="text-xs text-muted mb-4">{l.beFirst}</p>
        {onWriteReview && (
          <button
            onClick={onWriteReview}
            className="w-full py-2.5 px-4 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            {l.writeReview}
          </button>
        )}
      </div>
    );
  }

  const maxCount = Math.max(...Object.values(summary.distribution), 1);

  return (
    <div className="card p-5">
      <h2 className="font-display text-lg font-semibold mb-4">{l.title}</h2>

      <div className="flex items-start gap-6 mb-5">
        {/* Average rating */}
        <div className="text-center">
          <p className="font-mono text-4xl font-bold text-foreground">{summary.averageRating}</p>
          <StarRating rating={summary.averageRating} size="lg" />
          <p className="text-xs text-muted mt-1">
            {summary.totalReviews} {l.reviewCount}
          </p>
        </div>

        {/* Distribution bars */}
        <div className="flex-1 space-y-1.5">
          {([5, 4, 3, 2, 1] as const).map((star) => {
            const count = summary.distribution[star];
            const pct = summary.totalReviews > 0 ? Math.round((count / summary.totalReviews) * 100) : 0;
            const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-right font-mono">{star}</span>
                <span className="text-warning">&#9733;</span>
                <div className="flex-1 h-2.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-warning rounded-full transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <span className="w-8 text-right text-muted font-mono">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {onWriteReview && (
        <button
          onClick={onWriteReview}
          className="w-full py-2.5 px-4 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          {l.writeReview}
        </button>
      )}
    </div>
  );
}
