import { Phone, Mail, ExternalLink, MapPin, Shield } from "lucide-react";
import { formatDKK } from "@/lib/format";
import type { UnifiedInstitution, KommuneStats, InstitutionStats } from "@/lib/types";
import GoogleRatingBadge from "@/components/shared/GoogleRatingBadge";

interface Props {
  inst: UnifiedInstitution;
  language: "da" | "en";
  kommuneStats?: KommuneStats;
  instStats?: InstitutionStats;
  tilsynCount: number;
  tilsynClear: boolean;
  hasTilsynData?: boolean;
  googleRating?: { rating: number; review_count: number; maps_url: string | null } | null;
}

export default function InstitutionSidebar({ inst, language: lang, kommuneStats: ks, instStats, tilsynCount, tilsynClear, hasTilsynData, googleRating }: Props) {
  const q = inst.quality;

  return (
    <div className="flex flex-col gap-5">
      {/* Grades card — schools only */}
      {q?.k != null && (
        <div className="bg-bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
          <h3 className="font-display text-[15px] font-medium text-foreground mb-4">
            {lang === "da" ? "Nøgletal" : "Key figures"}
          </h3>
          <div className="text-center mb-4">
            <span className="font-mono text-4xl font-medium text-foreground">{q.k.toLocaleString("da-DK")}</span>
            <div className="text-xs text-muted mt-1">
              {lang === "da" ? "gennemsnit" : "average"}
            </div>
          </div>
          {/* Subject breakdown */}
          <div className="space-y-0">
            {[
              { l: lang === "da" ? "Elever" : "Students", v: q.el?.toLocaleString("da-DK") },
              { l: lang === "da" ? "Klassestørrelse" : "Class size", v: q.kv?.toLocaleString("da-DK") },
              { l: lang === "da" ? "Kompetencedækning" : "Qualifications", v: q.kp != null ? `${q.kp.toLocaleString("da-DK")}%` : null },
              { l: lang === "da" ? "Undervisningseffekt" : "Teaching effect", v: q.sr },
            ].filter(s => s.v != null).map((s, i) => (
              <div key={i} className="flex justify-between py-2 border-t border-border/30">
                <span className="text-[13px] text-muted">{s.l}</span>
                <span className="font-mono text-sm font-medium text-foreground">{s.v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Normering card — dagtilbud only */}
      {instStats && (instStats.normering02 != null || instStats.normering35 != null) && (
        <div className="bg-bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
          <h3 className="font-display text-base font-medium text-foreground mb-4">
            {lang === "da" ? "Normering" : "Staffing ratio"}
          </h3>
          <div className="text-center mb-4">
            <span className="font-mono text-4xl font-medium text-foreground">
              {(instStats.normering02 ?? instStats.normering35)?.toLocaleString("da-DK")}
            </span>
            <div className="text-xs text-muted mt-1">
              {lang === "da" ? "børn pr. voksen" : "children per adult"}
            </div>
          </div>
          <div className="space-y-0">
            {instStats.pctPaedagoger != null && (
              <div className="flex justify-between py-2 border-t border-border/30">
                <span className="text-[13px] text-muted">{lang === "da" ? "Pædagoger" : "Educators"}</span>
                <span className="font-mono text-sm font-medium text-foreground">{instStats.pctPaedagoger.toLocaleString("da-DK")}%</span>
              </div>
            )}
            {instStats.antalBoern != null && (
              <div className="flex justify-between py-2 border-t border-border/30">
                <span className="text-[13px] text-muted">{lang === "da" ? "Antal børn" : "Children"}</span>
                <span className="font-mono text-sm font-medium text-foreground">{instStats.antalBoern}</span>
              </div>
            )}
            {instStats.parentSatisfaction != null && (
              <div className="flex justify-between py-2 border-t border-border/30">
                <span className="text-[13px] text-muted">{lang === "da" ? "Forældretilfredshed" : "Parent satisfaction"}</span>
                <span className="font-mono text-sm font-medium text-foreground">{instStats.parentSatisfaction.toLocaleString("da-DK")}/5</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Kontakt */}
      {(inst.phone || inst.email || inst.web) && (
        <div className="bg-bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
          <h3 className="font-display text-base font-medium text-foreground mb-3">
            {lang === "da" ? "Kontakt" : "Contact"}
          </h3>
          <div className="text-sm text-muted leading-relaxed mb-4 flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{inst.address}, {inst.postalCode} {inst.city}</span>
          </div>
          <div className="space-y-2">
            {inst.phone && (
              <a href={`tel:${inst.phone}`} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary/5 text-sm text-primary font-medium hover:bg-primary/10 transition-colors">
                <Phone className="w-4 h-4" /> {inst.phone}
              </a>
            )}
            {inst.email && (
              <a href={`mailto:${inst.email}`} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary/5 text-sm text-foreground font-medium hover:bg-primary/10 transition-colors">
                <Mail className="w-4 h-4" /> {lang === "da" ? "Send email" : "Send email"}
              </a>
            )}
            {inst.web && (
              <a href={inst.web.startsWith("http") ? inst.web : `https://${inst.web}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary/5 text-sm text-foreground font-medium hover:bg-primary/10 transition-colors">
                <ExternalLink className="w-4 h-4" /> {lang === "da" ? "Hjemmeside" : "Website"}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Kommune kontekst */}
      {ks && (ks.avgSygefravaerDage != null || ks.udgiftPrBarn != null) && (
        <div className="bg-bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
          <h3 className="font-display text-base font-medium text-foreground mb-4">
            {inst.municipality}
          </h3>
          <div className="space-y-0">
            {ks.avgSygefravaerDage != null && (
              <div className="flex justify-between py-2 border-t border-border/30">
                <span className="text-[13px] text-muted">{lang === "da" ? "Sygefravær" : "Sick leave"}</span>
                <div className="text-right">
                  <span className="font-mono text-sm font-medium text-foreground">{ks.avgSygefravaerDage.toLocaleString("da-DK")} {lang === "da" ? "dage" : "days"}</span>
                  <div className="text-[10px] text-muted">{lang === "da" ? "pædagoger/år" : "educators/year"}</div>
                </div>
              </div>
            )}
            {ks.udgiftPrBarn != null && (
              <div className="flex justify-between py-2 border-t border-border/30">
                <span className="text-[13px] text-muted">{lang === "da" ? "Udgift pr. barn" : "Cost per child"}</span>
                <div className="text-right">
                  <span className="font-mono text-sm font-medium text-foreground">{formatDKK(ks.udgiftPrBarn)}</span>
                  <div className="text-[10px] text-muted">{lang === "da" ? "0-13 år/år" : "ages 0-13/year"}</div>
                </div>
              </div>
            )}
            {ks.pctPaedagogerKommune != null && (
              <div className="flex justify-between py-2 border-t border-border/30">
                <span className="text-[13px] text-muted">{lang === "da" ? "Pædagoger i kommunen" : "Educators in municipality"}</span>
                <span className="font-mono text-sm font-medium text-foreground">{ks.pctPaedagogerKommune.toLocaleString("da-DK")}%</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Google rating */}
      {googleRating && (
        <div className="bg-bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
          <h3 className="font-display text-base font-medium text-foreground mb-3">
            Google
          </h3>
          <GoogleRatingBadge
            rating={googleRating.rating}
            reviewCount={googleRating.review_count}
            mapsUrl={googleRating.maps_url}
          />
        </div>
      )}

      {/* Tilsyn badge — only show when we have real tilsyn data */}
      {hasTilsynData && (
        <div className={`rounded-2xl p-4 flex items-center gap-3 border ${
          tilsynClear
            ? "bg-[#0d7c5f]/[0.04] border-[#0d7c5f]/10"
            : "bg-amber-50 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-800/50"
        }`}>
          <Shield className={`w-5 h-5 shrink-0 ${tilsynClear ? "text-[#0d7c5f]" : "text-amber-600 dark:text-amber-400"}`} />
          <span className={`text-[13px] font-medium ${tilsynClear ? "text-[#2a5a4a] dark:text-green-400" : "text-amber-800 dark:text-amber-300"}`}>
            {tilsynClear
              ? (lang === "da" ? "Ingen aktive påbud" : "No active orders")
              : (lang === "da" ? `${tilsynCount} aktive påbud` : `${tilsynCount} active orders`)}
          </span>
        </div>
      )}
    </div>
  );
}
