import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Building2, GraduationCap, Users, Home, BookOpen, HelpCircle, Calculator, PiggyBank, Wallet } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFilteredInstitutions } from "@/hooks/useFilteredInstitutions";
import SearchFilterBar from "@/components/filters/SearchFilterBar";
import InstitutionMap from "@/components/map/InstitutionMap";
import InstitutionDetail from "@/components/detail/InstitutionDetail";
import CompareBar from "@/components/compare/CompareBar";
import { formatDKK as _formatDKK } from "@/lib/format";
import type { UnifiedInstitution, InstitutionCategory, SortKey } from "@/lib/types";

function formatDKK(val: number | null): string {
  if (val === null) return "–";
  return _formatDKK(val);
}

const FAQ_ITEMS_DA = [
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

const FAQ_ITEMS_EN = [
  {
    q: "What is childcare subsidy, and who can get it?",
    a: "Childcare subsidy (fripladstilskud) is a discount on parental fees for daycare. The subsidy depends on household income. In 2026, families with an income below DKK 677,500 can receive partial subsidy, and below DKK 218,100 full subsidy.",
  },
  {
    q: "What is the difference between childminder and nursery?",
    a: "Childminders (dagpleje) care for children in their private home with max 4-5 children, while nurseries (vuggestue) are institutions with more children and staff. Childminders are often cheaper, while nurseries typically have more pedagogues and facilities.",
  },
  {
    q: "How is the quality score for schools calculated?",
    a: "The quality score is based on official data from the Danish Ministry of Education and includes well-being surveys, grade averages, absence, competence coverage and teaching effectiveness (socio-economic reference).",
  },
  {
    q: "Are the prices up to date?",
    a: "Prices are based on data from Statistics Denmark (2025 figures) and the Daycare Registry. Municipalities typically adjust rates annually, so minor deviations may occur.",
  },
];

export default function HomePage() {
  const { institutions, municipalities, loading, error } = useData();
  const { t, language } = useLanguage();
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

  function handleSelect(inst: UnifiedInstitution) {
    setSelected(inst);
    setFlyTo({ lat: inst.lat, lng: inst.lng, zoom: 14 });
  }

  function handleCompare(inst: UnifiedInstitution) {
    if (compareList.length >= 4) return;
    if (compareList.find((c) => c.id === inst.id)) return;
    setCompareList([...compareList, inst]);
  }

  const CATEGORY_CARDS = [
    { category: "vuggestue" as const, label: t.categories.vuggestue, icon: Home, color: "text-success", href: "/vuggestue", desc: t.ageGroups.vuggestue },
    { category: "boernehave" as const, label: t.categories.boernehave, icon: Building2, color: "text-primary", href: "/boernehave", desc: t.ageGroups.boernehave },
    { category: "dagpleje" as const, label: t.categories.dagpleje, icon: Users, color: "text-warning", href: "/dagpleje", desc: t.ageGroups.dagpleje },
    { category: "skole" as const, label: t.categories.skole, icon: GraduationCap, color: "text-blue-500", href: "/skole", desc: t.ageGroups.skole },
    { category: "sfo" as const, label: t.categories.sfo, icon: BookOpen, color: "text-purple-500", href: "/sfo", desc: t.ageGroups.sfo },
  ];

  const FAQ_ITEMS = language === "en" ? FAQ_ITEMS_EN : FAQ_ITEMS_DA;

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
      {/* Hero */}
      <section className="px-4 py-12 sm:py-16 text-center bg-gradient-to-b from-primary/5 to-transparent">
        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
          {t.home.heroTitle}
        </h1>
        <p className="text-muted text-lg max-w-2xl mx-auto mb-8">
          {language === "da" ? "Sammenlign " : "Compare "}
          <span className="font-mono font-semibold text-primary">{institutions.length.toLocaleString("da-DK")}+</span>{" "}
          {t.home.heroSubtitle}
        </p>

        {/* Category cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 max-w-4xl mx-auto">
          {CATEGORY_CARDS.map((card) => {
            const count = institutions.filter((i) => i.category === card.category).length;
            return (
              <Link
                key={card.category}
                to={card.href}
                className="card p-4 text-center hover:scale-[1.02] transition-transform min-h-[44px]"
                aria-label={`${t.common.show} ${card.label}`}
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
                aria-label={`${inst.name}`}
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
              {t.common.showing} 50 {t.common.of} {filtered.length.toLocaleString("da-DK")} {t.common.results}. {t.common.useFilters}
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
          {t.home.municipalityOverview}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-3 text-muted font-medium" scope="col">{t.sort.municipality}</th>
                <th className="text-right py-3 px-3 text-muted font-medium" scope="col">{t.categories.dagpleje}</th>
                <th className="text-right py-3 px-3 text-muted font-medium" scope="col">{t.categories.vuggestue}</th>
                <th className="text-right py-3 px-3 text-muted font-medium" scope="col">{t.categories.boernehave}</th>
                <th className="text-right py-3 px-3 text-muted font-medium" scope="col">{t.categories.sfo}</th>
                <th className="text-right py-3 px-3 text-muted font-medium" scope="col">{t.common.institutions}</th>
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
            {t.common.showing} 20 {t.common.of} {municipalities.length} {language === "da" ? "kommuner." : "municipalities."}
          </p>
        )}
      </section>

      {/* Cross-sell: Suite products */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-foreground mb-2 text-center">
          {t.home.moreTools}
        </h2>
        <p className="text-muted text-center mb-8">
          {t.home.moreToolsSubtitle}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a
            href="https://nemtbudget.nu"
            target="_blank"
            rel="noopener noreferrer"
            className="card p-5 hover:scale-[1.02] transition-transform group"
          >
            <Wallet className="w-8 h-8 text-blue-500 mb-3" />
            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">NemtBudget</p>
            <p className="text-sm text-muted mt-1">{t.suiteProducts.nemtbudget}</p>
          </a>
          <a
            href="https://parfinans.dk"
            target="_blank"
            rel="noopener noreferrer"
            className="card p-5 hover:scale-[1.02] transition-transform group"
          >
            <Calculator className="w-8 h-8 text-amber-600 mb-3" />
            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">ParFinans</p>
            <p className="text-sm text-muted mt-1">{t.suiteProducts.parfinans}</p>
          </a>
          <a
            href="https://børneskat.dk"
            target="_blank"
            rel="noopener noreferrer"
            className="card p-5 hover:scale-[1.02] transition-transform group"
          >
            <PiggyBank className="w-8 h-8 text-success mb-3" />
            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">Børneskat</p>
            <p className="text-sm text-muted mt-1">{t.suiteProducts.boerneskat}</p>
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-primary" />
          {t.home.faq}
        </h2>
        <div className="space-y-4">
          {FAQ_ITEMS.map((faq) => (
            <details key={faq.q} className="card p-4 group">
              <summary className="font-semibold text-foreground cursor-pointer list-none flex justify-between items-center min-h-[44px]">
                {faq.q}
                <span className="text-muted group-open:rotate-180 transition-transform ml-2 shrink-0">&#x25BC;</span>
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
