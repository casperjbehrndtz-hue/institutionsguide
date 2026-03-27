import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const choice = localStorage.getItem("cookie-consent");
    if (!choice) setVisible(true);
  }, []);

  function handleChoice(accepted: boolean) {
    localStorage.setItem("cookie-consent", accepted ? "accepted" : "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-50 bg-bg-card border-t border-border p-4 sm:p-5 animate-fade-in shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      role="dialog"
      aria-label="Cookie-samtykke"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
        <p className="text-sm text-foreground flex-1">
          {t.cookie.message}{" "}
          <Link to="/privatliv" className="text-primary underline hover:text-accent transition-colors">{t.footer.privacy.toLowerCase()}</Link>.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => handleChoice(false)}
            className="px-4 py-2 text-sm rounded-lg border border-border text-muted hover:bg-border/30 transition-colors min-h-[44px]"
            aria-label={t.cookie.decline}
          >
            {t.cookie.decline}
          </button>
          <button
            onClick={() => handleChoice(true)}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary-light transition-colors min-h-[44px]"
            aria-label={t.cookie.accept}
          >
            {t.cookie.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
