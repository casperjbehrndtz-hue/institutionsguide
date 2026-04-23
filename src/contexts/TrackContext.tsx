import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { defaultWeights, type Track } from "@/lib/mi/metrics";

const STORAGE_KEY = "mi-state-v1";

interface PersistedState {
  track: Track;
  weights: Record<Track, Record<string, number>>;
}

function loadPersisted(): PersistedState {
  const fallback: PersistedState = {
    track: "school",
    weights: { daycare: defaultWeights("daycare"), school: defaultWeights("school") },
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      track: parsed.track === "daycare" || parsed.track === "school" ? parsed.track : fallback.track,
      weights: {
        daycare: { ...fallback.weights.daycare, ...(parsed.weights?.daycare ?? {}) },
        school: { ...fallback.weights.school, ...(parsed.weights?.school ?? {}) },
      },
    };
  } catch {
    return fallback;
  }
}

interface TrackContextValue {
  track: Track;
  setTrack: (t: Track) => void;
  weights: Record<string, number>;
  setWeight: (metricId: string, value: number) => void;
  resetWeights: () => void;
  /** Stable hash of the active track + weights, useful as memo key. */
  weightsHash: string;
}

const TrackContext = createContext<TrackContextValue | null>(null);

export function TrackProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(loadPersisted);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* quota — ignore */ }
  }, [state]);

  const setTrack = useCallback((t: Track) => {
    setState((s) => (s.track === t ? s : { ...s, track: t }));
  }, []);

  const setWeight = useCallback((metricId: string, value: number) => {
    setState((s) => ({
      ...s,
      weights: {
        ...s.weights,
        [s.track]: { ...s.weights[s.track], [metricId]: Math.max(0, Math.min(10, value)) },
      },
    }));
  }, []);

  const resetWeights = useCallback(() => {
    setState((s) => ({
      ...s,
      weights: { ...s.weights, [s.track]: defaultWeights(s.track) },
    }));
  }, []);

  const weights = state.weights[state.track];
  const weightsHash = useMemo(() => {
    const keys = Object.keys(weights).sort();
    return state.track + ":" + keys.map((k) => `${k}=${weights[k]}`).join(",");
  }, [weights, state.track]);

  const value = useMemo<TrackContextValue>(() => ({
    track: state.track,
    setTrack,
    weights,
    setWeight,
    resetWeights,
    weightsHash,
  }), [state.track, weights, setTrack, setWeight, resetWeights, weightsHash]);

  return <TrackContext value={value}>{children}</TrackContext>;
}

export function useTrack(): TrackContextValue {
  const ctx = useContext(TrackContext);
  if (!ctx) throw new Error("useTrack must be used within TrackProvider");
  return ctx;
}
