import { useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { useTrack } from "@/contexts/TrackContext";
import { buildMIDataset, leaderboard, type MIDataset, type MunicipalityScore } from "@/lib/mi/aggregate";

export interface MIResult {
  dataset: MIDataset;
  municipalities: MunicipalityScore[];
  nationalMean: number;
  ready: boolean;
}

/**
 * MIL hook: builds the per-track dataset (memoized on the underlying data)
 * and recomputes the leaderboard whenever weights change. Pure client-side.
 */
export function useMunicipalityIntelligence(): MIResult {
  const { institutions, institutionStats, kommuneStats, normering, supplementaryLoading } = useData();
  const { track, weights } = useTrack();

  const dataset = useMemo(
    () => buildMIDataset({ track, institutions, institutionStats, kommuneStats, normering }),
    [track, institutions, institutionStats, kommuneStats, normering],
  );

  const board = useMemo(() => {
    try {
      return leaderboard(dataset, weights);
    } catch {
      return { municipalities: [], nationalMean: 50 };
    }
  }, [dataset, weights]);

  return {
    dataset,
    municipalities: board.municipalities,
    nationalMean: board.nationalMean,
    ready: !supplementaryLoading,
  };
}
