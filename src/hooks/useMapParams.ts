import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Hook that syncs map viewport state (center, zoom, view mode, radius) to URL search params.
 * Uses short param names to keep URLs clean.
 *
 * URL format example:
 *   ?lat=55.6761&lng=12.5683&z=13&vis=kort&radius=5
 */

const PARAM = {
  lat: "lat",
  lng: "lng",
  zoom: "z",
  view: "vis",
  radius: "radius",
} as const;

const DEFAULT_LAT = 55.7;
const DEFAULT_LNG = 10.8;
const DEFAULT_ZOOM = 8;
const DEFAULT_VIEW = "liste" as const;

export type MapView = "liste" | "kort";

export interface MapParams {
  /** Map center latitude (default 56.0) */
  lat: number;
  /** Map center longitude (default 10.5) */
  lng: number;
  /** Zoom level (default 7) */
  zoom: number;
  /** View mode: "liste" or "kort" */
  view: MapView;
  /** Radius filter in km, or null if not active */
  radius: number | null;
  /** Update map center and zoom in URL (debounced internally) */
  setMapView: (center: { lat: number; lng: number }, zoom: number) => void;
  /** Set the view mode ("liste" or "kort") */
  setView: (view: MapView) => void;
  /** Set the radius filter */
  setRadius: (km: number | null) => void;
  /** Whether any map params differ from defaults */
  hasMapParams: boolean;
}

export function useMapParams(): MapParams {
  const [searchParams, setSearchParams] = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read values from URL
  const rawLat = searchParams.get(PARAM.lat);
  const rawLng = searchParams.get(PARAM.lng);
  const rawZoom = searchParams.get(PARAM.zoom);
  const rawView = searchParams.get(PARAM.view);
  const rawRadius = searchParams.get(PARAM.radius);

  const lat = rawLat !== null ? parseFloat(rawLat) : DEFAULT_LAT;
  const lng = rawLng !== null ? parseFloat(rawLng) : DEFAULT_LNG;
  const zoom = rawZoom !== null ? parseInt(rawZoom, 10) : DEFAULT_ZOOM;
  const view: MapView = rawView === "kort" ? "kort" : DEFAULT_VIEW;
  const radius = rawRadius !== null ? parseFloat(rawRadius) : null;

  // Validate parsed values
  const safeLat = isFinite(lat) ? lat : DEFAULT_LAT;
  const safeLng = isFinite(lng) ? lng : DEFAULT_LNG;
  const safeZoom = isFinite(zoom) ? Math.max(1, Math.min(18, zoom)) : DEFAULT_ZOOM;

  const setMapView = useCallback(
    (center: { lat: number; lng: number }, z: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const roundedLat = Math.round(center.lat * 10000) / 10000;
        const roundedLng = Math.round(center.lng * 10000) / 10000;
        const roundedZoom = Math.round(z);

        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);

            // Only set params if they differ from defaults
            if (roundedLat === DEFAULT_LAT && roundedLng === DEFAULT_LNG && roundedZoom === DEFAULT_ZOOM) {
              next.delete(PARAM.lat);
              next.delete(PARAM.lng);
              next.delete(PARAM.zoom);
            } else {
              next.set(PARAM.lat, String(roundedLat));
              next.set(PARAM.lng, String(roundedLng));
              next.set(PARAM.zoom, String(roundedZoom));
            }
            return next;
          },
          { replace: true }
        );
      }, 500);
    },
    [setSearchParams]
  );

  const setView = useCallback(
    (v: MapView) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (v === DEFAULT_VIEW) {
            next.delete(PARAM.view);
          } else {
            next.set(PARAM.view, v);
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setRadius = useCallback(
    (km: number | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (km === null) {
            next.delete(PARAM.radius);
          } else {
            next.set(PARAM.radius, String(km));
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const hasMapParams =
    rawLat !== null || rawLng !== null || rawZoom !== null || rawView !== null || rawRadius !== null;

  return {
    lat: safeLat,
    lng: safeLng,
    zoom: safeZoom,
    view,
    radius,
    setMapView,
    setView,
    setRadius,
    hasMapParams,
  };
}
