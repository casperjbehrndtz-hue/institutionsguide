/**
 * Conditionally loads PostHog and Umami analytics ONLY after cookie consent.
 * Called from CookieConsent when the user accepts cookies,
 * and on app init if consent was previously given.
 */

let analyticsLoaded = false;

export function hasConsent(): boolean {
  try {
    return localStorage.getItem("cookie-consent") === "accepted";
  } catch {
    return false;
  }
}

export function loadAnalytics(): void {
  if (analyticsLoaded) return;
  if (!hasConsent()) return;
  analyticsLoaded = true;

  // ── Umami ──
  const umamiId = import.meta.env.VITE_UMAMI_ID;
  if (umamiId && !umamiId.includes("VITE_")) {
    const s = document.createElement("script");
    s.defer = true;
    s.src = "https://cloud.umami.is/script.js";
    s.dataset.websiteId = umamiId;
    document.head.appendChild(s);
  }

  // ── PostHog ──
  const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
  if (posthogKey && !posthogKey.includes("VITE_")) {
    const s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src = "https://eu-assets.i.posthog.com/static/array.js";
    s.onload = () => {
      const ph = window.posthog;
      if (ph && typeof ph.init === "function") {
        ph.init(posthogKey, {
          api_host: "https://eu.i.posthog.com",
          persistence: "memory",
          autocapture: true,
          capture_pageview: true,
          capture_pageleave: true,
          disable_session_recording: true,
        });
      }
    };
    document.head.appendChild(s);
  }
}

/** Remove analytics if user later declines (best-effort). */
export function removeAnalytics(): void {
  // Opt-out PostHog if loaded
  const ph = window.posthog;
  if (ph && typeof ph.opt_out_capturing === "function") {
    ph.opt_out_capturing();
  }
  analyticsLoaded = false;
}
