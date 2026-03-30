import { useCallback } from "react";
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

const VALID_CATEGORIES: InstitutionCategory[] = ["alle", "vuggestue", "boernehave", "dagpleje", "skole", "sfo", "fritidsklub"];
const VALID_AGE_GROUPS: AgeGroup[] = ["", "0-2", "3-5", "6-9", "10-16"];
const VALID_SORT_KEYS: SortKey[] = ["name", "price", "municipality", "rating", "grades", "absence", "distance"];

interface UseFilterParamsOptions {
  defaultCategory?: InstitutionCategory;
  defaultSortKey?: SortKey;
}

export interface FilterParams {
  search: string;
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
  const defaultSortKey = options?.defaultSortKey ?? "price";

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

  const setSearch = useCallback(
    (value: string) => setParam(PARAM.search, value),
    [setParam]
  );

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
