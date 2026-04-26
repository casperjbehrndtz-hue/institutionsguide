import { Component, type ReactNode, type ErrorInfo, Suspense } from "react";
import { AlertCircle, RotateCw } from "lucide-react";
import { captureException } from "@/lib/errorTracking";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: (error: Error, retry: () => void) => ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class InnerErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    captureException(error, { componentStack: errorInfo.componentStack ?? undefined });
  }
  reset = () => this.setState({ hasError: false, error: null });
  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error, this.reset);
    }
    return this.props.children;
  }
}

interface AsyncBoundaryProps {
  children: ReactNode;
  loading?: ReactNode;
  /** Render this when children render but the result is "empty" (use isEmpty prop). */
  empty?: ReactNode;
  /** Set to true to show the empty state instead of children. */
  isEmpty?: boolean;
  /** Custom error renderer. Defaults to a friendly retry card. */
  error?: (err: Error, retry: () => void) => ReactNode;
  /** Min height to prevent layout shift between states. */
  minHeight?: string;
}

function DefaultLoading({ minHeight }: { minHeight?: string }) {
  return (
    <div
      role="status"
      aria-label="Indlæser"
      className="rounded-xl border border-border bg-bg-card animate-pulse flex items-center justify-center text-sm text-muted"
      style={{ minHeight: minHeight ?? "120px" }}
    >
      Indlæser…
    </div>
  );
}

function DefaultEmpty() {
  return (
    <div className="rounded-xl border border-border bg-bg-card p-4 text-sm text-muted text-center">
      Ingen data fundet endnu.
    </div>
  );
}

function DefaultError({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 p-4 flex items-start gap-3">
      <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">Kunne ikke indlæse</p>
        <p className="text-xs text-muted mt-0.5 truncate">{error.message}</p>
      </div>
      <button
        onClick={retry}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-border bg-bg text-xs font-semibold text-foreground hover:bg-muted/10 transition-colors min-h-[32px] shrink-0"
      >
        <RotateCw className="w-3 h-3" />
        Prøv igen
      </button>
    </div>
  );
}

/**
 * Standardized async-zone wrapper. Combines Suspense (for lazy() / async data),
 * Error boundary (for thrown errors during render), and optional empty-state
 * (for "no data" UX). Use everywhere a section can fail or be empty.
 *
 *   <AsyncBoundary minHeight="320px" isEmpty={items.length === 0}>
 *     <List items={items} />
 *   </AsyncBoundary>
 */
export default function AsyncBoundary({
  children,
  loading,
  empty,
  isEmpty = false,
  error,
  minHeight,
}: AsyncBoundaryProps) {
  return (
    <InnerErrorBoundary
      fallback={(err, retry) => (error ? error(err, retry) : <DefaultError error={err} retry={retry} />)}
    >
      <Suspense fallback={loading ?? <DefaultLoading minHeight={minHeight} />}>
        {isEmpty ? (empty ?? <DefaultEmpty />) : children}
      </Suspense>
    </InnerErrorBoundary>
  );
}
