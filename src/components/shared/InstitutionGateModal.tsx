import { useState, useEffect, useCallback, useRef } from "react";
import { Lock, Check, X, Loader2 } from "lucide-react";
import { setInstitutionUnlocked, setSuiteEmail, getSuiteEmail } from "@/lib/institutionGate";
import { useFocusTrap } from "@/hooks/useFocusTrap";

const CAPTURE_URL =
  "https://xahajjypbnrpitzdnpjg.supabase.co/functions/v1/capture-suite-lead";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  institutionName: string;
  open: boolean;
  onClose: () => void;
  onUnlocked: () => void;
}

const FREE_ITEMS = ["Navn og type", "Adresse og kommune", "Overordnet prisniveau"];
const GATED_ITEMS = [
  "Faktisk månedspris",
  "Normering med udvikling over tid",
  "Tilsynsrapporter og påtaler",
  "AI-kvalitetsvurdering",
];

export default function InstitutionGateModal({
  institutionName,
  open,
  onClose,
  onUnlocked,
}: Props) {
  const [email, setEmail] = useState(() => getSuiteEmail() || "");
  const [marketing, setMarketing] = useState(false);
  const [crossSell, setCrossSell] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const trapRef = useFocusTrap<HTMLDivElement>();

  // Track gate rejection (user saw modal, closed without submitting)
  const trackRejection = useCallback(() => {
    const ph = window.posthog;
    if (ph?.capture) ph.capture("gate_rejection", { institution: institutionName });
  }, [institutionName]);

  const handleClose = useCallback(() => {
    trackRejection();
    onClose();
  }, [trackRejection, onClose]);

  // Track gate impression + focus input when opened
  useEffect(() => {
    if (open) {
      const ph = window.posthog;
      if (ph?.capture) ph.capture("gate_impression", { institution: institutionName });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, institutionName]);

  // Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    },
    [handleClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Indtast venligst din email");
      return;
    }
    if (!EMAIL_RE.test(trimmed)) {
      setError("Indtast en gyldig email-adresse");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(CAPTURE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          source: "institutionsguide",
          gate: "institution_profile",
          consent_marketing: marketing,
          consent_cross_sell: crossSell,
          metadata: { institution: institutionName },
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `HTTP ${res.status}`);
      }

      const ph = window.posthog;
      if (ph?.capture) {
        ph.capture("gate_email_submitted", { institution: institutionName, consent_marketing: marketing });
        ph.capture("gate_unlocked", { institution: institutionName });
      }
      setSuiteEmail(trimmed);
      setInstitutionUnlocked();
      onUnlocked();
      onClose();
    } catch (err) {
      console.error("Gate capture failed:", err);
      // Still unlock on failure — don't block the user
      const ph = window.posthog;
      if (ph?.capture) {
        ph.capture("gate_email_submitted", { institution: institutionName, consent_marketing: marketing, fallback: true });
        ph.capture("gate_unlocked", { institution: institutionName, fallback: true });
      }
      setSuiteEmail(trimmed);
      setInstitutionUnlocked();
      onUnlocked();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) handleClose();
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Se den fulde profil for ${institutionName}`}
    >
      <div ref={trapRef} className="bg-white dark:bg-card sm:rounded-2xl shadow-2xl w-full h-full sm:h-auto sm:max-w-md relative animate-in fade-in zoom-in-95 duration-200 overflow-y-auto">
        {/* Close button */}
        <button
          onClick={handleClose}
          data-dismiss
          className="absolute top-3 right-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label="Luk"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground leading-tight">
              Se den fulde profil for{" "}
              <span className="text-primary">{institutionName}</span>
            </h2>
            <p className="text-sm text-muted mt-1.5">
              Gratis — vi beder kun om din email
            </p>
          </div>

          {/* Two-column: free vs gated */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div>
              <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">
                Det har du allerede set
              </p>
              <ul className="space-y-1.5">
                {FREE_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-1.5 text-xs text-foreground">
                    <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-primary uppercase tracking-wide mb-2">
                Lås op gratis
              </p>
              <ul className="space-y-1.5">
                {GATED_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-1.5 text-xs text-foreground">
                    <Lock className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <input
                ref={inputRef}
                type="email"
                placeholder="din@email.dk"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                className="w-full px-4 py-3 rounded-lg border border-border bg-white dark:bg-background text-foreground placeholder:text-muted/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
                autoComplete="email"
                disabled={loading}
              />
              {error && (
                <p className="text-xs text-red-500 mt-1">{error}</p>
              )}
            </div>

            {/* Consent */}
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => { setMarketing(e.target.checked); setCrossSell(e.target.checked); }}
                className="mt-0.5 accent-primary"
              />
              <span className="text-[11px] text-muted leading-tight">
                Send mig relevante tips om børnepasning og familieøkonomi
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2 min-h-[48px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Vent venligst...
                </>
              ) : (
                "Se den fulde profil"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
