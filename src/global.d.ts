/** Minimal PostHog typings for window.posthog accessed at runtime */
interface PostHogLike {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  identify: (id: string, properties?: Record<string, unknown>) => void;
  init: (apiKey: string, config?: Record<string, unknown>) => void;
  opt_out_capturing: () => void;
}

interface Window {
  posthog?: PostHogLike;
}
