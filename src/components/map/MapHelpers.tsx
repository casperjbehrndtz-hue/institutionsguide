import React, { useEffect } from "react";
import { useMap, useMapEvents } from "react-leaflet";

interface FlyToTarget {
  lat: number;
  lng: number;
  zoom?: number;
}

export function FlyToHandler({
  flyTo,
  onFlyStart,
}: {
  flyTo: FlyToTarget | null | undefined;
  onFlyStart: () => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (flyTo) {
      onFlyStart();
      map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom || 13, { duration: 0.4 });
    }
  }, [flyTo, map, onFlyStart]);
  return null;
}

export function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMap();
  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);
  useMapEvents({
    zoomend() {
      onZoomChange(map.getZoom());
    },
  });
  return null;
}

export function SearchAreaTracker({
  onShowButton,
  isProgrammaticRef,
}: {
  onShowButton: (show: boolean) => void;
  isProgrammaticRef: React.RefObject<boolean>;
}) {
  useMapEvents({
    moveend() {
      if (isProgrammaticRef.current) {
        isProgrammaticRef.current = false;
        return;
      }
      onShowButton(true);
    },
  });
  return null;
}

export function ViewChangeTracker({
  onViewChange,
  isProgrammaticRef,
}: {
  onViewChange: (center: { lat: number; lng: number }, zoom: number) => void;
  isProgrammaticRef: React.RefObject<boolean>;
}) {
  const map = useMap();
  useMapEvents({
    moveend() {
      if (isProgrammaticRef.current) return;
      const c = map.getCenter();
      onViewChange({ lat: c.lat, lng: c.lng }, map.getZoom());
    },
  });
  return null;
}

export function ScrollZoomGuard() {
  const map = useMap();
  useEffect(() => {
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    if (isTouchDevice) {
      map.scrollWheelZoom.disable();
      return;
    }

    const container = map.getContainer();
    map.scrollWheelZoom.disable();

    function handleEnter() { map.scrollWheelZoom.enable(); }
    function handleLeave() { map.scrollWheelZoom.disable(); }

    container.addEventListener("mouseenter", handleEnter);
    container.addEventListener("mouseleave", handleLeave);
    return () => {
      container.removeEventListener("mouseenter", handleEnter);
      container.removeEventListener("mouseleave", handleLeave);
      map.scrollWheelZoom.enable();
    };
  }, [map]);
  return null;
}

