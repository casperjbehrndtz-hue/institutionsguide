import { Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { ReviewAnalysis, ReviewTheme } from "@/hooks/useReviewAnalysis";

interface ReviewThemesProps {
  analysis: ReviewAnalysis;
}

const sentimentColors = {
  positive: { bg: "bg-success/10", text: "text-success", border: "border-success/20" },
  negative: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20" },
  neutral: { bg: "bg-muted/10", text: "text-muted", border: "border-border" },
  mixed: { bg: "bg-warning/10", text: "text-warning", border: "border-warning/20" },
};

const sentimentLabels = {
  positive: { da: "Overvejende positiv", en: "Mostly positive" },
  mixed: { da: "Blandet", en: "Mixed" },
  negative: { da: "Overvejende negativ", en: "Mostly negative" },
};

function SentimentBadge({ sentiment, language }: { sentiment: ReviewAnalysis["overallSentiment"]; language: string }) {
  const colors = sentimentColors[sentiment];
  const label = sentimentLabels[sentiment];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {language === "da" ? label.da : label.en}
    </span>
  );
}

function ThemeChip({ theme, language }: { theme: ReviewTheme; language: string }) {
  const colors = sentimentColors[theme.sentiment];
  const label = language === "da" ? theme.theme.da : theme.theme.en;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${colors.bg} ${colors.text} ${colors.border}`}>
      {label}
      <span className="font-mono text-[10px] opacity-70">{theme.mentionCount}x</span>
    </span>
  );
}

export default function ReviewThemes({ analysis }: ReviewThemesProps) {
  const { language } = useLanguage();

  const summary = language === "da" ? analysis.summary.da : analysis.summary.en;

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <SentimentBadge sentiment={analysis.overallSentiment} language={language} />
        <span className="inline-flex items-center gap-1 text-[10px] text-muted">
          <Sparkles className="w-3 h-3" />
          AI-analyseret
        </span>
      </div>

      <p className="text-sm text-muted leading-relaxed">{summary}</p>

      {analysis.themes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {analysis.themes.map((theme, i) => (
            <ThemeChip key={i} theme={theme} language={language} />
          ))}
        </div>
      )}
    </div>
  );
}
