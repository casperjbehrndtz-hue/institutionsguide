/** Reusable skeleton loading screens for major page types. */

export function SkeletonHero() {
  return (
    <div className="max-w-4xl mx-auto px-4 pt-12 pb-8 space-y-4">
      <div className="skeleton h-10 w-2/3 mx-auto" />
      <div className="skeleton h-5 w-1/2 mx-auto" />
      <div className="skeleton h-4 w-1/3 mx-auto" />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3">
      <div className="skeleton h-32 w-full rounded-lg" />
      <div className="skeleton h-5 w-3/4" />
      <div className="skeleton h-3 w-1/2" />
      <div className="skeleton h-4 w-1/4" />
    </div>
  );
}

export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="flex gap-4 p-4 border-b border-border">
          <div className="skeleton h-4 w-1/4" />
          <div className="skeleton h-4 w-1/6" />
          <div className="skeleton h-4 w-1/6" />
          <div className="skeleton h-4 w-1/6" />
          <div className="skeleton h-4 w-1/6" />
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4 border-b border-border last:border-0">
            <div className="skeleton h-4 w-1/4" />
            <div className="skeleton h-4 w-1/6" />
            <div className="skeleton h-4 w-1/6" />
            <div className="skeleton h-4 w-1/6" />
            <div className="skeleton h-4 w-1/6" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonDetail() {
  return (
    <div className="max-w-4xl mx-auto px-4 pt-8 space-y-6">
      {/* Breadcrumb */}
      <div className="skeleton h-4 w-1/3" />
      {/* Title area */}
      <div className="space-y-3">
        <div className="skeleton h-9 w-2/3" />
        <div className="skeleton h-5 w-1/2" />
        <div className="flex gap-2">
          <div className="skeleton h-6 w-20 rounded-full" />
          <div className="skeleton h-6 w-24 rounded-full" />
        </div>
      </div>
      {/* Info cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4 space-y-2">
            <div className="skeleton h-3 w-1/2" />
            <div className="skeleton h-6 w-3/4" />
          </div>
        ))}
      </div>
      {/* Content blocks */}
      <div className="card p-6 space-y-3">
        <div className="skeleton h-5 w-1/4" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-5/6" />
        <div className="skeleton h-4 w-4/6" />
      </div>
      <div className="card p-6 space-y-3">
        <div className="skeleton h-5 w-1/3" />
        <div className="skeleton h-40 w-full rounded-lg" />
      </div>
    </div>
  );
}
