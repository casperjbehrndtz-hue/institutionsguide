import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import SEOHead from "@/components/shared/SEOHead";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { buildSlugMap, toSlug } from "@/lib/slugs";
import RelatedSearches from "@/components/shared/RelatedSearches";
import type { UnifiedInstitution } from "@/lib/types";
import DataFreshness from "@/components/shared/DataFreshness";
import DataAttribution from "@/components/shared/DataAttribution";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { SkeletonHero, SkeletonCardGrid } from "@/components/shared/Skeletons";
import { qualityBadge } from "@/lib/badges";

function formatPct(v: number | undefined): string {
  if (v === undefined) return "–";
  return `${v.toLocaleString("da-DK", { maximumFractionDigits: 1 })}%`;
}

function formatNum(v: number | undefined): string {
  if (v === undefined) return "–";
  return v.toLocaleString("da-DK", { maximumFractionDigits: 1 });
}

export default function BestSchoolPage() {
  const { municipality: munSlug } = useParams<{ municipality: string }>();
  const { institutions, municipalities, loading, nationalAverages } = useData();

  const slugMap = useMemo(
    () => buildSlugMap(municipalities.map((m) => m.municipality)),
    [municipalities]
  );
  const munName = munSlug ? slugMap.get(munSlug) ?? "" : "";

  const schools = useMemo(() => {
    return institutions
      .filter(
        (i) =>
          i.category === "skole" &&
          i.municipality === munName &&
          i.quality?.r !== undefined
      )
      .sort((a, b) => (b.quality?.r ?? 0) - (a.quality?.r ?? 0));
  }, [institutions, munName]);

  const totalSchools = useMemo(
    () =>
      institutions.filter(
        (i) => i.category === "skole" && i.municipality === munName
      ).length,
    [institutions, munName]
  );

  // Nearby municipalities
  const nearbyMuns = useMemo(() => {
    const idx = municipalities.findIndex((m) => m.municipality === munName);
    if (idx === -1) return [];
    const nearby: string[] = [];
    for (
      let i = Math.max(0, idx - 4);
      i <= Math.min(municipalities.length - 1, idx + 4);
      i++
    ) {
      if (i !== idx) nearby.push(municipalities[i].municipality);
    }
    return nearby;
  }, [municipalities, munName]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <SkeletonHero />
        <SkeletonCardGrid count={6} />
      </div>
    );
  }

  if (!munName || schools.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 text-center max-w-md">
          <h1 className="font-display text-2xl font-bold mb-4">Side ikke fundet</h1>
          <p className="text-muted mb-6">
            Vi har ikke kvalitetsdata for skoler i denne kommune.
          </p>
          <Link to="/" className="text-primary hover:underline font-medium">
            Gå til forsiden
          </Link>
        </div>
      </div>
    );
  }

  // Municipality stats for unique content
  const munStats = useMemo(() => {
    const avgScore = schools.reduce((s, i) => s + (i.quality?.r ?? 0), 0) / schools.length;
    const folkeskoler = schools.filter((i) => i.subtype === "folkeskole").length;
    const friskoler = schools.length - folkeskoler;
    const withGrades = schools.filter((i) => i.quality?.k !== undefined);
    const avgGrades = withGrades.length > 0
      ? withGrades.reduce((s, i) => s + (i.quality?.k ?? 0), 0) / withGrades.length
      : null;
    const withAbsence = schools.filter((i) => i.quality?.fp !== undefined);
    const avgAbsence = withAbsence.length > 0
      ? withAbsence.reduce((s, i) => s + (i.quality?.fp ?? 0), 0) / withAbsence.length
      : null;
    return { avgScore, folkeskoler, friskoler, avgGrades, avgAbsence };
  }, [schools]);

  const top5 = schools.slice(0, 5);
  const bestSchool = schools[0];
  const pageTitle = `Bedste skoler i ${munName} ${new Date().getFullYear()} — Kvalitetsranking`;
  const pageDesc = `Top ${Math.min(schools.length, 5)} skoler i ${munName} rangeret efter kvalitetsdata. ${bestSchool.name} scorer højest med ${formatNum(bestSchool.quality?.r)}/5. Se trivsel, karaktersnit og fravær for ${totalSchools} skoler.`;

  // JSON-LD ItemList
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Bedste skoler i ${munName}`,
    numberOfItems: schools.length,
    itemListElement: top5.map((school, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: school.name,
      url: `https://institutionsguiden.dk/institution/${school.id}`,
    })),
  };

  return (
    <>
      <SEOHead
        title={pageTitle}
        description={pageDesc}
        path={`/bedste-skole/${munSlug}`}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumbs
        items={[
          { label: "Forside", href: "/" },
          { label: "Skoler", href: "/skole" },
          { label: munName, href: `/kommune/${encodeURIComponent(munName)}` },
          { label: `Bedste skoler i ${munName}` },
        ]}
      />

      {/* Header */}
      <ScrollReveal><section className="px-4 py-10 sm:py-14 text-center bg-gradient-to-b from-primary/5 to-transparent">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
          Bedste skoler i {munName}
        </h1>
        <p className="text-muted text-base max-w-2xl mx-auto">
          Top {Math.min(schools.length, 5)} skoler i {munName} baseret på officielle
          kvalitetsdata fra Undervisningsministeriet. {schools.length} ud af{" "}
          {totalSchools} skoler har kvalitetsvurdering.
        </p>
        <DataFreshness />
      </section></ScrollReveal>

      {/* Top 5 highlight */}
      <ScrollReveal><section className="max-w-4xl mx-auto px-4 py-6">
        <h2 className="font-display text-xl font-bold text-foreground mb-4">
          Top {top5.length} skoler i {munName}
        </h2>
        <div className="space-y-3">
          {top5.map((school, idx) => {
            const badge = qualityBadge(school.quality?.r);
            return (
              <div
                key={school.id}
                className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <Link
                      to={`/institution/${school.id}`}
                      className="font-semibold text-primary hover:underline block truncate"
                    >
                      {school.name}
                    </Link>
                    <p className="text-xs text-muted truncate">
                      {school.subtype === "folkeskole" ? "Folkeskole" : "Friskole"} — {school.address}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {badge && (
                    <span className={`text-xs px-2 py-1 rounded ${badge.color}`}>
                      {badge.label}
                    </span>
                  )}
                  <span className="font-mono font-bold text-primary">
                    {formatNum(school.quality?.r)}/5
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section></ScrollReveal>

      {/* Full table */}
      <ScrollReveal><section className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="font-display text-xl font-bold text-foreground mb-4">
          Alle {schools.length} skoler med kvalitetsdata
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-2 text-muted font-medium">#</th>
                <th className="py-2 pr-4 text-muted font-medium">Skole</th>
                <th className="py-2 pr-2 text-muted font-medium text-center">Score</th>
                <th className="py-2 pr-2 text-muted font-medium text-center">Trivsel</th>
                <th className="py-2 pr-2 text-muted font-medium text-center">Karaktersnit</th>
                <th className="py-2 pr-2 text-muted font-medium text-center">Fravær</th>
                <th className="py-2 text-muted font-medium text-center">Kompetence</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((school, idx) => (
                <SchoolRow
                  key={school.id}
                  school={school}
                  rank={idx + 1}
                  nationalAverages={nationalAverages}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section></ScrollReveal>

      {/* Dynamic analysis — unique per municipality */}
      <section className="max-w-3xl mx-auto px-4 py-6">
        <h2 className="font-display text-xl font-bold text-foreground mb-3">
          Skoleanalyse — {munName} Kommune
        </h2>
        <div className="prose prose-sm text-muted leading-relaxed space-y-3">
          <p>
            {munName} Kommune har {schools.length} skoler med kvalitetsdata ud af {totalSchools} i alt.
            {munStats.folkeskoler > 0 && munStats.friskoler > 0 && (
              <> Fordelingen er {munStats.folkeskoler} folkeskoler og {munStats.friskoler} fri- og privatskoler.</>
            )}
            {" "}Den gennemsnitlige kvalitetsscore i kommunen er {formatNum(munStats.avgScore)}/5
            {nationalAverages.trivsel > 0 && (
              <>, sammenlignet med en national trivselsscore på {formatNum(nationalAverages.trivsel)}</>
            )}
            .
          </p>
          <p>
            {bestSchool.name} topper ranglisten med en samlet score på {formatNum(bestSchool.quality?.r)}/5.
            {munStats.avgGrades !== null && (
              <> Det gennemsnitlige karaktersnit for skoler i {munName} er {formatNum(munStats.avgGrades)},
              {nationalAverages.karakterer > 0 && munStats.avgGrades > nationalAverages.karakterer
                ? ` over landsgennemsnittet på ${formatNum(nationalAverages.karakterer)}.`
                : nationalAverages.karakterer > 0 && munStats.avgGrades < nationalAverages.karakterer
                ? ` under landsgennemsnittet på ${formatNum(nationalAverages.karakterer)}.`
                : `.`}
              </>
            )}
            {munStats.avgAbsence !== null && (
              <> Gennemsnitligt fravær er {formatPct(munStats.avgAbsence)}
              {nationalAverages.fravaer > 0 && munStats.avgAbsence < nationalAverages.fravaer
                ? `, lavere end landsgennemsnittet på ${formatPct(nationalAverages.fravaer)}.`
                : nationalAverages.fravaer > 0 && munStats.avgAbsence > nationalAverages.fravaer
                ? `, højere end landsgennemsnittet på ${formatPct(nationalAverages.fravaer)}.`
                : `.`}
              </>
            )}
          </p>
        </div>
      </section>

      {/* Methodology note */}
      <section className="max-w-3xl mx-auto px-4 py-6">
        <div className="card card-static p-4 bg-[var(--color-bg)] dark:bg-[var(--color-bg-card)]">
          <h3 className="font-semibold text-sm mb-2">Om kvalitetsvurderingen</h3>
          <p className="text-xs text-muted">
            Kvalitetsscoren er baseret på officielle data fra Undervisningsministeriet og
            omfatter trivsel, karaktergennemsnit, fravær og kompetencedækning. Scoren er
            beregnet som et vægtet gennemsnit og bør ses som en indikator, ikke en
            absolut rangering. Landsgennemsnit — trivsel: {formatNum(nationalAverages.trivsel)},
            karakterer: {formatNum(nationalAverages.karakterer)},
            fravær: {formatPct(nationalAverages.fravaer)}.
          </p>
        </div>
      </section>

      {/* Data attribution */}
      <DataAttribution category="skole" />

      {/* Nearby */}
      {nearbyMuns.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 py-8">
          <h2 className="font-display text-lg font-bold text-foreground mb-3">
            Bedste skoler i nærliggende kommuner
          </h2>
          <div className="flex flex-wrap gap-2">
            {nearbyMuns.map((m) => (
              <Link
                key={m}
                to={`/bedste-skole/${toSlug(m)}`}
                className="card px-4 py-2 text-sm text-primary hover:bg-primary/5 transition-colors min-h-[44px] flex items-center"
              >
                {m}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Related searches */}
      <RelatedSearches municipality={munName} category="skole" />
    </>
  );
}

function SchoolRow({
  school,
  rank,
  nationalAverages,
}: {
  school: UnifiedInstitution;
  rank: number;
  nationalAverages: { trivsel: number; karakterer: number; fravaer: number };
}) {
  const q = school.quality;
  const badge = qualityBadge(q?.r);

  const colorClass = (val: number | undefined, natAvg: number, lowerBetter = false) => {
    if (val === undefined) return "text-muted";
    const diff = lowerBetter ? natAvg - val : val - natAvg;
    if (diff > 0.3) return "text-green-600";
    if (diff < -0.3) return "text-red-500";
    return "text-foreground";
  };

  return (
    <tr className="border-b hover:bg-primary/5 transition-colors">
      <td className="py-3 pr-2 font-mono text-muted text-xs">{rank}</td>
      <td className="py-3 pr-4">
        <Link
          to={`/institution/${school.id}`}
          className="font-medium text-primary hover:underline"
        >
          {school.name}
        </Link>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted capitalize">{school.subtype}</span>
          {badge && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${badge.color}`}>
              {badge.label}
            </span>
          )}
        </div>
      </td>
      <td className="py-3 pr-2 font-mono text-center font-semibold">
        {formatNum(q?.r)}
      </td>
      <td className={`py-3 pr-2 font-mono text-center ${colorClass(q?.ts, nationalAverages.trivsel)}`}>
        {formatNum(q?.ts)}
      </td>
      <td className={`py-3 pr-2 font-mono text-center ${colorClass(q?.k, nationalAverages.karakterer)}`}>
        {formatNum(q?.k)}
      </td>
      <td className={`py-3 pr-2 font-mono text-center ${colorClass(q?.fp, nationalAverages.fravaer, true)}`}>
        {formatPct(q?.fp)}
      </td>
      <td className="py-3 font-mono text-center">
        {formatPct(q?.kp)}
      </td>
    </tr>
  );
}
