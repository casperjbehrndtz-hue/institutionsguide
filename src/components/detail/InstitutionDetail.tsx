import { useRef, useEffect } from "react";
import { X, MapPin, ExternalLink, Mail, Phone, Heart, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFavorites } from "@/hooks/useFavorites";
import { useCompare } from "@/contexts/CompareContext";
import type { UnifiedInstitution } from "@/lib/types";
import { formatDKK } from "@/lib/format";
import StreetViewImage from "@/components/shared/StreetViewImage";

interface Props {
  institution: UnifiedInstitution;
  onClose: () => void;
  onCompare?: (inst: UnifiedInstitution) => void;
}

export default function InstitutionDetail({ institution: inst, onClose, onCompare }: Props) {
  const { t, language } = useLanguage();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { isInCompare } = useCompare();
  const panelRef = useRef<HTMLDivElement>(null);
  const q = inst.quality;

  useEffect(() => {
    panelRef.current?.focus();
  }, [inst.id]);

  const categoryLabels: Record<string, string> = {
    vuggestue: t.categories.vuggestue, boernehave: t.categories.boernehave,
    dagpleje: t.categories.dagpleje, skole: t.categories.skole, sfo: t.categories.sfo,
  };

  const subtypeLabels: Record<string, string> = {
    folkeskole: "Folkeskole", friskole: "Friskole", efterskole: "Efterskole",
    kommunal: "Kommunal", selvejende: "Selvejende", privat: "Privat", udliciteret: "Udliciteret",
  };

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label={inst.name}
      tabIndex={-1}
      className="card p-5 animate-fade-in overflow-y-auto max-h-[90vh] focus:outline-none"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold text-foreground truncate">{inst.name}</h2>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary">
              {categoryLabels[inst.category] || inst.category}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-border text-muted">
              {subtypeLabels[inst.subtype] || inst.subtype}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0 ml-2">
          <button
            onClick={() => toggleFavorite(inst.id)}
            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={isFavorite(inst.id) ? t.favorites.removeFavorite : t.favorites.addFavorite}
          >
            <Heart className={`w-4 h-4 transition-colors ${isFavorite(inst.id) ? "text-red-500 fill-red-500" : "text-muted hover:text-red-400"}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-border/50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={t.common.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Address */}
      <div className="flex items-start gap-1.5 text-xs text-muted mb-3">
        <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>{inst.address}, {inst.postalCode} {inst.city} — {inst.municipality}</span>
      </div>

      {/* Street View image */}
      <StreetViewImage
        lat={inst.lat}
        lng={inst.lng}
        alt={inst.name}
        className="w-full h-[140px] rounded-lg mb-4"
      />

      {/* Key metrics — compact */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {/* Price */}
        <div className="rounded-lg bg-bg-card border border-border p-3 text-center">
          <p className="text-[10px] text-muted uppercase">{language === "da" ? "Pris" : "Price"}</p>
          <p className="font-mono text-lg font-bold text-primary mt-0.5">
            {inst.monthlyRate ? formatDKK(inst.monthlyRate) : "–"}
          </p>
          <p className="text-[10px] text-muted">{t.common.perMonth}</p>
        </div>

        {/* Quality score or second metric */}
        {q?.ts != null ? (
          <div className="rounded-lg bg-bg-card border border-border p-3 text-center">
            <p className="text-[10px] text-muted uppercase">{t.detail.wellbeing}</p>
            <p className="font-mono text-lg font-bold text-foreground mt-0.5">{q.ts.toLocaleString("da-DK")}</p>
            <p className="text-[10px] text-muted">{language === "da" ? "af 5" : "of 5"}</p>
          </div>
        ) : (
          <div className="rounded-lg bg-bg-card border border-border p-3 text-center">
            <p className="text-[10px] text-muted uppercase">{t.detail.annualRate}</p>
            <p className="font-mono text-lg font-bold text-foreground mt-0.5">
              {inst.annualRate ? formatDKK(inst.annualRate) : "–"}
            </p>
          </div>
        )}
      </div>

      {/* School quality summary — compact row */}
      {q && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted mb-4 px-1">
          {q.k != null && <span>{t.detail.grades}: <strong className="text-foreground font-mono">{q.k.toLocaleString("da-DK")}</strong></span>}
          {q.fp != null && <span>{t.detail.absence}: <strong className="text-foreground font-mono">{q.fp.toLocaleString("da-DK")}%</strong></span>}
          {q.kv != null && <span>{t.detail.classSize}: <strong className="text-foreground font-mono">{q.kv.toLocaleString("da-DK")}</strong></span>}
          {q.el != null && <span>{t.detail.studentCount}: <strong className="text-foreground font-mono">{q.el.toLocaleString("da-DK")}</strong></span>}
          {q.epl != null && <span>{t.detail.studentsPerTeacher}: <strong className="text-foreground font-mono">{q.epl.toLocaleString("da-DK")}</strong></span>}
          {q.upe != null && <span>{t.detail.teachingTimePerStudent}: <strong className="text-foreground font-mono">{q.upe.toLocaleString("da-DK")} t</strong></span>}
        </div>
      )}

      {/* Contact — compact inline */}
      <div className="flex flex-wrap gap-3 text-xs mb-5">
        {inst.phone && (
          <a href={`tel:${inst.phone}`} className="flex items-center gap-1 text-primary hover:underline">
            <Phone className="w-3 h-3" /> {inst.phone}
          </a>
        )}
        {inst.email && (
          <a href={`mailto:${inst.email}`} className="flex items-center gap-1 text-primary hover:underline">
            <Mail className="w-3 h-3" /> E-mail
          </a>
        )}
        {inst.web && (
          <a href={inst.web.startsWith("http") ? inst.web : `https://${inst.web}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
            <ExternalLink className="w-3 h-3" /> Web
          </a>
        )}
      </div>

      {/* CTA buttons */}
      <div className="space-y-2">
        <Link
          to={`/institution/${inst.id}`}
          className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary-light transition-colors flex items-center justify-center gap-2 min-h-[44px] text-sm"
        >
          {t.common.seeFullProfile}
          <ArrowRight className="w-4 h-4" />
        </Link>
        {onCompare && !isInCompare(inst.id) && (
          <button
            onClick={() => onCompare(inst)}
            className="w-full py-2.5 px-4 border border-border rounded-xl font-medium text-foreground hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 min-h-[44px] text-sm"
          >
            {t.detail.addToCompare}
          </button>
        )}
      </div>
    </div>
  );
}
