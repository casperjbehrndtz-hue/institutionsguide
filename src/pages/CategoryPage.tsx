import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFilteredInstitutions } from "@/hooks/useFilteredInstitutions";
import SearchFilterBar from "@/components/filters/SearchFilterBar";
import InstitutionMap from "@/components/map/InstitutionMap";
import InstitutionDetail from "@/components/detail/InstitutionDetail";
import CompareBar from "@/components/compare/CompareBar";
import { formatDKK as _formatDKK } from "@/lib/format";
import type { UnifiedInstitution, InstitutionCategory, SortKey } from "@/lib/types";

interface Props {
  category: "vuggestue" | "boernehave" | "dagpleje" | "skole" | "sfo";
}

function formatDKK(val: number | null): string {
  if (val === null) return "–";
  return _formatDKK(val);
}

export default function CategoryPage({ category }: Props) {
  const { institutions, municipalities, loading, error } = useData();
  const { t, language } = useLanguage();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<InstitutionCategory>(category);
  const [municipalityFilter, setMunicipality] = useState("");
  const [qualityFilter, setQualityFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>(category === "skole" ? "rating" : "price");
  const [selected, setSelected] = useState<UnifiedInstitution | null>(null);
  const [compareList, setCompareList] = useState<UnifiedInstitution[]>([]);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearMeLoading, setNearMeLoading] = useState(false);

  const categoryTitles: Record<string, string> = {
    vuggestue: language === "en" ? "Nurseries in Denmark" : "Vuggestuer i Danmark",
    boernehave: language === "en" ? "Kindergartens in Denmark" : "Børnehaver i Danmark",
    dagpleje: language === "en" ? "Childminders in Denmark" : "Dagplejere i Danmark",
    skole: language === "en" ? "Schools in Denmark" : "Skoler i Danmark",
    sfo: language === "en" ? "After-school care in Denmark" : "SFO og fritidsordninger",
  };

  const filtered = useFilteredInstitutions(institutions, {
    search, category: catFilter, municipality: municipalityFilter, qualityFilter, sortKey,
  });

  const municipalityNames = useMemo(() => municipalities.map((m) => m.municipality), [municipalities]);

  const distanceSorted = useMemo(() => {
    if (!userLocation) return filtered;
    return [...filtered].sort((a, b) => {
      const distA = Math.hypot(a.lat - userLocation.lat, a.lng - userLocation.lng);
      const distB = Math.hypot(b.lat - userLocation.lat, b.lng - userLocation.lng);
      return distA - distB;
    });
  }, [filtered, userLocation]);

  const visibleList = useMemo(() => distanceSorted.slice(0, 50), [distanceSorted]);

  const handleNearMe = useCallback(() => {
    if (!navigator.geolocation) return;
    setNearMeLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setFlyTo({ ...loc, zoom: 13 });
        setNearMeLoading(false);
      },
      () => setNearMeLoading(false),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, []);

  const catMunicipalities = useMemo(() => {
    return municipalities
      .map((m) => {
        const rateKey = category === "skole" ? null : category;
        return {
          ...m,
          catRate: rateKey ? m.rates[rateKey as keyof typeof m.rates] : null,
          catCount:
            category === "vuggestue" ? m.vuggestueCount :
            category === "boernehave" ? m.boernehaveCount :
            category === "dagpleje" ? m.dagplejeCount :
            category === "skole" ? m.folkeskoleCount + m.friskoleCount :
            m.sfoCount,
        };
      })
      .filter((m) => m.catCount > 0)
      .sort((a, b) => (a.catRate ?? Infinity) - (b.catRate ?? Infinity));
  }, [municipalities, category]);

  function handleSelect(inst: UnifiedInstitution) {
    setSelected(inst);
    setFlyTo({ lat: inst.lat, lng: inst.lng, zoom: 14 });
  }

  function handleCompare(inst: UnifiedInstitution) {
    if (compareList.length >= 4) return;
    if (compareList.find((c) => c.id === inst.id)) return;
    setCompareList([...compareList, inst]);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 text-center max-w-md">
          <h1 className="font-display text-2xl font-bold mb-4">{t.errors.loadFailed}</h1>
          <p className="text-muted">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Category header */}
      <section className="px-4 py-10 sm:py-14 text-center bg-gradient-to-b from-primary/5 to-transparent">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
          {categoryTitles[category]}
        </h1>
        <p className="text-muted text-base max-w-2xl mx-auto mb-4">
          {t.categoryDescriptions[category]}
        </p>
        <p className="font-mono text-primary text-lg font-semibold">
          {filtered.length.toLocaleString("da-DK")} {t.common.institutions}
        </p>
      </section>

      {/* Dagpleje info box */}
      {category === "dagpleje" && (
        <section className="max-w-3xl mx-auto px-4 py-6">
          <div className="card p-6">
            <h2 className="font-display text-xl font-bold mb-4">{t.dagplejeInfo.title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="font-semibold text-success mb-2">{t.dagplejeInfo.pros}</h3>
                <ul className="space-y-1 text-muted">
                  {t.dagplejeInfo.prosList.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-destructive mb-2">{t.dagplejeInfo.cons}</h3>
                <ul className="space-y-1 text-muted">
                  {t.dagplejeInfo.consList.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* School quality note */}
      {category === "skole" && (
        <section className="max-w-3xl mx-auto px-4 py-6">
          <div className="card p-6">
            <h2 className="font-display text-xl font-bold mb-3">{t.schoolInfo.title}</h2>
            <p className="text-sm text-muted leading-relaxed">{t.schoolInfo.description}</p>
          </div>
        </section>
      )}

      {/* Filter bar */}
      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        category={catFilter}
        onCategoryChange={setCatFilter}
        municipality={municipalityFilter}
        onMunicipalityChange={setMunicipality}
        qualityFilter={qualityFilter}
        onQualityFilterChange={setQualityFilter}
        sortKey={sortKey}
        onSortChange={setSortKey}
        resultCount={filtered.length}
        municipalities={municipalityNames}
        onNearMe={handleNearMe}
        nearMeLoading={nearMeLoading}
      />

      {/* Split layout */}
      <section className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3 overflow-y-auto max-h-[600px] lg:max-h-[700px]">
          {visibleList.length === 0 && (
            <p className="text-center text-muted py-12">
              {language === "da" ? "Ingen institutioner matcher din søgning." : "No institutions match your search."}
            </p>
          )}
          {visibleList.map((inst) => (
            <div key={inst.id} className={`card hover:scale-[1.01] transition-transform ${
              selected?.id === inst.id ? "ring-2 ring-primary" : ""
            }`}>
              <button
                onClick={() => handleSelect(inst)}
                className="w-full text-left p-4 min-h-[44px]"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-foreground">{inst.name}</p>
                    <p className="text-xs text-muted">{inst.address}, {inst.postalCode} {inst.city}</p>
                    <p className="text-xs text-muted">{inst.municipality}</p>
                    {inst.quality?.o !== undefined && (
                      <span className={`inline-block text-xs mt-1 px-2 py-0.5 rounded-full ${
                        inst.quality.o === 1 ? "bg-success/10 text-success" :
                        inst.quality.o === 0 ? "bg-warning/10 text-warning" :
                        "bg-destructive/10 text-destructive"
                      }`}>
                        {inst.quality.o === 1 ? t.detail.aboveAvg : inst.quality.o === 0 ? t.detail.average : t.detail.belowAvg}
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="font-mono text-sm font-medium text-primary">{formatDKK(inst.monthlyRate)}</p>
                    <span className="text-xs text-muted">{t.common.perMonth}</span>
                  </div>
                </div>
              </button>
              <Link
                to={`/institution/${inst.id}`}
                className="block text-xs text-primary hover:underline px-4 pb-3"
              >
                {t.common.seeFullProfile} &rarr;
              </Link>
            </div>
          ))}
          {filtered.length > 50 && (
            <p className="text-center text-sm text-muted py-4">
              {t.common.showing} 50 {t.common.of} {filtered.length.toLocaleString("da-DK")} {t.common.results}.
            </p>
          )}
        </div>

        <div className="h-[500px] lg:h-[700px]">
          {selected ? (
            <InstitutionDetail
              institution={selected}
              onClose={() => setSelected(null)}
              onCompare={handleCompare}
            />
          ) : (
            <InstitutionMap
              institutions={distanceSorted}
              onSelect={handleSelect}
              flyTo={flyTo}
            />
          )}
        </div>
      </section>

      {/* Municipality ranking for this category */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          {language === "da" ? "Kommuner" : "Municipalities"} — {categoryTitles[category]?.split(" ")[0]}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-3 text-muted font-medium" scope="col">{t.sort.municipality}</th>
                {category !== "skole" && (
                  <th className="text-right py-3 px-3 text-muted font-medium" scope="col">
                    {language === "da" ? "Takst/md." : "Rate/mo."}
                  </th>
                )}
                <th className="text-right py-3 px-3 text-muted font-medium" scope="col">
                  {language === "da" ? "Antal" : "Count"}
                </th>
              </tr>
            </thead>
            <tbody>
              {catMunicipalities.slice(0, 30).map((m) => (
                <tr key={m.municipality} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                  <td className="py-2 px-3">
                    <Link to={`/kommune/${encodeURIComponent(m.municipality)}`} className="text-primary hover:underline font-medium">
                      {m.municipality}
                    </Link>
                  </td>
                  {category !== "skole" && (
                    <td className="py-2 px-3 text-right font-mono">{formatDKK(m.catRate)}</td>
                  )}
                  <td className="py-2 px-3 text-right font-mono">{m.catCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <CompareBar
        selected={compareList}
        onRemove={(id) => setCompareList(compareList.filter((c) => c.id !== id))}
        onClear={() => setCompareList([])}
      />
    </>
  );
}
