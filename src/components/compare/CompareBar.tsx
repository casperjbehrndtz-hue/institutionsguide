import { X, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { UnifiedInstitution } from "@/lib/types";
import { formatDKK as _formatDKK } from "@/lib/format";

interface Props {
  selected: UnifiedInstitution[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

function formatDKK(val: number | null): string {
  if (val === null) return "–";
  return _formatDKK(val);
}

function categoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    vuggestue: "Vuggestue",
    boernehave: "Børnehave",
    dagpleje: "Dagpleje",
    skole: "Skole",
    sfo: "SFO",
  };
  return labels[cat] || cat;
}

export default function CompareBar({ selected, onRemove, onClear }: Props) {
  if (selected.length === 0) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-bg-card border-t border-border p-4 animate-fade-in shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted shrink-0">
          Sammenlign ({selected.length}/4):
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
                aria-label={`Fjern ${inst.name} fra sammenligning`}
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
            aria-label="Ryd sammenligning"
          >
            Ryd
          </button>
          {selected.length >= 2 && (
            <Link
              to="/sammenlign"
              state={{ institutions: selected }}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary-light transition-colors flex items-center gap-2 min-h-[44px]"
              aria-label="Vis sammenligning"
            >
              Vis sammenligning
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
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="table">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-muted font-medium" scope="col">Egenskab</th>
            {institutions.map((inst) => (
              <th key={inst.id} className="text-left py-3 px-4 font-semibold text-foreground min-w-[200px]" scope="col">
                {inst.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border/50">
            <td className="py-2 px-4 text-muted">Kategori</td>
            {institutions.map((i) => <td key={i.id} className="py-2 px-4">{categoryLabel(i.category)}</td>)}
          </tr>
          <tr className="border-b border-border/50">
            <td className="py-2 px-4 text-muted">Kommune</td>
            {institutions.map((i) => <td key={i.id} className="py-2 px-4">{i.municipality}</td>)}
          </tr>
          <tr className="border-b border-border/50">
            <td className="py-2 px-4 text-muted">Adresse</td>
            {institutions.map((i) => <td key={i.id} className="py-2 px-4 text-xs">{i.address}, {i.postalCode} {i.city}</td>)}
          </tr>
          <tr className="border-b border-border/50">
            <td className="py-2 px-4 text-muted">Månedlig takst</td>
            {institutions.map((i) => <td key={i.id} className="py-2 px-4 font-mono font-medium">{formatDKK(i.monthlyRate)}</td>)}
          </tr>
          <tr className="border-b border-border/50">
            <td className="py-2 px-4 text-muted">Årlig takst</td>
            {institutions.map((i) => <td key={i.id} className="py-2 px-4 font-mono">{formatDKK(i.annualRate)}</td>)}
          </tr>
          <tr className="border-b border-border/50">
            <td className="py-2 px-4 text-muted">Type</td>
            {institutions.map((i) => <td key={i.id} className="py-2 px-4">{i.subtype}</td>)}
          </tr>
          {institutions.some((i) => i.quality) && (
            <>
              <tr className="border-b border-border/50">
                <td className="py-2 px-4 text-muted">Trivsel</td>
                {institutions.map((i) => <td key={i.id} className="py-2 px-4 font-mono">{i.quality?.ts?.toLocaleString("da-DK") || "–"}</td>)}
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 px-4 text-muted">Karaktersnit</td>
                {institutions.map((i) => <td key={i.id} className="py-2 px-4 font-mono">{i.quality?.k?.toLocaleString("da-DK") || "–"}</td>)}
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 px-4 text-muted">Fravær %</td>
                {institutions.map((i) => <td key={i.id} className="py-2 px-4 font-mono">{i.quality?.fp?.toLocaleString("da-DK") || "–"}%</td>)}
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 px-4 text-muted">Kompetencedækning</td>
                {institutions.map((i) => <td key={i.id} className="py-2 px-4 font-mono">{i.quality?.kp?.toLocaleString("da-DK") || "–"}%</td>)}
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 px-4 text-muted">Elevtal</td>
                {institutions.map((i) => <td key={i.id} className="py-2 px-4 font-mono">{i.quality?.el?.toLocaleString("da-DK") || "–"}</td>)}
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 px-4 text-muted">Klassekvotient</td>
                {institutions.map((i) => <td key={i.id} className="py-2 px-4 font-mono">{i.quality?.kv?.toLocaleString("da-DK") || "–"}</td>)}
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
