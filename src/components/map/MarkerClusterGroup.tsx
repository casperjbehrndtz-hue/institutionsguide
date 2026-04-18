import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import { getCategoryIcon } from "./markerIcons";

interface MarkerData {
  lat: number;
  lng: number;
  color: string;
  popupHtml: string;
  id: string;
  price: number | null;
  category?: string;
  /** School quality tier: 1 = over middel, 0 = middel, -1 = under middel, undefined = no ring */
  qualityTier?: number;
}

interface MarkerClusterGroupProps {
  markers: MarkerData[];
  showPrices?: boolean;
  highlightedId?: string | null;
  onMarkerHover?: (id: string | null) => void;
}

function formatPrice(price: number | null): string | null {
  if (price === null) return null;
  if (price >= 1000) {
    const k = (price / 1000).toFixed(1).replace(".", ",");
    return k.replace(",0", "") + "k";
  }
  return String(price);
}

function qualityRingColor(tier: number | undefined): string | null {
  if (tier === 1) return "#16A34A";
  if (tier === 0) return "#D97706";
  if (tier === -1) return "#DC2626";
  return null;
}

/**
 * SVG teardrop pin with a bespoke category pictogram centered in the top circle,
 * and an optional concentric quality-ring for schools.
 */
function pinSvg(color: string, category: string, size: number, qualityTier?: number): string {
  const s = size;
  const half = s / 2;
  const ringColor = qualityRingColor(qualityTier);
  // Top bulb of the teardrop is roughly a circle centered at (half, half) with radius ~half*0.85
  const bulbR = half * 0.85;
  // The ring sits just outside the pin stroke, tangent to the bulb
  const ringR = bulbR + 2.4;
  // Scale a 16×16 icon viewBox to fit ~55% of pin width, centered on the bulb
  const iconSize = s * 0.55;
  const iconOffset = half - iconSize / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s + 6}" height="${s * 1.3 + 6}" viewBox="${-3} ${-3} ${s + 6} ${s * 1.3 + 6}" style="color:${color}">
    <ellipse cx="${half}" cy="${s * 1.22}" rx="${s * 0.22}" ry="${s * 0.06}" fill="rgba(15,23,42,0.25)"/>
    ${ringColor ? `<circle cx="${half}" cy="${half}" r="${ringR}" fill="none" stroke="${ringColor}" stroke-width="2.4" opacity="0.95"/>` : ""}
    <path d="M${half} ${s * 1.15} C${half} ${s * 1.15} ${s * 0.05} ${half * 1.1} ${s * 0.05} ${half * 0.85} C${s * 0.05} ${s * 0.15} ${s * 0.15} ${s * 0.05} ${half} ${s * 0.05} C${s * 0.85} ${s * 0.05} ${s * 0.95} ${s * 0.15} ${s * 0.95} ${half * 0.85} C${s * 0.95} ${half * 1.1} ${half} ${s * 1.15} ${half} ${s * 1.15} Z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
    <svg x="${iconOffset}" y="${iconOffset * 0.85}" width="${iconSize}" height="${iconSize}" viewBox="0 0 16 16">
      ${getCategoryIcon(category)}
    </svg>
  </svg>`;
}

// Cache pin icons by key
const pinIconCache = new Map<string, L.DivIcon>();

function getPinIcon(color: string, category: string, highlighted: boolean, qualityTier?: number): L.DivIcon {
  const key = `${color}-${category}-${highlighted ? "h" : "n"}-${qualityTier ?? "x"}`;
  const cached = pinIconCache.get(key);
  if (cached) return cached;

  const size = highlighted ? 34 : 28;
  const svg = pinSvg(color, category, size, qualityTier);
  // Account for ring padding (3px on each side built into viewBox)
  const w = size + 6;
  const h = size * 1.3 + 6;

  const icon = L.divIcon({
    className: "custom-circle-marker",
    html: svg,
    iconSize: [w, h],
    iconAnchor: [w / 2, h - 3],
    popupAnchor: [0, -(h - 3)],
  });
  pinIconCache.set(key, icon);
  return icon;
}

function createPriceIcon(color: string, price: number | null, highlighted: boolean, category = ""): L.DivIcon {
  const label = formatPrice(price);
  // No price → fall back to pin marker (color already shows category)
  if (!label) return getPinIcon(color, category, highlighted);
  const scale = highlighted ? "transform:scale(1.15);" : "";
  return L.divIcon({
    className: "custom-circle-marker price-marker",
    html: `<span style="background:${color};color:#fff;font-size:11px;font-weight:600;font-family:Inter,system-ui,sans-serif;padding:2px 8px;border-radius:12px;white-space:nowrap;display:inline-flex;align-items:center;border:2px solid #fff;line-height:1.3;box-shadow:0 1px 4px rgba(0,0,0,0.25);${scale}transition:transform 0.15s ease;">${label}</span>`,
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
  useEffect(() => { showPricesRef.current = showPrices; });

  const onMarkerHoverRef = useRef(onMarkerHover);
  useEffect(() => { onMarkerHoverRef.current = onMarkerHover; });

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
        : getPinIcon(m.color, m.category || "", false, m.qualityTier);

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
          : getPinIcon(data.color, data.category || "", isHighlighted, data.qualityTier);
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
            showPrices ? createPriceIcon(prevData.color, prevData.price, false, prevData.category) : getPinIcon(prevData.color, prevData.category || "", false, prevData.qualityTier)
          );
          prevMarker.setZIndexOffset(0);
        }
      }

      if (highlightedId) {
        const curMarker = markerMap.get(highlightedId);
        const curData = dataMap.get(highlightedId);
        if (curMarker && curData) {
          curMarker.setIcon(
            showPrices ? createPriceIcon(curData.color, curData.price, true, curData.category) : getPinIcon(curData.color, curData.category || "", true, curData.qualityTier)
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
