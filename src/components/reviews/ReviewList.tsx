import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Review } from "@/lib/types";
import ReviewCard from "./ReviewCard";

type SortOption = "newest" | "highest" | "lowest" | "helpful";

interface ReviewListProps {
  reviews: Review[];
  comingSoon?: boolean;
}

const PAGE_SIZE = 5;

export default function ReviewList({ reviews, comingSoon = true }: ReviewListProps) {
  const { t } = useLanguage();
  const [sort, setSort] = useState<SortOption>("newest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (comingSoon) return null;

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "newest", label: t.reviews.sortNewest },
    { value: "highest", label: t.reviews.sortHighest },
    { value: "lowest", label: t.reviews.sortLowest },
    { value: "helpful", label: t.reviews.sortHelpful },
  ];

  const sorted = useMemo(() => {
    const copy = [...reviews];
    switch (sort) {
      case "newest":
        return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case "highest":
        return copy.sort((a, b) => b.rating - a.rating);
      case "lowest":
        return copy.sort((a, b) => a.rating - b.rating);
      case "helpful":
        return copy.sort((a, b) => b.helpful - a.helpful);
      default:
        return copy;
    }
  }, [reviews, sort]);

  if (reviews.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-muted">{t.reviews.empty}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sort controls */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted">{t.reviews.sortBy}:</span>
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
        <ReviewCard key={review.id} review={review} />
      ))}

      {/* Load more */}
      {visibleCount < sorted.length && (
        <button
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="w-full py-2.5 rounded-lg border border-border text-sm font-medium text-muted hover:text-foreground hover:border-primary/30 transition-colors"
        >
          {t.common.showMore} ({sorted.length - visibleCount} {t.reviews.remaining})
        </button>
      )}
    </div>
  );
}
