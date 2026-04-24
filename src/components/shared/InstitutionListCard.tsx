import { useMemo, useState } from "react";
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
  badge?: { label: string; className: string } | null;
  normering?: number | null;
  subtypeLabel?: string;
}

interface MetricChip {
  label: string;
  value: string;
}

function StreetViewThumb({ lat, lng, name, category }: { lat: number; lng: number; name: string; category: string }) {
  const [failed, setFailed] = useState(false);

  if (!API_KEY || failed) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center gap-0.5 ${THUMB_BG[category] || "bg-primary/5"}`}>
        <span className={`text-2xl font-bold ${THUMB_TEXT[category] || "text-primary"}`}>
          {name.charAt(0)}
        </span>
        <Camera className="w-3 h-3 text-muted/30" />
      </div>
    );
  }

  return (
    <img
      src={`https://maps.googleapis.com/maps/api/streetview?size=200x200&location=${lat},${lng}&fov=80&pitch=0&key=${API_KEY}`}
      alt={name}
      loading="lazy"
      decoding="async"
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
  const isDa = language === "da";

  // Priority-ordered metric chips. Cap to 3 so the row stays readable on all
  // screen sizes and never needs a horizontal scroll.
  const chips: MetricChip[] = useMemo(() => {
    const out: MetricChip[] = [];
    if (normering != null) {
      out.push({ label: isDa ? "Normering" : "Ratio", value: `${normering.toFixed(1).replace(".", ",")} ${isDa ? "pr. voksen" : "per adult"}` });
    }
    if (inst.quality?.ts != null) {
      out.push({ label: isDa ? "Trivsel" : "Well-being", value: `${inst.quality.ts.toFixed(1).replace(".", ",")} / 5` });
    }
    if (inst.quality?.k != null && out.length < 3) {
      out.push({ label: isDa ? "Karakter" : "Grade", value: inst.quality.k.toFixed(1).replace(".", ",") });
    }
    if (inst.quality?.fp != null && out.length < 3) {
      out.push({ label: isDa ? "Fravær" : "Absence", value: `${inst.quality.fp.toFixed(1).replace(".", ",")}%` });
    }
    if (inst.quality?.el != null && out.length < 3) {
      out.push({ label: isDa ? "Elever" : "Students", value: inst.quality.el.toLocaleString("da-DK") });
    }
    if (inst.category === "efterskole" && inst.availableSpots != null && inst.availableSpots > 0 && out.length < 3) {
      out.push({ label: isDa ? "Ledige" : "Available", value: `${inst.availableSpots}` });
    }
    return out.slice(0, 3);
  }, [normering, inst, isDa]);

  return (
    <Link
      to={`/institution/${inst.id}`}
      state={{ from: loc.pathname + loc.search }}
      data-inst-id={inst.id}
      className={`card transition-all block hover:shadow-md ${
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
        <div className="w-20 sm:w-28 shrink-0 overflow-hidden rounded-l-[inherit]">
          {inst.imageUrl && !imgFailed ? (
            <img src={inst.imageUrl} alt={inst.name} loading="lazy" decoding="async" className="w-full h-full object-cover" onError={() => setImgFailed(true)} />
          ) : (
            <StreetViewThumb lat={inst.lat} lng={inst.lng} name={inst.name} category={inst.category} />
          )}
        </div>

        <div className="flex-1 min-w-0 p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-semibold text-foreground text-sm sm:text-base leading-tight truncate">
                  {inst.name}
                </p>
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
              <p className="text-xs text-muted mt-1 truncate">
                {inst.municipality}
                {inst.postalCode && <span className="text-muted/60"> · {inst.postalCode} {inst.city}</span>}
                {userLocation && (
                  <span className="inline-flex items-center gap-0.5 text-primary/80 ml-1.5">
                    <MapPin className="w-3 h-3" />
                    {formatDistance(haversineKm(userLocation.lat, userLocation.lng, inst.lat, inst.lng))}
                  </span>
                )}
              </p>
            </div>
            <div className="text-right shrink-0">
              {inst.category === "efterskole" && inst.yearlyPrice ? (
                <>
                  <p className="font-mono text-sm sm:text-base font-bold tabular-nums text-primary leading-none">{formatDKK(inst.yearlyPrice)}</p>
                  <span className="text-[10px] text-muted">{isDa ? "/år" : "/year"}</span>
                </>
              ) : inst.monthlyRate ? (
                <>
                  <p className="font-mono text-sm sm:text-base font-bold tabular-nums text-primary leading-none">{formatDKK(inst.monthlyRate)}</p>
                  <span className="text-[10px] text-muted">{t.common.perMonth}</span>
                </>
              ) : null}
            </div>
          </div>

          {chips.length > 0 && (
            <div className="mt-2.5 pt-2.5 border-t border-border/40 grid grid-cols-3 gap-2">
              {chips.map((chip) => (
                <div key={chip.label} className="min-w-0">
                  <p className="text-[10px] text-muted uppercase tracking-wide truncate">{chip.label}</p>
                  <p className="text-[13px] font-semibold text-foreground font-mono tabular-nums truncate">{chip.value}</p>
                </div>
              ))}
            </div>
          )}

          {subtypeLabel && (
            <p className="text-[11px] text-muted mt-2">{subtypeLabel}</p>
          )}

          {inst.category === "efterskole" && inst.profiles && inst.profiles.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
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

          <div className="flex items-center justify-between mt-2.5">
            <span className="text-xs text-primary font-semibold">
              {t.common.seeFullProfile} &rarr;
            </span>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(inst.id); }}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label={isFavorite ? t.favorites.removeFavorite : t.favorites.addFavorite}
            >
              <Heart className={`w-4 h-4 transition-colors ${isFavorite ? "text-red-500 fill-red-500" : "text-muted hover:text-red-400"}`} />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
