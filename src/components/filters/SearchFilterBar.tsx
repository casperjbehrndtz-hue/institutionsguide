import { useMemo } from "react";
import { Search, SlidersHorizontal, MapPin, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { InstitutionCategory, AgeGroup, SortKey } from "@/lib/types";

/** Daycare categories where school-specific sort options don't apply */
const DAYCARE_CATEGORIES: InstitutionCategory[] = ["vuggestue", "boernehave", "dagpleje", "sfo"];

/** School-only sort keys that should be hidden for daycare categories */
const SCHOOL_ONLY_SORT_KEYS: SortKey[] = ["rating", "grades", "absence"];

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  category: InstitutionCategory;
  onCategoryChange: (cat: InstitutionCategory) => void;
  ageGroup: AgeGroup;
  onAgeGroupChange: (age: AgeGroup) => void;
  municipality: string;
  onMunicipalityChange: (value: string) => void;
  qualityFilter: string;
  onQualityFilterChange: (value: string) => void;
  sortKey: SortKey;
  onSortChange: (key: SortKey) => void;
  resultCount: number;
  municipalities: string[];
  onNearMe?: () => void;
  nearMeLoading?: boolean;
  onClearAll?: () => void;
  hasActiveFilters?: boolean;
}

const POPULAR_MUNICIPALITIES = [
  "København", "Aarhus", "Odense", "Aalborg", "Frederiksberg",
  "Gentofte", "Roskilde", "Helsingør", "Vejle", "Horsens",
];

