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
    iconSize: [0, 0],
    iconAnchor: [0, 10],
    popupAnchor: [0, -12],
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

  // Create / recreate cluster when markers or showPrices change
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
          iconSize: L.point(0, 0),
          iconAnchor: L.point(0, 16),
        });
      },
    });

    const newMarkerMap = new Map<string, L.Marker>();

    markers.forEach((m) => {
      const isHighlighted = m.id === highlightedId;
      const icon = showPrices
        ? createPriceIcon(m.color, m.price, isHighlighted)
        : createDotIcon(m.color, isHighlighted);

      const marker = L.marker([m.lat, m.lng], {
        icon,
        zIndexOffset: isHighlighted ? 1000 : 0,
        _price: m.price,
      } as L.MarkerOptions & { _price: number | null });
      marker.bindPopup(m.popupHtml);

      if (onMarkerHover) {
        marker.on("mouseover", () => onMarkerHover(m.id));
        marker.on("mouseout", () => onMarkerHover(null));
      }

      newMarkerMap.set(m.id, marker);
      cluster.addLayer(marker);
    });

    map.addLayer(cluster);
    clusterRef.current = cluster;
    markerMapRef.current = newMarkerMap;

    return () => {
      map.removeLayer(cluster);
      clusterRef.current = null;
      markerMapRef.current = new Map();
    };
  }, [map, markers, showPrices, highlightedId, onMarkerHover]);

  return null;
}
