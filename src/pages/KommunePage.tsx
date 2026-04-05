import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import InstitutionMap from "@/components/map/InstitutionMap";
import InstitutionDetail from "@/components/detail/InstitutionDetail";
import FripladsCalculator from "@/components/detail/FripladsCalculator";
import SEOHead from "@/components/shared/SEOHead";
import JsonLd from "@/components/shared/JsonLd";
import { breadcrumbSchema, itemListSchema } from "@/lib/schema";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import type { UnifiedInstitution } from "@/lib/types";
import { CHILDCARE_RATES_2025 } from "@/lib/childcare/rates";
import { formatDKK } from "@/lib/format";
import { toSlug } from "@/lib/slugs";
import NormeringChart from "@/components/charts/NormeringChart";
import PriceAlertSignup from "@/components/alerts/PriceAlertSignup";
import DagplejeVsVuggestue from "@/components/insights/DagplejeVsVuggestue";
import RelatedSearches from "@/components/shared/RelatedSearches";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { useFamily } from "@/contexts/FamilyContext";
import { SkeletonHero, SkeletonCardGrid } from "@/components/shared/Skeletons";
import DataFreshness from "@/components/shared/DataFreshness";

const CATEGORIES = ["vuggestue", "boernehave", "dagpleje", "skole", "sfo", "fritidsklub", "efterskole", "gymnasium"] as const;

