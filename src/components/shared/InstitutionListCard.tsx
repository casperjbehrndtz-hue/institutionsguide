import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Heart, MapPin, Camera } from "lucide-react";
import { formatDKK } from "@/lib/format";
import { haversineKm, formatDistance } from "@/lib/geo";
import { useLanguage } from "@/contexts/LanguageContext";
import { CATEGORY_BADGE_COLORS } from "@/lib/badges";
import type { UnifiedInstitution } from "@/lib/types";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || "";

const THUMB_BG: Record<string, string> = {
  vuggestue: "bg-pink-50 dark:bg-pink-950/30",
  boernehave: "bg-amber-50 dark:bg-amber-950/30",
  dagpleje: "bg-teal-50 dark:bg-teal-950/30",
  skole: "bg-blue-50 dark:bg-blue-950/30",
  sfo: "bg-violet-50 dark:bg-violet-950/30",
  fritidsklub: "bg-orange-50 dark:bg-orange-950/30",
  efterskole: "bg-pink-50 dark:bg-pink-950/30",
};
const THUMB_TEXT: Record<string, string> = {
  vuggestue: "text-pink-400",
  boernehave: "text-amber-400",
  dagpleje: "text-teal-400",
  skole: "text-blue-400",
  sfo: "text-violet-400",
  fritidsklub: "text-orange-400",
  efterskole: "text-pink-400",
};

interface Props {
  inst: UnifiedInstitution;
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
  userLocation?: { lat: number; lng: number } | null;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  showCategoryBadge?: boolean;
  /** Optional quality badge */
  badge?: { label: string; className: string } | null;
  /** Optional normering value */
  normering?: number | null;
  /** Optional subtitle info (e.g. subtype label) */
  subtypeLabel?: string;
}

function StreetViewThumb({ lat, lng, name, category }: { lat: number; lng: number; name: string; category: string }) {
  const [failed, setFailed] = useState(false);

  if (!API_KEY || failed) {
    // Fallback: category-colored initial
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center gap-0.5 ${THUMB_BG[category] || "bg-primary/5"}`}>
        <span className={`text-lg font-bold ${THUMB_TEXT[category] || "text-primary"}`}>
          {name.charAt(0)}
        </span>
        <Camera className="w-3 h-3 text-muted/30" />
      </div>
    );
  }

  return (
    <img
      src={`https://maps.googleapis.com/maps/api/streetview?size=160x120&location=${lat},${lng}&fov=80&pitch=0&key=${API_KEY}`}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      className="w-full h-full object-cover"
    />
  );
}

