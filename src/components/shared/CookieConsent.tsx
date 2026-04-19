import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { loadAnalytics, removeAnalytics, hasConsent } from "@/lib/initAnalytics";
import Button from "@/components/ui/Button";

function getInitialVisibility(): boolean {
  try {
    return !localStorage.getItem("cookie-consent");
  } catch {
    return true;
  }
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(getInitialVisibility);
  const { t } = useLanguage();

  // Load analytics on mount if user previously gave consent
  useEffect(() => {
    if (hasConsent()) {
      loadAnalytics();
    }
  }, []);

  function handleChoice(accepted: boolean) {
    localStorage.setItem("cookie-consent", accepted ? "accepted" : "declined");
    if (accepted) {
      loadAnalytics();
    } else {
      removeAnalytics();
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      data-cookie-consent
      className="fixed bottom-0 inset-x-0 z-50 bg-bg-card border-t border-border p-4 sm:p-5 animate-fade-in shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      role="alertdialog"
      aria-label="Cookie-samtykke"
      aria-modal="false"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
        <p className="text-sm text-foreground flex-1">
          {t.cookie.message}{" "}
          <Link to="/privatliv" className="text-primary underline hover:text-accent transition-colors">{t.footer.privacy.toLowerCase()}</Link>.
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleChoice(false)}
            aria-label={t.cookie.decline}
          >
            {t.cookie.decline}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleChoice(true)}
            aria-label={t.cookie.accept}
          >
            {t.cookie.accept}
          </Button>
        </div>
      </div>
    </div>
  );
}
