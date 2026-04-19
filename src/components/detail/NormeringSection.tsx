import { lazy, Suspense } from "react";
import type { UnifiedInstitution, NormeringEntry } from "@/lib/types";

const NormeringBadge = lazy(() => import("@/components/charts/NormeringBadge"));

const AGE_GROUP_MAP: Record<string, string> = {
  vuggestue: "0-2", boernehave: "3-5", dagpleje: "dagpleje", sfo: "3-5",
};

interface NormeringSectionProps {
  inst: UnifiedInstitution;
  normering: NormeringEntry[];
}

export default function NormeringSection({ inst, normering }: NormeringSectionProps) {
  if (inst.category === "skole") return null;
  const ag = AGE_GROUP_MAP[inst.category];
  const latest = normering
    .filter((n) => n.municipality === inst.municipality && n.ageGroup === ag)
    .sort((a, b) => b.year - a.year);
  if (latest.length === 0) return null;
  const current = latest[0];
  const prev = latest.length > 1 ? latest[1] : undefined;

  return (
    <Suspense fallback={<div className="h-[250px] bg-border/20 rounded-xl animate-pulse" />}>
      <NormeringBadge
        municipality={inst.municipality}
        ageGroup={current.ageGroup}
        ratio={current.ratio}
        year={current.year}
        previousRatio={prev?.ratio}
      />
    </Suspense>
  );
}