export default function InstitutionListCard({
  inst,
  hoveredId,
  onHover,
  userLocation,
  isFavorite,
  onToggleFavorite,
  showCategoryBadge,
  badge,
  normering,
  subtypeLabel,
}: Props) {
  const { t, language } = useLanguage();
  const loc = useLocation();
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <Link
      to={`/institution/${inst.id}`}
      state={{ from: loc.pathname + loc.search }}
      data-inst-id={inst.id}
      className={`card transition-all block ${
        hoveredId === inst.id ? "ring-2 ring-primary/50 bg-primary/5" : ""
      }`}
      onMouseEnter={() => {
        if (window.matchMedia("(hover: hover)").matches) onHover?.(inst.id);
      }}
      onMouseLeave={() => {
        if (window.matchMedia("(hover: hover)").matches) onHover?.(null);
      }}
    >
      <div className="flex">
        {/* Thumbnail — efterskole image, Street View, or category initial */}
        <div className="w-16 sm:w-20 shrink-0 overflow-hidden rounded-l-[inherit]">
          {inst.imageUrl && !imgFailed ? (
            <img src={inst.imageUrl} alt={inst.name} loading="lazy" className="w-full h-full object-cover" onError={() => setImgFailed(true)} />
          ) : (
            <StreetViewThumb lat={inst.lat} lng={inst.lng} name={inst.name} category={inst.category} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 p-3 sm:p-4">
          {/* Row 1: Name + badges + price */}
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-semibold text-foreground text-sm truncate max-w-[calc(100%-40px)] sm:max-w-none sm:text-base">{inst.name}</p>
                {badge && (
                  <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-md ${badge.className}`}>
                    {badge.label}
                  </span>
                )}
                {showCategoryBadge && (
                  <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full ${CATEGORY_BADGE_COLORS[inst.category] || ""}`}>
                    {t.categories[inst.category]}
                  </span>
                )}
              </div>
              {/* Row 2: Address + distance */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-xs text-muted truncate">{inst.address}, {inst.postalCode} {inst.city}</p>
                {userLocation && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-primary/70 shrink-0">
                    <MapPin className="w-3 h-3" />
                    {formatDistance(haversineKm(userLocation.lat, userLocation.lng, inst.lat, inst.lng))}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              {inst.category === "efterskole" && inst.yearlyPrice ? (
                <>
                  <p className="font-mono text-xs sm:text-sm font-bold tabular-nums text-primary">{formatDKK(inst.yearlyPrice)}</p>
                  <span className="text-[10px] text-muted">{language === "da" ? "/år" : "/year"}</span>
                </>
              ) : inst.monthlyRate ? (
                <>
                  <p className="font-mono text-xs sm:text-sm font-bold tabular-nums text-primary">{formatDKK(inst.monthlyRate)}</p>
                  <span className="text-[10px] text-muted">{t.common.perMonth}</span>
                </>
              ) : null}
            </div>
          </div>

          {/* Row 3: Metrics strip */}
          <div className="flex items-center gap-2 sm:gap-3 mt-2 pt-2 border-t border-border/40 text-[11px] text-muted overflow-x-auto no-scrollbar">
            {normering != null && (
              <span className="shrink-0">{language === "da" ? "Normering" : "Ratio"} <strong className="text-foreground font-mono">{normering.toFixed(1).replace(".", ",")}</strong></span>
            )}
            {inst.quality?.ts != null && (
              <span className="shrink-0">{language === "da" ? "Trivsel" : "Well-being"} <strong className="text-foreground font-mono">{inst.quality.ts.toFixed(1).replace(".", ",")}</strong></span>
            )}
            {inst.quality?.k != null && (
              <span className="shrink-0">{language === "da" ? "Karakter" : "Grades"} <strong className="text-foreground font-mono">{inst.quality.k.toFixed(1).replace(".", ",")}</strong></span>
            )}
            {inst.quality?.fp != null && (
              <span className="shrink-0">{language === "da" ? "Fravær" : "Absence"} <strong className="text-foreground font-mono">{inst.quality.fp.toFixed(1).replace(".", ",")}%</strong></span>
            )}
            {inst.quality?.kp != null && (
              <span className="shrink-0">{language === "da" ? "Komp." : "Comp."} <strong className="text-foreground font-mono">{inst.quality.kp.toFixed(0)}%</strong></span>
            )}
            {inst.quality?.el != null && (
              <span className="shrink-0">{inst.quality.el.toLocaleString("da-DK")} {language === "da" ? "elever" : "students"}</span>
            )}
            {inst.quality?.kv != null && (
              <span className="shrink-0">{language === "da" ? "Klasse" : "Class"} <strong className="text-foreground font-mono">{inst.quality.kv.toLocaleString("da-DK")}</strong></span>
            )}
            {inst.category === "efterskole" && inst.availableSpots != null && inst.availableSpots > 0 && (
              <span className="shrink-0 text-green-600 dark:text-green-400 font-medium">
                {inst.availableSpots} {language === "da" ? "ledige" : "available"}
              </span>
            )}
            {inst.category === "efterskole" && inst.schoolType && inst.schoolType !== "Almen" && (
              <span className="shrink-0 font-medium text-primary">{inst.schoolType}</span>
            )}
            {inst.category === "efterskole" && inst.classLevels && inst.classLevels.length > 0 && (
              <span className="shrink-0">{inst.classLevels.join(". + ")}. {language === "da" ? "kl." : "gr."}</span>
            )}
            {subtypeLabel && <span className="shrink-0">{subtypeLabel}</span>}
            <span className="shrink-0">{inst.municipality}</span>
          </div>
          {/* Efterskole profiles */}
          {inst.category === "efterskole" && inst.profiles && inst.profiles.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {inst.profiles.slice(0, 4).map((p) => (
                <span key={p} className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-50 text-pink-600 dark:bg-pink-950/30 dark:text-pink-400">
                  {p}
                </span>
              ))}
              {inst.profiles.length > 4 && (
                <span className="text-[10px] text-muted">+{inst.profiles.length - 4}</span>
              )}
            </div>
          )}

          {/* Row 4: Actions */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-primary font-medium">
              {t.common.seeFullProfile} &rarr;
            </span>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(inst.id); }}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label={isFavorite ? t.favorites.removeFavorite : t.favorites.addFavorite}
            >
              <Heart className={`w-5 h-5 transition-colors ${isFavorite ? "text-red-500 fill-red-500" : "text-muted hover:text-red-400"}`} />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
