import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Building2, GraduationCap, Users, Home, BookOpen, HelpCircle, Calculator, PiggyBank, Wallet } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useFilteredInstitutions } from "@/hooks/useFilteredInstitutions";
import SearchFilterBar from "@/components/filters/SearchFilterBar";
import InstitutionMap from "@/components/map/InstitutionMap";
import InstitutionDetail from "@/components/detail/InstitutionDetail";
import CompareBar from "@/components/compare/CompareBar";
import { formatDKK as _formatDKK } from "@/lib/format";
import type { UnifiedInstitution, InstitutionCategory, SortKey } from "@/lib/types";

const CATEGORY_CARDS = [
  { category: "vuggestue" as const, label: "Vuggestuer", icon: Home, color: "text-success", href: "/vuggestue", desc: "0–2 år" },
  { category: "boernehave" as const, label: "Børnehaver", icon: Building2, color: "text-primary", href: "/boernehave", desc: "3–5 år" },
  { category: "dagpleje" as const, label: "Dagplejere", icon: Users, color: "text-warning", href: "/dagpleje", desc: "0–2 år" },
  { category: "skole" as const, label: "Skoler", icon: GraduationCap, color: "text-blue-500", href: "/skole", desc: "6–16 år" },
  { category: "sfo" as const, label: "SFO", icon: BookOpen, color: "text-purple-500", href: "/sfo", desc: "6–9 år" },
];

const FAQ_ITEMS = [
  {
    q: "Hvad er fripladstilskud, og hvem kan få det?",
    a: "Fripladstilskud er en rabat på forældrebetalingen for dagtilbud. Tilskuddet afhænger af husstandsindkomsten. I 2026 kan familier med en indkomst under 677.500 kr. få delvist tilskud, og under 218.100 kr. får man fuld friplads.",
  },
  {
    q: "Hvad er forskellen på dagpleje og vuggestue?",
    a: "Dagpleje foregår i en dagplejers private hjem med maks 4-5 børn, mens en vuggestue er en institution med flere børn og personale. Dagpleje er ofte billigere, mens vuggestuer typisk har flere pædagoger og faciliteter.",
  },
  {
    q: "Hvordan beregnes kvalitetsscoren for skoler?",
    a: "Kvalitetsscoren er baseret på officielle data fra Undervisningsministeriet og inkluderer trivselsmålinger, karaktergennemsnit, fravær, kompetencedækning og undervisningseffekt (socioøkonomisk reference).",
  },
  {
    q: "Er priserne opdaterede?",
    a: "Priserne er baseret på data fra Danmarks Statistik (2025-tal) og Dagtilbudsregisteret. Kommunerne regulerer typisk taksterne årligt, så der kan forekomme mindre afvigelser.",
  },
];

function formatDKK(val: number | null): string {
  if (val === null) return "–";
  return _formatDKK(val);
}

