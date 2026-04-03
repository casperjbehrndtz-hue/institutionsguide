import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";

interface MarkerData {
  lat: number;
  lng: number;
  color: string;
  popupHtml: string;
  id: string;
  price: number | null;
  category?: string;
}

interface MarkerClusterGroupProps {
  markers: MarkerData[];
  showPrices?: boolean;
  highlightedId?: string | null;
  onMarkerHover?: (id: string | null) => void;
}

function formatPrice(price: number | null): string {
  if (price === null) return "?";
  if (price >= 1000) {
    const k = (price / 1000).toFixed(1).replace(".", ",");
    return k.replace(",0", "") + "k";
  }
  return String(price);
}

// Category emoji/symbols for pin markers
const CATEGORY_SYMBOL: Record<string, string> = {
  vuggestue: "👶",
  boernehave: "🧒",
  dagpleje: "🏠",
  skole: "🎓",
  sfo: "📚",
  fritidsklub: "⚽",
  efterskole: "🏫",
  gymnasium: "🏛",
};

// SVG pin marker — teardrop shape with category symbol
function pinSvg(color: string, symbol: string, size: number, shadow = true): string {
  const s = size;
  const half = s / 2;
  // Teardrop: circle top + pointed bottom
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s * 1.3}" viewBox="0 0 ${s} ${s * 1.3}">
    ${shadow ? `<ellipse cx="${half}" cy="${s * 1.22}" rx="${s * 0.22}" ry="${s * 0.06}" fill="rgba(0,0,0,0.2)"/>` : ""}
    <path d="M${half} ${s * 1.15} C${half} ${s * 1.15} ${s * 0.05} ${half * 1.1} ${s * 0.05} ${half * 0.85} C${s * 0.05} ${s * 0.15} ${s * 0.15} ${s * 0.05} ${half} ${s * 0.05} C${s * 0.85} ${s * 0.05} ${s * 0.95} ${s * 0.15} ${s * 0.95} ${half * 0.85} C${s * 0.95} ${half * 1.1} ${half} ${s * 1.15} ${half} ${s * 1.15} Z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
    <text x="${half}" y="${half * 0.95}" text-anchor="middle" dominant-baseline="central" font-size="${s * 0.38}">${symbol}</text>
  </svg>`;
}

// Cache pin icons by key
const pinIconCache = new Map<string, L.DivIcon>();

function getPinIcon(color: string, category: string, highlighted: boolean): L.DivIcon {
  const key = `${color}-${category}-${highlighted ? "h" : "n"}`;
  const cached = pinIconCache.get(key);
  if (cached) return cached;

  const size = highlighted ? 34 : 28;
  const symbol = CATEGORY_SYMBOL[category] || "📍";
  const svg = pinSvg(color, symbol, size);

  const icon = L.divIcon({
    className: "custom-circle-marker",
    html: svg,
    iconSize: [size, size * 1.3],
    iconAnchor: [size / 2, size * 1.3],
    popupAnchor: [0, -size * 1.1],
  });
  pinIconCache.set(key, icon);
  return icon;
}

function createPriceIcon(color: string, price: number | null, highlighted: boolean, category = ""): L.DivIcon {
  const label = formatPrice(price);
  const symbol = CATEGORY_SYMBOL[category] || "";
  const scale = highlighted ? "transform:scale(1.15);" : "";
  return L.divIcon({
    className: "custom-circle-marker price-marker",
    html: `<span style="background:${color};color:#fff;font-size:11px;font-weight:600;font-family:Inter,system-ui,sans-serif;padding:2px 8px;border-radius:12px;white-space:nowrap;display:inline-flex;align-items:center;gap:2px;border:2px solid #fff;line-height:1.3;box-shadow:0 1px 4px rgba(0,0,0,0.25);${scale}transition:transform 0.15s ease;">${symbol ? `<span style="font-size:12px;">${symbol}</span>` : ""}${label}</span>`,
    iconSize: [70, 28],
    iconAnchor: [35, 14],
    popupAnchor: [0, -16],
  });
}

export default function MarkerClusterGroup({
  markers,
  showPrices = false,
  highlightedId,
  onMarkerHover,
}: MarkerClusterGroupProps) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markerMapRef = useRef<Map<string, L.Marker>>(new Map());
  const markerDataRef = useRef<Map<string, MarkerData>>(new Map());
  const showPricesRef = useRef(showPrices);
  const prevHighlightRef = useRef<string | null>(null);
  const prevShowPricesRef = useRef(showPrices);
  showPricesRef.current = showPrices;

  const onMarkerHoverRef = useRef(onMarkerHover);
  onMarkerHoverRef.current = onMarkerHover;

  // Create / recreate cluster only when markers change
  useEffect(() => {
    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      spiderfyDistanceMultiplier: 2,
      disableClusteringAtZoom: 15,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction(clusterObj) {
        const count = clusterObj.getChildCount();
        const size = count <= 10 ? "small" : count <= 50 ? "medium" : "large";
        return L.divIcon({
          html: `<span class="cluster-label">${count}</span>`,
          className: `marker-cluster-pill marker-cluster-pill-${size}`,
          iconSize: L.point(40, 32),
          iconAnchor: L.point(20, 16),
        });
      },
    });

    const newMarkerMap = new Map<string, L.Marker>();
    const newDataMap = new Map<string, MarkerData>();

    for (const m of markers) {
      const sp = showPricesRef.current;
      const icon = sp
        ? createPriceIcon(m.color, m.price, false, m.category)
        : getPinIcon(m.color, m.category || "", false);

      const marker = L.marker([m.lat, m.lng], {
        icon,
        zIndexOffset: 0,
        _price: m.price,
      } as L.MarkerOptions & { _price: number | null });
      marker.bindPopup(m.popupHtml);

      marker.on("mouseover", () => onMarkerHoverRef.current?.(m.id));
      marker.on("mouseout", () => onMarkerHoverRef.current?.(null));

      newMarkerMap.set(m.id, marker);
      newDataMap.set(m.id, m);
      cluster.addLayer(marker);
    }

    map.addLayer(cluster);
    clusterRef.current = cluster;
    markerMapRef.current = newMarkerMap;
    markerDataRef.current = newDataMap;
    prevHighlightRef.current = null;
    prevShowPricesRef.current = showPricesRef.current;

    return () => {
      map.removeLayer(cluster);
      clusterRef.current = null;
      markerMapRef.current = new Map();
      markerDataRef.current = new Map();
    };
  }, [map, markers]);

  // Update icons when showPrices or highlightedId changes
  // Optimized: only touch changed markers instead of iterating all
  useEffect(() => {
    const markerMap = markerMapRef.current;
    const dataMap = markerDataRef.current;
    const pricesChanged = showPrices !== prevShowPricesRef.current;

    if (pricesChanged) {
      // showPrices toggled — update all markers
      markerMap.forEach((marker, id) => {
        const data = dataMap.get(id);
        if (!data) return;
        const isHighlighted = id === highlightedId;
        const icon = showPrices
          ? createPriceIcon(data.color, data.price, isHighlighted, data.category)
          : getPinIcon(data.color, data.category || "", isHighlighted);
        marker.setIcon(icon);
        marker.setZIndexOffset(isHighlighted ? 1000 : 0);
      });
    } else {
      // Only highlight changed — update previous and current highlighted marker
      const prevId = prevHighlightRef.current;

      if (prevId && prevId !== highlightedId) {
        const prevMarker = markerMap.get(prevId);
        const prevData = dataMap.get(prevId);
        if (prevMarker && prevData) {
          prevMarker.setIcon(
            showPrices ? createPriceIcon(prevData.color, prevData.price, false, prevData.category) : getPinIcon(prevData.color, prevData.category || "", false)
          );
          prevMarker.setZIndexOffset(0);
        }
      }

      if (highlightedId) {
        const curMarker = markerMap.get(highlightedId);
        const curData = dataMap.get(highlightedId);
        if (curMarker && curData) {
          curMarker.setIcon(
            showPrices ? createPriceIcon(curData.color, curData.price, true, curData.category) : getPinIcon(curData.color, curData.category || "", true)
          );
          curMarker.setZIndexOffset(1000);
        }
      }
    }

    prevHighlightRef.current = highlightedId ?? null;
    prevShowPricesRef.current = showPrices;
  }, [highlightedId, showPrices]);

  return null;
}
