import { useState, useMemo } from "react";
import { ShieldCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useReviews, type SupabaseReview } from "@/hooks/useReviews";
import StarRating from "@/components/shared/StarRating";

type SortOption = "newest" | "highest" | "lowest";

interface ReviewListV2Props {
  institutionId: string;
}

const PAGE_SIZE = 5;

function ReviewCardV2({ review }: { review: SupabaseReview }) {
  const { language } = useLanguage();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === "da" ? "da-DK" : "en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <StarRating rating={review.rating} />
          {review.title && (
            <h4 className="font-display font-semibold text-foreground mt-1">{review.title}</h4>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {review.child_age_group && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
              {review.child_age_group} {language === "da" ? "år" : "yrs"}
            </span>
          )}
          {review.verified && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-success/10 text-success">
              <ShieldCheck className="w-3 h-3" />
              {language === "da" ? "Verificeret" : "Verified"}
            </span>
          )}
        </div>
      </div>

      {review.body && (
        <p className="text-sm text-muted mb-3 leading-relaxed">{review.body}</p>
      )}

      {(review.pros || review.cons) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {review.pros && (
            <div className="text-sm">
              <span className="font-medium text-success">+</span>{" "}
              <span className="text-muted">{review.pros}</span>
            </div>
          )}
          {review.cons && (
            <div className="text-sm">
              <span className="font-medium text-destructive">&minus;</span>{" "}
              <span className="text-muted">{review.cons}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="font-medium text-foreground">{review.author_name}</span>
        <span>{formatDate(review.created_at)}</span>
      </div>
    </div>
  );
}

export default function ReviewListV2({ institutionId }: ReviewListV2Props) {
  const { language } = useLanguage();
  const { reviews, loading, error } = useReviews(institutionId);
  const [sort, setSort] = useState<SortOption>("newest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const labels = {
    da: {
      sortBy: "Sortér efter",
      newest: "Nyeste",
      highest: "Højeste",
      lowest: "Laveste",
      empty: "Vær den første til at anmelde",
      loading: "Indlæser anmeldelser...",
      error: "Kunne ikke hente anmeldelser",
      showMore: "Vis flere",
      remaining: "tilbage",
    },
    en: {
      sortBy: "Sort by",
      newest: "Newest",
      highest: "Highest",
      lowest: "Lowest",
      empty: "Be the first to review",
      loading: "Loading reviews...",
      error: "Could not load reviews",
      showMore: "Show more",
      remaining: "remaining",
    },
  };

  const l = labels[language as keyof typeof labels] || labels.da;

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "newest", label: l.newest },
    { value: "highest", label: l.highest },
    { value: "lowest", label: l.lowest },
  ];

  const sorted = useMemo(() => {
    const copy = [...reviews];
    switch (sort) {
      case "newest":
        return copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case "highest":
        return copy.sort((a, b) => b.rating - a.rating);
      case "lowest":
        return copy.sort((a, b) => a.rating - b.rating);
      default:
        return copy;
    }
  }, [reviews, sort]);

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <p className="text-muted text-sm">{l.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="text-muted text-sm">{l.error}</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-muted">{l.empty}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sort controls */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted">{l.sortBy}:</span>
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as SortOption);
            setVisibleCount(PAGE_SIZE);
          }}
          className="px-2 py-1 rounded-lg border border-border bg-bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Review cards */}
      {sorted.slice(0, visibleCount).map((review) => (
        <ReviewCardV2 key={review.id} review={review} />
      ))}

      {/* Load more */}
      {visibleCount < sorted.length && (
        <button
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="w-full py-2.5 rounded-lg border border-border text-sm font-medium text-muted hover:text-foreground hover:border-primary/30 transition-colors"
        >
          {l.showMore} ({sorted.length - visibleCount} {l.remaining})
        </button>
      )}
    </div>
  );
}
