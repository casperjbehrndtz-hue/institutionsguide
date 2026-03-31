import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, RotateCcw, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import { GeoModal, GeoErrorToast } from "@/components/shared/GeoUI";
import { usePreferenceScoring } from "@/hooks/usePreferenceScoring";
import { DIMENSIONS_BY_CATEGORY, categoryHasFinder, type InstitutionCategory } from "@/lib/preferenceConfig";
import PreferencePanel from "@/components/preferences/PreferencePanel";
import MatchCard from "@/components/preferences/MatchCard";
import SEOHead from "@/components/shared/SEOHead";

const STORAGE_KEY = "preference-weights";

// ── Presets ──────────────────────────────────────────────────────

interface Preset {
  id: string;
  label: { da: string; en: string };
  emoji: string;
  weights: Record<string, number>;
  /** Which categories this preset applies to */
  categories: InstitutionCategory[];
}

const PRESETS: Preset[] = [
  {
    id: "academic",
    label: { da: "Akademisk fokus", en: "Academic focus" },
    emoji: "📝",
    weights: { karakterer: 90, kompetence: 70, trivsel: 40, fravaer: 50, klassestorrelse: 30, elevPrLaerer: 40, distance: 10 },
    categories: ["skole"],
  },
  {
    id: "wellbeing",
    label: { da: "Trygt miljø", en: "Safe environment" },
    emoji: "🤗",
    weights: { trivsel: 90, fravaer: 70, klassestorrelse: 60, elevPrLaerer: 50, karakterer: 20, kompetence: 30, distance: 30 },
    categories: ["skole"],
  },
  {
    id: "individual",
    label: { da: "Individuel opmærksomhed", en: "Individual attention" },
    emoji: "🧑‍🏫",
    weights: { elevPrLaerer: 100, undervisningstid: 80, klassestorrelse: 70, trivsel: 40, karakterer: 30, distance: 20 },
    categories: ["skole"],
  },
  {
    id: "nearby-school",
    label: { da: "Tæt på os", en: "Close to us" },
    emoji: "📍",
    weights: { distance: 100, trivsel: 40, karakterer: 40, fravaer: 20, kompetence: 10, klassestorrelse: 10 },
    categories: ["skole"],
  },
  {
    id: "quality-care",
    label: { da: "Bedste kvalitet", en: "Best quality" },
    emoji: "⭐",
    weights: { normering: 90, uddannelse: 80, tilfredshed: 70, price: 20, distance: 20 },
    categories: ["vuggestue", "boernehave", "dagpleje", "sfo"],
  },
  {
    id: "budget",
    label: { da: "Billigst muligt", en: "Lowest price" },
    emoji: "💰",
    weights: { price: 100, normering: 30, distance: 40, uddannelse: 10, tilfredshed: 20 },
    categories: ["vuggestue", "boernehave", "dagpleje", "sfo", "efterskole"],
  },
  {
    id: "nearby-care",
    label: { da: "Tæt på os", en: "Close to us" },
    emoji: "📍",
    weights: { distance: 100, normering: 40, tilfredshed: 30, price: 20, uddannelse: 10 },
    categories: ["vuggestue", "boernehave", "dagpleje", "sfo"],
  },
];

// ── Helpers ──────────────────────────────────────────────────────

function loadSavedWeights(): { category: InstitutionCategory; weights: Record<string, number> } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** All sliders start at 0 (off) — user chooses what matters via presets or manual */
function getEmptyWeights(category: InstitutionCategory): Record<string, number> {
  const dims = DIMENSIONS_BY_CATEGORY[category] ?? [];
  const w: Record<string, number> = {};
  for (const d of dims) {
    w[d.key] = 0;
  }
  return w;
}

// ── Component ───────────────────────────────────────────────────

