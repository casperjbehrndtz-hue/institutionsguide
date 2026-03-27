import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg p-6">
          <div className="card p-8 max-w-md text-center">
            <h1 className="font-display text-2xl font-bold text-foreground mb-4">
              Something went wrong
            </h1>
            <p className="text-muted mb-6">
              An unexpected error occurred. Try reloading the page.
            </p>
            <p className="text-sm text-muted/60 font-mono mb-6">
              {this.state.error?.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary-light transition-colors min-h-[44px]"
              aria-label="Reload page"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
