import React, { useState } from "react";
import { X, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { UnifiedInstitution } from "@/lib/types";
import { useCompare } from "@/contexts/CompareContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDKK } from "@/lib/format";

export default function CompareBar() {
  const { compareList: selected, removeFromCompare: onRemove, clearCompare } = useCompare();
  const { t, language } = useLanguage();
  const [showConfirm, setShowConfirm] = useState(false);
  const [minimized, setMinimized] = useState(false);

  if (selected.length === 0) return null;

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="print:hidden fixed bottom-4 right-4 z-40 bg-primary text-primary-foreground px-4 py-2.5 rounded-full shadow-lg text-sm font-medium hover:bg-primary-light transition-colors min-h-[44px]"
      >
        {t.compare.barTitle.replace("{count}", String(selected.length))}
      </button>
    );
  }

  return (
    <>
      <div className="print:hidden fixed bottom-0 inset-x-0 z-40 bg-bg-card border-t border-border p-4 animate-fade-in shadow-[0_-4px_20px_rgba(0,0,0,0.06)]" role="region" aria-label={t.compare.barAriaLabel} aria-live="polite">
        <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
          <span className="text-sm text-muted shrink-0">
            {t.compare.barTitle.replace("{count}", String(selected.length))}
          </span>

          <div className="flex flex-wrap gap-2 flex-1">
            {selected.map((inst) => (
              <span
                key={inst.id}
                className="inline-flex items-center gap-1.5 bg-primary/10 text-primary rounded-full px-3 py-1.5 text-sm max-w-[200px]"
                title={inst.name}
              >
                <span className="truncate">{inst.name}</span>
                <button
                  onClick={() => onRemove(inst.id)}
                  className="p-1 hover:bg-primary/20 rounded-full flex items-center justify-center shrink-0"
                  aria-label={t.compare.removeAriaLabel.replace("{name}", inst.name)}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setMinimized(true)}
              className="lg:hidden px-2 py-2 text-sm border border-border rounded-lg text-muted hover:bg-border/30 transition-colors min-h-[44px]"
              aria-label={language === "da" ? "Minimer" : "Minimize"}
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className="px-3 py-2 text-sm border border-border rounded-lg text-muted hover:bg-border/30 transition-colors min-h-[44px]"
              aria-label={t.compare.clearAriaLabel}
            >
              {t.compare.clear}
            </button>
            {selected.length >= 2 && (
              <Link
                to="/sammenlign"
                state={{ institutions: selected }}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary-light transition-colors flex items-center gap-2 min-h-[44px]"
                aria-label={t.compare.show}
              >
                {t.compare.show}
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Confirm clear dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-clear-title" onClick={() => setShowConfirm(false)}>
          <div className="bg-bg-card rounded-xl shadow-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <p id="confirm-clear-title" className="text-foreground font-medium mb-2">
              {language === "da" ? "Ryd sammenligning?" : "Clear comparison?"}
            </p>
            <p className="text-sm text-muted mb-5">
              {language === "da"
                ? `${selected.length} institutioner vil blive fjernet fra sammenligningen.`
                : `${selected.length} institutions will be removed from the comparison.`}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-border/30 transition-colors min-h-[44px]"
              >
                {language === "da" ? "Annuller" : "Cancel"}
              </button>
              <button
                onClick={() => { clearCompare(); setShowConfirm(false); }}
                className="px-4 py-2 text-sm rounded-lg bg-destructive text-white hover:bg-destructive/90 transition-colors min-h-[44px]"
              >
                {language === "da" ? "Ryd alle" : "Clear all"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Green/amber/red for metric quality — matches ScoreRing/ComparisonTable pattern
const METRIC_COLOR = (value: number, max: number) => {
  const pct = value / max;
  return pct >= 0.7 ? "#0d7c5f" : pct >= 0.5 ? "#b8860b" : "#c0392b";
};

// Comparison table for full page
export function ComparisonTable({ institutions }: { institutions: UnifiedInstitution[] }) {
  const { t } = useLanguage();

  function categoryLabel(cat: string): string {
    const key = cat as keyof typeof t.categories;
    return t.categories[key] || cat;
  }

  const hasQuality = institutions.some((i) => i.quality);

  // "higher" = higher is better, "lower" = lower is better
  type Row = {
    label: string;
    render: (i: UnifiedInstitution) => string;
    value?: (i: UnifiedInstitution) => number | null;
    best?: "higher" | "lower";
    max?: number; // for color scaling
  };

  const rows: Row[] = [
    { label: t.compare.category, render: (i) => categoryLabel(i.category) },
    { label: t.compare.municipality, render: (i) => i.municipality },
    { label: t.compare.address, render: (i) => `${i.address}, ${i.postalCode} ${i.city}` },
    { label: t.compare.monthlyRate, render: (i) => formatDKK(i.monthlyRate), value: (i) => i.monthlyRate ?? null, best: "lower" },
    { label: t.compare.annualRate, render: (i) => formatDKK(i.annualRate), value: (i) => i.annualRate ?? null, best: "lower" },
    { label: t.compare.type, render: (i) => i.subtype || "–" },
  ];
  if (hasQuality) {
    rows.push(
      { label: t.compare.wellbeing, render: (i) => i.quality?.ts?.toLocaleString("da-DK") || "–", value: (i) => i.quality?.ts ?? null, best: "higher", max: 5 },
      { label: t.compare.gradeAvg, render: (i) => i.quality?.k?.toLocaleString("da-DK") || "–", value: (i) => i.quality?.k ?? null, best: "higher", max: 12 },
      { label: t.compare.absencePercent, render: (i) => i.quality?.fp != null ? `${i.quality.fp.toLocaleString("da-DK")}%` : "–", value: (i) => i.quality?.fp ?? null, best: "lower", max: 15 },
      { label: t.compare.competenceCoverage, render: (i) => i.quality?.kp != null ? `${i.quality.kp.toLocaleString("da-DK")}%` : "–", value: (i) => i.quality?.kp ?? null, best: "higher", max: 100 },
      { label: t.compare.studentCount, render: (i) => i.quality?.el?.toLocaleString("da-DK") || "–" },
      { label: t.compare.classSize, render: (i) => i.quality?.kv?.toLocaleString("da-DK") || "–" },
    );
  }

  // Precompute winner index per row
  function getWinnerIdx(row: Row): number | null {
    if (!row.value || !row.best) return null;
    const vals = institutions.map((i) => row.value!(i));
    const valid = vals.filter((v): v is number => v != null);
    if (valid.length < 2) return null;
    const target = row.best === "higher" ? Math.max(...valid) : Math.min(...valid);
    const idx = vals.indexOf(target);
    // Only mark winner if it's strictly better than at least one other
    const unique = new Set(valid);
    return unique.size > 1 ? idx : null;
  }

  function metricStyle(row: Row, inst: UnifiedInstitution, isWinner: boolean) {
    if (!row.value) return {};
    const v = row.value(inst);
    if (v == null) return {};
    const style: React.CSSProperties = {};
    if (row.max) {
      // For absence (lower is better), invert for color: low absence = green
      const colorVal = row.best === "lower" ? row.max - v : v;
      style.color = METRIC_COLOR(colorVal, row.max);
    }
    if (isWinner) style.fontWeight = 700;
    return style;
  }

  return (
    <>
      {/* Mobile: swipeable cards with scroll-snap */}
      <div className="sm:hidden">
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-3 no-scrollbar">
          {institutions.map((inst, idx) => (
            <div
              key={inst.id}
              className="snap-start shrink-0 w-[85vw] max-w-[320px] card p-4 space-y-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                <h3 className="font-display font-semibold text-foreground text-sm truncate">{inst.name}</h3>
              </div>
              {rows.map((row) => {
                const winnerIdx = getWinnerIdx(row);
                const isWinner = winnerIdx === idx;
                return (
                  <div key={row.label} className="flex justify-between gap-2 py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-xs text-muted shrink-0">{row.label}</span>
                    <span
                      className="text-sm font-medium text-right"
                      style={metricStyle(row, inst, isWinner)}
                    >
                      {isWinner && <span className="mr-1" aria-label="Bedst">✦</span>}
                      {row.render(inst)}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-1.5 mt-2">
          {institutions.map((inst) => (
            <div key={inst.id} className="w-2 h-2 rounded-full bg-border" aria-hidden="true" />
          ))}
        </div>
        <p className="text-center text-xs text-muted mt-1">Swipe for at sammenligne</p>
      </div>

      {/* Desktop: table view */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-muted font-medium" scope="col">{t.compare.property}</th>
              {institutions.map((inst) => (
                <th key={inst.id} className="text-left py-3 px-4 font-semibold text-foreground min-w-[200px]" scope="col">
                  {inst.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const winnerIdx = getWinnerIdx(row);
              return (
                <tr key={row.label} className="border-b border-border/50">
                  <td className="py-2 px-4 text-muted">{row.label}</td>
                  {institutions.map((i, idx) => {
                    const isWinner = winnerIdx === idx;
                    return (
                      <td
                        key={i.id}
                        className="py-2 px-4 font-mono"
                        style={metricStyle(row, i, isWinner)}
                      >
                        {isWinner && <span className="mr-1 text-xs" aria-label="Bedst">✦</span>}
                        {row.render(i)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
