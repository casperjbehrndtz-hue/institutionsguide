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

// Cache dot icons by color — only ~7 colors exist
const dotIconCache = new Map<string, L.DivIcon>();
const dotIconHighlightCache = new Map<string, L.DivIcon>();

function getDotIcon(color: string, highlighted: boolean): L.DivIcon {
  const cache = highlighted ? dotIconHighlightCache : dotIconCache;
  const cached = cache.get(color);
  if (cached) return cached;

  const scale = highlighted ? "transform:scale(1.5);" : "";
  const ring = highlighted
    ? `<span class="marker-pulse-ring" style="border-color:${color};"></span>`
    : "";
  const icon = L.divIcon({
    className: "custom-circle-marker",
    html: `${ring}<span style="background:${color};width:14px;height:14px;display:block;border-radius:50%;border:1.5px solid #fff;opacity:0.9;position:absolute;top:7px;left:7px;${scale}transition:transform 0.15s ease;"></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
  cache.set(color, icon);
  return icon;
}

function createPriceIcon(color: string, price: number | null, highlighted: boolean): L.DivIcon {
  const label = formatPrice(price);
  const scale = highlighted ? "transform:scale(1.3);" : "";
  const ring = highlighted
    ? `<span class="marker-pulse-ring" style="border-color:${color};width:100%;height:100%;top:0;left:0;border-radius:10px;"></span>`
    : "";
  return L.divIcon({
    className: "custom-circle-marker price-marker",
    html: `${ring}<span style="background:${color};color:#fff;font-size:11px;font-weight:600;font-family:Inter,system-ui,sans-serif;padding:2px 7px;border-radius:10px;white-space:nowrap;display:inline-block;border:1.5px solid #fff;line-height:1.3;${scale}transition:transform 0.15s ease;">${label}</span>`,
    iconSize: [60, 24],
    iconAnchor: [30, 12],
    popupAnchor: [0, -14],
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
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      spiderfyDistanceMultiplier: 2,
      disableClusteringAtZoom: 18,
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
        ? createPriceIcon(m.color, m.price, false)
        : getDotIcon(m.color, false);

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
          ? createPriceIcon(data.color, data.price, isHighlighted)
          : getDotIcon(data.color, isHighlighted);
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
            showPrices ? createPriceIcon(prevData.color, prevData.price, false) : getDotIcon(prevData.color, false)
          );
          prevMarker.setZIndexOffset(0);
        }
      }

      if (highlightedId) {
        const curMarker = markerMap.get(highlightedId);
        const curData = dataMap.get(highlightedId);
        if (curMarker && curData) {
          curMarker.setIcon(
            showPrices ? createPriceIcon(curData.color, curData.price, true) : getDotIcon(curData.color, true)
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
