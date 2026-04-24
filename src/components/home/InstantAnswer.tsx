import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, MapPin, Search, Sparkles, X } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import { buildMIDataset } from "@/lib/mi/aggregate";
import { percentileOf } from "@/lib/mi/percentiles";
import GradeBadge from "@/components/shared/GradeBadge";
import { formatDKK } from "@/lib/format";
import { toSlug } from "@/lib/slugs";
import type { UnifiedInstitution } from "@/lib/types";

interface InstantAnswerProps {
  onLocationSelected?: (kommune: string, postnummer?: string) => void;
}

/** Popular quick-click destinations shown above the input on empty state */
const QUICK_PICKS: { pn: string; city: string }[] = [
  { pn: "2100", city: "København Ø" },
  { pn: "2300", city: "København S" },
  { pn: "8000", city: "Aarhus C" },
  { pn: "5000", city: "Odense C" },
  { pn: "9000", city: "Aalborg" },
  { pn: "6000", city: "Kolding" },
];

interface PostIndexEntry { city: string; kommune: string; count: number }
type PostIndex = Record<string, PostIndexEntry>;

type CategoryKey = "vuggestue" | "boernehave" | "dagpleje" | "skole" | "sfo" | "efterskole";

const CATEGORY_OPTIONS: { key: CategoryKey; label: string; primary?: boolean }[] = [
  { key: "skole", label: "Folkeskoler", primary: true },
  { key: "vuggestue", label: "Vuggestuer", primary: true },
  { key: "boernehave", label: "Børnehaver", primary: true },
  { key: "dagpleje", label: "Dagplejere" },
  { key: "sfo", label: "SFO" },
  { key: "efterskole", label: "Efterskoler" },
];

interface LocationCandidate {
  kind: "postnummer" | "kommune";
  id: string;
  label: string;
  sublabel: string;
  kommune: string;
  postnummer?: string;
  count: number;
}

function scoreInstitutionForCategory(
  inst: UnifiedInstitution,
  category: CategoryKey,
  daycareDataset: ReturnType<typeof buildMIDataset> | null,
  schoolDataset: ReturnType<typeof buildMIDataset> | null,
): number | null {
  if (category === "vuggestue" || category === "boernehave" || category === "dagpleje") {
    if (!daycareDataset) return null;
    const row = daycareDataset.rows.find((r) => r.institutionId === inst.id);
    if (!row) return null;
    const cells = Object.values(row.cells).filter((c): c is NonNullable<typeof c> => !!c);
    if (cells.length === 0) return null;
    return cells.reduce((s, c) => s + c.percentile, 0) / cells.length;
  }
  if (category === "skole") {
    if (!schoolDataset) return null;
    const row = schoolDataset.rows.find((r) => r.institutionId === inst.id);
    if (!row) return null;
    const cells = Object.values(row.cells).filter((c): c is NonNullable<typeof c> => !!c);
    if (cells.length === 0) return null;
    return cells.reduce((s, c) => s + c.percentile, 0) / cells.length;
  }
  // SFO / efterskole: no MIL track — use quality.r if present, else null
  if (inst.quality?.r != null) return (inst.quality.r / 5) * 100;
  return null;
}

