export function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3">
      <div className="skeleton h-5 w-3/4" />
      <div className="skeleton h-3 w-1/2" />
      <div className="skeleton h-3 w-1/3" />
    </div>
  );
}

export function SkeletonList({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4 space-y-2">
          <div className="skeleton h-8 w-8 rounded-full mx-auto" />
          <div className="skeleton h-4 w-3/4 mx-auto" />
          <div className="skeleton h-3 w-1/2 mx-auto" />
        </div>
      ))}
    </div>
  );
}