export default function HomePage() {
  const { institutions, municipalities, loading, error } = useData();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<InstitutionCategory>("alle");
  const [municipality, setMunicipality] = useState("");
  const [qualityFilter, setQualityFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [selected, setSelected] = useState<UnifiedInstitution | null>(null);
  const [compareList, setCompareList] = useState<UnifiedInstitution[]>([]);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearMeLoading, setNearMeLoading] = useState(false);

  const filtered = useFilteredInstitutions(institutions, { search, category, municipality, qualityFilter, sortKey });
  const municipalityNames = useMemo(() => municipalities.map((m) => m.municipality), [municipalities]);

  // Sort by distance if user location is available
  const distanceSorted = useMemo(() => {
    if (!userLocation) return filtered;
    return [...filtered].sort((a, b) => {
      const distA = Math.hypot(a.lat - userLocation.lat, a.lng - userLocation.lng);
      const distB = Math.hypot(b.lat - userLocation.lat, b.lng - userLocation.lng);
      return distA - distB;
    });
  }, [filtered, userLocation]);

  // Visible list (limit for performance)
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
          <h1 className="font-display text-2xl font-bold mb-4">Fejl ved indlæsning</h1>
          <p className="text-muted">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Hero */}
      <section className="px-4 py-12 sm:py-16 text-center bg-gradient-to-b from-primary/5 to-transparent">
        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
          Find den rette institution for dit barn
        </h1>
        <p className="text-muted text-lg max-w-2xl mx-auto mb-8">
          Sammenlign <span className="font-mono font-semibold text-primary">{institutions.length.toLocaleString("da-DK")}+</span> vuggestuer,
          børnehaver, dagplejere, skoler og SFO&apos;er i alle 98 kommuner.
        </p>

        {/* Category cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 max-w-4xl mx-auto">
          {CATEGORY_CARDS.map((card) => {
            const count = institutions.filter((i) => i.category === card.category).length;
            return (
              <Link
                key={card.category}
                to={card.href}
                className="glass-card p-4 text-center hover:scale-[1.02] transition-transform min-h-[44px]"
                aria-label={`Se ${card.label}`}
              >
                <card.icon className={`w-8 h-8 mx-auto mb-2 ${card.color}`} />
                <p className="font-semibold text-foreground text-sm">{card.label}</p>
                <p className="text-xs text-muted">{card.desc}</p>
                <p className="font-mono text-xs text-primary mt-1">{count.toLocaleString("da-DK")}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Filter bar */}
      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        municipality={municipality}
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

      {/* Split layout: List + Map */}
      <section className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sidebar list */}
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
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="font-mono text-sm font-medium text-primary">
                      {formatDKK(inst.monthlyRate)}
                    </p>
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
              Viser 50 af {filtered.length.toLocaleString("da-DK")} resultater. Brug filtre til at indsnævre.
            </p>
          )}
        </div>

        {/* Map or Detail */}
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

      {/* Municipality ranking */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-foreground mb-6">
          Kommuneoversigt
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-3 text-muted font-medium" scope="col">Kommune</th>
                <th className="text-right py-3 px-3 text-muted font-medium" scope="col">Dagpleje</th>
                <th className="text-right py-3 px-3 text-muted font-medium" scope="col">Vuggestue</th>
                <th className="text-right py-3 px-3 text-muted font-medium" scope="col">Børnehave</th>
                <th className="text-right py-3 px-3 text-muted font-medium" scope="col">SFO</th>
                <th className="text-right py-3 px-3 text-muted font-medium" scope="col">Institutioner</th>
              </tr>
            </thead>
            <tbody>
              {municipalities.slice(0, 20).map((m) => {
                const total = m.vuggestueCount + m.boernehaveCount + m.dagplejeCount + m.folkeskoleCount + m.friskoleCount + m.sfoCount;
                return (
                  <tr key={m.municipality} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                    <td className="py-2 px-3">
                      <Link to={`/kommune/${encodeURIComponent(m.municipality)}`} className="text-primary hover:underline font-medium">
                        {m.municipality}
                      </Link>
                    </td>
                    <td className="py-2 px-3 text-right font-mono">{formatDKK(m.rates.dagpleje)}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatDKK(m.rates.vuggestue)}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatDKK(m.rates.boernehave)}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatDKK(m.rates.sfo)}</td>
                    <td className="py-2 px-3 text-right font-mono">{total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {municipalities.length > 20 && (
          <p className="text-center text-sm text-muted mt-4">
            Viser 20 af {municipalities.length} kommuner. Brug søgefeltet ovenfor til at finde din kommune.
          </p>
        )}
      </section>

      {/* Cross-sell: Suite products */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-foreground mb-2 text-center">
          Flere værktøjer til din familieøkonomi
        </h2>
        <p className="text-muted text-center mb-8">
          Institutionsguide er del af ParFinans-familien af gratis finansielle værktøjer.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a
            href="https://nemtbudget.nu"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-card p-5 hover:scale-[1.02] transition-transform group"
          >
            <Wallet className="w-8 h-8 text-blue-500 mb-3" />
            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">NemtBudget</p>
            <p className="text-sm text-muted mt-1">Beregn dit rådighedsbeløb gratis. Find ud af hvad du reelt har til overs efter alle faste udgifter.</p>
          </a>
          <a
            href="https://parfinans.dk"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-card p-5 hover:scale-[1.02] transition-transform group"
          >
            <Calculator className="w-8 h-8 text-amber-600 mb-3" />
            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">ParFinans</p>
            <p className="text-sm text-muted mt-1">Fair fordeling af udgifter for par. Beregn parøkonomi med præcis skat for alle 98 kommuner.</p>
          </a>
          <a
            href="https://børneskat.dk"
            target="_blank"
            rel="noopener noreferrer"
            className="glass-card p-5 hover:scale-[1.02] transition-transform group"
          >
            <PiggyBank className="w-8 h-8 text-success mb-3" />
            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">Børneskat</p>
            <p className="text-sm text-muted mt-1">Skatteeffektiv opsparing til dit barn. Guide, investeringstjekker og beregner til børnedepot.</p>
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-primary" />
          Ofte stillede spørgsmål
        </h2>
        <div className="space-y-4">
          {FAQ_ITEMS.map((faq) => (
            <details key={faq.q} className="glass-card p-4 group">
              <summary className="font-semibold text-foreground cursor-pointer list-none flex justify-between items-center min-h-[44px]">
                {faq.q}
                <span className="text-muted group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-muted text-sm mt-3 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Compare bar */}
      <CompareBar
        selected={compareList}
        onRemove={(id) => setCompareList(compareList.filter((c) => c.id !== id))}
        onClear={() => setCompareList([])}
      />
    </>
  );
}