export default function KommunePage() {
  const { name } = useParams<{ name: string }>();
  const decodedName = decodeURIComponent(name || "");
  const { institutions, municipalities, normering, loading, error } = useData();
  const { t, language } = useLanguage();
  const { profile } = useFamily();
  const [selected, setSelected] = useState<UnifiedInstitution | null>(null);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  const CATEGORY_LABELS: Record<string, string> = {
    vuggestue: t.categories.vuggestue,
    boernehave: t.categories.boernehave,
    dagpleje: t.categories.dagpleje,
    skole: t.categories.skole,
    sfo: t.categories.sfo,
    fritidsklub: t.categories.fritidsklub,
    efterskole: t.categories.efterskole,
    gymnasium: t.categories.gymnasium,
  };

  const munInstitutions = useMemo(
    () => institutions.filter((i) => i.municipality === decodedName),
    [institutions, decodedName]
  );

  const munSummary = municipalities.find((m) => m.municipality === decodedName);
  const rates = CHILDCARE_RATES_2025.find((r) => r.municipality === decodedName);

  const munNormering = useMemo(
    () => normering.filter((n) => n.municipality === decodedName),
    [normering, decodedName]
  );

  // Avg prices for dagpleje vs vuggestue comparison
  const dagplejeAvg = useMemo(() => {
    const prices = munInstitutions.filter((i) => i.category === "dagpleje" && i.monthlyRate).map((i) => i.monthlyRate!);
    return prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null;
  }, [munInstitutions]);
  const vuggestueAvg = useMemo(() => {
    const prices = munInstitutions.filter((i) => i.category === "vuggestue" && i.monthlyRate).map((i) => i.monthlyRate!);
    return prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null;
  }, [munInstitutions]);

  const center = useMemo(() => {
    if (munInstitutions.length === 0) return null;
    const avgLat = munInstitutions.reduce((s, i) => s + i.lat, 0) / munInstitutions.length;
    const avgLng = munInstitutions.reduce((s, i) => s + i.lng, 0) / munInstitutions.length;
    return { lat: avgLat, lng: avgLng, zoom: 11 };
  }, [munInstitutions]);

  const grouped = useMemo(() => {
    const map: Record<string, UnifiedInstitution[]> = {};
    for (const cat of CATEGORIES) {
      map[cat] = munInstitutions.filter((i) => i.category === cat);
    }
    return map;
  }, [munInstitutions]);

  const nearbyMunicipalities = useMemo(() => {
    const idx = municipalities.findIndex((m) => m.municipality === decodedName);
    if (idx === -1) return [];
    const nearby: string[] = [];
    for (let i = Math.max(0, idx - 3); i <= Math.min(municipalities.length - 1, idx + 3); i++) {
      if (i !== idx) nearby.push(municipalities[i].municipality);
    }
    return nearby;
  }, [municipalities, decodedName]);

  function handleSelect(inst: UnifiedInstitution) {
    setSelected(inst);
    setFlyTo({ lat: inst.lat, lng: inst.lng, zoom: 14 });
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <SkeletonHero />
        <SkeletonCardGrid count={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 text-center max-w-md">
          <h1 className="font-display text-2xl font-bold mb-4">
            {language === "da" ? "Kunne ikke indlæse data" : "Could not load data"}
          </h1>
          <p className="text-muted mb-6">
            {language === "da"
              ? "Kunne ikke indlæse data. Prøv igen."
              : "Could not load data. Please try again."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary-light transition-colors min-h-[44px]"
          >
            {language === "da" ? "Prøv igen" : "Try again"}
          </button>
        </div>
      </div>
    );
  }

  if (munInstitutions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 text-center max-w-md">
          <h1 className="font-display text-2xl font-bold mb-4">
            {language === "da" ? "Ingen institutioner fundet" : "No institutions found"}
          </h1>
          <p className="text-muted mb-6">
            {language === "da"
              ? "Ingen institutioner fundet i denne kommune."
              : "No institutions found in this municipality."}
          </p>
          <Link to="/" className="text-primary hover:underline font-medium">
            {t.errors.goHome}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title={`${decodedName} — Institutioner og børnepasning`}
        description={`Se alle ${munInstitutions.length} institutioner i ${decodedName} kommune. Vuggestuer, børnehaver, dagplejere, skoler og SFO med priser og kontaktinfo.`}
        path={`/kommune/${encodeURIComponent(decodedName)}`}
      />
      <JsonLd data={breadcrumbSchema([
        { name: language === "da" ? "Forside" : "Home", url: "https://institutionsguiden.dk/" },
        { name: `${decodedName} Kommune`, url: `https://institutionsguiden.dk/kommune/${encodeURIComponent(decodedName)}` },
      ])} />
      <JsonLd data={itemListSchema(
        munInstitutions.slice(0, 10).map((inst) => ({
          name: inst.name,
          url: `/institution/${inst.id}`,
        })),
        "https://institutionsguiden.dk",
        `${language === "da" ? "Institutioner i" : "Institutions in"} ${decodedName}`,
      )} />

      <Breadcrumbs items={[
        { label: language === "da" ? "Forside" : "Home", href: "/" },
        { label: language === "da" ? "Kommuner" : "Municipalities", href: "/" },
        { label: decodedName },
      ]} />

      {/* Header */}
      <ScrollReveal><section className="px-4 py-10 sm:py-14 text-center bg-gradient-to-b from-primary/5 to-transparent">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
          {decodedName}
        </h1>
        <p className="text-muted text-base mb-2">
          {t.municipality.institutionsIn} {decodedName}
        </p>
        <p className="font-mono text-primary text-lg font-semibold">
          {munInstitutions.length.toLocaleString("da-DK")} {t.common.institutions}
        </p>
      </section></ScrollReveal>

      {/* Rates overview */}
      {munSummary && (
        <ScrollReveal><section className="max-w-4xl mx-auto px-4 py-6">
          <ScrollReveal stagger className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card p-4 text-center">
              <p className="text-xs text-muted mb-1">{t.categories.dagpleje}{t.common.perMonth}</p>
              <p className="font-mono text-lg font-bold text-primary">{formatDKK(munSummary.rates.dagpleje)}</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xs text-muted mb-1">{t.categories.vuggestue}{t.common.perMonth}</p>
              <p className="font-mono text-lg font-bold text-primary">{formatDKK(munSummary.rates.vuggestue)}</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xs text-muted mb-1">{t.categories.boernehave}{t.common.perMonth}</p>
              <p className="font-mono text-lg font-bold text-primary">{formatDKK(munSummary.rates.boernehave)}</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xs text-muted mb-1">{t.categories.sfo}{t.common.perMonth}</p>
              <p className="font-mono text-lg font-bold text-primary">{formatDKK(munSummary.rates.sfo)}</p>
            </div>
          </ScrollReveal>
        </section></ScrollReveal>
      )}

      {/* Map */}
      <section className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[400px] lg:h-[500px]">
            {selected ? (
              <InstitutionDetail
                institution={selected}
                onClose={() => setSelected(null)}
              />
            ) : (
              <InstitutionMap
                institutions={munInstitutions}
                onSelect={handleSelect}
                flyTo={flyTo || center}
              />
            )}
          </div>

          {rates && rates.vuggestue && (
            <div>
              <FripladsCalculator
                annualRate={rates.vuggestue}
                label={`${t.friplads.title} — ${decodedName} (${t.categories.vuggestue.toLowerCase()})`}
              />
              {rates.boernehave && (
                <div className="mt-4">
                  <FripladsCalculator
                    annualRate={rates.boernehave}
                    label={`${t.friplads.title} — ${decodedName} (${t.categories.boernehave.toLowerCase()})`}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Normering chart */}
      {munNormering.length > 0 && (
        <ScrollReveal><section className="max-w-4xl mx-auto px-4 py-6">
          <NormeringChart
            municipality={decodedName}
            data={munNormering}
          />
        </section></ScrollReveal>
      )}

      {/* Dagpleje vs Vuggestue comparison */}
      {dagplejeAvg && vuggestueAvg && (
        <ScrollReveal><section className="max-w-4xl mx-auto px-4 py-6">
          <DagplejeVsVuggestue
            municipality={decodedName}
            dagplejeAvgPrice={dagplejeAvg}
            vuggestueAvgPrice={vuggestueAvg}
            profile={profile}
          />
        </section></ScrollReveal>
      )}

      {/* Institution lists by category */}
      <ScrollReveal><section className="max-w-7xl mx-auto px-4 py-8">
        {CATEGORIES.map((cat) => {
          const list = grouped[cat];
          if (list.length === 0) return null;
          return (
            <div key={cat} className="mb-8">
              <h2 className="font-display text-xl font-bold text-foreground mb-4">
                {CATEGORY_LABELS[cat]} ({list.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {list.slice(0, 12).map((inst) => (
                  <button
                    key={inst.id}
                    onClick={() => handleSelect(inst)}
                    className="text-left card p-4 transition-transform min-h-[44px]"
                  >
                    <p className="font-semibold text-foreground text-sm">{inst.name}</p>
                    <p className="text-xs text-muted">{inst.address}</p>
                    <p className="font-mono text-sm text-primary mt-1">
                      {inst.category === "efterskole" && inst.yearlyPrice
                        ? `${formatDKK(inst.yearlyPrice)}${language === "da" ? "/år" : "/year"}`
                        : `${formatDKK(inst.monthlyRate)}${t.common.perMonth}`}
                    </p>
                  </button>
                ))}
              </div>
              {list.length > 12 && (
                <Link
                  to={`/${cat}/${toSlug(decodedName)}`}
                  className="inline-block text-sm text-primary hover:underline font-medium mt-3"
                >
                  {language === "da" ? "Og" : "And"} {list.length - 12} {t.municipality.andMore} {CATEGORY_LABELS[cat].toLowerCase()} &rarr;
                </Link>
              )}
            </div>
          );
        })}
      </section></ScrollReveal>

      {/* Price alert signup */}
      <section className="max-w-4xl mx-auto px-4 py-6">
        <PriceAlertSignup municipality={decodedName} compact />
      </section>

      {/* Nearby municipalities */}
      {nearbyMunicipalities.length > 0 && (
        <ScrollReveal><section className="max-w-4xl mx-auto px-4 py-8">
          <h2 className="font-display text-xl font-bold text-foreground mb-4">
            {t.municipality.seeOtherMunicipalities}
          </h2>
          <div className="flex flex-wrap gap-2">
            {nearbyMunicipalities.map((m) => (
              <Link
                key={m}
                to={`/kommune/${encodeURIComponent(m)}`}
                className="card px-4 py-2 text-sm text-primary hover:bg-primary/5 transition-colors min-h-[44px] flex items-center"
              >
                {m}
              </Link>
            ))}
          </div>
        </section></ScrollReveal>
      )}

      {/* Related searches */}
      <RelatedSearches municipality={decodedName} />

      <DataFreshness lang={language} />
    </>
  );
}
