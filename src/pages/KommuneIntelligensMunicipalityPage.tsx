import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { useTrack } from "@/contexts/TrackContext";
import { useMunicipalityIntelligence } from "@/hooks/useMunicipalityIntelligence";
import KommuneVsNationalCard from "@/components/mi/KommuneVsNationalCard";
import KommuneSummaryCard from "@/components/mi/KommuneSummaryCard";
import LifeStageToggle from "@/components/mi/LifeStageToggle";
import WeightSliders from "@/components/mi/WeightSliders";
import SEOHead from "@/components/shared/SEOHead";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import JsonLd from "@/components/shared/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";
import { toSlug } from "@/lib/slugs";

/**
 * SEO-focused landing page for kommune-intelligens per kommune:
 * /kommune-intelligens/:kommune (slug or raw name).
 * Renders only this kommune's comparison card + weight controls + links.
 */
export default function KommuneIntelligensMunicipalityPage() {
  const { kommune } = useParams<{ kommune: string }>();
  const { institutions } = useData();
  const { track } = useTrack();
  const { municipalities } = useMunicipalityIntelligence();
  const trackLabel = track === "daycare" ? "dagtilbud" : "folkeskole";

  const canonicalName = useMemo(() => {
    if (!kommune) return null;
    const raw = decodeURIComponent(kommune);
    const canonical = new Set(institutions.map((i) => i.municipality));
    if (canonical.has(raw)) return raw;
    const slug = toSlug(raw);
    return [...canonical].find((m) => toSlug(m) === slug) ?? null;
  }, [kommune, institutions]);

  const score = useMemo(() => {
    if (!canonicalName) return null;
    return municipalities.find((m) => m.municipality === canonicalName) ?? null;
  }, [municipalities, canonicalName]);

  if (!canonicalName) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">Kommune ikke fundet</h1>
        <p className="text-muted mb-4">Vi kunne ikke finde en kommune der matcher "{kommune}".</p>
        <Link to="/kommune-intelligens" className="text-primary hover:underline font-medium">
          Se hele leaderboardet →
        </Link>
      </div>
    );
  }

  const rank = score ? municipalities.findIndex((m) => m.municipality === canonicalName) + 1 : null;

  return (
    <>
      <SEOHead
        title={`Kommune-intelligens: ${canonicalName} — Score, normering, trivsel | Institutionsguiden`}
        description={`Se hvordan ${canonicalName} Kommune ligger på kvalitetsindekset for ${trackLabel} — normering, trivsel, pris og mere, sammenlignet med landsmedianen.`}
        path={`/kommune-intelligens/${toSlug(canonicalName)}`}
      />
      <JsonLd data={breadcrumbSchema([
        { name: "Forside", url: "https://www.institutionsguiden.dk/" },
        { name: "Kommune-intelligens", url: "https://www.institutionsguiden.dk/kommune-intelligens" },
        { name: canonicalName, url: `https://www.institutionsguiden.dk/kommune-intelligens/${toSlug(canonicalName)}` },
      ])} />

      <Breadcrumbs items={[
        { label: "Forside", href: "/" },
        { label: "Kommune-intelligens", href: "/kommune-intelligens" },
        { label: canonicalName },
      ]} />

      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
        <header className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-4xl font-bold text-foreground mb-2">
              Kommune-intelligens: {canonicalName}
            </h1>
            <p className="text-muted max-w-2xl">
              {score ? (
                <>
                  {canonicalName} har en samlet score på{" "}
                  <strong className="text-foreground">{score.score.toFixed(1)}</strong> ud af 100
                  {rank && <> (#{rank} af {municipalities.length} kommuner)</>} for {trackLabel}.
                  Justér vægtene for at se hvordan rangeringen skifter hvis du prioriterer andre ting.
                </>
              ) : (
                <>Se hvordan {canonicalName} præsterer på hver metrik for {trackLabel}, målt mod landsmedianen.</>
              )}
            </p>
          </div>
          <LifeStageToggle />
        </header>

        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-[340px] shrink-0">
            <div className="lg:sticky lg:top-20 space-y-3">
              <WeightSliders />
            </div>
          </aside>

          <main className="flex-1 min-w-0 space-y-4">
            <KommuneSummaryCard municipality={canonicalName} />
            <KommuneVsNationalCard municipality={canonicalName} />

            <div className="rounded-xl border border-border bg-bg-card p-4">
              <h2 className="font-display text-base font-bold text-foreground mb-2">Næste skridt</h2>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to={`/kommune/${toSlug(canonicalName)}`} className="text-primary hover:underline font-medium">
                    Se alle institutioner i {canonicalName}
                  </Link>
                  <span className="text-muted"> — priser, normering, kvalitet</span>
                </li>
                <li>
                  <Link to="/kommune-intelligens" className="text-primary hover:underline font-medium">
                    Åbn det fulde leaderboard
                  </Link>
                  <span className="text-muted"> — rangér alle 98 kommuner efter dine prioriteter</span>
                </li>
                <li>
                  <Link to="/kommune-intelligens/sammenlign" className="text-primary hover:underline font-medium">
                    Sammenlign kommuner side om side
                  </Link>
                  <span className="text-muted"> — pin op til 3 og se dem i kolonner</span>
                </li>
              </ul>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
