import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { useMap } from "react-leaflet";
import { ArrowRight, X } from "lucide-react";
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

function tierColor(percentile: number): string {
  if (percentile >= 90) return "#059669";
  if (percentile >= 75) return "#10B981";
  if (percentile >= 55) return "#0E7490";
  if (percentile >= 45) return "#94A3B8";
  if (percentile >= 25) return "#F59E0B";
  return "#DC2626";
}

interface Props {
  track: Track;
  flyTo?: { lat: number; lng: number; zoom?: number } | null;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

function FlyToController({ target }: { target: { lat: number; lng: number; zoom?: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], target.zoom ?? 10, { duration: 0.9 });
  }, [target, map]);
  return null;
}

export default function KommuneQualityMap({ track, flyTo, isFullscreen = false, onToggleFullscreen }: Props) {
  const { institutions, institutionStats, kommuneStats, normering } = useData();
  const isDark = useDarkMode();
  const navigate = useNavigate();
  const [bottomSheetKommune, setBottomSheetKommune] = useState<KommuneDatum | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  // Lock body scroll while bottom-sheet is open (mobile only)
  useEffect(() => {
    if (!bottomSheetKommune || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [bottomSheetKommune]);

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
    <div className="relative h-full w-full">
      {onToggleFullscreen && (
        <button
          onClick={onToggleFullscreen}
          className="absolute top-3 right-3 z-[1000] p-2 rounded-lg bg-white dark:bg-bg-card shadow-md border border-border/50 hover:bg-muted/5 transition-colors"
          aria-label={isFullscreen ? "Luk fuldskærm" : "Åbn fuldskærm"}
          title={isFullscreen ? "Luk fuldskærm" : "Åbn fuldskærm"}
        >
          <svg className="w-4 h-4 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isFullscreen ? <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /> : <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />}
          </svg>
        </button>
      )}
      <MapContainer
        center={[56.1, 10.5]}
        zoom={7}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
        minZoom={6}
        maxZoom={11}
      >
        <TileLayer url={tileUrl} attribution="&copy; OpenStreetMap contributors, &copy; CARTO" />
        <FlyToController target={flyTo ?? null} />

        {kommuneData.map((k) => {
          const color = tierColor(k.meanPercentile);
          const radius = Math.max(5, Math.min(12, 4 + Math.sqrt(k.count) * 0.9));
          return (
            <CircleMarker
              key={k.name}
              center={[k.lat, k.lng]}
              radius={radius}
              pathOptions={{
                color: color,
                weight: 1.5,
                fillColor: color,
                fillOpacity: 0.75,
              }}
              eventHandlers={{
                click: () => {
                  if (isMobile) {
                    setBottomSheetKommune(k);
                  } else {
                    navigate(`/kommune-intelligens/${toSlug(k.name)}`);
                  }
                },
              }}
            >
              {/* Hover tooltip — desktop only (touch devices ignore it) */}
              {!isMobile && (
                <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                  <div style={{ minWidth: 160 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{k.name}</div>
                    <div style={{ fontSize: 11, color: "#64748B", marginBottom: 3 }}>
                      #{k.rank} af {kommuneData.length} · {k.count} institutioner
                    </div>
                    <div style={{ display: "inline-block", padding: "1px 6px", borderRadius: 999, background: color + "22", color: color, fontSize: 10, fontWeight: 600 }}>
                      {percentileToTier(k.meanPercentile).shortLabel}
                    </div>
                  </div>
                </Tooltip>
              )}
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Mobile bottom-sheet — appears when user taps a circle on small screens */}
      {bottomSheetKommune && (
        <>
          <div
            className="fixed inset-0 z-[1100] bg-black/30 sm:hidden"
            onClick={() => setBottomSheetKommune(null)}
            aria-hidden="true"
          />
          <div
            className="fixed bottom-0 inset-x-0 z-[1101] sm:hidden bg-bg-card border-t border-border rounded-t-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-2"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-display text-lg font-bold text-foreground">{bottomSheetKommune.name}</p>
                <p className="text-xs text-muted">
                  #{bottomSheetKommune.rank} af {kommuneData.length} · {bottomSheetKommune.count} institutioner
                </p>
              </div>
              <button
                onClick={() => setBottomSheetKommune(null)}
                className="p-2 -m-2 text-muted hover:text-foreground"
                aria-label="Luk"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              <span
                className="inline-flex items-center text-[11px] font-semibold uppercase tracking-wide rounded-full border px-2.5 py-1"
                style={{
                  background: tierColor(bottomSheetKommune.meanPercentile) + "22",
                  color: tierColor(bottomSheetKommune.meanPercentile),
                  borderColor: tierColor(bottomSheetKommune.meanPercentile) + "44",
                }}
              >
                {percentileToTier(bottomSheetKommune.meanPercentile).label}
              </span>
            </div>
            <button
              onClick={() => {
                navigate(`/kommune-intelligens/${toSlug(bottomSheetKommune.name)}`);
                setBottomSheetKommune(null);
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-light transition-colors min-h-[48px]"
            >
              Se {bottomSheetKommune.name} på kvalitetsindekset <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                navigate(`/kommune/${toSlug(bottomSheetKommune.name)}`);
                setBottomSheetKommune(null);
              }}
              className="w-full mt-2 inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-border text-foreground text-sm font-semibold hover:bg-primary/5 transition-colors min-h-[48px]"
            >
              Se alle institutioner i {bottomSheetKommune.name}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
