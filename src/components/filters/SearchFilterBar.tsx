import { Search, SlidersHorizontal, MapPin } from "lucide-react";
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

const CATEGORIES: { value: InstitutionCategory; label: string }[] = [
  { value: "alle", label: "Alle" },
  { value: "vuggestue", label: "Vuggestue" },
  { value: "boernehave", label: "Børnehave" },
  { value: "dagpleje", label: "Dagpleje" },
  { value: "skole", label: "Skole" },
  { value: "sfo", label: "SFO" },
];

const POPULAR_MUNICIPALITIES = [
  "København", "Aarhus", "Odense", "Aalborg", "Frederiksberg",
  "Gentofte", "Roskilde", "Helsingør", "Vejle", "Horsens",
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Navn" },
  { value: "price", label: "Pris" },
  { value: "municipality", label: "Kommune" },
  { value: "rating", label: "Rating" },
  { value: "grades", label: "Karakterer" },
  { value: "absence", label: "Fravær" },
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
  const otherMunicipalities = municipalities.filter(
    (m) => !POPULAR_MUNICIPALITIES.includes(m)
  );

  return (
    <div className="sticky top-0 z-30 bg-bg/95 backdrop-blur-sm border-b border-border py-3 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Search */}
        <div className="relative">
          <label htmlFor="search-input" className="sr-only">
            Søg institution, adresse eller postnummer
          </label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <input
            id="search-input"
            type="text"
            placeholder="Søg institution, adresse, postnummer..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-24 py-3 rounded-xl border border-border bg-bg-card text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
            aria-label="Søg efter institutioner"
          />
          {onNearMe && (
            <button
              onClick={onNearMe}
              disabled={nearMeLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-dark transition-colors disabled:opacity-60"
              aria-label="Find institutioner nær mig"
            >
              <MapPin className={`w-3.5 h-3.5 ${nearMeLoading ? "animate-pulse" : ""}`} />
              Nær mig
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
                    ? "bg-primary text-white"
                    : "bg-border/40 text-muted hover:bg-border/70"
                }`}
                aria-pressed={category === cat.value}
                aria-label={`Filtrer efter ${cat.label}`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Municipality dropdown */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="municipality-select" className="sr-only">
              Vælg kommune
            </label>
            <select
              id="municipality-select"
              value={municipality}
              onChange={(e) => onMunicipalityChange(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-border bg-bg-card text-foreground text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Vælg kommune"
            >
              <option value="">Alle kommuner</option>
              <optgroup label="Populære">
                {POPULAR_MUNICIPALITIES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </optgroup>
              <optgroup label="Alle kommuner">
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
                Kvalitetsfilter
              </label>
              <select
                id="quality-select"
                value={qualityFilter}
                onChange={(e) => onQualityFilterChange(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-border bg-bg-card text-foreground text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Filtrer efter kvalitetsvurdering"
              >
                <option value="">Alle vurderinger</option>
                <option value="1">Over middel</option>
                <option value="0">Middel</option>
                <option value="-1">Under middel</option>
              </select>
            </div>
          )}

          {/* Sort */}
          <div className="flex items-center gap-1.5 ml-auto">
            <SlidersHorizontal className="w-4 h-4 text-muted" />
            <label htmlFor="sort-select" className="sr-only">
              Sortér efter
            </label>
            <select
              id="sort-select"
              value={sortKey}
              onChange={(e) => onSortChange(e.target.value as SortKey)}
              className="px-3 py-1.5 rounded-xl border border-border bg-bg-card text-foreground text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Sortér resultater"
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
          institutioner fundet
        </p>
      </div>
    </div>
  );
}
