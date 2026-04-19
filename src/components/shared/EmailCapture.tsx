import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface EmailCaptureProps {
  compact?: boolean;
}

export default function EmailCapture({ compact = false }: EmailCaptureProps) {
  const { t, language } = useLanguage();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t.reviews.errorName);
      return;
    }

    setLoading(true);
    const trimmedEmail = email.trim();

    try {
      if (supabase) {
        const { error: dbError } = await supabase.from("email_alerts").insert({
          email: trimmedEmail,
          municipality: null,
          category: null,
          alert_type: "newsletter",
        });
        if (dbError && dbError.code !== "23505") {
          console.error("[EmailCapture] Supabase insert failed:", dbError);
          setError(t.emailCapture.error ?? "Noget gik galt. Prøv igen.");
          return;
        }
      } else {
        console.warn("[EmailCapture] Supabase not configured — check VITE_SUPABASE_URL");
        setError(t.emailCapture.error ?? "Noget gik galt. Prøv igen.");
        return;
      }
      setSubmitted(true);
    } catch (err) {
      console.error("[EmailCapture] Unexpected error:", err);
      setError(t.emailCapture.error ?? "Noget gik galt. Prøv igen.");
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    if (submitted) {
      return (
        <div className="flex items-center gap-2 py-2 text-sm text-success">
          <Check className="w-4 h-4" />
          <span className="font-medium">{t.emailCapture.success}</span>
        </div>
      );
    }
    return (
      <form onSubmit={handleSubmit} className="mt-4">
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.emailCapture.placeholder}
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors shrink-0 disabled:opacity-50"
          >
            {t.emailCapture.subscribe}
          </button>
        </div>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </form>
    );
  }

  if (submitted) {
    return (
      <div className="text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-success mb-3">
          {language === "da" ? "Tilmeldt" : "Subscribed"}
        </p>
        <p className="font-display text-2xl sm:text-3xl font-semibold text-foreground leading-tight">
          {t.emailCapture.success}
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted/60 mb-4">
        {language === "da" ? "Nyhedsbrev" : "Newsletter"}
      </p>
      <h2 className="font-display text-2xl sm:text-3xl font-semibold text-foreground tracking-tight leading-tight mb-3">
        {t.emailCapture.headline}
      </h2>
      <p className="text-muted text-base leading-relaxed mb-6">
        {t.emailCapture.subtitle}
      </p>

      <form onSubmit={handleSubmit} className="flex items-stretch gap-0 border-b-2 border-foreground/80 focus-within:border-accent transition-colors">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.emailCapture.placeholder}
          className="flex-1 min-w-0 py-3 text-base bg-transparent text-foreground placeholder:text-muted/60 focus:outline-none"
          aria-label={t.emailCapture.placeholder}
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-1.5 pl-4 text-sm font-medium text-accent hover:text-accent-light transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {t.emailCapture.subscribe}
          <span aria-hidden="true">→</span>
        </button>
      </form>
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
    </div>
  );
}
