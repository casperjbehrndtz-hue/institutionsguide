import { Map as MapIcon } from "lucide-react";

interface Props {
  label?: string;
}

/**
 * Unified skeleton for any lazy-loaded map. Shows the map-style background
 * shimmer + an inline "loading map" affordance so the user understands the
 * box will become a map shortly.
 */
export default function MapSkeleton({ label = "Indlæser kort…" }: Props) {
  return (
    <div className="relative h-full w-full bg-border/15 overflow-hidden" role="status" aria-label={label}>
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-border/10 via-border/25 to-border/10" />
      {/* Faint grid for map-feel */}
      <svg className="absolute inset-0 h-full w-full opacity-30" aria-hidden="true">
        <defs>
          <pattern id="mapgrid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-muted/30" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mapgrid)" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg/80 backdrop-blur border border-border/50 text-xs text-muted">
          <MapIcon className="w-3.5 h-3.5 animate-pulse" />
          {label}
        </div>
      </div>
    </div>
  );
}
