/**
 * StaticMapThumb — lightweight static map thumbnail using a single OSM tile.
 * No extra dependencies; just an <img> with a CSS marker overlay.
 */

interface StaticMapThumbProps {
  lat: number;
  lng: number;
  name: string;
  zoom?: number;
  className?: string;
}

/** Convert lat/lng to OSM slippy-map tile coordinates */
function latLngToTile(lat: number, lng: number, zoom: number) {
  const n = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

export default function StaticMapThumb({ lat, lng, name, zoom = 15, className = "" }: StaticMapThumbProps) {
  const { x, y } = latLngToTile(lat, lng, zoom);
  const src = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-border shrink-0 ${className}`}
      style={{ width: 80, height: 60 }}
    >
      <img
        src={src}
        alt={name}
        loading="lazy"
        width={80}
        height={60}
        className="w-full h-full object-cover"
        style={{ imageRendering: "auto" }}
      />
      {/* Marker dot */}
      <span
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-primary border-2 border-white shadow-sm"
        aria-hidden="true"
      />
    </div>
  );
}
