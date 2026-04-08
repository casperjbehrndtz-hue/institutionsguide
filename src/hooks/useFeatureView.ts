import { useEffect, useRef } from "react";

/**
 * Tracks when a gated feature section enters the viewport (post-unlock).
 * Fires a PostHog "gated_feature_viewed" event once per feature per page load.
 */
export function useFeatureView(
  feature: string,
  unlocked: boolean,
  metadata?: Record<string, string | null>,
) {
  const ref = useRef<HTMLDivElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (!unlocked || fired.current || !ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired.current) {
          fired.current = true;
          const ph = window.posthog;
          if (ph?.capture) ph.capture("gated_feature_viewed", { feature, ...metadata });
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [unlocked, feature, metadata]);

  return ref;
}
