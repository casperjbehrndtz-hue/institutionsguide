import { useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { AgeGroup, SortKey } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  ageGroup: AgeGroup;
  onAgeGroupChange: (age: AgeGroup) => void;
  ageOptions: { value: AgeGroup; label: string }[];
  municipality: string;
  onMunicipalityChange: (value: string) => void;
  municipalities: string[];
  qualityFilter: string;
  onQualityFilterChange: (value: string) => void;
  showQualityFilter: boolean;
  sortKey: SortKey;
  onSortChange: (key: SortKey) => void;
  sortOptions: { value: SortKey; label: string }[];
  onClearAll?: () => void;
  hasActiveFilters?: boolean;
}

const POPULAR_MUNICIPALITIES = [
  "København", "Aarhus", "Odense", "Aalborg", "Frederiksberg",
  "Gentofte", "Roskilde", "Helsingør", "Vejle", "Horsens",
];

export default function FilterBottomSheet({
  open,
  onClose,
  ageGroup,
  onAgeGroupChange,
  ageOptions,
  municipality,
  onMunicipalityChange,
  municipalities,
  qualityFilter,
  onQualityFilterChange,
  showQualityFilter,
  sortKey,
  onSortChange,
  sortOptions,
  onClearAll,
  hasActiveFilters,
}: Props) {
  const { t } = useLanguage();
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    currentY.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0 && sheetRef.current) {
      currentY.current = dy;
      sheetRef.current.style.transform = `translateY(${dy}px)`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (sheetRef.current) {
      sheetRef.current.style.transform = "";
    }
    if (currentY.current > 100) {
      onClose();
    }
    currentY.current = 0;
  }, [onClose]);

  // Sort municipalities: popular first, then rest
  const sortedMunicipalities = (() => {
    const popular = POPULAR_MUNICIPALITIES.filter((m) => municipalities.includes(m));
    const rest = municipalities.filter((m) => !POPULAR_MUNICIPALITIES.includes(m));
    return [...popular, ...rest];
  })();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-bg-card rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col transition-transform duration-200"
        role="dialog"
        aria-modal="true"
        aria-label={t.home.showFilters}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-border">
          <h2 className="text-base font-semibold text-foreground font-display">
            {t.home.showFilters}
          </h2>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-border/30 transition-colors"
            aria-label={t.home.hideFilters}
          >
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* Filter controls */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Age group */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t.ageFilter.allAges}</label>
            <div className="flex flex-wrap gap-2">
              {ageOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onAgeGroupChange(opt.value)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                    ageGroup === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-border/40 text-muted hover:bg-border/70"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Municipality */}
          <div className="space-y-2">
            <label htmlFor="bs-municipality" className="text-sm font-medium text-foreground">
              {t.common.allMunicipalities}
            </label>
            <select
              id="bs-municipality"
              value={municipality}
              onChange={(e) => onMunicipalityChange(e.target.value)}
              className={`w-full px-3 py-2.5 rounded-xl border bg-bg-card text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary ${
                municipality ? "border-primary text-primary font-medium" : "border-border text-foreground"
              }`}
            >
              <option value="">{t.common.allMunicipalities}</option>
              {sortedMunicipalities.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Quality filter */}
          {showQualityFilter && (
            <div className="space-y-2">
              <label htmlFor="bs-quality" className="text-sm font-medium text-foreground">
                {t.common.allRatings}
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "", label: t.common.allRatings },
                  { value: "1", label: t.detail.aboveAvg },
                  { value: "0", label: t.detail.average },
                  { value: "-1", label: t.detail.belowAvg },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onQualityFilterChange(opt.value)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                      qualityFilter === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-border/40 text-muted hover:bg-border/70"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sort */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Sortér efter</label>
            <div className="flex flex-wrap gap-2">
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onSortChange(opt.value)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                    sortKey === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-border/40 text-muted hover:bg-border/70"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-border flex gap-3">
          {hasActiveFilters && onClearAll && (
            <button
              onClick={() => { onClearAll(); onClose(); }}
              className="flex-1 py-3 rounded-xl text-sm font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 transition-colors min-h-[44px]"
            >
              {t.common.resetFilters}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground transition-colors min-h-[44px]"
          >
            {t.common.found ? `Vis resultater` : `Anvend`}
          </button>
        </div>
      </div>
    </div>
  );
}
