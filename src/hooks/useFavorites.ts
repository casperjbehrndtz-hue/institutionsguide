import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "institutionsguide_favorites";
const MAX_FAVORITES = 20;

function readFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.slice(0, MAX_FAVORITES);
    return [];
  } catch {
    return [];
  }
}

function writeFavorites(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // storage full or unavailable
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(readFavorites);

  // Sync across tabs
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        setFavorites(readFavorites());
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id)
        ? prev.filter((fid) => fid !== id)
        : prev.length >= MAX_FAVORITES
          ? prev
          : [...prev, id];
      writeFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (id: string) => favorites.includes(id),
    [favorites]
  );

  const clearFavorites = useCallback(() => {
    setFavorites([]);
    writeFavorites([]);
  }, []);

  return { favorites, toggleFavorite, isFavorite, clearFavorites };
}
