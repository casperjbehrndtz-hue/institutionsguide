import { Search, SlidersHorizontal, MapPin } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { InstitutionCategory, SortKey } from "@/lib/types";

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  category: InstitutionCategory;
  onCategoryChange: (cat: InstitutionCategory) => void;
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
}: Props) {
  const { t } = useLanguage();

  const CATEGORIES: { value: InstitutionCategory; label: string }[] = [
    { value: "alle", label: t.categories.alle },
    { value: "vuggestue", label: t.categories.vuggestue },
    { value: "boernehave", label: t.categories.boernehave },
    { value: "dagpleje", label: t.categories.dagpleje },
    { value: "skole", label: t.categories.skole },
    { value: "sfo", label: t.categories.sfo },
  ];

  const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: "name", label: t.sort.name },
    { value: "price", label: t.sort.price },
    { value: "municipality", label: t.sort.municipality },
    { value: "rating", label: t.sort.rating },
    { value: "grades", label: t.sort.grades },
    { value: "absence", label: t.sort.absence },
  ];

  const otherMunicipalities = municipalities.filter(
    (m) => !POPULAR_MUNICIPALITIES.includes(m)
  );

  return (
    <div className="sticky top-0 z-30 bg-bg/95 backdrop-blur-sm border-b border-border py-3 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Search */}
        <div className="relative">
          <label htmlFor="search-input" className="sr-only">
            {t.common.search}
          </label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <input
            id="search-input"
            type="text"
            placeholder={t.common.search}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-24 py-3 rounded-xl border border-border bg-bg-card text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
            aria-label={t.common.search}
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
                onClick={() => onCategoryChange(cat.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-[44px] ${
                  category === cat.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-border/40 text-muted hover:bg-border/70"
                }`}
                aria-pressed={category === cat.value}
              >
                {cat.label}
              </button>
            ))}
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
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
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
