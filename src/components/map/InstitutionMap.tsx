import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents, CircleMarker } from "react-leaflet";
import { Maximize2, Minimize2 } from "lucide-react";
import type { UnifiedInstitution } from "@/lib/types";
import MarkerClusterGroup from "./MarkerClusterGroup";
import InstitutionDetail from "@/components/detail/InstitutionDetail";
import RadiusFilter, { RadiusCircle } from "./RadiusFilter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompare } from "@/contexts/CompareContext";
import { useFavorites } from "@/hooks/useFavorites";

interface Props {
  institutions: UnifiedInstitution[];
  onSelect?: (institution: UnifiedInstitution) => void;
  selectedInstitution?: UnifiedInstitution | null;
  onClose?: () => void;
  onCompare?: (inst: UnifiedInstitution) => void;
  flyTo?: { lat: number; lng: number; zoom?: number } | null;
  maxMarkers?: number;
  // New props
  highlightedId?: string | null;
  onMarkerHover?: (id: string | null) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  /** Initial map center from URL params */
  initialCenter?: { lat: number; lng: number };
  /** Initial zoom level from URL params */
  initialZoom?: number;
  /** Called on moveend with new center and zoom for URL sync */
  onViewChange?: (center: { lat: number; lng: number }, zoom: number) => void;
  /** Center point for radius filter circle */
  radiusCenter?: { lat: number; lng: number } | null;
  /** Active radius in km */
  radiusKm?: number | null;
  /** Called when user changes the radius dropdown */
  onRadiusChange?: (km: number | null) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  vuggestue: "#1B8F5F",
  boernehave: "#0E7490",
  dagpleje: "#F4B82C",
  skole: "#3B82F6",
  sfo: "#8B5CF6",
  fritidsklub: "#EA580C",
  efterskole: "#DB2777",
  gymnasium: "#0D9488",
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

function formatRate(rate: number | null, unknownLabel: string, perMonthLabel: string): string {
  if (rate === null) return unknownLabel;
  return rate.toLocaleString("da-DK") + " kr" + perMonthLabel;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function FlyToHandler({
  flyTo,
  onFlyStart,
}: {
  flyTo: Props["flyTo"];
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

function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
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

function SearchAreaTracker({
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

/** Fires onViewChange on moveend so the parent can sync center/zoom to URL */
function ViewChangeTracker({
  onViewChange,
  isProgrammaticRef,
}: {
  onViewChange: (center: { lat: number; lng: number }, zoom: number) => void;
  isProgrammaticRef: React.RefObject<boolean>;
}) {
  const map = useMap();
  useMapEvents({
    moveend() {
      // Skip programmatic moves (flyTo) - SearchAreaTracker resets the flag
      if (isProgrammaticRef.current) return;
      const c = map.getCenter();
      onViewChange({ lat: c.lat, lng: c.lng }, map.getZoom());
    },
  });
  return null;
}

function ScrollZoomGuard({ message: _message }: { message: string }) {
  const map = useMap();
  useEffect(() => {
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    if (isTouchDevice) {
      map.scrollWheelZoom.disable();
      return;
    }

    // Enable scroll zoom on hover, disable on leave
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

const TILE_LIGHT = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_DARK = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

function useDarkMode(): boolean {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() => {
      setDark(el.classList.contains("dark"));
    });
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

function InstitutionMap({
  institutions,
  onSelect,
  selectedInstitution,
  onClose,
  onCompare,
  flyTo,
  highlightedId,
  onMarkerHover,
  isFullscreen,
  onToggleFullscreen,
  onBoundsChange,
  initialCenter,
  initialZoom,
  onViewChange,
  radiusCenter,
  radiusKm,
  onRadiusChange,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const isProgrammaticRef = useRef(false);
  const { t, language } = useLanguage();
  const { addToCompare, isInCompare } = useCompare();
  const { toggleFavorite, isFavorite } = useFavorites();
  const isDark = useDarkMode();

  // Capture initial values once so MapContainer does not re-render
  const mapCenter = useRef<[number, number]>([
    initialCenter?.lat ?? 55.7,
    initialCenter?.lng ?? 10.8,
  ]).current;
  const mapZoom = useRef(initialZoom ?? 8).current;

  const [zoom, setZoom] = useState(mapZoom);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const handleZoomChange = useCallback((z: number) => setZoom(z), []);
  const handleFlyStart = useCallback(() => {
    isProgrammaticRef.current = true;
  }, []);
  const handleShowSearchArea = useCallback((show: boolean) => setShowSearchArea(show), []);

  // Only show legend items for categories present in current data
  const visibleCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const inst of institutions) cats.add(inst.category);
    return cats;
  }, [institutions]);

  const legendItems = useMemo(() => [
    { category: "vuggestue", color: "#1B8F5F", label: t.map.legendVuggestue },
    { category: "boernehave", color: "#0E7490", label: t.map.legendBoernehave },
    { category: "dagpleje", color: "#F4B82C", label: t.map.legendDagpleje },
    { category: "skole", color: "#3B82F6", label: t.map.legendSkole },
    { category: "sfo", color: "#8B5CF6", label: t.map.legendSfo },
    { category: "fritidsklub", color: "#EA580C", label: t.map.legendFritidsklub },
    { category: "efterskole", color: "#DB2777", label: t.map.legendEfterskole },
    { category: "gymnasium", color: "#0D9488", label: t.map.legendGymnasium },
  ], [t]);

  const instById = useMemo(() => {
    const m = new Map<string, UnifiedInstitution>();
    institutions.forEach((inst) => m.set(inst.id, inst));
    return m;
  }, [institutions]);

  // Handle clicks from popup links/buttons (event delegation)
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;

      // "See details" link
      const link = target.closest("[data-select-id]") as HTMLElement | null;
      if (link && onSelect) {
        e.preventDefault();
        const inst = instById.get(link.getAttribute("data-select-id") || "");
        if (inst) onSelect(inst);
        return;
      }

      // "Add to compare" button
      const compareBtn = target.closest("[data-compare-id]") as HTMLElement | null;
      if (compareBtn) {
        e.preventDefault();
        const inst = instById.get(compareBtn.getAttribute("data-compare-id") || "");
        if (inst) addToCompare(inst);
        compareBtn.textContent = "\u2713";
        compareBtn.style.opacity = "0.6";
        compareBtn.style.cursor = "default";
        return;
      }

      // "Favorite" heart button
      const favBtn = target.closest("[data-favorite-id]") as HTMLElement | null;
      if (favBtn) {
        e.preventDefault();
        const id = favBtn.getAttribute("data-favorite-id") || "";
        if (id) toggleFavorite(id);
        const wasFav = favBtn.innerHTML.includes("\u2665");
        favBtn.innerHTML = wasFav ? "&#9825;" : "&#9829;";
        favBtn.style.color = wasFav ? "#9CA3AF" : "#EF4444";
        return;
      }
    }
    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [instById, onSelect, addToCompare, toggleFavorite]);

  const markerData = useMemo(
    () =>
      institutions.map((inst) => {
        const textSecondary = isDark ? "#94A3B8" : "#596A7B";
        const linkColor = isDark ? "#D4944A" : "#B8642E";

        // Build quality metrics row for schools
        const q = inst.quality;
        let metricsHtml = "";
        if (inst.category === "skole" && q) {
          const pills: string[] = [];
          if (q.ts != null) pills.push(`<span style="background:${isDark ? "#1E293B" : "#F1F5F9"};padding:1px 5px;border-radius:4px;">&#9786; ${q.ts.toFixed(1).replace(".", ",")}</span>`);
          if (q.k != null) pills.push(`<span style="background:${isDark ? "#1E293B" : "#F1F5F9"};padding:1px 5px;border-radius:4px;">&#9733; ${q.k.toFixed(1).replace(".", ",")}</span>`);
          if (q.fp != null) pills.push(`<span style="background:${isDark ? "#1E293B" : "#F1F5F9"};padding:1px 5px;border-radius:4px;">${q.fp.toFixed(1).replace(".", ",")}%</span>`);
          if (q.el != null) pills.push(`<span style="background:${isDark ? "#1E293B" : "#F1F5F9"};padding:1px 5px;border-radius:4px;">${q.el} elever</span>`);
          if (pills.length > 0) {
            metricsHtml = `<div style="display:flex;flex-wrap:wrap;gap:3px;margin:4px 0;font-size:10px;font-weight:500;color:${isDark ? "#CBD5E1" : "#334155"};">${pills.join("")}</div>`;
          }
        }

        // Subtitle: city + price (or quality badge for schools)
        let subtitle = escapeHtml(inst.city);
        if (inst.category === "skole" && q?.o != null) {
          const badgeLabel = q.o === 1 ? (language === "da" ? "Over middel" : "Above avg") : q.o === -1 ? (language === "da" ? "Under middel" : "Below avg") : (language === "da" ? "Middel" : "Average");
          const badgeColor = q.o === 1 ? "#16A34A" : q.o === -1 ? "#DC2626" : textSecondary;
          subtitle += ` · <span style="color:${badgeColor};font-weight:600;">${badgeLabel}</span>`;
        } else if (inst.category === "efterskole" && inst.yearlyPrice) {
          subtitle += ` · ${inst.yearlyPrice.toLocaleString("da-DK")} kr${language === "da" ? "/år" : "/year"}`;
        } else if (inst.monthlyRate) {
          subtitle += ` · ${formatRate(inst.monthlyRate, t.common.unknown, t.common.perMonth)}`;
        }

        return {
          lat: inst.lat,
          lng: inst.lng,
          color: getColor(inst),
          id: inst.id,
          price: inst.monthlyRate,
          category: inst.category,
          popupHtml: `<div style="font-size:13px;line-height:1.4;max-width:220px;font-family:system-ui,-apple-system,sans-serif;">
  <p style="font-weight:600;margin:0;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(inst.name)}</p>
  <p style="color:${textSecondary};font-size:11px;margin:2px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${subtitle}</p>
  ${metricsHtml}
  <button data-select-id="${escapeHtml(inst.id)}" type="button" style="display:block;width:100%;text-align:center;padding:5px 0;margin-top:5px;background:${linkColor};color:#fff;font-size:11px;font-weight:600;border:none;cursor:pointer;border-radius:5px;">${escapeHtml(t.map.seeDetails)} &rarr;</button>
</div>`,
        };
      }),
    [institutions, t, language, isFavorite, isInCompare, isDark]
  );


  const handleSearchArea = useCallback(() => {
    if (!mapInstanceRef.current || !onBoundsChange) return;
    const bounds = mapInstanceRef.current.getBounds();
    onBoundsChange({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    });
    setShowSearchArea(false);
  }, [onBoundsChange]);

  const showPrices = zoom >= 12;

  const containerClasses = isFullscreen
    ? "fixed inset-0 z-50 transition-all duration-300"
    : "relative w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-border transition-all duration-300";

  return (
    <div ref={mapContainerRef} className={containerClasses} role="application" aria-label={t.map.mapAriaLabel}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="w-full h-full min-h-[400px]"
        scrollWheelZoom={false}
        ref={(mapRef) => {
          if (mapRef) mapInstanceRef.current = mapRef;
        }}
      >
        <TileLayer
          key={isDark ? "dark" : "light"}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url={isDark ? TILE_DARK : TILE_LIGHT}
          subdomains="abcd"
        />
        <FlyToHandler flyTo={flyTo} onFlyStart={handleFlyStart} />
        <ZoomTracker onZoomChange={handleZoomChange} />
        <SearchAreaTracker onShowButton={handleShowSearchArea} isProgrammaticRef={isProgrammaticRef} />
        {onViewChange && (
          <ViewChangeTracker onViewChange={onViewChange} isProgrammaticRef={isProgrammaticRef} />
        )}
        <MarkerClusterGroup
          markers={markerData}
          showPrices={showPrices}
          highlightedId={highlightedId}
          onMarkerHover={onMarkerHover}
        />
        <ScrollZoomGuard message={t.map.scrollZoomGuard} />
        {radiusCenter && radiusKm && (
          <RadiusCircle center={radiusCenter} radiusKm={radiusKm} />
        )}
        {radiusCenter && (
          <>
            {/* Pulsing ring */}
            <CircleMarker
              center={[radiusCenter.lat, radiusCenter.lng]}
              radius={18}
              pathOptions={{ color: "#3B82F6", weight: 1.5, fillColor: "#3B82F6", fillOpacity: 0.12, className: "user-loc-pulse" }}
              pane="markerPane"
            />
            {/* Solid dot */}
            <CircleMarker
              center={[radiusCenter.lat, radiusCenter.lng]}
              radius={6}
              pathOptions={{ color: "#fff", weight: 2.5, fillColor: "#3B82F6", fillOpacity: 1 }}
              pane="markerPane"
            />
          </>
        )}
      </MapContainer>

      {/* Search this area button */}
      {showSearchArea && onBoundsChange && (
        <button
          onClick={handleSearchArea}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-[1100] bg-bg-card text-foreground text-sm font-medium px-4 py-2 rounded-full shadow-lg border border-border hover:shadow-xl transition-shadow cursor-pointer"
        >
          {t.map.searchArea || "Søg i dette område"}
        </button>
      )}

      {/* Fullscreen toggle */}
      {onToggleFullscreen && (
        <button
          onClick={onToggleFullscreen}
          className="absolute top-4 right-4 z-[1100] bg-bg-card text-foreground p-2 rounded-lg shadow-md border border-border hover:shadow-lg transition-shadow cursor-pointer"
          aria-label={isFullscreen ? (t.map.exitFullscreen || "Formindsk kort") : (t.map.enterFullscreen || "Forstør kort")}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      )}

      {/* Detail overlay panel */}
      {selectedInstitution && onClose && (
        <div className="absolute top-0 left-0 z-[1200] w-80 lg:w-96 h-full overflow-y-auto bg-bg-card shadow-xl animate-slide-in-left">
          <InstitutionDetail
            institution={selectedInstitution}
            onClose={onClose}
            onCompare={onCompare}
          />
        </div>
      )}

      {/* Radius filter control */}
      {onRadiusChange && (
        <RadiusFilter
          radiusCenter={radiusCenter ?? null}
          radiusKm={radiusKm ?? null}
          onRadiusChange={onRadiusChange}
        />
      )}

      {/* Legend — only show categories present in data */}
      {visibleCategories.size > 1 && (
        <div className="absolute bottom-4 left-4 z-[1000] card p-2 text-[11px] select-none opacity-80 hover:opacity-100 transition-opacity" role="region" aria-label={t.map.legendAriaLabel}>
          {legendItems
            .filter((item) => visibleCategories.has(item.category))
            .map((item) => (
              <div key={item.category} className="flex items-center gap-1.5 px-0.5 py-0.5">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.label}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default React.memo(InstitutionMap);
