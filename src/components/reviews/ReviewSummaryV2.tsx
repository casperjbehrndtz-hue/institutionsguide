import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useReviews, REVIEW_DIMENSIONS, type DimensionKey } from "@/hooks/useReviews";
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

    // Track dimension sums and counts
    const dimSums: Record<DimensionKey, number> = { personale: 0, mad: 0, lokaler: 0, udearealer: 0, kommunikation: 0 };
    const dimCounts: Record<DimensionKey, number> = { personale: 0, mad: 0, lokaler: 0, udearealer: 0, kommunikation: 0 };

    for (const review of reviews) {
      distribution[review.rating] = (distribution[review.rating] || 0) + 1;
      sum += review.rating;

      if (review.dimension_ratings) {
        for (const dim of REVIEW_DIMENSIONS) {
          const val = review.dimension_ratings[dim.key];
          if (val != null) {
            dimSums[dim.key] += val;
            dimCounts[dim.key] += 1;
          }
        }
      }
    }

    // Only include dimensions with 2+ ratings
    const dimensionAverages: { key: DimensionKey; avg: number; count: number }[] = [];
    for (const dim of REVIEW_DIMENSIONS) {
      if (dimCounts[dim.key] >= 2) {
        dimensionAverages.push({
          key: dim.key,
          avg: Math.round((dimSums[dim.key] / dimCounts[dim.key]) * 10) / 10,
          count: dimCounts[dim.key],
        });
      }
    }

    return {
      averageRating: reviews.length > 0 ? Math.round((sum / reviews.length) * 10) / 10 : 0,
      totalReviews: reviews.length,
      distribution: distribution as Record<1 | 2 | 3 | 4 | 5, number>,
      dimensionAverages,
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

      {/* Dimension averages */}
      {summary.dimensionAverages.length > 0 && (
        <div className="mb-5 space-y-1.5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            {language === "da" ? "Vurdering pr. dimension" : "Ratings by dimension"}
          </h3>
          {summary.dimensionAverages.map((dim) => {
            const dimDef = REVIEW_DIMENSIONS.find((d) => d.key === dim.key);
            const label = dimDef ? (language === "da" ? dimDef.da : dimDef.en) : dim.key;
            const barWidth = (dim.avg / 5) * 100;
            return (
              <div key={dim.key} className="flex items-center gap-2 text-xs">
                <span className="w-[110px] shrink-0 truncate text-muted">{label}</span>
                <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <span className="w-7 text-right font-mono text-muted">{dim.avg}</span>
              </div>
            );
          })}
        </div>
      )}

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
