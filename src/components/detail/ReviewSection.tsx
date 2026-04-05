import { useState } from "react";
import { useReviews } from "@/hooks/useReviews";
import { useReviewAnalysis } from "@/hooks/useReviewAnalysis";
import ReviewSummaryV2 from "@/components/reviews/ReviewSummaryV2";
import ReviewThemes from "@/components/reviews/ReviewThemes";
import ReviewFormV2 from "@/components/reviews/ReviewFormV2";
import ReviewListV2 from "@/components/reviews/ReviewListV2";

export default function ReviewSection({ institutionId }: { institutionId: string }) {
  const [showForm, setShowForm] = useState(false);
  const { reviews } = useReviews(institutionId);
  const { analysis } = useReviewAnalysis(institutionId, reviews);

  return (
    <div className="space-y-6">
      <ReviewSummaryV2
        institutionId={institutionId}
        onWriteReview={() => setShowForm((v) => !v)}
      />
      {analysis && <ReviewThemes analysis={analysis} />}
      {showForm && (
        <ReviewFormV2
          institutionId={institutionId}
          onClose={() => setShowForm(false)}
        />
      )}
      <ReviewListV2 institutionId={institutionId} />
    </div>
  );
}