export default function InstantAnswer({ onLocationSelected }: InstantAnswerProps = {}) {
  const { institutions, institutionStats, kommuneStats, normering } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const geo = useGeolocation(() => { /* no-op — we react via geo.userLocation below */ });

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<LocationCandidate | null>(null);
  const [category, setCategory] = useState<CategoryKey>("skole");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [postIndex, setPostIndex] = useState<PostIndex | null>(null);

  // Load hero video after idle + not on slow networks or when user prefers reduced motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (conn?.saveData === true) return;
    if (conn?.effectiveType === "2g" || conn?.effectiveType === "slow-2g") return;
    const idle = (cb: () => void) =>
      "requestIdleCallback" in window
        ? (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(cb)
        : setTimeout(cb, 400);
    idle(() => setShouldLoadVideo(true));
  }, []);

  // Load postnummer index once
  useEffect(() => {
    let cancelled = false;
    fetch("/data/postnummer-index.json")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (!cancelled && data) setPostIndex(data); })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, []);

  // Hydrate from URL once data is ready
  useEffect(() => {
    const urlCat = searchParams.get("cat") as CategoryKey | null;
    const urlKommune = searchParams.get("k");
    const urlPn = searchParams.get("pn");
    if (urlCat && CATEGORY_OPTIONS.some((c) => c.key === urlCat)) setCategory(urlCat);
    if (urlPn && postIndex?.[urlPn]) {
      const e = postIndex[urlPn];
      setSelected({ kind: "postnummer", id: `pn-${urlPn}`, label: `${urlPn} ${e.city}`, sublabel: `${e.kommune} Kommune`, kommune: e.kommune, postnummer: urlPn, count: e.count });
    } else if (urlKommune) {
      const decoded = decodeURIComponent(urlKommune);
      const count = institutions.filter((i) => i.municipality === decoded).length;
      if (count > 0) {
        setSelected({ kind: "kommune", id: `k-${decoded}`, label: decoded, sublabel: "Hele kommunen", kommune: decoded, count });
      }
    }
  }, [postIndex, institutions, searchParams]);

  // Keep URL in sync with selection
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (selected) {
      if (selected.postnummer) {
        params.set("pn", selected.postnummer);
        params.delete("k");
      } else {
        params.set("k", encodeURIComponent(selected.kommune));
        params.delete("pn");
      }
      params.set("cat", category);
    } else {
      params.delete("pn");
      params.delete("k");
      params.delete("cat");
    }
    const next = params.toString();
    if (next !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, category]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  // Build two MIL datasets once (memoized on underlying data)
  const daycareDataset = useMemo(
    () => buildMIDataset({ track: "daycare", institutions, institutionStats, kommuneStats, normering }),
    [institutions, institutionStats, kommuneStats, normering],
  );
  const schoolDataset = useMemo(
    () => buildMIDataset({ track: "school", institutions, institutionStats, kommuneStats, normering }),
    [institutions, institutionStats, kommuneStats, normering],
  );

  // Live candidates as user types
  const candidates = useMemo<LocationCandidate[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2 || !postIndex) return [];
    const out: LocationCandidate[] = [];
    const isDigits = /^\d+$/.test(q);

    if (isDigits) {
      for (const [pn, e] of Object.entries(postIndex)) {
        if (pn.startsWith(q)) {
          out.push({ kind: "postnummer", id: `pn-${pn}`, label: `${pn} ${e.city}`, sublabel: `${e.kommune} Kommune`, kommune: e.kommune, postnummer: pn, count: e.count });
        }
        if (out.length >= 8) break;
      }
    } else {
      // Match kommune names first
      const kommuneMatches = new Set<string>();
      for (const inst of institutions) {
        if (inst.municipality.toLowerCase().startsWith(q) && !kommuneMatches.has(inst.municipality)) {
          kommuneMatches.add(inst.municipality);
        }
      }
      for (const k of Array.from(kommuneMatches).slice(0, 6).sort((a, b) => a.localeCompare(b, "da"))) {
        const count = institutions.filter((i) => i.municipality === k).length;
        out.push({ kind: "kommune", id: `k-${k}`, label: k, sublabel: `Hele kommunen · ${count} institutioner`, kommune: k, count });
      }
      // Also match city names from postIndex
      for (const [pn, e] of Object.entries(postIndex)) {
        if (e.city.toLowerCase().startsWith(q)) {
          out.push({ kind: "postnummer", id: `pn-${pn}`, label: `${pn} ${e.city}`, sublabel: `${e.kommune} Kommune`, kommune: e.kommune, postnummer: pn, count: e.count });
        }
        if (out.length >= 12) break;
      }
    }
    return out.slice(0, 10);
  }, [query, postIndex, institutions]);

  // Matching institutions for the selected location + category
  const topResults = useMemo(() => {
    if (!selected) return null;
    const filtered = institutions.filter((i) => {
      if (i.category !== category) return false;
      if (selected.postnummer) return i.postalCode === selected.postnummer;
      return i.municipality === selected.kommune;
    });
    const scored = filtered.map((inst) => ({
      inst,
      percentile: scoreInstitutionForCategory(inst, category, daycareDataset, schoolDataset),
    }));
    scored.sort((a, b) => {
      const pa = a.percentile ?? -1;
      const pb = b.percentile ?? -1;
      if (pa === pb) return a.inst.name.localeCompare(b.inst.name, "da");
      return pb - pa;
    });
    return { total: filtered.length, top: scored.slice(0, 5) };
  }, [selected, category, institutions, daycareDataset, schoolDataset]);

  // National top 5 for current category — shown as "Danmarks 5 bedste" when
  // nothing is selected. Gives immediate value at first paint.
  const nationalTop = useMemo(() => {
    const filtered = institutions.filter((i) => i.category === category);
    const scored = filtered
      .map((inst) => ({
        inst,
        percentile: scoreInstitutionForCategory(inst, category, daycareDataset, schoolDataset),
      }))
      .filter((s) => s.percentile != null);
    scored.sort((a, b) => (b.percentile ?? 0) - (a.percentile ?? 0));
    return scored.slice(0, 5);
  }, [category, institutions, daycareDataset, schoolDataset]);

  // Kommune-level percentile for badge
  const kommunePercentile = useMemo<number | null>(() => {
    if (!selected) return null;
    const dataset = category === "skole" ? schoolDataset : daycareDataset;
    if (!dataset) return null;
    const muniRows = dataset.byMunicipality.get(selected.kommune);
    if (!muniRows || muniRows.length === 0) return null;
    const percs = muniRows.flatMap((r) => Object.values(r.cells).filter((c): c is NonNullable<typeof c> => !!c).map((c) => c.percentile));
    if (percs.length === 0) return null;
    const mean = percs.reduce((s, p) => s + p, 0) / percs.length;
    // Convert mean percentile to rank among all kommuner
    const allMeans: number[] = [];
    for (const rows of dataset.byMunicipality.values()) {
      const ps = rows.flatMap((r) => Object.values(r.cells).filter((c): c is NonNullable<typeof c> => !!c).map((c) => c.percentile));
      if (ps.length > 0) allMeans.push(ps.reduce((s, p) => s + p, 0) / ps.length);
    }
    const sorted = [...allMeans].sort((a, b) => a - b);
    return percentileOf(sorted, mean);
  }, [selected, category, daycareDataset, schoolDataset]);

  function handleSelect(c: LocationCandidate) {
    setSelected(c);
    setQuery("");
    setDropdownOpen(false);
    inputRef.current?.blur();
    onLocationSelected?.(c.kommune, c.postnummer);
  }

  function handleQuickPick(pn: string) {
    const e = postIndex?.[pn];
    if (!e) return;
    handleSelect({
      kind: "postnummer",
      id: `pn-${pn}`,
      label: `${pn} ${e.city}`,
      sublabel: `${e.kommune} Kommune`,
      kommune: e.kommune,
      postnummer: pn,
      count: e.count,
    });
  }

  /** Resolve the user's geolocation to nearest postnummer and select it */
  function handleNearMe() {
    geo.handleNearMe();
  }

  // When geolocation resolves, find nearest postnummer with data and select it
  useEffect(() => {
    if (!geo.userLocation || selected) return;
    // Find nearest institution with postalCode, then use that postnummer
    let nearest: { inst: UnifiedInstitution; dist: number } | null = null;
    for (const inst of institutions) {
      if (!inst.postalCode) continue;
      const dLat = inst.lat - geo.userLocation.lat;
      const dLng = (inst.lng - geo.userLocation.lng) * Math.cos(geo.userLocation.lat * Math.PI / 180);
      const dist = Math.hypot(dLat, dLng);
      if (!nearest || dist < nearest.dist) nearest = { inst, dist };
    }
    if (nearest?.inst.postalCode) handleQuickPick(nearest.inst.postalCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.userLocation]);

  function clearSelection() {
    setSelected(null);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  const seeAllHref = selected
    ? (category === "sfo" || category === "efterskole"
        ? `/${category}`
        : `/${category}/${toSlug(selected.kommune)}`)
    : `/${category}`;

  return (
    <section className="relative overflow-hidden bg-primary">
      {/* Poster backdrop always — video fades in when idle & network OK */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/og-image.png')", filter: "brightness(0.45) saturate(0.5) contrast(0.95)" }}
      />
      {shouldLoadVideo && (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          poster="/og-image.png"
          className="absolute left-0 top-[90%] w-full min-h-full object-cover pointer-events-none"
          style={{ transform: "translateY(-90%)", filter: "brightness(0.45) saturate(0.5) contrast(0.95)" }}
        >
          <source src="/hero-1.mp4" type="video/mp4" />
        </video>
      )}
      <div aria-hidden="true" className="absolute inset-0 bg-primary/75" />
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, transparent 0%, transparent 45%, rgba(13,28,47,0.35) 100%)" }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-12 pb-8 sm:pt-16 sm:pb-12">
        <h1 className="font-display text-[2rem] sm:text-[3rem] lg:text-[3.5rem] font-bold text-white leading-[1.08] mb-3 tracking-tight text-center">
          Find den bedste institution til dit barn
        </h1>
        <p className="text-white/70 text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed text-center">
          Uafhængig kvalitetsdata fra Undervisningsministeriet og Danmarks Statistik.
          Find skolen, børnehaven eller vuggestuen med den bedste kvalitet i dit område.
        </p>

        {/* Category toggle — primary options emphasized, rest muted */}
        <div role="tablist" aria-label="Vælg institutionstype" className="flex flex-wrap gap-1.5 justify-center mb-3">
          {CATEGORY_OPTIONS.map((opt) => {
            const active = category === opt.key;
            if (opt.primary) {
              return (
                <button
                  key={opt.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setCategory(opt.key)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors min-h-[40px] ${
                    active
                      ? "bg-white text-primary shadow-md"
                      : "bg-white/15 text-white hover:bg-white/25"
                  }`}
                >
                  {opt.label}
                </button>
              );
            }
            return (
              <button
                key={opt.key}
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(opt.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[32px] ${
                  active
                    ? "bg-white text-primary"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Location input + dropdown */}
        <div ref={wrapperRef} className="relative max-w-xl mx-auto">
          {selected ? (
            <div className="flex items-center justify-between gap-2 bg-white rounded-full pl-5 pr-2 py-3 shadow-lg">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{selected.label}</p>
                  <p className="text-[11px] text-muted truncate">{selected.sublabel}</p>
                </div>
              </div>
              <button
                onClick={clearSelection}
                className="p-2 rounded-full hover:bg-muted/10 transition-colors text-muted"
                aria-label="Skift område"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/70 pointer-events-none" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onFocus={() => setDropdownOpen(true)}
                onChange={(e) => { setQuery(e.target.value); setDropdownOpen(true); }}
                placeholder="Skriv postnummer eller by (fx 2500 eller Aarhus)"
                className="w-full py-4 pl-14 pr-6 text-[16px] rounded-full bg-white text-foreground placeholder:text-muted/70 border border-black/5 focus:outline-none focus:ring-2 focus:ring-accent shadow-lg"
                autoComplete="off"
                inputMode="search"
              />
              {dropdownOpen && candidates.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-border/50 overflow-hidden max-h-[320px] overflow-y-auto z-20">
                  {candidates.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleSelect(c)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-primary/5 transition-colors border-b border-border/40 last:border-b-0"
                    >
                      <MapPin className="w-4 h-4 text-muted shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">{c.label}</p>
                        <p className="text-[11px] text-muted truncate">{c.sublabel}</p>
                      </div>
                      <span className="text-[11px] text-muted font-mono tabular-nums shrink-0">
                        {c.count} {c.count === 1 ? "inst." : "inst."}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {dropdownOpen && query.length >= 2 && candidates.length === 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-border/50 p-4 z-20">
                  <p className="text-sm text-foreground font-medium mb-2">Ingen match på "{query}"</p>
                  <p className="text-xs text-muted mb-3">Prøv et 4-cifret postnummer eller fuldt kommunenavn, eller lad os finde dit nærområde automatisk.</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => { handleNearMe(); setDropdownOpen(false); setQuery(""); }}
                      disabled={geo.nearMeLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary-light transition-colors disabled:opacity-50"
                    >
                      <MapPin className="w-3 h-3" />
                      {geo.nearMeLoading ? "Henter…" : "Find i nærheden"}
                    </button>
                    <Link
                      to="/kommune-intelligens"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border border-border text-foreground hover:bg-primary/5 transition-colors"
                    >
                      Se alle 98 kommuner <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick-pick popular locations — shown only when nothing selected */}
        {!selected && postIndex && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 max-w-2xl mx-auto">
            <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-white/55">Populære:</span>
            {QUICK_PICKS.filter((q) => postIndex[q.pn]).map((q) => (
              <button
                key={q.pn}
                onClick={() => handleQuickPick(q.pn)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-white text-[12px] font-medium hover:bg-white/20 transition-colors"
              >
                {q.pn} {q.city}
              </button>
            ))}
            <button
              onClick={handleNearMe}
              disabled={geo.nearMeLoading}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-white text-[12px] font-medium hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              <MapPin className="w-3 h-3" />
              {geo.nearMeLoading ? "Henter…" : "Min position"}
            </button>
          </div>
        )}
      </div>

      {/* Default results panel — "Danmarks 5 bedste" when nothing selected */}
      {!selected && nationalTop.length > 0 && (
        <div className="relative z-10 bg-bg border-t border-border/30">
          <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Danmarks 5 bedste {CATEGORY_OPTIONS.find((c) => c.key === category)?.label.toLowerCase()}
                </h2>
                <p className="text-[11px] text-muted mt-0.5">Rangeret på national percentil — vælg område ovenfor for dine lokale resultater.</p>
              </div>
              <Link to={`/${category === "sfo" || category === "efterskole" ? category : category}`} className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1">
                Se alle <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <ol className="rounded-xl border border-border bg-bg-card overflow-hidden divide-y divide-border">
              {nationalTop.map(({ inst, percentile }, i) => (
                <li key={inst.id}>
                  <Link
                    to={`/institution/${inst.id}`}
                    className="flex items-center gap-3 px-3 sm:px-4 py-3 hover:bg-primary/5 transition-colors"
                  >
                    <span className="text-muted font-mono tabular-nums text-xs w-5 shrink-0">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{inst.name}</p>
                      <p className="text-[11px] text-muted truncate">
                        {inst.municipality} · {inst.postalCode} {inst.city}
                        {inst.monthlyRate ? <> · <span className="font-mono tabular-nums">{formatDKK(inst.monthlyRate)}/md</span></> : null}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <GradeBadge percentile={percentile} variant="compact" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted shrink-0" />
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* Location-specific results panel */}
      {selected && topResults && (
        <div className="relative z-10 bg-bg border-t border-border/30">
          <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">
                  {topResults.total === 0
                    ? `Ingen ${CATEGORY_OPTIONS.find((c) => c.key === category)?.label.toLowerCase()} i ${selected.postnummer ? selected.label : selected.kommune}`
                    : `Top ${Math.min(5, topResults.total)} ${CATEGORY_OPTIONS.find((c) => c.key === category)?.label.toLowerCase()} i ${selected.postnummer ? selected.label : selected.kommune}`}
                </h2>
                {kommunePercentile != null && (category === "skole" || category === "vuggestue" || category === "boernehave" || category === "dagpleje") && (
                  <p className="text-xs text-muted mt-1 flex items-center gap-2">
                    <span>Kommunens samlede niveau:</span>
                    <GradeBadge percentile={kommunePercentile} variant="compact" />
                  </p>
                )}
              </div>
              {topResults.total > 5 && (
                <Link to={seeAllHref} className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1">
                  Se alle {topResults.total} <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>

            {topResults.total === 0 ? (
              <div className="rounded-xl border border-border bg-bg-card p-4 text-sm text-muted">
                Prøv en anden kategori eller udvid til hele kommunen.
              </div>
            ) : (
              <ol className="rounded-xl border border-border bg-bg-card overflow-hidden divide-y divide-border">
                {topResults.top.map(({ inst, percentile }, i) => (
                  <li key={inst.id}>
                    <Link
                      to={`/institution/${inst.id}`}
                      className="flex items-center gap-3 px-3 sm:px-4 py-3 hover:bg-primary/5 transition-colors"
                    >
                      <span className="text-muted font-mono tabular-nums text-xs w-5 shrink-0">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">{inst.name}</p>
                        <p className="text-[11px] text-muted truncate">
                          {inst.postalCode} {inst.city}
                          {inst.monthlyRate ? <> · <span className="font-mono tabular-nums">{formatDKK(inst.monthlyRate)}/md</span></> : null}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <GradeBadge percentile={percentile} variant="compact" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted shrink-0" />
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
