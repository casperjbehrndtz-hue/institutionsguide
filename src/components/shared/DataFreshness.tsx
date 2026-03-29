import { Calendar } from "lucide-react";
import { dataVersions, formatDataDate } from "@/lib/dataVersions";

/** Small badge showing when data was last updated. */
export default function DataFreshness({ lang = "da" }: { lang?: "da" | "en" }) {
  const label = lang === "da" ? "Data opdateret" : "Data updated";
  return (
    <div className="flex items-center justify-center gap-1.5 text-xs text-muted py-2">
      <Calendar className="w-3.5 h-3.5" />
      <span>{label}: {formatDataDate(dataVersions.overall.lastUpdated, lang)}</span>
    </div>
  );
}
