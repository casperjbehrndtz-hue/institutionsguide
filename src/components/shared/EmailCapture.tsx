import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Mail } from "lucide-react";

interface EmailCaptureProps {
  compact?: boolean;
}

export default function EmailCapture({ compact = false }: EmailCaptureProps) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t.reviews.errorName); // reuse a generic error
      return;
    }

    // Save to localStorage
    const existing = JSON.parse(localStorage.getItem("ig_email_subscribers") || "[]");
    if (!existing.includes(email)) {
      existing.push(email);
      localStorage.setItem("ig_email_subscribers", JSON.stringify(existing));
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className={`flex items-center gap-2 ${compact ? "py-2" : "card p-5"} text-success`}>
        <Mail className="w-4 h-4" />
        <span className="text-sm font-medium">{t.emailCapture.success}</span>
      </div>
    );
  }

  if (compact) {
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
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
          >
            {t.emailCapture.subscribe}
          </button>
        </div>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </form>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Mail className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-display text-base font-semibold text-foreground">{t.emailCapture.headline}</h3>
          <p className="text-sm text-muted mt-0.5">{t.emailCapture.subtitle}</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.emailCapture.placeholder}
          className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
        >
          {t.emailCapture.subscribe}
        </button>
      </form>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
