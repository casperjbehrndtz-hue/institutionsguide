import { AlertTriangle, Info, CheckCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { InsightFlag, FlagSeverity } from "@/lib/insights";

interface Props {
  flags: InsightFlag[];
}

const SEVERITY_CONFIG: Record<FlagSeverity, { icon: typeof AlertTriangle; bg: string; border: string; text: string; label: Record<string, string> }> = {
  red: {
    icon: AlertTriangle,
    bg: "bg-destructive/5",
    border: "border-destructive/20",
    text: "text-destructive",
    label: { da: "Advarsel", en: "Warning" },
  },
  yellow: {
    icon: Info,
    bg: "bg-warning/5",
    border: "border-warning/20",
    text: "text-warning",
    label: { da: "Opmærksomhedspunkt", en: "Point of attention" },
  },
  green: {
    icon: CheckCircle,
    bg: "bg-success/5",
    border: "border-success/20",
    text: "text-success",
    label: { da: "Styrke", en: "Strength" },
  },
};

export default function InsightFlags({ flags }: Props) {
  const { language } = useLanguage();

  if (flags.length === 0) return null;

  const redFlags = flags.filter((f) => f.severity === "red");
  const yellowFlags = flags.filter((f) => f.severity === "yellow");
  const greenFlags = flags.filter((f) => f.severity === "green");

  return (
    <div className="space-y-3">
      {/* Red flags first — loss aversion */}
      {redFlags.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-destructive uppercase tracking-wider">
            {language === "da" ? `${redFlags.length} advarsel${redFlags.length > 1 ? "er" : ""}` : `${redFlags.length} warning${redFlags.length > 1 ? "s" : ""}`}
          </p>
          {redFlags.map((flag) => (
            <FlagCard key={flag.metric} flag={flag} lang={language} />
          ))}
        </div>
      )}

      {yellowFlags.length > 0 && (
        <div className="space-y-2">
          {yellowFlags.map((flag) => (
            <FlagCard key={flag.metric} flag={flag} lang={language} />
          ))}
        </div>
      )}

      {greenFlags.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-success uppercase tracking-wider">
            {language === "da" ? "Styrker" : "Strengths"}
          </p>
          {greenFlags.map((flag) => (
            <FlagCard key={flag.metric} flag={flag} lang={language} />
          ))}
        </div>
      )}
    </div>
  );
}

function FlagCard({ flag, lang }: { flag: InsightFlag; lang: "da" | "en" }) {
  const config = SEVERITY_CONFIG[flag.severity];
  const Icon = config.icon;

  return (
    <div className={`${config.bg} border ${config.border} rounded-lg p-3`}>
      <div className="flex items-start gap-2.5">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.text}`} />
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${config.text}`}>
            {flag.title[lang]}
          </p>
          <p className="text-xs text-muted leading-relaxed mt-0.5">
            {flag.detail[lang]}
          </p>
        </div>
      </div>
    </div>
  );
}
