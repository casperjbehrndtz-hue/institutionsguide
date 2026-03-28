import { useState } from "react";
import { Camera } from "lucide-react";

interface Props {
  lat: number;
  lng: number;
  width?: number;
  height?: number;
  className?: string;
  alt?: string;
}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || "";

/**
 * Shows a Google Street View image for a given lat/lng.
 * Falls back to a styled placeholder if no API key or image fails to load.
 */
export default function StreetViewImage({
  lat,
  lng,
  width = 640,
  height = 300,
  className = "",
  alt = "",
}: Props) {
  const [failed, setFailed] = useState(false);

  if (!API_KEY || failed) {
    return (
      <div className={`bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center ${className}`}>
        <Camera className="w-8 h-8 text-muted/30" />
      </div>
    );
  }

  const src = `https://maps.googleapis.com/maps/api/streetview?size=${width}x${height}&location=${lat},${lng}&fov=80&pitch=0&key=${API_KEY}`;

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
