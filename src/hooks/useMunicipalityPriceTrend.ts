import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface TrendPoint {
  date: string;
  avg: number;
  min: number;
  max: number;
}

interface UseMunicipalityPriceTrendResult {
  data: TrendPoint[];
  loading: boolean;
  error: string | null;
}

export function useMunicipalityPriceTrend(
  municipality: string,
  category?: string
): UseMunicipalityPriceTrendResult {
  const [data, setData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !municipality) {
      setData([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    let query = supabase
      .from("price_snapshots")
      .select("snapshot_date, monthly_rate, category")
      .eq("municipality", municipality)
      .order("snapshot_date", { ascending: true });

    if (category) {
      query = query.eq("category", category);
    }

    Promise.resolve(query).then(({ data: rows, error: err }) => {
      if (cancelled) return;
      if (err) {
        setError(err.message);
        setData([]);
        setLoading(false);
        return;
      }

      // Aggregate by snapshot_date
      const byDate: Record<string, number[]> = {};
      for (const r of rows ?? []) {
        const d = r.snapshot_date;
        if (!byDate[d]) byDate[d] = [];
        byDate[d].push(r.monthly_rate);
      }

      const trend: TrendPoint[] = Object.keys(byDate)
        .sort()
        .map((date) => {
          const rates = byDate[date];
          if (rates.length === 0) return null;
          const sum = rates.reduce((a, b) => a + b, 0);
          return {
            date,
            avg: Math.round(sum / rates.length),
            min: Math.min(...rates),
            max: Math.max(...rates),
          };
        })
        .filter((p): p is TrendPoint => p !== null);

      setData(trend);
      setLoading(false);
    }).catch((e: unknown) => {
      if (!cancelled) {
        setError(e instanceof Error ? e.message : "Unknown error");
        setData([]);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [municipality, category]);

  return { data, loading, error };
}
