import { MessageSquare } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ReviewSummary as ReviewSummaryType } from "@/lib/types";
import StarRating from "@/components/shared/StarRating";
import EmailCapture from "@/components/shared/EmailCapture";

interface ReviewSummaryProps {
  summary: ReviewSummaryType;
  onWriteReview: () => void;
  comingSoon?: boolean;
}

export default function ReviewSummaryComponent({ summary, onWriteReview, comingSoon = true }: ReviewSummaryProps) {
  const { t } = useLanguage();

  if (comingSoon) {
    return (
      <div className="card p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              {t.reviews.parentReviewsComingSoon}
            </h2>
            <p className="text-sm text-muted mt-1">
              {t.reviews.parentReviewsComingSoonMessage}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted mb-1">{t.reviews.getNotified}</p>
        <EmailCapture compact />
      </div>
    );
  }

  const maxCount = Math.max(...Object.values(summary.distribution), 1);

  return (
    <div className="card p-5">
      <h2 className="font-display text-lg font-semibold mb-4">{t.reviews.title}</h2>

      <div className="flex items-start gap-6 mb-5">
        {/* Average rating */}
        <div className="text-center">
          <p className="font-mono text-4xl font-bold text-foreground">{summary.averageRating}</p>
          <StarRating rating={summary.averageRating} size="lg" />
          <p className="text-xs text-muted mt-1">
            {summary.totalReviews} {t.reviews.reviewCount}
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

      <button
        onClick={onWriteReview}
        className="w-full py-2.5 px-4 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors"
      >
        {t.reviews.writeReview}
      </button>
    </div>
  );
}
