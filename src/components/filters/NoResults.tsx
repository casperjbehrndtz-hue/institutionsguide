import { SearchX, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { InstitutionCategory, AgeGroup } from "@/lib/types";

interface ActiveFilter {
  label: string;
  onRemove: () => void;
}

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  category: InstitutionCategory;
  onCategoryChange: (cat: InstitutionCategory) => void;
  municipality: string;
  onMunicipalityChange: (value: string) => void;
  ageGroup: AgeGroup;
  onAgeGroupChange: (age: AgeGroup) => void;
  qualityFilter: string;
  onQualityFilterChange: (value: string) => void;
  onClearAll?: () => void;
  /** The default category for the page (e.g. "skole" on CategoryPage) */
  defaultCategory?: InstitutionCategory;
}

export default function NoResults({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  municipality,
  onMunicipalityChange,
  ageGroup,
  onAgeGroupChange,
  qualityFilter,
  onQualityFilterChange,
  onClearAll,
  defaultCategory = "alle",
}: Props) {
  const { t } = useLanguage();

  // Build list of active filters
  const activeFilters: ActiveFilter[] = [];

  if (search.trim()) {
    activeFilters.push({
      label: `"${search}"`,
      onRemove: () => onSearchChange(""),
    });
  }

  if (category !== defaultCategory && category !== "alle") {
    const catLabels = t.categories;
    activeFilters.push({
      label: catLabels[category] || category,
      onRemove: () => onCategoryChange(defaultCategory),
    });
  }

  if (municipality) {
    activeFilters.push({
      label: municipality,
      onRemove: () => onMunicipalityChange(""),
    });
  }

  if (ageGroup) {
    const ageLabels: Record<string, string> = {
      "0-2": t.ageFilter.age0to2,
      "3-5": t.ageFilter.age3to5,
      "6-9": t.ageFilter.age6to9,
      "10-16": t.ageFilter.age10to16,
    };
    activeFilters.push({
      label: ageLabels[ageGroup] || ageGroup,
      onRemove: () => onAgeGroupChange(""),
    });
  }

  if (qualityFilter) {
    const qualityLabels: Record<string, string> = {
      "1": t.detail.aboveAvg,
      "0": t.detail.average,
      "-1": t.detail.belowAvg,
    };
    activeFilters.push({
      label: qualityLabels[qualityFilter] || qualityFilter,
      onRemove: () => onQualityFilterChange(""),
    });
  }

  // Suggest removing the most restrictive filter (search is typically the most restrictive, then quality, then municipality)
  const suggestedFilter = activeFilters[0];

  return (
    <div className="text-center py-12 px-4">
      <SearchX className="w-12 h-12 text-muted/40 mx-auto mb-4" />

      <h3 className="text-lg font-semibold text-foreground mb-2">
        {t.common.noResults}
      </h3>

      {activeFilters.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-muted mb-2">{t.common.activeFilters}:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {activeFilters.map((filter, i) => (
              <button
                key={i}
                onClick={filter.onRemove}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-border/40 text-foreground hover:bg-border/70 transition-colors"
              >
                {filter.label}
                <X className="w-3.5 h-3.5 text-muted" />
              </button>
            ))}
          </div>
        </div>
      )}

      {suggestedFilter && (
        <p className="text-sm text-muted mb-4">
          {t.common.noResultsHint}:{" "}
          <button
            onClick={suggestedFilter.onRemove}
            className="text-primary underline hover:no-underline"
          >
            {t.common.tryClearFilter} {suggestedFilter.label}
          </button>
        </p>
      )}

      {onClearAll && (
        <button
          onClick={onClearAll}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-light transition-colors"
        >
          {t.common.clearAllFilters}
        </button>
      )}
    </div>
  );
}