export default function SearchFilterBar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  ageGroup,
  onAgeGroupChange,
  municipality,
  onMunicipalityChange,
  qualityFilter,
  onQualityFilterChange,
  sortKey,
  onSortChange,
  resultCount,
  municipalities,
  onNearMe,
  nearMeLoading,
  onClearAll,
  hasActiveFilters,
}: Props) {
  const { t } = useLanguage();

  const AGE_OPTIONS: { value: AgeGroup; label: string }[] = [
    { value: "", label: t.ageFilter.allAges },
    { value: "0-2", label: t.ageFilter.age0to2 },
    { value: "3-5", label: t.ageFilter.age3to5 },
    { value: "6-9", label: t.ageFilter.age6to9 },
    { value: "10-16", label: t.ageFilter.age10to16 },
  ];

  function handleAgeGroupChange(age: AgeGroup) {
    onAgeGroupChange(age);
    // Auto-set category to match
    if (age === "") {
      onCategoryChange("alle");
    } else if (age === "0-2") {
      onCategoryChange("alle"); // shows vuggestue + dagpleje via ageGroup filter
    } else if (age === "3-5") {
      onCategoryChange("alle");
    } else if (age === "6-9") {
      onCategoryChange("alle");
    } else if (age === "10-16") {
      onCategoryChange("alle");
    }
  }

  function handleCategoryChange(cat: InstitutionCategory) {
    onCategoryChange(cat);
    // Clear age group when manually selecting a category
    if (ageGroup) {
      onAgeGroupChange("");
    }
  }

  const CATEGORIES: { value: InstitutionCategory; label: string }[] = [
    { value: "alle", label: t.categories.alle },
    { value: "vuggestue", label: t.categories.vuggestue },
    { value: "boernehave", label: t.categories.boernehave },
    { value: "dagpleje", label: t.categories.dagpleje },
    { value: "skole", label: t.categories.skole },
    { value: "sfo", label: t.categories.sfo },
  ];

  // Context-aware sort options: hide school-specific sorts for daycare categories
  const ALL_SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: "name", label: t.sort.name },
    { value: "price", label: t.sort.price },
    { value: "municipality", label: t.sort.municipality },
    { value: "rating", label: t.sort.rating },
    { value: "grades", label: t.sort.grades },
    { value: "absence", label: t.sort.absence },
  ];

  const sortOptions = useMemo(() => {
    const isDaycareOnly = DAYCARE_CATEGORIES.includes(category);
    if (isDaycareOnly) {
      return ALL_SORT_OPTIONS.filter((opt) => !SCHOOL_ONLY_SORT_KEYS.includes(opt.value));
    }
    return ALL_SORT_OPTIONS;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, t]);

  const otherMunicipalities = municipalities.filter(
    (m) => !POPULAR_MUNICIPALITIES.includes(m)
  );

  return (
    <div className="sticky top-0 z-30 bg-bg/95 backdrop-blur-sm border-b border-border py-3 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Search */}
        <div className="relative">
          <label htmlFor="search-input" className="sr-only">
            {t.common.searchPlaceholder}
          </label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <input
            id="search-input"
            type="text"
            placeholder={t.common.searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-24 py-3 rounded-xl border border-border bg-bg-card text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
            aria-label={t.common.searchPlaceholder}
          />
          {onNearMe && (
            <button
              onClick={onNearMe}
              disabled={nearMeLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary-light transition-colors disabled:opacity-60"
              aria-label={t.common.nearMe}
            >
              <MapPin className={`w-3.5 h-3.5 ${nearMeLoading ? "animate-pulse" : ""}`} />
              {t.common.nearMe}
            </button>
          )}
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category pills */}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Kategori-filter">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => handleCategoryChange(cat.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-[44px] ${
                  category === cat.value && !ageGroup
                    ? "bg-primary text-primary-foreground"
                    : "bg-border/40 text-muted hover:bg-border/70"
                }`}
                aria-pressed={category === cat.value && !ageGroup}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Age group dropdown */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="age-group-select" className="sr-only">
              {t.ageFilter.allAges}
            </label>
            <select
              id="age-group-select"
              value={ageGroup}
              onChange={(e) => handleAgeGroupChange(e.target.value as AgeGroup)}
              className={`px-3 py-1.5 rounded-xl border border-border bg-bg-card text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary ${
                ageGroup ? "text-primary font-medium border-primary" : "text-foreground"
              }`}
            >
              {AGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Municipality dropdown */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="municipality-select" className="sr-only">
              {t.common.allMunicipalities}
            </label>
            <select
              id="municipality-select"
              value={municipality}
              onChange={(e) => onMunicipalityChange(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-border bg-bg-card text-foreground text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{t.common.allMunicipalities}</option>
              <optgroup label={t.popular}>
                {POPULAR_MUNICIPALITIES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </optgroup>
              <optgroup label={t.common.allMunicipalities}>
                {otherMunicipalities.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Quality filter (for schools) */}
          {(category === "alle" || category === "skole") && (
            <div className="flex items-center gap-1.5">
              <label htmlFor="quality-select" className="sr-only">
                {t.common.allRatings}
              </label>
              <select
                id="quality-select"
                value={qualityFilter}
                onChange={(e) => onQualityFilterChange(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-border bg-bg-card text-foreground text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">{t.common.allRatings}</option>
                <option value="1">{t.detail.aboveAvg}</option>
                <option value="0">{t.detail.average}</option>
                <option value="-1">{t.detail.belowAvg}</option>
              </select>
            </div>
          )}

          {/* Sort */}
          <div className="flex items-center gap-1.5 ml-auto">
            <SlidersHorizontal className="w-4 h-4 text-muted" />
            <label htmlFor="sort-select" className="sr-only">
              Sort
            </label>
            <select
              id="sort-select"
              value={sortKey}
              onChange={(e) => onSortChange(e.target.value as SortKey)}
              className="px-3 py-1.5 rounded-xl border border-border bg-bg-card text-foreground text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Clear all filters button - only shown when filters are active */}
          {hasActiveFilters && onClearAll && (
            <button
              onClick={onClearAll}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors min-h-[44px]"
            >
              <X className="w-3.5 h-3.5" />
              {t.common.resetFilters}
            </button>
          )}
        </div>

        {/* Result count */}
        <p className="text-sm text-muted" aria-live="polite">
          <span className="font-mono font-medium text-foreground">
            {resultCount.toLocaleString("da-DK")}
          </span>{" "}
          {t.common.institutions} {t.common.found}
        </p>
      </div>
    </div>
  );
}
