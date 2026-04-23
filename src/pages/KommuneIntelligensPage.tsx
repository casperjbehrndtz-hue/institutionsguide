import { useMunicipalityIntelligence } from "@/hooks/useMunicipalityIntelligence";
import { useTrack } from "@/contexts/TrackContext";
import LifeStageToggle from "@/components/mi/LifeStageToggle";
import WeightSliders from "@/components/mi/WeightSliders";
import MunicipalityLeaderboard from "@/components/mi/MunicipalityLeaderboard";
import SEOHead from "@/components/shared/SEOHead";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import JsonLd from "@/components/shared/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";

export default function KommuneIntelligensPage() {
  const { track } = useTrack();
  const { municipalities, nationalMean, ready } = useMunicipalityIntelligence();
  const trackLabel = track === "daycare" ? "Dagtilbud" : "Folkeskole";

  return (
    <>
      <SEOHead
        title="Kommune-intelligens — Sammenlign Danmarks 98 kommuner"
        description="Volumen-vægtet kvalitetsindeks for alle 98 kommuner. Justér selv vægten af normering, trivsel, undervisningseffekt og pris."
        path="/kommune-intelligens"
      />
      <JsonLd data={breadcrumbSchema([
        { name: "Forside", url: "https://www.institutionsguiden.dk/" },
        { name: "Kommune-intelligens", url: "https://www.institutionsguiden.dk/kommune-intelligens" },
      ])} />

      <Breadcrumbs items={[
        { label: "Forside", href: "/" },
        { label: "Kommune-intelligens" },
      ]} />

      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
        <header className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-4xl font-bold text-foreground mb-2">
              Kommune-intelligens
            </h1>
            <p className="text-muted max-w-2xl">
              Et to-spors kvalitetsindeks for Danmarks 98 kommuner.
              Kør dine egne prioriteter på datagrundlaget — leaderboardet genberegnes med det samme.
            </p>
          </div>
          <LifeStageToggle />
        </header>

        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-[340px] shrink-0">
            <div className="lg:sticky lg:top-20 space-y-3">
              <WeightSliders />
              <p className="text-[11px] text-muted px-1">
                Datakilder: Uddannelsesstatistik, Den Nationale Trivselsmåling,
                Danmarks Statistik, BUVM, KRL, BTU. Confidence-penalty α = 0,5
                ved kommune-median; α² = 0,25 ved landsmedian.
              </p>
            </div>
          </aside>

          <main className="flex-1 min-w-0">
            {!ready && (
              <div className="rounded-xl border border-border bg-bg-card p-4 mb-3 text-sm text-muted">
                Indlæser supplerende data — leaderboardet opdateres når metrikker er klar.
              </div>
            )}
            <MunicipalityLeaderboard
              municipalities={municipalities}
              nationalMean={nationalMean}
              trackLabel={trackLabel}
            />
          </main>
        </div>
      </div>
    </>
  );
}
