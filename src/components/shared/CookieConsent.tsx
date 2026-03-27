import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

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
      className="fixed bottom-0 inset-x-0 z-50 bg-[#1A2632] text-white p-4 sm:p-5 animate-fade-in"
      role="dialog"
      aria-label="Cookie-samtykke"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
        <p className="text-sm text-white/90 flex-1">
          Vi bruger cookies til at forbedre din oplevelse. Læs mere i vores{" "}
          <Link to="/privatliv" className="underline hover:text-white">privatlivspolitik</Link>.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => handleChoice(false)}
            className="px-4 py-2 text-sm rounded-lg border border-white/30 text-white/80 hover:bg-white/10 transition-colors min-h-[44px]"
            aria-label="Afvis cookies"
          >
            Afvis
          </button>
          <button
            onClick={() => handleChoice(true)}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-white font-medium hover:bg-primary-dark transition-colors min-h-[44px]"
            aria-label="Acceptér cookies"
          >
            Acceptér
          </button>
        </div>
      </div>
    </div>
  );
}
