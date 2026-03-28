import { useMemo, useState, useRef, useEffect } from "react";
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

function MunicipalityCombobox({ value, onChange, municipalities, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  municipalities: string[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = useMemo(() => {
    if (!query) {
      const popular = POPULAR_MUNICIPALITIES.filter((m) => municipalities.includes(m));
      const rest = municipalities.filter((m) => !POPULAR_MUNICIPALITIES.includes(m));
      return [...popular, ...rest];
    }
    const q = query.toLowerCase();
    return municipalities.filter((m) => m.toLowerCase().includes(q));
  }, [query, municipalities]);

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        value={open ? query : value || ""}
        placeholder={placeholder}
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        className={`w-[180px] px-3 py-1.5 rounded-xl border bg-bg-card text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary ${
          value ? "border-primary text-primary font-medium" : "border-border text-foreground"
        }`}
        role="combobox"
        aria-expanded={open}
        aria-label={placeholder}
      />
      {value && !open && (
        <button
          onClick={() => { onChange(""); setQuery(""); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-border/30 rounded"
          aria-label="Clear"
        >
          <X className="w-3.5 h-3.5 text-muted" />
        </button>
      )}
      {open && (
        <div className="absolute top-full left-0 mt-1 w-[220px] max-h-[280px] overflow-y-auto bg-bg-card border border-border rounded-xl shadow-lg z-50">
          <button
            onClick={() => { onChange(""); setOpen(false); setQuery(""); }}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-primary/5 ${!value ? "text-primary font-medium" : "text-foreground"}`}
          >
            {placeholder}
          </button>
          {filtered.slice(0, 30).map((m) => (
            <button
              key={m}
              onClick={() => { onChange(m); setOpen(false); setQuery(""); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-primary/5 ${value === m ? "text-primary font-medium bg-primary/5" : "text-foreground"}`}
            >
              {m}
            </button>
          ))}
          {filtered.length > 30 && (
            <p className="px-3 py-2 text-xs text-muted">+{filtered.length - 30} mere...</p>
          )}
        </div>
      )}
    </div>
  );
}

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

          {/* Municipality searchable combobox */}
          <MunicipalityCombobox
            value={municipality}
            onChange={onMunicipalityChange}
            municipalities={municipalities}
            placeholder={t.common.allMunicipalities}
          />

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

        {/* Result count + active filter pills */}
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm text-muted" aria-live="polite">
            <span className="font-mono font-medium text-foreground">
              {resultCount.toLocaleString("da-DK")}
            </span>{" "}
            {t.common.institutions} {t.common.found}
          </p>
          {/* Active filter pills */}
          {search && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
              &ldquo;{search}&rdquo;
              <button onClick={() => onSearchChange("")} className="hover:bg-primary/20 rounded-full p-0.5" aria-label="Clear search"><X className="w-3 h-3" /></button>
            </span>
          )}
          {municipality && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
              {municipality}
              <button onClick={() => onMunicipalityChange("")} className="hover:bg-primary/20 rounded-full p-0.5" aria-label="Clear municipality"><X className="w-3 h-3" /></button>
            </span>
          )}
          {ageGroup && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
              {AGE_OPTIONS.find((o) => o.value === ageGroup)?.label}
              <button onClick={() => onAgeGroupChange("")} className="hover:bg-primary/20 rounded-full p-0.5" aria-label="Clear age"><X className="w-3 h-3" /></button>
            </span>
          )}
          {qualityFilter && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
              {qualityFilter === "1" ? t.detail.aboveAvg : qualityFilter === "0" ? t.detail.average : t.detail.belowAvg}
              <button onClick={() => onQualityFilterChange("")} className="hover:bg-primary/20 rounded-full p-0.5" aria-label="Clear quality"><X className="w-3 h-3" /></button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
