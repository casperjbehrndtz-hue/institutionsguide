import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "ig_recently_viewed";
const MAX_ITEMS = 10;

interface RecentItem {
  id: string;
  ts: number;
}

function readRecent(): RecentItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.slice(0, MAX_ITEMS);
    return [];
  } catch {
    return [];
  }
}

function writeRecent(items: RecentItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage full or unavailable
  }
}

export function useRecentlyViewed() {
  const [recent, setRecent] = useState<RecentItem[]>(readRecent);

  // Sync across tabs
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        setRecent(readRecent());
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addViewed = useCallback((id: string) => {
    setRecent((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      const next = [{ id, ts: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
      writeRecent(next);
      return next;
    });
  }, []);

  const recentIds = recent.map((item) => item.id);

  return { recentIds, addViewed };
}
