import { useCallback, useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import type { InstitutionCategory, AgeGroup, SortKey } from "@/lib/types";

/**
 * Hook that persists filter state in URL search params.
 * Uses Danish param names for SEO.
 *
 * URL format example:
 *   ?q=østerbro&kategori=vuggestue&kommune=København&alder=0-2&kvalitet=1&sort=price
 *
 * Usage in HomePage / CategoryPage:
 *   const {
 *     search, setSearch,
 *     category, setCategory,
 *     municipality, setMunicipality,
 *     ageGroup, setAgeGroup,
 *     qualityFilter, setQualityFilter,
 *     sortKey, setSortKey,
 *     clearAll,
 *     hasActiveFilters,
 *   } = useFilterParams();
 *
 * You can pass default values (e.g. a category page might default category to "skole"):
 *   const filters = useFilterParams({ defaultCategory: "skole" });
 */

// Param name mapping (Danish for SEO)
const PARAM = {
  search: "q",
  category: "kategori",
  municipality: "kommune",
  ageGroup: "alder",
  qualityFilter: "kvalitet",
  sortKey: "sort",
} as const;

const VALID_CATEGORIES: InstitutionCategory[] = ["alle", "vuggestue", "boernehave", "dagpleje", "skole", "sfo", "fritidsklub", "efterskole"];
const VALID_AGE_GROUPS: AgeGroup[] = ["", "0-2", "3-5", "6-9", "10-16"];
const VALID_SORT_KEYS: SortKey[] = ["name", "price", "municipality", "rating", "grades", "absence", "distance"];

interface UseFilterParamsOptions {
  defaultCategory?: InstitutionCategory;
  defaultSortKey?: SortKey;
}

export interface FilterParams {
  /** Debounced search value (use for filtering) */
  search: string;
  /** Immediate search value (use for input display) */
  searchInput: string;
  setSearch: (value: string) => void;
  category: InstitutionCategory;
  setCategory: (value: InstitutionCategory) => void;
  municipality: string;
  setMunicipality: (value: string) => void;
  ageGroup: AgeGroup;
  setAgeGroup: (value: AgeGroup) => void;
  qualityFilter: string;
  setQualityFilter: (value: string) => void;
  sortKey: SortKey;
  setSortKey: (value: SortKey) => void;
  clearAll: () => void;
  hasActiveFilters: boolean;
}

export function useFilterParams(options?: UseFilterParamsOptions): FilterParams {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultCategory = options?.defaultCategory ?? "alle";
  const defaultSortKey = options?.defaultSortKey ?? "name";

  // Read values from URL, falling back to defaults
  const search = searchParams.get(PARAM.search) ?? "";

  const rawCategory = searchParams.get(PARAM.category) ?? "";
  const category: InstitutionCategory = VALID_CATEGORIES.includes(rawCategory as InstitutionCategory)
    ? (rawCategory as InstitutionCategory)
    : defaultCategory;

  const municipality = searchParams.get(PARAM.municipality) ?? "";

  const rawAgeGroup = searchParams.get(PARAM.ageGroup) ?? "";
  const ageGroup: AgeGroup = VALID_AGE_GROUPS.includes(rawAgeGroup as AgeGroup)
    ? (rawAgeGroup as AgeGroup)
    : "";

  const qualityFilter = searchParams.get(PARAM.qualityFilter) ?? "";

  const rawSortKey = searchParams.get(PARAM.sortKey) ?? "";
  const sortKey: SortKey = VALID_SORT_KEYS.includes(rawSortKey as SortKey)
    ? (rawSortKey as SortKey)
    : defaultSortKey;

  // Helper: set a single param (removes it if value is the default/empty)
  const setParam = useCallback(
    (key: string, value: string, defaultValue = "") => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === defaultValue || value === "") {
            next.delete(key);
          } else {
            next.set(key, value);
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Debounced search: local state updates immediately, URL updates after 250ms
  const [searchInput, setSearchInput] = useState(search);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when URL changes externally (e.g. clearAll, back/forward)
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const setSearch = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => setParam(PARAM.search, value), 250);
    },
    [setParam]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, []);

  const setCategory = useCallback(
    (value: InstitutionCategory) => setParam(PARAM.category, value, defaultCategory),
    [setParam, defaultCategory]
  );

  const setMunicipality = useCallback(
    (value: string) => setParam(PARAM.municipality, value),
    [setParam]
  );

  const setAgeGroup = useCallback(
    (value: AgeGroup) => setParam(PARAM.ageGroup, value),
    [setParam]
  );

  const setQualityFilter = useCallback(
    (value: string) => setParam(PARAM.qualityFilter, value),
    [setParam]
  );

  const setSortKey = useCallback(
    (value: SortKey) => setParam(PARAM.sortKey, value, defaultSortKey),
    [setParam, defaultSortKey]
  );

  const clearAll = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const hasActiveFilters =
    search !== "" ||
    category !== defaultCategory ||
    municipality !== "" ||
    ageGroup !== "" ||
    qualityFilter !== "" ||
    sortKey !== defaultSortKey;

  return {
    search,
    searchInput,
    setSearch,
    category,
    setCategory,
    municipality,
    setMunicipality,
    ageGroup,
    setAgeGroup,
    qualityFilter,
    setQualityFilter,
    sortKey,
    setSortKey,
    clearAll,
    hasActiveFilters,
  };
}
