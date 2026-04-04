interface Props {
  rating: number;
  reviewCount: number;
  mapsUrl: string | null;
  compact?: boolean;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = rating >= i ? 1 : rating >= i - 0.5 ? 0.5 : 0;
        return (
          <svg key={i} width="14" height="14" viewBox="0 0 20 20" className="shrink-0">
            {/* Empty star */}
            <path
              d="M10 1l2.47 5.01L18 6.94l-4 3.9.94 5.51L10 13.77l-4.94 2.58L6 10.84l-4-3.9 5.53-.93L10 1z"
              fill="#e0e0e0"
            />
            {/* Filled star (full or half) */}
            {fill > 0 && (
              <clipPath id={`star-clip-${i}`}>
                <rect x="0" y="0" width={fill === 1 ? 20 : 10} height="20" />
              </clipPath>
            )}
            {fill > 0 && (
              <path
                d="M10 1l2.47 5.01L18 6.94l-4 3.9.94 5.51L10 13.77l-4.94 2.58L6 10.84l-4-3.9 5.53-.93L10 1z"
                fill="#f4a940"
                clipPath={`url(#star-clip-${i})`}
              />
            )}
          </svg>
        );
      })}
    </div>
  );
}

export default function GoogleRatingBadge({ rating, reviewCount, mapsUrl, compact }: Props) {
  const content = (
    <div className={`inline-flex items-center gap-2 ${compact ? "gap-1.5" : "gap-2"}`}>
      {/* Google "G" icon */}
      <svg width="16" height="16" viewBox="0 0 24 24" className="shrink-0">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      <span className="font-mono text-sm font-medium text-foreground">{rating.toFixed(1)}</span>
      {!compact && <Stars rating={rating} />}
      <span className="text-xs text-muted">
        ({reviewCount})
      </span>
    </div>
  );

  if (mapsUrl) {
    return (
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
        title="Se anmeldelser på Google"
      >
        {content}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-muted shrink-0">
          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </a>
    );
  }

  return content;
}
