import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
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

const CATEGORY_META: Record<string, { title: string; description: string; color: string }> = {
  vuggestue: {
    title: "Vuggestuer i Danmark",
    description: "Find og sammenlign vuggestuer (0-2 år) i alle 98 kommuner. Se priser, ejerskab og beregn fripladstilskud.",
    color: "text-success",
  },
  boernehave: {
    title: "Børnehaver i Danmark",
    description: "Sammenlign børnehaver (3-5 år) i hele landet. Se kommunale, selvejende og private børnehaver med priser.",
    color: "text-primary",
  },
  dagpleje: {
    title: "Dagplejere i Danmark",
    description: "Find dagpleje (0-2 år) i din kommune. Ofte et billigere alternativ til vuggestue med højere voksen-barn ratio.",
    color: "text-warning",
  },
  skole: {
    title: "Skoler i Danmark",
    description: "Sammenlign folkeskoler og friskoler med kvalitetsdata: trivsel, karaktersnit, fravær og kompetencedækning.",
    color: "text-blue-500",
  },
  sfo: {
    title: "SFO og fritidsordninger",
    description: "Find SFO-tilbud (6-9 år) i din kommune. Se priser og sammenlign med andre fritidsordninger.",
    color: "text-purple-500",
  },
};

function formatDKK(val: number | null): string {
  if (val === null) return "–";
  return _formatDKK(val);
}

export default function CategoryPage({ category }: Props) {
  const { institutions, municipalities, loading, error } = useData();
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

  const filtered = useFilteredInstitutions(institutions, {
    search,
    category: catFilter,
    municipality: municipalityFilter,
    qualityFilter,
    sortKey,
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

  const meta = CATEGORY_META[category];

  // Filtered municipality data for this category
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
        <div className="glass-card p-8 text-center max-w-md">
          <h1 className="font-display text-2xl font-bold mb-4">Fejl</h1>
          <p className="text-muted">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Category header */}
      <section className="px-4 py-10 sm:py-14 text-center bg-gradient-to-b from-primary/5 to-transparent">
        <h1 className={`font-display text-3xl sm:text-4xl font-bold text-foreground mb-3`}>
          {meta.title}
        </h1>
        <p className="text-muted text-base max-w-2xl mx-auto mb-4">{meta.description}</p>
        <p className="font-mono text-primary text-lg font-semibold">
          {filtered.length.toLocaleString("da-DK")} institutioner
        </p>
      </section>

      {/* Dagpleje info box */}
      {category === "dagpleje" && (
        <section className="max-w-3xl mx-auto px-4 py-6">
          <div className="glass-card p-6">
            <h2 className="font-display text-xl font-bold mb-4">Dagpleje vs. vuggestue</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="font-semibold text-success mb-2">Fordele ved dagpleje</h3>
                <ul className="space-y-1 text-muted">
                  <li>Ofte billigere end vuggestue</li>
                  <li>Mindre grupper (maks 4-5 børn)</li>
                  <li>Hjemlig atmosfære</li>
                  <li>Tæt voksen-barn relation</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-destructive mb-2">Ulemper ved dagpleje</h3>
                <ul className="space-y-1 text-muted">
                  <li>Færre pædagogiske faciliteter</li>
                  <li>Sårbar ved sygdom (kun én dagplejer)</li>
                  <li>Mindre social stimulering</li>
                  <li>Varierende kvalitet</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* School quality note */}
      {category === "skole" && (
        <section className="max-w-3xl mx-auto px-4 py-6">
          <div className="glass-card p-6">
            <h2 className="font-display text-xl font-bold mb-3">Om kvalitetsdata</h2>
            <p className="text-sm text-muted leading-relaxed">
              Kvalitetsdata for skoler inkluderer trivselsmålinger, karaktergennemsnit ved afgangsprøven,
              fravær, kompetencedækning og undervisningseffekt (socioøkonomisk reference). Data stammer fra
              Undervisningsministeriet og dækker skoleåret 2024/2025. Skoler markeret &quot;Over middel&quot;
              klarer sig bedre end forventet ud fra elevernes socioøkonomiske baggrund.
            </p>
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
            <p className="text-center text-muted py-12">Ingen institutioner matcher din søgning.</p>
          )}
          {visibleList.map((inst) => (
            <div key={inst.id} className={`glass-card hover:scale-[1.01] transition-transform ${
              selected?.id === inst.id ? "ring-2 ring-primary" : ""
            }`}>
              <button
                onClick={() => handleSelect(inst)}
                className="w-full text-left p-4 min-h-[44px]"
                aria-label={`Se detaljer for ${inst.name}`}
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
                        {inst.quality.o === 1 ? "Over middel" : inst.quality.o === 0 ? "Middel" : "Under middel"}
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="font-mono text-sm font-medium text-primary">{formatDKK(inst.monthlyRate)}</p>
                    <span className="text-xs text-muted">/md.</span>
                  </div>
                </div>
              </button>
              <Link
                to={`/institution/${inst.id}`}
                className="block text-xs text-primary hover:underline px-4 pb-3"
              >
                Se fuld profil &rarr;
              </Link>
            </div>
          ))}
          {filtered.length > 50 && (
            <p className="text-center text-sm text-muted py-4">
              Viser 50 af {filtered.length.toLocaleString("da-DK")} resultater.
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
          Kommuner — {meta.title.split(" ")[0]}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-3 text-muted font-medium" scope="col">Kommune</th>
                {category !== "skole" && (
                  <th className="text-right py-3 px-3 text-muted font-medium" scope="col">Takst/md.</th>
                )}
                <th className="text-right py-3 px-3 text-muted font-medium" scope="col">Antal</th>
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
