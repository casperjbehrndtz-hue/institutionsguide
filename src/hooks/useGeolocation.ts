import { useState, useCallback, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const GEO_CONSENT_KEY = "geo_consented";

interface GeolocationState {
  userLocation: { lat: number; lng: number } | null;
  nearMeLoading: boolean;
  geoError: string | null;
  showGeoModal: boolean;
  handleNearMe: () => void;
  acceptConsent: () => void;
  dismissModal: () => void;
  dismissError: () => void;
  retryGeolocation: () => void;
}

export function useGeolocation(
  onLocation: (loc: { lat: number; lng: number }) => void,
): GeolocationState {
  const { language } = useLanguage();

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [showGeoModal, setShowGeoModal] = useState(false);
  const [geoConsented, setGeoConsented] = useState(() => {
    try { return localStorage.getItem(GEO_CONSENT_KEY) === "1"; }
    catch { return false; }
  });

  // Persist consent across sessions
  useEffect(() => {
    if (geoConsented) {
      try { localStorage.setItem(GEO_CONSENT_KEY, "1"); }
      catch { /* quota exceeded, ignore */ }
    }
  }, [geoConsented]);

  const t = useCallback((da: string, en: string) => language === "da" ? da : en, [language]);

  const requestGeolocation = useCallback(() => {
    setNearMeLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setNearMeLoading(false);
        onLocation(loc);
      },
      (err) => {
        setNearMeLoading(false);
        if (err.code === 1) {
          setGeoError(t(
            "Placeringstilladelse nægtet. Gå til din browsers indstillinger og tillad placering for denne side.",
            "Location permission denied. Go to your browser settings and allow location for this site.",
          ));
        } else if (err.code === 3) {
          setGeoError(t(
            "Det tog for lang tid at finde din placering. Prøv igen udendørs eller med bedre signal.",
            "Finding your location took too long. Try again outdoors or with better signal.",
          ));
        } else {
          setGeoError(t(
            "Kunne ikke hente din placering. Tjek din browsers tilladelser.",
            "Could not get your location. Check your browser permissions.",
          ));
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }, [onLocation, t]);

  const proceedWithConsent = useCallback(() => {
    if (!geoConsented) {
      setShowGeoModal(true);
      return;
    }
    requestGeolocation();
  }, [geoConsented, requestGeolocation]);

  const handleNearMe = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGeoError(t(
        "Din browser understøtter ikke placering. Prøv en nyere browser.",
        "Your browser does not support geolocation. Try a newer browser.",
      ));
      return;
    }

    // Proactively check if permission is permanently denied
    if ("permissions" in navigator) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        if (result.state === "denied") {
          setGeoError(t(
            "Placering er blokeret. Åbn browserindstillinger → Webstedsindstillinger → Placering, og tillad adgang.",
            "Location is blocked. Open browser settings → Site settings → Location, and allow access.",
          ));
          return;
        }
        proceedWithConsent();
      }).catch(() => {
        // permissions API not supported (e.g. iOS Safari), fall through
        proceedWithConsent();
      });
      return;
    }
    proceedWithConsent();
  }, [proceedWithConsent, t]);

  const acceptConsent = useCallback(() => {
    setGeoConsented(true);
    setShowGeoModal(false);
    requestGeolocation();
  }, [requestGeolocation]);

  const dismissModal = useCallback(() => setShowGeoModal(false), []);
  const dismissError = useCallback(() => setGeoError(null), []);
  const retryGeolocation = useCallback(() => {
    setGeoError(null);
    requestGeolocation();
  }, [requestGeolocation]);

  return {
    userLocation,
    nearMeLoading,
    geoError,
    showGeoModal,
    handleNearMe,
    acceptConsent,
    dismissModal,
    dismissError,
    retryGeolocation,
  };
}
