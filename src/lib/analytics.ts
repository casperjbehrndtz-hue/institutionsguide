/**
 * Typed PostHog event helpers for the conversion funnel.
 *
 * The full funnel from landing to value:
 *   landing_view  →  instant_answer_search  →  result_clicked
 *                 →  compare_added (×N)     →  compare_completed
 *
 * Each helper is a no-op when PostHog isn't loaded, so it's safe to call
 * unconditionally (e.g. before cookie consent is granted).
 */

type EventProps = Record<string, string | number | boolean | string[] | null | undefined>;

function track(event: string, props?: EventProps): void {
  if (typeof window === "undefined") return;
  const ph = window.posthog;
  if (ph?.capture) {
    try { ph.capture(event, props ?? {}); } catch { /* never throw from analytics */ }
  }
}

export const analytics = {
  /** Fired once per landing on the homepage. */
  landingView: (props: { utm_source?: string; utm_medium?: string; utm_campaign?: string } = {}) =>
    track("landing_view", props),

  /** User actively chose a location (typed, quick-pick, or geolocation). */
  instantAnswerSearch: (props: { method: "type" | "quickpick" | "geo"; kommune: string; postnummer?: string; category: string }) =>
    track("instant_answer_search", props),

  /** User clicked into an institution from any results list. */
  resultClicked: (props: { institutionId: string; surface: "instant_answer" | "national_top" | "kommune_page" | "category_page" | "compare_page"; rank?: number }) =>
    track("result_clicked", props),

  /** Institution added to the compare cart. */
  compareAdded: (props: { institutionId: string; cartSize: number; surface: string }) =>
    track("compare_added", props),

  /** User opened the side-by-side comparison page (compare flow completed). */
  compareCompleted: (props: { institutionIds: string[]; cartSize: number }) =>
    track("compare_completed", props),

  /** Kommune-intelligens: pin/leaderboard interactions. */
  milPresetUsed: (props: { presetId: string; track: "daycare" | "school" }) =>
    track("mil_preset_used", props),
  milKommunePinned: (props: { kommune: string; cartSize: number }) =>
    track("mil_kommune_pinned", props),
  milCompareOpened: (props: { kommuner: string[]; track: "daycare" | "school" }) =>
    track("mil_compare_opened", props),
};
