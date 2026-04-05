import { Link } from "react-router-dom";
import { formatDKK } from "@/lib/format";
import { toSlug } from "@/lib/slugs";
import type { UnifiedInstitution } from "@/lib/types";

interface NearbyInstitution extends UnifiedInstitution {
  dist: number;
}

export default function SimilarInstitutions({
  inst,
  nearby,
  categoryLabels,
  language,
}: {
  inst: UnifiedInstitution;
  nearby: NearbyInstitution[];
  categoryLabels: Record<string, string>;
  language: string;
}) {
  if (nearby.length === 0) return null;

  return (
    <section className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="font-display text-xl font-bold text-foreground mb-4">
        {language === "da" ? "Lignende institutioner i nærheden" : "Similar institutions nearby"}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {nearby.slice(0, 5).map((n) => (
          <Link
            key={n.id}
            to={`/institution/${n.id}`}
            className="card p-4 hover:bg-primary/5 transition-colors block"
          >
            <p className="font-semibold text-sm text-foreground">{n.name}</p>
            <p className="text-xs text-muted">{n.address}, {n.postalCode} {n.city}</p>
            <div className="flex items-center gap-3 mt-2">
              {n.monthlyRate && (
                <span className="font-mono text-sm text-primary">{formatDKK(n.monthlyRate)}/md</span>
              )}
              <span className="text-xs text-muted">{n.dist.toFixed(1)} km</span>
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-4 text-center">
        <Link
          to={`/${inst.category}/${toSlug(inst.municipality)}`}
          className="text-sm text-primary hover:underline"
        >
          {language === "da"
            ? `Se alle ${categoryLabels[inst.category] || inst.category} i ${inst.municipality}`
            : `See all ${categoryLabels[inst.category] || inst.category} in ${inst.municipality}`}
        </Link>
      </div>
    </section>
  );
}
