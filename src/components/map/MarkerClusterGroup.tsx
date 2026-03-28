import { useEffect, useRef, useCallback } from "react";
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
    // Remove trailing ,0
    const clean = k.replace(",0", "");
    return clean + "k";
  }
  return String(price);
}

function createDotIcon(color: string, highlighted: boolean): L.DivIcon {
  const scale = highlighted ? "transform:scale(1.5);" : "";
  const ring = highlighted
    ? `<span class="marker-pulse-ring" style="border-color:${color};"></span>`
    : "";
  return L.divIcon({
    className: "custom-circle-marker",
    html: `${ring}<span style="background:${color};width:14px;height:14px;display:block;border-radius:50%;border:1.5px solid #fff;opacity:0.9;position:absolute;top:7px;left:7px;${scale}transition:transform 0.2s ease;"></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function createPriceIcon(color: string, price: number | null, highlighted: boolean): L.DivIcon {
  const label = formatPrice(price);
  const scale = highlighted ? "transform:scale(1.5);" : "";
  const ring = highlighted
    ? `<span class="marker-pulse-ring" style="border-color:${color};width:100%;height:100%;top:0;left:0;border-radius:10px;"></span>`
    : "";
  return L.divIcon({
    className: "custom-circle-marker price-marker",
    html: `${ring}<span style="background:${color};color:#fff;font-size:11px;font-weight:600;font-family:Inter,system-ui,sans-serif;padding:2px 7px;border-radius:10px;white-space:nowrap;display:inline-block;border:1.5px solid #fff;line-height:1.3;${scale}transition:transform 0.2s ease;">${label}</span>`,
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
  showPricesRef.current = showPrices;

  // Stable hover callback ref so it doesn't trigger cluster recreation
  const onMarkerHoverRef = useRef(onMarkerHover);
  onMarkerHoverRef.current = onMarkerHover;

  // Create / recreate cluster when markers or showPrices change
  // NOTE: highlightedId is NOT in deps — we handle highlights separately below
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

    markers.forEach((m) => {
      const icon = showPrices
        ? createPriceIcon(m.color, m.price, false)
        : createDotIcon(m.color, false);

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
    });

    map.addLayer(cluster);
    clusterRef.current = cluster;
    markerMapRef.current = newMarkerMap;
    markerDataRef.current = newDataMap;

    return () => {
      map.removeLayer(cluster);
      clusterRef.current = null;
      markerMapRef.current = new Map();
      markerDataRef.current = new Map();
    };
  }, [map, markers, showPrices]);

  // Update highlighted marker icon WITHOUT recreating the cluster
  useEffect(() => {
    const markerMap = markerMapRef.current;
    const dataMap = markerDataRef.current;
    const sp = showPricesRef.current;

    // Update all markers: set highlighted state for the matching one, reset others
    markerMap.forEach((marker, id) => {
      const data = dataMap.get(id);
      if (!data) return;
      const isHighlighted = id === highlightedId;
      const icon = sp
        ? createPriceIcon(data.color, data.price, isHighlighted)
        : createDotIcon(data.color, isHighlighted);
      marker.setIcon(icon);
      if (isHighlighted) marker.setZIndexOffset(1000);
      else marker.setZIndexOffset(0);
    });
  }, [highlightedId]);

  return null;
}
