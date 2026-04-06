import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, MapPin, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { InstitutionCategory, AgeGroup, SortKey, UnifiedInstitution } from "@/lib/types";
import FilterBottomSheet from "./FilterBottomSheet";

/** Normalize Danish characters for accent-tolerant search */
function normalizeSearch(str: string): string {
  return str
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/é/g, "e")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ä/g, "a");
}

/** Categories where school-specific sort options don't apply */
const DAYCARE_CATEGORIES: InstitutionCategory[] = ["vuggestue", "boernehave", "dagpleje", "sfo", "fritidsklub", "efterskole"];

/** School-only sort keys that should be hidden for daycare categories */
const SCHOOL_ONLY_SORT_KEYS: SortKey[] = ["rating", "grades", "absence"];

const CATEGORY_LABELS: Record<string, string> = {
  vuggestue: "Vuggestue",
  boernehave: "Børnehave",
  dagpleje: "Dagpleje",
  skole: "Skole",
  sfo: "SFO",
  fritidsklub: "Fritidsklub",
  efterskole: "Efterskole",
};

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
  institutions?: UnifiedInstitution[];
  onNearMe?: () => void;
  nearMeLoading?: boolean;
  onClearAll?: () => void;
  hasActiveFilters?: boolean;
  hideCategoryPills?: boolean;
  hasGeolocation?: boolean;
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
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const listboxId = "municipality-listbox";

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
    const qNorm = normalizeSearch(q);
    return municipalities.filter((m) => {
      const mLower = m.toLowerCase();
      return mLower.includes(q) || normalizeSearch(mLower).includes(qNorm);
    });
  }, [query, municipalities]);

  const visibleItems = filtered.slice(0, 30);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlightIndex((prev) => Math.min(prev + 1, visibleItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && open && highlightIndex >= 0) {
      e.preventDefault();
      onChange(visibleItems[highlightIndex]);
      setOpen(false);
      setQuery("");
      setHighlightIndex(-1);
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlightIndex(-1);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <label htmlFor="muni-combobox" className="sr-only">Kommune</label>
      <input
        id="muni-combobox"
        type="text"
        value={open ? query : value || ""}
        placeholder={placeholder}
        onFocus={() => { setOpen(true); setQuery(""); setHighlightIndex(-1); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlightIndex(-1); }}
        onKeyDown={handleKeyDown}
        className={`w-full sm:w-[180px] px-3 py-1.5 rounded-xl border bg-bg-card text-sm min-h-[36px] sm:min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary ${
          value ? "border-primary text-primary font-medium" : "border-border text-foreground"
        }`}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open && highlightIndex >= 0 ? `muni-option-${highlightIndex}` : undefined}
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
        <div id={listboxId} role="listbox" className="absolute top-full left-0 mt-1 w-full sm:w-[220px] max-h-[50vh] sm:max-h-[280px] overflow-y-auto bg-bg-card border border-border rounded-xl shadow-lg z-50">
          <button
            role="option"
            aria-selected={!value}
            onClick={() => { onChange(""); setOpen(false); setQuery(""); setHighlightIndex(-1); }}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-primary/5 ${!value ? "text-primary font-medium" : "text-foreground"}`}
          >
            {placeholder}
          </button>
          {visibleItems.map((m, i) => (
            <button
              key={m}
              id={`muni-option-${i}`}
              role="option"
              aria-selected={value === m}
              onClick={() => { onChange(m); setOpen(false); setQuery(""); setHighlightIndex(-1); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-primary/5 ${
                highlightIndex === i ? "bg-primary/10" : ""
              } ${value === m ? "text-primary font-medium bg-primary/5" : "text-foreground"}`}
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
  institutions,
  onNearMe,
  nearMeLoading,
  onClearAll,
  hasActiveFilters,
  hideCategoryPills,
  hasGeolocation,
}: Props) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (ageGroup) count++;
    if (municipality) count++;
    if (qualityFilter) count++;
    if (sortKey !== "name" && sortKey !== "price" && sortKey !== "rating") count++;
    return count;
  }, [ageGroup, municipality, qualityFilter, sortKey]);

  const suggestions = useMemo(() => {
    if (!institutions || search.trim().length < 2) return [];
    const q = search.toLowerCase().trim();
    const qNorm = normalizeSearch(q);
    const matches: UnifiedInstitution[] = [];
    // Prioritize name-starts-with, then name-includes, then city/address
    // Uses both exact and normalized matching for accent tolerance
    for (const inst of institutions) {
      if (matches.length >= 8) break;
      const nameLower = inst.name.toLowerCase();
      if (nameLower.startsWith(q) || normalizeSearch(nameLower).startsWith(qNorm)) matches.push(inst);
    }
    for (const inst of institutions) {
      if (matches.length >= 8) break;
      if (matches.includes(inst)) continue;
      const nameLower = inst.name.toLowerCase();
      if (nameLower.includes(q) || normalizeSearch(nameLower).includes(qNorm)) matches.push(inst);
    }
    for (const inst of institutions) {
      if (matches.length >= 8) break;
      if (matches.includes(inst)) continue;
      const cityLower = inst.city.toLowerCase();
      const addrLower = inst.address.toLowerCase();
      if (cityLower.includes(q) || addrLower.includes(q) || normalizeSearch(cityLower).includes(qNorm) || normalizeSearch(addrLower).includes(qNorm)) matches.push(inst);
    }
    return matches;
  }, [institutions, search]);

  useEffect(() => {
    setHighlightIdx(-1);
    setShowSuggestions(suggestions.length > 0);
  }, [suggestions]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectSuggestion = useCallback((inst: UnifiedInstitution) => {
    setShowSuggestions(false);
    navigate(`/institution/${inst.id}`);
  }, [navigate]);

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && highlightIdx >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[highlightIdx]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

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
    { value: "fritidsklub", label: t.categories.fritidsklub },
    { value: "efterskole", label: t.categories.efterskole },
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
    let opts = isDaycareOnly
      ? ALL_SORT_OPTIONS.filter((opt) => !SCHOOL_ONLY_SORT_KEYS.includes(opt.value))
      : [...ALL_SORT_OPTIONS];
    // Show distance sort when geolocation is active
    if (hasGeolocation) {
      opts.push({ value: "distance" as SortKey, label: t.sort.distance });
    }
    return opts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, t, hasGeolocation]);

  return (
    <div className="bg-bg/95 backdrop-blur-sm border-b border-border py-3 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Search with autocomplete */}
        <div className="relative" ref={searchRef}>
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
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            onKeyDown={handleSearchKeyDown}
            className="w-full pl-10 pr-12 sm:pr-24 py-3 rounded-xl border border-border bg-bg-card text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px] text-base sm:text-sm"
            aria-label={t.common.searchPlaceholder}
            role="combobox"
            aria-expanded={showSuggestions}
            aria-haspopup="listbox"
            aria-controls={showSuggestions ? "search-suggestions" : undefined}
            aria-activedescendant={showSuggestions && highlightIdx >= 0 ? `suggestion-${highlightIdx}` : undefined}
            autoComplete="off"
          />
          {onNearMe && (
            <button
              onClick={onNearMe}
              disabled={nearMeLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary-light transition-colors disabled:opacity-60"
              aria-label={t.common.nearMe}
            >
              <MapPin className={`w-3.5 h-3.5 ${nearMeLoading ? "animate-pulse" : ""}`} />
              <span className="hidden sm:inline">{t.common.nearMe}</span>
            </button>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <div id="search-suggestions" role="listbox" className="absolute top-full left-0 right-0 mt-1 bg-bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden max-h-[60vh] overflow-y-auto">
              {suggestions.map((inst, i) => (
                <button
                  key={inst.id}
                  id={`suggestion-${i}`}
                  role="option"
                  aria-selected={highlightIdx === i}
                  onMouseDown={() => selectSuggestion(inst)}
                  className={`w-full text-left px-3 sm:px-4 py-3 sm:py-2.5 flex items-center gap-2 sm:gap-3 text-sm hover:bg-primary/5 transition-colors ${
                    highlightIdx === i ? "bg-primary/10" : ""
                  }`}
                >
                  <span className="flex-1 min-w-0">
                    <span className="font-medium text-foreground block sm:inline truncate">{inst.name}</span>
                    <span className="text-muted text-xs sm:text-sm sm:ml-1.5 block sm:inline truncate">{inst.city}, {inst.municipality}</span>
                  </span>
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium bg-border/50 text-muted">
                    {CATEGORY_LABELS[inst.category] || inst.category}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Category pills — hidden on dedicated category pages */}
          {!hideCategoryPills && (
          <div className="w-full sm:w-auto overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
            <div className="flex gap-1.5 sm:flex-wrap" role="group" aria-label="Kategori-filter">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => handleCategoryChange(cat.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-[36px] sm:min-h-[44px] whitespace-nowrap shrink-0 ${
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
          </div>
          )}

          {/* Mobile: filter button that opens bottom sheet */}
          <button
            onClick={() => setBottomSheetOpen(true)}
            className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-border/40 text-muted hover:bg-border/70 transition-colors min-h-[36px]"
            aria-label={t.home.showFilters}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {t.home.showFilters}
            {activeFilterCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-primary text-primary-foreground leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Desktop: inline secondary filters */}
          <div className="hidden sm:flex flex-wrap items-center gap-2 w-auto">
            {/* Age group dropdown */}
            <select
              id="age-group-select"
              value={ageGroup}
              onChange={(e) => handleAgeGroupChange(e.target.value as AgeGroup)}
              aria-label={t.ageFilter.allAges}
              className={`px-3 py-1.5 rounded-xl border border-border bg-bg-card text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary ${
                ageGroup ? "text-primary font-medium border-primary" : "text-foreground"
              }`}
            >
              {AGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* Municipality searchable combobox */}
            <MunicipalityCombobox
              value={municipality}
              onChange={onMunicipalityChange}
              municipalities={municipalities}
              placeholder={t.common.allMunicipalities}
            />

            {/* Quality filter (for schools) */}
            {(category === "alle" || category === "skole") && (
              <select
                id="quality-select"
                value={qualityFilter}
                onChange={(e) => onQualityFilterChange(e.target.value)}
                aria-label={t.common.allRatings}
                className="px-3 py-1.5 rounded-xl border border-border bg-bg-card text-foreground text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">{t.common.allRatings}</option>
                <option value="1">{t.detail.aboveAvg}</option>
                <option value="0">{t.detail.average}</option>
                <option value="-1">{t.detail.belowAvg}</option>
              </select>
            )}

            {/* Sort */}
            <div className="flex items-center gap-1.5 ml-auto">
              <SlidersHorizontal className="w-4 h-4 text-muted" />
              <select
                id="sort-select"
                value={sortKey}
                onChange={(e) => onSortChange(e.target.value as SortKey)}
                aria-label="Sortér"
                className="px-3 py-1.5 rounded-xl border border-border bg-bg-card text-foreground text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear all filters button */}
          {hasActiveFilters && onClearAll && (
            <button
              onClick={onClearAll}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors min-h-[36px] sm:min-h-[44px]"
            >
              <X className="w-3.5 h-3.5" />
              {t.common.resetFilters}
            </button>
          )}

          {/* Mobile bottom sheet */}
          <FilterBottomSheet
            open={bottomSheetOpen}
            onClose={() => setBottomSheetOpen(false)}
            ageGroup={ageGroup}
            onAgeGroupChange={handleAgeGroupChange}
            ageOptions={AGE_OPTIONS}
            municipality={municipality}
            onMunicipalityChange={onMunicipalityChange}
            municipalities={municipalities}
            qualityFilter={qualityFilter}
            onQualityFilterChange={onQualityFilterChange}
            showQualityFilter={category === "alle" || category === "skole"}
            sortKey={sortKey}
            onSortChange={onSortChange}
            sortOptions={sortOptions}
            onClearAll={onClearAll}
            hasActiveFilters={hasActiveFilters}
          />
        </div>

        {/* Result count + active filter pills */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <p className="text-xs sm:text-sm text-muted" aria-live="polite">
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
