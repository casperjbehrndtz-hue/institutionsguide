import { MapPin } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface GeoModalProps {
  onAccept: () => void;
  onDismiss: () => void;
}

export function GeoModal({ onAccept, onDismiss }: GeoModalProps) {
  const { language } = useLanguage();
  const trapRef = useFocusTrap<HTMLDivElement>();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="geo-modal-title"
      onClick={onDismiss}
    >
      <div
        ref={trapRef}
        className="bg-bg-card rounded-xl shadow-xl p-6 max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <p id="geo-modal-title" className="text-foreground font-medium">
            {language === "da" ? "Find institutioner nær dig" : "Find institutions near you"}
          </p>
        </div>
        <p className="text-sm text-muted mb-5 leading-relaxed">
          {language === "da"
            ? "Din placering behandles kun lokalt i din browser og sendes ikke til vores servere. Vi bruger den udelukkende til at vise afstand til institutioner."
            : "Your location is processed locally in your browser only and is not sent to our servers. We use it solely to show distance to institutions."}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onDismiss}
            data-dismiss
            className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-border/30 transition-colors min-h-[44px]"
          >
            {language === "da" ? "Nej tak" : "No thanks"}
          </button>
          <button
            onClick={onAccept}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary-light transition-colors min-h-[44px]"
          >
            {language === "da" ? "Tillad placering" : "Allow location"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface GeoErrorToastProps {
  message: string;
  onDismiss: () => void;
  onRetry: () => void;
}

export function GeoErrorToast({ message, onDismiss, onRetry }: GeoErrorToastProps) {
  const { language } = useLanguage();
  return (
    <div className="fixed bottom-6 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md z-50 bg-destructive text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-4">
      <p>{message}</p>
      <div className="flex gap-3 mt-2">
        <button onClick={onRetry} className="underline font-semibold">
          {language === "da" ? "Prøv igen" : "Try again"}
        </button>
        <button onClick={onDismiss} className="underline opacity-80">
          OK
        </button>
      </div>
    </div>
  );
}
