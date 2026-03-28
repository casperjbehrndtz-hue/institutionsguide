/**
 * Sentry-ready error tracking utility.
 *
 * Currently logs to the console. When you're ready to enable Sentry,
 * install the SDK and replace the implementations below:
 *
 *   npm install @sentry/react
 *
 *   import * as Sentry from "@sentry/react";
 *
 *   Sentry.init({ dsn: "https://<key>@sentry.io/<project>" });
 *
 *   export function captureException(error: Error, context?: Record<string, unknown>) {
 *     Sentry.captureException(error, { extra: context });
 *   }
 *
 *   export function captureMessage(message: string, level?: "info" | "warning" | "error") {
 *     Sentry.captureMessage(message, level);
 *   }
 */

export function captureException(
  error: Error,
  context?: Record<string, unknown>,
): void {
  // eslint-disable-next-line no-console
  console.error("[errorTracking] captureException", error, context);
}

export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
): void {
  const logFn =
    level === "error"
      ? console.error
      : level === "warning"
        ? console.warn
        : console.info;

  // eslint-disable-next-line no-console
  logFn(`[errorTracking] ${level}:`, message);
}
