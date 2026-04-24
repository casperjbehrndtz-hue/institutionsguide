import { useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { buildMIDataset } from "@/lib/mi/aggregate";
import { percentileToTier } from "@/components/shared/GradeBadge";
import { useDarkMode } from "@/hooks/useDarkMode";
import { toSlug } from "@/lib/slugs";

type Track = "daycare" | "school";

interface KommuneDatum {
  name: string;
  lat: number;
  lng: number;
  count: number;
  meanPercentile: number;
  rank: number;
}

// Map percentile -> fill color (hex), matching GradeBadge tiers
function tierColor(percentile: number): string {
  if (percentile >= 90) return "#059669"; // emerald-600
  if (percentile >= 75) return "#10B981"; // emerald-500
  if (percentile >= 55) return "#0E7490"; // primary teal
  if (percentile >= 45) return "#94A3B8"; // slate-400
  if (percentile >= 25) return "#F59E0B"; // amber-500
  return "#DC2626";                        // red-600
}

interface Props {
  track: Track;
}

/**
 * Kommune-level quality overview map. One circle per kommune at centroid,
 * size proportional to institution count, color by mean MIL percentile tier.
 */
export default function KommuneQualityMap({ track }: Props) {
  const { institutions, institutionStats, kommuneStats, normering } = useData();
  const isDark = useDarkMode();
  const navigate = useNavigate();

  const dataset = useMemo(
    () => buildMIDataset({ track, institutions, institutionStats, kommuneStats, normering }),
    [track, institutions, institutionStats, kommuneStats, normering],
  );

  const kommuneData = useMemo<KommuneDatum[]>(() => {
    const out: KommuneDatum[] = [];
    for (const [mun, rows] of dataset.byMunicipality) {
      if (rows.length === 0) continue;
      const matchingInsts = institutions.filter((i) => i.municipality === mun && i.lat && i.lng);
      if (matchingInsts.length === 0) continue;
      const avgLat = matchingInsts.reduce((s, i) => s + i.lat, 0) / matchingInsts.length;
      const avgLng = matchingInsts.reduce((s, i) => s + i.lng, 0) / matchingInsts.length;
      const percs = rows.flatMap((r) => Object.values(r.cells).filter((c): c is NonNullable<typeof c> => !!c).map((c) => c.percentile));
      if (percs.length === 0) continue;
      const mean = percs.reduce((s, p) => s + p, 0) / percs.length;
      out.push({ name: mun, lat: avgLat, lng: avgLng, count: rows.length, meanPercentile: mean, rank: 0 });
    }
    out.sort((a, b) => b.meanPercentile - a.meanPercentile);
    out.forEach((d, i) => { d.rank = i + 1; });
    return out;
  }, [dataset, institutions]);

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png";

  return (
    <MapContainer
      center={[56.1, 10.5]}
      zoom={7}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
      minZoom={6}
      maxZoom={11}
    >
      <TileLayer url={tileUrl} attribution="&copy; OpenStreetMap contributors, &copy; CARTO" />

      {kommuneData.map((k) => {
        const tier = percentileToTier(k.meanPercentile);
        const color = tierColor(k.meanPercentile);
        const radius = Math.max(8, Math.min(26, Math.sqrt(k.count) * 1.6));
        return (
          <CircleMarker
            key={k.name}
            center={[k.lat, k.lng]}
            radius={radius}
            pathOptions={{
              color: color,
              weight: 2,
              fillColor: color,
              fillOpacity: 0.55,
            }}
            eventHandlers={{
              click: () => navigate(`/kommune-intelligens/${toSlug(k.name)}`),
            }}
          >
            <Tooltip direction="top" offset={[0, -4]} opacity={1} permanent={false} className="kommune-quality-tooltip">
              <div style={{ minWidth: 180 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                  {k.name}
                </div>
                <div style={{ fontSize: 11, color: "#64748B", marginBottom: 4 }}>
                  #{k.rank} af {kommuneData.length} · {k.count} institutioner
                </div>
                <div style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, background: color + "22", color: color, fontSize: 11, fontWeight: 600 }}>
                  {tier.shortLabel}
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
