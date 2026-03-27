import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import InstitutionMap from "@/components/map/InstitutionMap";
import InstitutionDetail from "@/components/detail/InstitutionDetail";
import FripladsCalculator from "@/components/detail/FripladsCalculator";
import type { UnifiedInstitution } from "@/lib/types";
import { CHILDCARE_RATES_2025 } from "@/lib/childcare/rates";
import { formatDKK as _formatDKK } from "@/lib/format";

function formatDKK(val: number | null): string {
  if (val === null) return "–";
  return _formatDKK(val);
}

const CATEGORIES = ["vuggestue", "boernehave", "dagpleje", "skole", "sfo"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  vuggestue: "Vuggestuer",
  boernehave: "Børnehaver",
  dagpleje: "Dagplejere",
  skole: "Skoler",
  sfo: "SFO",
};

export default function KommunePage() {
  const { name } = useParams<{ name: string }>();
  const decodedName = decodeURIComponent(name || "");
  const { institutions, municipalities, loading, error } = useData();
  const [selected, setSelected] = useState<UnifiedInstitution | null>(null);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  const munInstitutions = useMemo(
    () => institutions.filter((i) => i.municipality === decodedName),
    [institutions, decodedName]
  );

  const munSummary = municipalities.find((m) => m.municipality === decodedName);

  const rates = CHILDCARE_RATES_2025.find((r) => r.municipality === decodedName);

  // Center on municipality
  const center = useMemo(() => {
    if (munInstitutions.length === 0) return null;
    const avgLat = munInstitutions.reduce((s, i) => s + i.lat, 0) / munInstitutions.length;
    const avgLng = munInstitutions.reduce((s, i) => s + i.lng, 0) / munInstitutions.length;
    return { lat: avgLat, lng: avgLng, zoom: 11 };
  }, [munInstitutions]);

  // Group institutions by category
  const grouped = useMemo(() => {
    const map: Record<string, UnifiedInstitution[]> = {};
    for (const cat of CATEGORIES) {
      map[cat] = munInstitutions.filter((i) => i.category === cat);
    }
    return map;
  }, [munInstitutions]);

  // Nearby municipalities
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || munInstitutions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-card p-8 text-center max-w-md">
          <h1 className="font-display text-2xl font-bold mb-4">Kommune ikke fundet</h1>
          <p className="text-muted mb-6">
            Vi kunne ikke finde data for &quot;{decodedName}&quot;.
          </p>
          <Link to="/" className="text-primary hover:underline font-medium">
            Gå til forsiden
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <section className="px-4 py-10 sm:py-14 text-center bg-gradient-to-b from-primary/5 to-transparent">
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-3">
          {decodedName}
        </h1>
        <p className="text-muted text-base mb-2">
          Institutioner og skoler i {decodedName}
        </p>
        <p className="font-mono text-primary text-lg font-semibold">
          {munInstitutions.length.toLocaleString("da-DK")} institutioner
        </p>
      </section>

      {/* Rates overview */}
      {munSummary && (
        <section className="max-w-4xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="glass-card p-4 text-center">
              <p className="text-xs text-muted mb-1">Dagpleje/md.</p>
              <p className="font-mono text-lg font-bold text-primary">{formatDKK(munSummary.rates.dagpleje)}</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-xs text-muted mb-1">Vuggestue/md.</p>
              <p className="font-mono text-lg font-bold text-primary">{formatDKK(munSummary.rates.vuggestue)}</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-xs text-muted mb-1">Børnehave/md.</p>
              <p className="font-mono text-lg font-bold text-primary">{formatDKK(munSummary.rates.boernehave)}</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-xs text-muted mb-1">SFO/md.</p>
              <p className="font-mono text-lg font-bold text-primary">{formatDKK(munSummary.rates.sfo)}</p>
            </div>
          </div>
        </section>
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

          {/* Friplads calculator */}
          {rates && rates.vuggestue && (
            <div>
              <FripladsCalculator
                annualRate={rates.vuggestue}
                label={`Beregn fripladstilskud — ${decodedName} (vuggestue)`}
              />
              {rates.boernehave && (
                <div className="mt-4">
                  <FripladsCalculator
                    annualRate={rates.boernehave}
                    label={`Beregn fripladstilskud — ${decodedName} (børnehave)`}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Institution lists by category */}
      <section className="max-w-7xl mx-auto px-4 py-8">
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
                    className="text-left glass-card p-4 hover:scale-[1.01] transition-transform min-h-[44px]"
                    aria-label={`Se detaljer for ${inst.name}`}
                  >
                    <p className="font-semibold text-foreground text-sm">{inst.name}</p>
                    <p className="text-xs text-muted">{inst.address}</p>
                    <p className="font-mono text-sm text-primary mt-1">{formatDKK(inst.monthlyRate)}/md.</p>
                  </button>
                ))}
              </div>
              {list.length > 12 && (
                <p className="text-sm text-muted mt-3">
                  Og {list.length - 12} flere {CATEGORY_LABELS[cat].toLowerCase()}...
                </p>
              )}
            </div>
          );
        })}
      </section>

      {/* Nearby municipalities */}
      {nearbyMunicipalities.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 py-8">
          <h2 className="font-display text-xl font-bold text-foreground mb-4">
            Se også andre kommuner
          </h2>
          <div className="flex flex-wrap gap-2">
            {nearbyMunicipalities.map((m) => (
              <Link
                key={m}
                to={`/kommune/${encodeURIComponent(m)}`}
                className="glass-card px-4 py-2 text-sm text-primary hover:bg-primary/5 transition-colors min-h-[44px] flex items-center"
              >
                {m}
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
