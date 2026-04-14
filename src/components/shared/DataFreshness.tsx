import { Calendar } from "lucide-react";
import { dataVersions, formatDataDate } from "@/lib/dataVersions";
import { useLanguage } from "@/contexts/LanguageContext";

/** Small badge showing when data was last updated. */
export default function DataFreshness({ lang }: { lang?: "da" | "en" } = {}) {
  const { language } = useLanguage();
  const effectiveLang = lang ?? language;
  const label = effectiveLang === "da" ? "Data opdateret" : "Data updated";
  return (
    <div className="flex items-center justify-center gap-1.5 text-xs text-muted py-2">
      <Calendar className="w-3.5 h-3.5" />
      <span>{label}: {formatDataDate(dataVersions.overall.lastUpdated, effectiveLang)}</span>
    </div>
  );
}
