interface StarRatingProps {
  rating: number;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export default function StarRating({ rating, size = "md" }: StarRatingProps) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className={`text-warning ${sizeClasses[size]}`} aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => {
        if (i < full) return <span key={i}>&#9733;</span>;
        if (i === full && half) return <span key={i}>&#9733;</span>;
        return <span key={i}>&#9734;</span>;
      })}
    </span>
  );
}
