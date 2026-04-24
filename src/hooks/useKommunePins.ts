import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

const PARAM = "pinned";
const MAX_PINS = 3;

/**
 * URL-synchronised list of pinned municipalities. Used by the MIL leaderboard
 * to build up a side-by-side comparison and by the compare page to read the
 * pinned set. Keeping state in the URL makes the comparison shareable.
 */
export function useKommunePins() {
  const [params, setParams] = useSearchParams();

  const pinned = useMemo<string[]>(() => {
    const raw = params.get(PARAM);
    if (!raw) return [];
    return raw
      .split(",")
      .map((v) => decodeURIComponent(v.trim()))
      .filter(Boolean)
      .slice(0, MAX_PINS);
  }, [params]);

  const writePins = useCallback((next: string[]) => {
    setParams((prev) => {
      const updated = new URLSearchParams(prev);
      if (next.length === 0) {
        updated.delete(PARAM);
      } else {
        updated.set(PARAM, next.map((v) => encodeURIComponent(v)).join(","));
      }
      return updated;
    }, { replace: true });
  }, [setParams]);

  const togglePin = useCallback((municipality: string) => {
    const exists = pinned.includes(municipality);
    if (exists) {
      writePins(pinned.filter((p) => p !== municipality));
    } else if (pinned.length < MAX_PINS) {
      writePins([...pinned, municipality]);
    }
  }, [pinned, writePins]);

  const clearPins = useCallback(() => writePins([]), [writePins]);

  const isPinned = useCallback((m: string) => pinned.includes(m), [pinned]);

  return { pinned, togglePin, clearPins, isPinned, max: MAX_PINS };
}
