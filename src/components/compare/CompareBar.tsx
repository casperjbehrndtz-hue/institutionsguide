import { X, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { UnifiedInstitution } from "@/lib/types";
import { useCompare } from "@/contexts/CompareContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDKK } from "@/lib/format";

// Props kept for backwards compatibility — CompareBar now reads from CompareContext
interface LegacyProps {
  selected?: UnifiedInstitution[];
  onRemove?: (id: string) => void;
  onClear?: () => void;
}

export default function CompareBar(_props?: LegacyProps) {
  const { compareList: selected, removeFromCompare: onRemove, clearCompare: onClear } = useCompare();
  const { t } = useLanguage();

  if (selected.length === 0) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-bg-card border-t border-border p-4 animate-fade-in shadow-[0_-4px_20px_rgba(0,0,0,0.06)]" role="region" aria-label={t.compare.barAriaLabel} aria-live="polite">
      <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted shrink-0">
          {t.compare.barTitle.replace("{count}", String(selected.length))}
        </span>

        <div className="flex flex-wrap gap-2 flex-1">
          {selected.map((inst) => (
            <span
              key={inst.id}
              className="inline-flex items-center gap-1.5 bg-primary/10 text-primary rounded-full px-3 py-1.5 text-sm"
            >
              {inst.name}
              <button
                onClick={() => onRemove(inst.id)}
                className="p-0.5 hover:bg-primary/20 rounded-full min-w-[28px] min-h-[28px] flex items-center justify-center"
                aria-label={t.compare.removeAriaLabel.replace("{name}", inst.name)}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClear}
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
  );
}

// Comparison table for full page
export function ComparisonTable({ institutions }: { institutions: UnifiedInstitution[] }) {
  const { t } = useLanguage();

  function categoryLabel(cat: string): string {
    const key = cat as keyof typeof t.categories;
    return t.categories[key] || cat;
  }

  return (
    <div className="overflow-x-auto">
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
          <tr className="border-b border-border/50">
            <td className="py-2 px-4 text-muted">{t.compare.category}</td>
            {institutions.map((i) => <td key={i.id} className="py-2 px-4">{categoryLabel(i.category)}</td>)}
          </tr>
          <tr className="border-b border-border/50">
            <td className="py-2 px-4 text-muted">{t.compare.municipality}</td>
            {institutions.map((i) => <td key={i.id} className="py-2 px-4">{i.municipality}</td>)}
          </tr>
          <tr className="border-b border-border/50">
            <td className="py-2 px-4 text-muted">{t.compare.address}</td>
            {institutions.map((i) => <td key={i.id} className="py-2 px-4 text-xs">{i.address}, {i.postalCode} {i.city}</td>)}
          </tr>
          <tr className="border-b border-border/50">
            <td className="py-2 px-4 text-muted">{t.compare.monthlyRate}</td>
            {institutions.map((i) => <td key={i.id} className="py-2 px-4 font-mono font-medium">{formatDKK(i.monthlyRate)}</td>)}
          </tr>
          <tr className="border-b border-border/50">
            <td className="py-2 px-4 text-muted">{t.compare.annualRate}</td>
            {institutions.map((i) => <td key={i.id} className="py-2 px-4 font-mono">{formatDKK(i.annualRate)}</td>)}
          </tr>
          <tr className="border-b border-border/50">
            <td className="py-2 px-4 text-muted">{t.compare.type}</td>
            {institutions.map((i) => <td key={i.id} className="py-2 px-4">{i.subtype}</td>)}
          </tr>
          {institutions.some((i) => i.quality) && (
            <>
              <tr className="border-b border-border/50">
                <td className="py-2 px-4 text-muted">{t.compare.wellbeing}</td>
                {institutions.map((i) => <td key={i.id} className="py-2 px-4 font-mono">{i.quality?.ts?.toLocaleString("da-DK") || "–"}</td>)}
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 px-4 text-muted">{t.compare.gradeAvg}</td>
                {institutions.map((i) => <td key={i.id} className="py-2 px-4 font-mono">{i.quality?.k?.toLocaleString("da-DK") || "–"}</td>)}
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 px-4 text-muted">{t.compare.absencePercent}</td>
                {institutions.map((i) => <td key={i.id} className="py-2 px-4 font-mono">{i.quality?.fp?.toLocaleString("da-DK") || "–"}%</td>)}
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 px-4 text-muted">{t.compare.competenceCoverage}</td>
                {institutions.map((i) => <td key={i.id} className="py-2 px-4 font-mono">{i.quality?.kp?.toLocaleString("da-DK") || "–"}%</td>)}
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 px-4 text-muted">{t.compare.studentCount}</td>
                {institutions.map((i) => <td key={i.id} className="py-2 px-4 font-mono">{i.quality?.el?.toLocaleString("da-DK") || "–"}</td>)}
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 px-4 text-muted">{t.compare.classSize}</td>
                {institutions.map((i) => <td key={i.id} className="py-2 px-4 font-mono">{i.quality?.kv?.toLocaleString("da-DK") || "–"}</td>)}
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
