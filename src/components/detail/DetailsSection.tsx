import { lazy, Suspense } from "react";
import GatedSection from "@/components/shared/GatedSection";
import PriceAlertSignup from "@/components/alerts/PriceAlertSignup";
import FripladsCalculator from "@/components/detail/FripladsCalculator";
import ArbejdstilsynSection from "@/components/detail/ArbejdstilsynSection";
import TilsynRapportSection from "@/components/tilsyn/TilsynRapportSection";
import ReviewSection from "@/components/detail/ReviewSection";
import PriceSection from "@/components/detail/PriceSection";
import NormeringSection from "@/components/detail/NormeringSection";
import type { UnifiedInstitution, NormeringEntry, TilsynRapport } from "@/lib/types";

const PriceHistoryChart = lazy(() => import("@/components/charts/PriceHistoryChart"));
const InstitutionMap = lazy(() => import("@/components/map/InstitutionMap"));

interface DetailsSectionProps {
  inst: UnifiedInstitution;
  nearby: (UnifiedInstitution & { dist: number })[];
  municipalityAvgPrice: number | null;
  normering: NormeringEntry[];
  tilsynRapporter: Record<string, TilsynRapport[]>;
  reviews: { rating: number }[];
  unlocked: boolean;
  onRequestUnlock: () => void;
  language: string;
  t: any;
}

export default function DetailsSection({
  inst, nearby, municipalityAvgPrice, normering,
  tilsynRapporter, reviews, unlocked, onRequestUnlock, language, t,
}: DetailsSectionProps) {
  return (
    <section className="max-w-[1020px] mx-auto px-4 pb-12 space-y-6">
      <PriceSection inst={inst} municipalityAvgPrice={municipalityAvgPrice} unlocked={unlocked} onRequestUnlock={onRequestUnlock} language={language} t={t} />

      {inst.annualRate && inst.annualRate > 0 && !["skole", "efterskole", "fritidsklub"].includes(inst.category) && (
        <FripladsCalculator annualRate={inst.annualRate} label={`${t.friplads.title} — ${inst.name}`} />
      )}

      <NormeringSection inst={inst} normering={normering} unlocked={unlocked} onRequestUnlock={onRequestUnlock} />

      <GatedSection unlocked={unlocked} onRequestUnlock={onRequestUnlock}>
        <ArbejdstilsynSection institutionId={inst.id} institutionName={inst.name} />
      </GatedSection>

      <GatedSection unlocked={unlocked} onRequestUnlock={onRequestUnlock}>
        <Suspense fallback={<div className="h-[250px] bg-border/20 rounded-xl animate-pulse" />}>
          <PriceHistoryChart institutionId={inst.id} institutionName={inst.name} />
        </Suspense>
      </GatedSection>

      {!["skole", "efterskole", "gymnasium"].includes(inst.category) && (
        <PriceAlertSignup municipality={inst.municipality} category={inst.category} compact />
      )}

      <Suspense fallback={<div className="h-[250px] bg-border/20 rounded-xl animate-pulse" />}>
        <div className="h-[250px] rounded-xl overflow-hidden border border-border">
          <InstitutionMap
            institutions={[inst, ...nearby]}
            onSelect={() => {}}
            flyTo={{ lat: inst.lat, lng: inst.lng, zoom: 14 }}
          />
        </div>
      </Suspense>

      {tilsynRapporter[inst.id]?.length > 0 && (
        <GatedSection unlocked={unlocked} onRequestUnlock={onRequestUnlock}>
          <TilsynRapportSection reports={tilsynRapporter[inst.id]} institutionName={inst.name} />
        </GatedSection>
      )}

      {reviews.length > 0 && (
        <div id="section-anmeldelser">
          <ReviewSection institutionId={inst.id} />
        </div>
      )}
    </section>
  );
}
