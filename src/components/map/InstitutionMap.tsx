import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import type { UnifiedInstitution } from "@/lib/types";

interface Props {
  institutions: UnifiedInstitution[];
  onSelect?: (institution: UnifiedInstitution) => void;
  flyTo?: { lat: number; lng: number; zoom?: number } | null;
  maxMarkers?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  vuggestue: "#1B8F5F",
  boernehave: "#0E7490",
  dagpleje: "#F4B82C",
  skole: "#3B82F6",
  sfo: "#8B5CF6",
};

function getSchoolColor(quality?: { o?: number }): string {
  if (!quality || quality.o === undefined) return CATEGORY_COLORS.skole;
  if (quality.o === 1) return "#1B8F5F";  // over middel — green
  if (quality.o === 0) return "#F4B82C";  // middel — amber
  return "#D73C3C";                        // under middel — red
}

function getColor(inst: UnifiedInstitution): string {
  if (inst.category === "skole") return getSchoolColor(inst.quality);
  return CATEGORY_COLORS[inst.category] || "#6B7280";
}

function formatRate(rate: number | null): string {
  if (rate === null) return "Ukendt";
  return rate.toLocaleString("da-DK") + " kr/md.";
}

function FlyToHandler({ flyTo }: { flyTo: Props["flyTo"] }) {
  const map = useMap();
  useEffect(() => {
    if (flyTo) {
      map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom || 13, { duration: 1 });
    }
  }, [flyTo, map]);
  return null;
}

const LEGEND_ITEMS = [
  { color: "#1B8F5F", label: "Vuggestue" },
  { color: "#0E7490", label: "Børnehave" },
  { color: "#F4B82C", label: "Dagpleje" },
  { color: "#3B82F6", label: "Skole" },
  { color: "#8B5CF6", label: "SFO" },
];

export default function InstitutionMap({ institutions, onSelect, flyTo, maxMarkers = 1000 }: Props) {
  const visible = useMemo(
    () => institutions.slice(0, maxMarkers),
    [institutions, maxMarkers]
  );

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-border">
      <MapContainer
        center={[56.0, 10.5]}
        zoom={7}
        className="w-full h-full min-h-[400px]"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToHandler flyTo={flyTo} />

        {visible.map((inst) => (
          <CircleMarker
            key={inst.id}
            center={[inst.lat, inst.lng]}
            radius={6}
            pathOptions={{
              fillColor: getColor(inst),
              fillOpacity: 0.8,
              color: "#fff",
              weight: 1.5,
            }}
            eventHandlers={{
              click: () => onSelect?.(inst),
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-foreground">{inst.name}</p>
                <p className="text-muted text-xs">{inst.address}, {inst.postalCode} {inst.city}</p>
                <p className="font-mono text-xs mt-1">{formatRate(inst.monthlyRate)}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] card p-3 text-xs" role="region" aria-label="Kort-forklaring">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-2 mb-1 last:mb-0">
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
