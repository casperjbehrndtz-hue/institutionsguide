import { Lock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  unlocked: boolean;
  onRequestUnlock: () => void;
  children: React.ReactNode;
  className?: string;
}

export default function GatedSection({ unlocked, onRequestUnlock, children, className = "" }: Props) {
  const { language } = useLanguage();
  const isDa = language === "da";

  if (unlocked) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Blurred content */}
      <div className="select-none" style={{ filter: "blur(8px)", pointerEvents: "none" }} aria-hidden="true">
        {children}
      </div>

      {/* Overlay */}
      <button
        onClick={onRequestUnlock}
        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/60 dark:bg-[#0f0f23]/60 rounded-xl cursor-pointer transition-colors hover:bg-white/70 dark:hover:bg-[#0f0f23]/70"
        aria-label={isDa ? "Lås op med email" : "Unlock with email"}
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
          <Lock className="w-5 h-5 text-primary" />
        </div>
        <span className="text-sm font-semibold text-foreground">
          {isDa ? "Lås op med email" : "Unlock with email"}
        </span>
        <span className="text-xs text-muted">{isDa ? "Gratis — intet kreditkort" : "Free — no credit card"}</span>
      </button>
    </div>
  );
}
