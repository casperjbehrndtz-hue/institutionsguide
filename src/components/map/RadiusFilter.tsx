import { useCallback } from "react";
import { Circle, useMap } from "react-leaflet";
import { MapPin, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import L from "leaflet";

const RADIUS_OPTIONS = [1, 2, 3, 5, 10, 15, 25] as const;

interface RadiusFilterProps {
  radiusCenter: { lat: number; lng: number } | null;
  radiusKm: number | null;
  onRadiusChange: (km: number | null) => void;
}

/** Inner component that uses useMap() — must be rendered inside MapContainer */
function RadiusFitBounds({
  center,
  radiusKm,
}: {
  center: { lat: number; lng: number };
  radiusKm: number;
}) {
  const map = useMap();

  // Fit bounds whenever center or radius changes
  const circleCenter = L.latLng(center.lat, center.lng);
  const radiusMeters = radiusKm * 1000;
  const bounds = circleCenter.toBounds(radiusMeters * 2);
  // Use setTimeout to avoid calling fitBounds during render
  setTimeout(() => {
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
  }, 0);

  return null;
}

/** Circle overlay rendered inside the map */
export function RadiusCircle({
  center,
  radiusKm,
}: {
  center: { lat: number; lng: number };
  radiusKm: number;
}) {
  return (
    <>
      <Circle
        center={[center.lat, center.lng]}
        radius={radiusKm * 1000}
        pathOptions={{
          color: "#0E7490",
          weight: 2,
          fillColor: "#0E7490",
          fillOpacity: 0.08,
          dashArray: "6 4",
        }}
      />
      <RadiusFitBounds center={center} radiusKm={radiusKm} />
    </>
  );
}

/** Control panel overlay — positioned absolutely over the map */
export default function RadiusFilter({
  radiusCenter,
  radiusKm,
  onRadiusChange,
}: RadiusFilterProps) {
  const { t } = useLanguage();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      onRadiusChange(val === "" ? null : Number(val));
    },
    [onRadiusChange],
  );

  const handleClear = useCallback(() => {
    onRadiusChange(null);
  }, [onRadiusChange]);

  const hasLocation = radiusCenter !== null;

  return (
    <div className="absolute bottom-4 right-4 z-[1000] card p-3 text-xs select-none max-w-[200px]">
      <div className="flex items-center gap-1.5 mb-2 text-foreground font-medium">
        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
        <span>{t.map.radiusShowWithin}</span>
      </div>

      {hasLocation ? (
        <div className="flex items-center gap-2">
          <select
            value={radiusKm ?? ""}
            onChange={handleChange}
            className="flex-1 py-1.5 px-2 text-xs rounded-md border border-border bg-bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">—</option>
            {RADIUS_OPTIONS.map((km) => (
              <option key={km} value={km}>
                {km} {t.map.radiusKm}
              </option>
            ))}
          </select>
          {radiusKm !== null && (
            <button
              onClick={handleClear}
              className="p-1 rounded hover:bg-primary/10 text-muted hover:text-foreground transition-colors"
              aria-label={t.map.radiusClear}
              title={t.map.radiusClear}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <p className="text-muted text-[11px] leading-snug">
          {t.map.radiusActivateLocation}
        </p>
      )}
    </div>
  );
}
