import { Component, type ReactNode, type ErrorInfo } from "react";
import { captureException } from "@/lib/errorTracking";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Detect current language from localStorage or <html lang>.
 * The ErrorBoundary sits *above* LanguageProvider so it cannot use useLanguage().
 */
function detectLanguage(): "da" | "en" {
  try {
    const stored = localStorage.getItem("institutionsguide_language");
    if (stored === "en") return "en";
  } catch {
    /* localStorage unavailable */
  }
  if (document.documentElement.lang === "en") return "en";
  return "da";
}

const messages = {
  da: {
    title: "Noget gik galt",
    body: "Der opstod en uventet fejl. Prøv at genindlæse siden.",
    tryAgain: "Prøv igen",
    reload: "Genindlæs",
  },
  en: {
    title: "Something went wrong",
    body: "An unexpected error occurred. Try reloading the page.",
    tryAgain: "Try again",
    reload: "Reload",
  },
};

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Auto-reload on chunk load failures (stale deploy cache)
    if (error.message?.includes("dynamically imported module") || error.message?.includes("Loading chunk")) {
      window.location.reload();
      return;
    }
    captureException(error, {
      componentStack: errorInfo.componentStack ?? undefined,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const lang = detectLanguage();
      const m = messages[lang];

      return (
        <div className="min-h-screen flex items-center justify-center bg-bg p-6">
          <div className="card p-8 max-w-md text-center">
            <h1 className="font-display text-2xl font-bold text-foreground mb-4">
              {m.title}
            </h1>
            <p className="text-muted mb-6">{m.body}</p>
            <p className="text-sm text-muted/60 font-mono mb-6">
              {this.state.error?.message}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary-light transition-colors min-h-[44px]"
                aria-label={m.tryAgain}
              >
                {m.tryAgain}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 border border-border rounded-lg font-medium text-foreground hover:bg-border/30 transition-colors min-h-[44px]"
                aria-label={m.reload}
              >
                {m.reload}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
