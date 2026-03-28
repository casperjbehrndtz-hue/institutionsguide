import { useRef, useEffect } from "react";
import { X, MapPin, ExternalLink, Mail, Phone, Plus, Star, Heart } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFavorites } from "@/hooks/useFavorites";
import type { UnifiedInstitution } from "@/lib/types";
import { formatDKK } from "@/lib/format";
import FripladsCalculator from "./FripladsCalculator";
import ShareButton from "@/components/shared/ShareButton";

interface Props {
  institution: UnifiedInstitution;
  onClose: () => void;
  onCompare?: (inst: UnifiedInstitution) => void;
}

function QualityDot({ value, max = 5 }: { value: number | undefined; max?: number }) {
  if (value === undefined) return <span className="text-xs text-muted">–</span>;
  const pct = (value / max) * 100;
  const color = pct >= 70 ? "bg-success" : pct >= 40 ? "bg-warning" : "bg-destructive";
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="font-mono text-sm">{typeof value === "number" ? value.toLocaleString("da-DK") : value}</span>
    </div>
  );
}

export default function InstitutionDetail({ institution: inst, onClose, onCompare }: Props) {
  const { t } = useLanguage();
  const { toggleFavorite, isFavorite } = useFavorites();
  const panelRef = useRef<HTMLDivElement>(null);
  const q = inst.quality;

  // Move focus into the detail panel when it mounts
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

  function overallLabel(o: number | undefined): string {
    if (o === 1) return t.detail.aboveAvg;
    if (o === 0) return t.detail.average;
    if (o === -1) return t.detail.belowAvg;
    return t.common.unknown;
  }

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label={inst.name}
      tabIndex={-1}
      className="card p-5 sm:p-6 animate-fade-in overflow-y-auto max-h-[90vh] focus:outline-none"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
            {inst.name}
          </h2>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              {categoryLabels[inst.category] || inst.category}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-border text-muted">
              {subtypeLabels[inst.subtype] || inst.subtype}
            </span>
            {q?.o !== undefined && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                q.o === 1 ? "bg-success/10 text-success" :
                q.o === 0 ? "bg-warning/10 text-warning" :
                "bg-destructive/10 text-destructive"
              }`}>
                {overallLabel(q.o)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ShareButton title={inst.name} url={`/institution/${inst.id}`} />
          <button
            onClick={() => toggleFavorite(inst.id)}
            className="p-2 rounded-lg hover:bg-red-50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={isFavorite(inst.id) ? t.favorites.removeFavorite : t.favorites.addFavorite}
          >
            <Heart className={`w-5 h-5 transition-colors ${isFavorite(inst.id) ? "text-red-500 fill-red-500" : "text-muted hover:text-red-400"}`} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-border/50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={t.common.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Address */}
      <div className="flex items-start gap-2 text-sm text-muted mb-4">
        <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
        <span>{inst.address}, {inst.postalCode} {inst.city} — {inst.municipality}</span>
      </div>

      {/* Quality indicators (schools) */}
      {q && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <span className="text-xs text-muted">{t.detail.wellbeing}</span>
            <QualityDot value={q.ts} />
          </div>
          <div>
            <span className="text-xs text-muted">{t.detail.grades}</span>
            <QualityDot value={q.k} max={12} />
          </div>
          <div>
            <span className="text-xs text-muted">{t.detail.absence}</span>
            {q.fp !== undefined ? (
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${q.fp < 6 ? "bg-success" : q.fp < 9 ? "bg-warning" : "bg-destructive"}`} />
                <span className="font-mono text-sm">{q.fp?.toLocaleString("da-DK")}%</span>
              </div>
            ) : (
              <span className="text-xs text-muted">–</span>
            )}
          </div>
          <div>
            <span className="text-xs text-muted">{t.detail.competenceCoverage}</span>
            {q.kp !== undefined ? (
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${q.kp! >= 80 ? "bg-success" : q.kp! >= 60 ? "bg-warning" : "bg-destructive"}`} />
                <span className="font-mono text-sm">{q.kp?.toLocaleString("da-DK")}%</span>
              </div>
            ) : (
              <span className="text-xs text-muted">–</span>
            )}
          </div>
          <div>
            <span className="text-xs text-muted">{t.detail.teachingEffect}</span>
            <span className="text-sm">{q.sr || "–"}</span>
          </div>
          <div>
            <span className="text-xs text-muted">{t.detail.classSize}</span>
            <span className="font-mono text-sm">{q.kv?.toLocaleString("da-DK") || "–"}</span>
          </div>
          <div>
            <span className="text-xs text-muted">{t.detail.studentCount}</span>
            <span className="font-mono text-sm">{q.el?.toLocaleString("da-DK") || "–"}</span>
          </div>
          {q.r !== undefined && (
            <div>
              <span className="text-xs text-muted">{t.detail.overallRating}</span>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-warning fill-warning" />
                <span className="font-mono text-sm">{q.r}/5</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rates */}
      <div className="flex gap-4 mb-5">
        <div className="bg-bg-card border border-border rounded-lg p-3 flex-1 text-center">
          <p className="text-xs text-muted mb-1">{t.detail.monthlyRate}</p>
          <p className="font-mono text-lg font-bold text-primary">
            {formatDKK(inst.monthlyRate)}
          </p>
          <p className="text-[10px] text-muted">{t.common.advisory}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-lg p-3 flex-1 text-center">
          <p className="text-xs text-muted mb-1">{t.detail.annualRate}</p>
          <p className="font-mono text-lg font-bold text-foreground">
            {formatDKK(inst.annualRate)}
          </p>
        </div>
      </div>

      {/* Friplads calculator */}
      {inst.annualRate && inst.annualRate > 0 && (
        <div className="mb-5">
          <FripladsCalculator annualRate={inst.annualRate} />
        </div>
      )}

      {/* Contact */}
      <div className="space-y-2 mb-5">
        {inst.email && (
          <a href={`mailto:${inst.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline min-h-[44px]">
            <Mail className="w-4 h-4" /> {inst.email}
          </a>
        )}
        {inst.phone && (
          <a href={`tel:${inst.phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline min-h-[44px]">
            <Phone className="w-4 h-4" /> {inst.phone}
          </a>
        )}
        {inst.web && (
          <a href={inst.web.startsWith("http") ? inst.web : `https://${inst.web}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline min-h-[44px]">
            <ExternalLink className="w-4 h-4" /> {t.detail.website}
          </a>
        )}
        {/* Leader name removed — no GDPR legal basis to display personal names */}
      </div>

      {/* Compare button */}
      {onCompare && (
        <button
          onClick={() => onCompare(inst)}
          className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary-light transition-colors flex items-center justify-center gap-2 min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          {t.detail.addToCompare}
        </button>
      )}
    </div>
  );
}
