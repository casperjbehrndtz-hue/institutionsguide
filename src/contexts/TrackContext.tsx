import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { defaultWeights, METRICS_BY_TRACK, type Track } from "@/lib/mi/metrics";
import { findPreset } from "@/lib/mi/presets";

const STORAGE_KEY = "mi-state-v1";
const URL_TRACK_PARAM = "mode";
const URL_WEIGHTS_PARAM = "w";
const URL_PRESET_PARAM = "preset";

interface PersistedState {
  track: Track;
  weights: Record<Track, Record<string, number>>;
}

function defaultState(): PersistedState {
  // School is the primary interest for most Danish parents (10-year commitment,
  // ties to neighborhood choice). Default accordingly.
  return {
    track: "school",
    weights: { daycare: defaultWeights("daycare"), school: defaultWeights("school") },
  };
}

function loadPersisted(): PersistedState {
  const fallback = defaultState();
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

/** Encode the active track's weights as `d_norm:4,d_stabil:3,...`. */
function encodeWeights(weights: Record<string, number>): string {
  return Object.entries(weights)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k}:${v}`)
    .join(",");
}

function decodeWeights(raw: string, track: Track): Record<string, number> | null {
  const validIds = new Set(METRICS_BY_TRACK[track].map((m) => m.id));
  const out: Record<string, number> = {};
  for (const part of raw.split(",")) {
    const [k, v] = part.split(":");
    if (!k || !v) continue;
    if (!validIds.has(k)) continue;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 10) continue;
    out[k] = n;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Read initial state from URL if present, else fall back to localStorage. */
function initialState(): PersistedState {
  if (typeof window === "undefined") return defaultState();
  const params = new URLSearchParams(window.location.search);
  const base = loadPersisted();

  const urlTrack = params.get(URL_TRACK_PARAM);
  if (urlTrack === "daycare" || urlTrack === "school") {
    base.track = urlTrack;
  }

  const presetId = params.get(URL_PRESET_PARAM);
  if (presetId) {
    const preset = findPreset(presetId);
    if (preset) {
      return {
        track: preset.track,
        weights: { ...base.weights, [preset.track]: { ...defaultWeights(preset.track), ...preset.weights } },
      };
    }
  }

  const urlWeights = params.get(URL_WEIGHTS_PARAM);
  if (urlWeights) {
    const decoded = decodeWeights(urlWeights, base.track);
    if (decoded) {
      return {
        ...base,
        weights: {
          ...base.weights,
          [base.track]: { ...defaultWeights(base.track), ...decoded },
        },
      };
    }
  }
  return base;
}

interface TrackContextValue {
  track: Track;
  setTrack: (t: Track) => void;
  weights: Record<string, number>;
  setWeight: (metricId: string, value: number) => void;
  resetWeights: () => void;
  applyPreset: (presetId: string) => void;
  /** URL fragment representing the current track + weights, suitable for sharing. */
  shareQuery: string;
  /** Stable hash of the active track + weights, useful as memo key. */
  weightsHash: string;
}

const TrackContext = createContext<TrackContextValue | null>(null);

export function TrackProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(initialState);

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

  const applyPreset = useCallback((presetId: string) => {
    const preset = findPreset(presetId);
    if (!preset) return;
    setState((s) => ({
      track: preset.track,
      weights: {
        ...s.weights,
        [preset.track]: { ...defaultWeights(preset.track), ...preset.weights },
      },
    }));
  }, []);

  const weights = state.weights[state.track];
  const weightsHash = useMemo(() => {
    const keys = Object.keys(weights).sort();
    return state.track + ":" + keys.map((k) => `${k}=${weights[k]}`).join(",");
  }, [weights, state.track]);

  const shareQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set(URL_TRACK_PARAM, state.track);
    const encoded = encodeWeights(weights);
    if (encoded) params.set(URL_WEIGHTS_PARAM, encoded);
    return params.toString();
  }, [state.track, weights]);

  const value = useMemo<TrackContextValue>(() => ({
    track: state.track,
    setTrack,
    weights,
    setWeight,
    resetWeights,
    applyPreset,
    shareQuery,
    weightsHash,
  }), [state.track, weights, setTrack, setWeight, resetWeights, applyPreset, shareQuery, weightsHash]);

  return <TrackContext value={value}>{children}</TrackContext>;
}

export function useTrack(): TrackContextValue {
  const ctx = useContext(TrackContext);
  if (!ctx) throw new Error("useTrack must be used within TrackProvider");
  return ctx;
}