export default function FindPage() {
  const { institutions, institutionStats, normering, loading } = useData();
  const { language } = useLanguage();

  const saved = useMemo(loadSavedWeights, []);

  const [category, setCategory] = useState<InstitutionCategory>(
    saved?.category && categoryHasFinder(saved.category) ? saved.category : "skole",
  );
  const [weights, setWeights] = useState<Record<string, number>>(
    () => saved?.weights ?? getEmptyWeights(saved?.category ?? "skole"),
  );
  const [municipality, setMunicipality] = useState<string>("");
  const [showPanel, setShowPanel] = useState(true);
  const [showExcluded, setShowExcluded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);

  // Debounced localStorage save (#11)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSave = useCallback((cat: InstitutionCategory, w: Record<string, number>) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ category: cat, weights: w }));
      } catch { /* */ }
    }, 500);
  }, []);
  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  const geo = useGeolocation(
    useCallback(() => {
      // When geolocation resolves, enable distance slider if it was off
      setWeights((prev) => {
        if ((prev.distance ?? 0) === 0) {
          return { ...prev, distance: 50 };
        }
        return prev;
      });
    }, []),
  );

  const handleCategoryChange = useCallback((c: InstitutionCategory) => {
    setCategory(c);
    const newW = getEmptyWeights(c);
    setWeights(newW);
    setVisibleCount(20);
    setShowExcluded(false);
    debouncedSave(c, newW);
  }, [debouncedSave]);

  const handleWeightChange = useCallback((key: string, value: number) => {
    setWeights((prev) => {
      const next = { ...prev, [key]: value };
      debouncedSave(category, next);
      return next;
    });
  }, [category, debouncedSave]);

  const handleReset = useCallback(() => {
    const newW = getEmptyWeights(category);
    setWeights(newW);
    debouncedSave(category, newW);
  }, [category, debouncedSave]);

  const handlePreset = useCallback((preset: Preset) => {
    const dims = DIMENSIONS_BY_CATEGORY[category] ?? [];
    const newW: Record<string, number> = {};
    for (const d of dims) {
      newW[d.key] = preset.weights[d.key] ?? 0;
    }
    // If preset uses distance and we have location, ensure it's active
    if (newW.distance && newW.distance > 0 && !geo.userLocation) {
      geo.handleNearMe();
    }
    setWeights(newW);
    setVisibleCount(20);
    debouncedSave(category, newW);
  }, [category, debouncedSave, geo]);

  const municipalities = useMemo(() => {
    const set = new Set<string>();
    for (const inst of institutions) {
      if (inst.category === category) set.add(inst.municipality);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "da"));
  }, [institutions, category]);

  const { ranked, excluded } = usePreferenceScoring({
    institutions,
    category,
    weights,
    userLocation: geo.userLocation,
    institutionStats,
    normering,
    municipality: municipality || undefined,
  });

  const hasActiveWeights = Object.values(weights).some((w) => w > 0);
  const activeCount = Object.values(weights).filter((w) => w > 0).length;
  const presetsForCategory = PRESETS.filter((p) => p.categories.includes(category));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title={language === "da" ? "Find den rette institution — Personlig ranking" : "Find the right institution — Personal ranking"}
        description={language === "da"
          ? "Juster dine prioriteter og find den institution der passer bedst til din familie. Personlig ranking baseret på officielle data."
          : "Adjust your priorities and find the best institution for your family. Personal ranking based on official data."}
        path="/find"
      />

      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            {language === "da" ? "Personlig ranking" : "Personal ranking"}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-2">
            {language === "da" ? "Find den rette institution" : "Find the right institution"}
          </h1>
          <p className="text-muted max-w-xl mx-auto">
            {language === "da"
              ? "Vælg en hurtig profil eller juster sliderne selv. Vi rangerer alle institutioner baseret på jeres prioriteter."
              : "Choose a quick profile or adjust the sliders yourself. We'll rank all institutions based on your priorities."}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left panel: preferences */}
          <div className="lg:w-[380px] shrink-0">
            <div className="lg:sticky lg:top-20">
              {/* Mobile toggle */}
              <button
                onClick={() => setShowPanel(!showPanel)}
                className="lg:hidden w-full flex items-center justify-between p-3 rounded-xl bg-bg-card border border-border mb-3"
              >
                <span className="text-sm font-medium">
                  {language === "da" ? `${activeCount} prioriteter aktive` : `${activeCount} priorities active`}
                </span>
                {showPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              <div className={`${showPanel ? "block" : "hidden lg:block"} rounded-xl bg-bg-card border border-border p-4 shadow-sm`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg font-bold text-foreground">
                    {language === "da" ? "Dine prioriteter" : "Your priorities"}
                  </h2>
                  <button
                    onClick={handleReset}
                    className="text-xs text-muted hover:text-foreground flex items-center gap-1 transition-colors"
                    title={language === "da" ? "Nulstil" : "Reset"}
                  >
                    <RotateCcw className="w-3 h-3" />
                    {language === "da" ? "Nulstil" : "Reset"}
                  </button>
                </div>

                <PreferencePanel
                  category={category}
                  onCategoryChange={handleCategoryChange}
                  weights={weights}
                  onWeightChange={handleWeightChange}
                  language={language}
                  hasLocation={!!geo.userLocation}
                  nearMeLoading={geo.nearMeLoading}
                  onNearMe={geo.handleNearMe}
                />

                {/* Quick presets */}
                {presetsForCategory.length > 0 && !hasActiveWeights && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {language === "da" ? "Hurtig-profiler" : "Quick profiles"}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {presetsForCategory.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => handlePreset(preset)}
                          className="text-xs px-3 py-1.5 rounded-full border border-accent/30 text-accent hover:bg-accent/10 hover:border-accent/50 transition-all font-medium"
                        >
                          {preset.emoji} {language === "da" ? preset.label.da : preset.label.en}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Municipality filter */}
                <div className="mt-4 pt-4 border-t border-border/50">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider block mb-1.5">
                    {language === "da" ? "Kommune (valgfri)" : "Municipality (optional)"}
                  </label>
                  <select
                    value={municipality}
                    onChange={(e) => { setMunicipality(e.target.value); setVisibleCount(20); }}
                    className="w-full text-sm rounded-lg border border-border bg-bg-card px-3 py-2 text-foreground"
                  >
                    <option value="">{language === "da" ? "Alle kommuner" : "All municipalities"}</option>
                    {municipalities.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: results */}
          <div className="flex-1 min-w-0">
            {!hasActiveWeights ? (
              <div className="text-center py-16 text-muted">
                <p className="text-lg mb-2">
                  {language === "da" ? "Vælg en hurtig-profil eller juster sliderne" : "Choose a quick profile or adjust the sliders"}
                </p>
                <p className="text-sm">
                  {language === "da"
                    ? "Fortæl os hvad der er vigtigt for jeres familie, og vi finder de bedste matches"
                    : "Tell us what matters to your family, and we'll find the best matches"}
                </p>
              </div>
            ) : (
              <>
                {/* Results header */}
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="font-display text-lg font-bold text-foreground">
                    {language === "da" ? "Dine top matches" : "Your top matches"}
                    <span className="text-sm font-normal text-muted ml-2">
                      {ranked.length} {language === "da" ? "institutioner" : "institutions"}
                    </span>
                  </h2>
                </div>

                {ranked.length === 0 && excluded.length === 0 ? (
                  <div className="text-center py-12 text-muted">
                    <p>{language === "da" ? "Ingen institutioner matcher dine kriterier" : "No institutions match your criteria"}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {ranked.slice(0, visibleCount).map((r, i) => (
                      <MatchCard
                        key={r.institution.id}
                        result={r}
                        rank={i + 1}
                        language={language}
                      />
                    ))}

                    {visibleCount < ranked.length && (
                      <button
                        onClick={() => setVisibleCount((v) => v + 20)}
                        className="w-full py-3 text-sm font-medium text-primary hover:bg-primary/5 rounded-xl border border-border transition-colors"
                      >
                        {language === "da"
                          ? `Vis flere (${ranked.length - visibleCount} tilbage)`
                          : `Show more (${ranked.length - visibleCount} remaining)`}
                      </button>
                    )}

                    {/* Excluded — low data */}
                    {excluded.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-border/50">
                        <button
                          onClick={() => setShowExcluded(!showExcluded)}
                          className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
                        >
                          {showExcluded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          {language === "da"
                            ? `${excluded.length} institutioner med begrænset data`
                            : `${excluded.length} institutions with limited data`}
                        </button>
                        {showExcluded && (
                          <div className="space-y-2 mt-3 opacity-70">
                            {excluded.map((r, i) => (
                              <MatchCard
                                key={r.institution.id}
                                result={r}
                                rank={ranked.length + i + 1}
                                language={language}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* CTA to methodology */}
            <div className="mt-8 p-4 rounded-xl bg-muted/5 border border-border/50 text-center">
              <p className="text-xs text-muted mb-1">
                {language === "da"
                  ? "Ranking baseret på officielle data fra Uddannelsesstatistik, Danmarks Statistik og Dagtilbudsregisteret"
                  : "Ranking based on official data from the Danish Ministry of Education, Statistics Denmark, and the Daycare Registry"}
              </p>
              <Link to="/metode" className="text-xs text-primary hover:underline">
                {language === "da" ? "Læs om vores metode →" : "Read about our methodology →"}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {geo.showGeoModal && (
        <GeoModal onAccept={geo.acceptConsent} onDismiss={geo.dismissModal} />
      )}
      {geo.geoError && (
        <GeoErrorToast message={geo.geoError} onDismiss={geo.dismissError} onRetry={geo.retryGeolocation} />
      )}
    </>
  );
}
