import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import { useDarkMode } from "@/hooks/useDarkMode";
import L from "leaflet";

interface Props {
  lat: number;
  lng: number;
  name: string;
}

const PIN = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#0E7490;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/**
 * Compact location map for the institution detail page.
 * Lazy-loaded (parent uses Suspense). 200px tall.
 */
export default function InstitutionMiniMap({ lat, lng, name }: Props) {
  const isDark = useDarkMode();
  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png";

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={14}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
      zoomControl={true}
      dragging={true}
    >
      <TileLayer url={tileUrl} attribution="&copy; OpenStreetMap, &copy; CARTO" />
      <Marker position={[lat, lng]} icon={PIN}>
        <Tooltip permanent direction="top" offset={[0, -8]} opacity={1}>
          <span style={{ fontWeight: 600, fontSize: 12 }}>{name}</span>
        </Tooltip>
      </Marker>
    </MapContainer>
  );
}
