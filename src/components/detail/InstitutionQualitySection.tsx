import type { InstitutionStats, KommuneStats } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { GraduationCap, Users, Heart } from "lucide-react";

interface Props {
  stats: InstitutionStats | undefined;
  kommuneStats: KommuneStats | undefined;
  municipality: string;
  category: string;
}

function StatCard({ icon, label, value, subtext, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  color?: "green" | "amber" | "red" | "neutral";
}) {
  const colorMap = {
    green: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800",
    amber: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
    red: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
    neutral: "bg-bg-card border-border",
  };

  return (
    <div className={`rounded-lg border p-3 ${colorMap[color ?? "neutral"]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted">{label}</span>
      </div>
      <p className="font-mono text-lg font-bold text-foreground">{value}</p>
      {subtext && <p className="text-[10px] text-muted mt-0.5">{subtext}</p>}
    </div>
  );
}

function normeringColor(ratio: number | null, ageGroup: "0-2" | "3-5"): "green" | "amber" | "red" | "neutral" {
  if (ratio == null) return "neutral";
  const good = ageGroup === "0-2" ? 3.0 : 6.0;
  const bad = ageGroup === "0-2" ? 4.0 : 8.0;
  if (ratio <= good) return "green";
  if (ratio <= bad) return "amber";
  return "red";
}

function staffColor(pct: number | null): "green" | "amber" | "red" | "neutral" {
  if (pct == null) return "neutral";
  if (pct >= 65) return "green";
  if (pct >= 50) return "amber";
  return "red";
}

function satisfactionColor(score: number | null): "green" | "amber" | "red" | "neutral" {
  if (score == null) return "neutral";
  if (score >= 4.0) return "green";
  if (score >= 3.5) return "amber";
  return "red";
}

export default function InstitutionQualitySection({ stats, kommuneStats, municipality, category }: Props) {
  const { language: lang } = useLanguage();

  const hasInstData = stats && (stats.normering02 != null || stats.normering35 != null || stats.pctPaedagoger != null || stats.parentSatisfaction != null);
  const hasKomData = kommuneStats && (kommuneStats.avgSygefravaerDage != null || kommuneStats.udgiftPrBarn != null);

  if (!hasInstData && !hasKomData) return null;

  const isDagtilbud = ["vuggestue", "boernehave", "dagpleje", "sfo"].includes(category);
  const ageGroup: "0-2" | "3-5" = (category === "vuggestue" || category === "dagpleje") ? "0-2" : "3-5";
  const relevantNormering = ageGroup === "0-2" ? stats?.normering02 : stats?.normering35;

  return (
    <div className="card p-5">
      <h2 className="font-display text-lg font-semibold mb-4">
        {lang === "da" ? "Kvalitetsdata" : "Quality Data"}
      </h2>

      {/* Per-institution stats */}
      {hasInstData && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Normering per institution */}
          {relevantNormering != null && isDagtilbud && (
            <StatCard
              icon={<Users className="w-4 h-4 text-primary" />}
              label={lang === "da" ? `Normering (${ageGroup} år)` : `Staff ratio (${ageGroup} yr)`}
              value={`${relevantNormering.toFixed(1).replace(".", ",")} ${lang === "da" ? "børn/voksen" : "children/adult"}`}
              subtext={lang === "da"
                ? `Anbefalet: max ${ageGroup === "0-2" ? "3,0" : "6,0"}`
                : `Recommended: max ${ageGroup === "0-2" ? "3.0" : "6.0"}`}
              color={normeringColor(relevantNormering, ageGroup)}
            />
          )}

          {/* Staff education */}
          {stats?.pctPaedagoger != null && (
            <StatCard
              icon={<GraduationCap className="w-4 h-4 text-primary" />}
              label={lang === "da" ? "Uddannede pædagoger" : "Qualified pedagogues"}
              value={`${stats.pctPaedagoger.toFixed(0)}%`}
              subtext={
                kommuneStats?.pctPaedagogerKommune != null
                  ? `${lang === "da" ? "Kommunesnit" : "Muni. avg"}: ${kommuneStats.pctPaedagogerKommune.toFixed(0)}%`
                  : undefined
              }
              color={staffColor(stats.pctPaedagoger)}
            />
          )}

          {/* Parent satisfaction */}
          {stats?.parentSatisfaction != null && (
            <StatCard
              icon={<Heart className="w-4 h-4 text-red-400" />}
              label={lang === "da" ? "Forældretilfredshed" : "Parent satisfaction"}
              value={`${stats.parentSatisfaction.toFixed(1).replace(".", ",")} / 5`}
              subtext={
                stats.parentSatisfactionYear
                  ? `BTU ${stats.parentSatisfactionYear}`
                  : undefined
              }
              color={satisfactionColor(stats.parentSatisfaction)}
            />
          )}

          {/* Enrolled children count */}
          {stats?.antalBoern != null && (
            <StatCard
              icon={<Users className="w-4 h-4 text-blue-400" />}
              label={lang === "da" ? "Indskrevne børn" : "Enrolled children"}
              value={`${stats.antalBoern}`}
              color="neutral"
            />
          )}
        </div>
      )}

      {/* Staff education breakdown bar */}
      {stats?.pctPaedagoger != null && stats?.pctPaedAssistenter != null && (
        <div className="mb-4">
          <p className="text-xs text-muted mb-2">
            {lang === "da" ? "Personalets uddannelse" : "Staff education"}
          </p>
          <div className="flex h-4 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 transition-all"
              style={{ width: `${stats.pctPaedagoger}%` }}
              title={`${lang === "da" ? "Pædagoger" : "Pedagogues"}: ${stats.pctPaedagoger.toFixed(0)}%`}
            />
            <div
              className="bg-blue-400 transition-all"
              style={{ width: `${stats.pctPaedAssistenter}%` }}
              title={`${lang === "da" ? "Pæd. assistenter" : "Ped. assistants"}: ${stats.pctPaedAssistenter.toFixed(0)}%`}
            />
            {stats.pctUdenPaedUdd != null && (
              <div
                className="bg-gray-300 dark:bg-gray-600 transition-all"
                style={{ width: `${stats.pctUdenPaedUdd}%` }}
                title={`${lang === "da" ? "Uden pæd. uddannelse" : "No ped. education"}: ${stats.pctUdenPaedUdd.toFixed(0)}%`}
              />
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {lang === "da" ? "Pædagoger" : "Pedagogues"} {stats.pctPaedagoger.toFixed(0)}%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              {lang === "da" ? "Pæd. assistenter" : "Ped. assistants"} {stats.pctPaedAssistenter.toFixed(0)}%
            </span>
            {stats.pctUdenPaedUdd != null && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                {lang === "da" ? "Øvrige" : "Other"} {stats.pctUdenPaedUdd.toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* Kommune context stats */}
      {hasKomData && (
        <>
          <div className="border-t border-border/40 pt-4 mt-4">
            <p className="text-xs font-medium text-muted mb-3">
              {lang === "da" ? `Kommune-kontekst: ${municipality}` : `Municipal context: ${municipality}`}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {kommuneStats!.avgSygefravaerDage != null && (
                <div className="text-center p-2 rounded-lg bg-bg-card border border-border">
                  <p className="text-[10px] text-muted">{lang === "da" ? "Sygefravær" : "Sick leave"}</p>
                  <p className="font-mono text-sm font-bold">
                    {kommuneStats!.avgSygefravaerDage.toFixed(1).replace(".", ",")} {lang === "da" ? "dage" : "days"}
                  </p>
                  <p className="text-[9px] text-muted">{lang === "da" ? "Pædagoger/år" : "Pedagogues/yr"}</p>
                </div>
              )}
              {kommuneStats!.udgiftPrBarn != null && (
                <div className="text-center p-2 rounded-lg bg-bg-card border border-border">
                  <p className="text-[10px] text-muted">{lang === "da" ? "Udgift/barn" : "Cost/child"}</p>
                  <p className="font-mono text-sm font-bold">
                    {Math.round(kommuneStats!.udgiftPrBarn).toLocaleString("da-DK")} kr.
                  </p>
                  <p className="text-[9px] text-muted">{lang === "da" ? "0-13 år/år" : "Age 0-13/yr"}</p>
                </div>
              )}
              {kommuneStats!.sprogvurderingPctUdfordret != null && (
                <div className="text-center p-2 rounded-lg bg-bg-card border border-border">
                  <p className="text-[10px] text-muted">{lang === "da" ? "Sprogudfordrede" : "Language challenges"}</p>
                  <p className="font-mono text-sm font-bold">
                    {kommuneStats!.sprogvurderingPctUdfordret.toFixed(1).replace(".", ",")}%
                  </p>
                  <p className="text-[9px] text-muted">{lang === "da" ? "Af børnehaveklasse" : "Of kindergarten class"}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <p className="text-[10px] text-muted mt-3">
        {lang === "da"
          ? "Data fra Uddannelsesstatistik.dk, ISM Brugertilfredshedsundersøgelse og Danmarks Statistik"
          : "Data from Uddannelsesstatistik.dk, ISM User Satisfaction Survey and Statistics Denmark"}
      </p>
    </div>
  );
}
