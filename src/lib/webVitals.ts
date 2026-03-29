import { onCLS, onINP, onLCP, onFCP, onTTFB } from "web-vitals";

function sendToAnalytics(metric: { name: string; value: number; id: string }) {
  // Send to PostHog if available
  if (typeof window !== "undefined" && (window as any).posthog) {
    (window as any).posthog.capture("web_vital", {
      metric_name: metric.name,
      metric_value: metric.value,
      metric_id: metric.id,
    });
  }
}

export function initWebVitals() {
  onCLS(sendToAnalytics);
  onINP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onFCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}
