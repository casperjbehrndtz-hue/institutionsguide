import * as Sentry from "@sentry/react";

let initialized = false;

export function initErrorTracking() {
  if (initialized) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.5,
  });
  initialized = true;
}

export function captureException(
  error: Error,
  context?: Record<string, unknown>,
) {
  console.error("[error]", error, context);
  if (context) Sentry.setContext("extra", context);
  Sentry.captureException(error);
}

export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
) {
  const logFn =
    level === "error"
      ? console.error
      : level === "warning"
        ? console.warn
        : console.info;

  logFn(`[errorTracking] ${level}:`, message);
  Sentry.captureMessage(message, level);
}

export function setUser(id: string) {
  Sentry.setUser({ id });
}
