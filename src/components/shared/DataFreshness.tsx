import { Calendar } from "lucide-react";

/** Small badge showing when data was last updated. */
export default function DataFreshness() {
  return (
    <div className="flex items-center justify-center gap-1.5 text-xs text-muted py-2">
      <Calendar className="w-3.5 h-3.5" />
      <span>Data opdateret: marts 2026</span>
    </div>
  );
}
