import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface PricePoint {
  date: string;
  monthlyRate: number;
}

interface UsePriceHistoryResult {
  data: PricePoint[];
  loading: boolean;
  error: string | null;
}

export function usePriceHistory(institutionId: string): UsePriceHistoryResult {
  const [data, setData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !institutionId) {
      setData([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    supabase
      .from("price_snapshots")
      .select("snapshot_date, monthly_rate")
      .eq("institution_id", institutionId)
      .order("snapshot_date", { ascending: true })
      .then(({ data: rows, error: err }) => {
        if (cancelled) return;
        if (err) {
          setError(err.message);
          setData([]);
        } else {
          setData(
            (rows ?? []).map((r) => ({
              date: r.snapshot_date,
              monthlyRate: r.monthly_rate,
            }))
          );
        }
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Network error");
          setData([]);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [institutionId]);

  return { data, loading, error };
}
