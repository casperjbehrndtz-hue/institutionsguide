import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Review } from "@/lib/types";
import StarRating from "@/components/shared/StarRating";

interface ReviewCardProps {
  review: Review;
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const { t, language } = useLanguage();
  const [helpfulCount, setHelpfulCount] = useState(review.helpful);
  const [hasVoted, setHasVoted] = useState(false);

  const relationshipLabels: Record<string, Record<Review["relationship"], string>> = {
    da: { parent: "Forælder", employee: "Medarbejder", student: "Elev", other: "Andet" },
    en: { parent: "Parent", employee: "Employee", student: "Student", other: "Other" },
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === "da" ? "da-DK" : "en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleHelpful = () => {
    if (hasVoted) return;
    setHelpfulCount((c) => c + 1);
    setHasVoted(true);
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <StarRating rating={review.rating} />
          <h4 className="font-display font-semibold text-foreground mt-1">{review.title}</h4>
        </div>
        {review.verified && (
          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-success/10 text-success">
            {language === "da" ? "Verificeret" : "Verified"}
          </span>
        )}
      </div>

      <p className="text-sm text-muted mb-3 leading-relaxed">{review.body}</p>

      <div className="flex items-center justify-between text-xs text-muted">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{review.authorName}</span>
          <span className="px-1.5 py-0.5 rounded bg-border text-[10px]">
            {relationshipLabels[language][review.relationship]}
          </span>
          <span>{formatDate(review.createdAt)}</span>
        </div>
        <button
          onClick={handleHelpful}
          disabled={hasVoted}
          className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
            hasVoted
              ? "bg-primary/10 text-primary cursor-default"
              : "hover:bg-primary/5 text-muted hover:text-primary"
          }`}
        >
          <span>👍</span>
          <span>{t.reviews.helpful}</span>
          <span className="font-mono">({helpfulCount})</span>
        </button>
      </div>
    </div>
  );
}
