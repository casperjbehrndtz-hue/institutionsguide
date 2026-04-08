import { useEffect, useRef } from "react";

/**
 * Tracks scroll depth at 25/50/75/100% thresholds via PostHog.
 * Fires each threshold at most once per page load.
 */
export function useScrollDepth(metadata?: Record<string, string | number | null>) {
  const fired = useRef(new Set<number>());

  useEffect(() => {
    fired.current.clear();
    const thresholds = [25, 50, 75, 100];

    const handler = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = Math.round((scrollTop / docHeight) * 100);

      for (const t of thresholds) {
        if (pct >= t && !fired.current.has(t)) {
          fired.current.add(t);
          const ph = window.posthog;
          if (ph?.capture) ph.capture("scroll_depth", { depth: t, ...metadata });
        }
      }
    };

    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [metadata]);
}
