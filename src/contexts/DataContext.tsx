import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react";
import type {
  UnifiedInstitution,
  CompactSchool,
  MunicipalitySummary,
  NormeringEntry,
  InstitutionStats,
  KommuneStats,
} from "@/lib/types";
import { CHILDCARE_RATES_2025 } from "@/lib/childcare/rates";

interface SchoolData {
  s: CompactSchool[];
  avg: { trivsel: number; karakterer: number; fravaer: number };
}

/** Compact dagtilbud record (short keys from compact-data.mjs) */
interface CompactDagtilbud {
  id: string;
  n: string;
  tp: string;
  ow: string;
  m: string;
  a?: string;
  z?: string;
  c?: string;
  la?: number;
  lo?: number;
  e?: string;
  ph?: string;
  ar?: number;
  mr?: number;
}

interface CompactDagtilbudData {
  i: CompactDagtilbud[];
}

/** Compact normering record from normering-data.json */
interface CompactNormering {
  m: string;  // municipality
  ag: string; // ageGroup
  y: number;  // year
  r: number;  // ratio
}

interface DataContextValue {
  institutions: UnifiedInstitution[];
  municipalities: MunicipalitySummary[];
  normering: NormeringEntry[];
  institutionStats: Record<string, InstitutionStats>;
  kommuneStats: Record<string, KommuneStats>;
  loading: boolean;
  error: string | null;
  nationalAverages: { trivsel: number; karakterer: number; fravaer: number };
}

const DataContext = createContext<DataContextValue | null>(null);

function mapSchoolType(t: "f" | "p" | "e" | "u"): string {
  switch (t) {
    case "f": return "folkeskole";
    case "p": return "friskole";
    case "e": return "efterskole";
    case "u": return "ungdomsskole";
    default: return "skole";
  }
}

function schoolToUnified(s: CompactSchool): UnifiedInstitution | null {
  if (!s.la || !s.lo) return null;
  if (s.t === "u") return null; // skip ungdomsskoler
  const isEfterskole = s.t === "e";
  return {
    id: `school-${s.id}`,
    name: s.n,
    category: isEfterskole ? "efterskole" : "skole",
    subtype: mapSchoolType(s.t),
    municipality: s.m.replace(" Kommune", ""),
    address: s.a,
    postalCode: s.z,
    city: s.c,
    lat: s.la,
    lng: s.lo,
    monthlyRate: isEfterskole ? (s.wp || null) : (s.sfo || null),
    annualRate: isEfterskole ? (s.yp || null) : (s.sfo ? s.sfo * 12 : null),
    leader: s.l,
    web: s.w,
    email: s.e,
    quality: s.q,
    // Efterskole-specific
    yearlyPrice: s.yp,
    weeklyPrice: s.wp,
    profiles: s.pr,
    schoolType: s.sc,
    classLevels: s.cl,
    availableSpots: s.av,
    imageUrl: s.img ? `https://www.efterskolerne.dk${s.img}` : undefined,
    edkUrl: s.url ? `https://www.efterskolerne.dk${s.url}` : undefined,
  };
}

function dagtilbudCategory(type: string): "vuggestue" | "boernehave" | "dagpleje" | "sfo" | "fritidsklub" {
  switch (type) {
    case "dagpleje": return "dagpleje";
    case "sfo": return "sfo";
    case "klub": return "fritidsklub";
    case "boernehave": return "boernehave";
    default: return "vuggestue"; // vuggestue, aldersintegreret, andet
  }
}

function compactDagtilbudToUnified(d: CompactDagtilbud, prefix: string): UnifiedInstitution | null {
  if (!d.la || !d.lo) return null;
  return {
    id: `${prefix}-${d.id}`,
    name: d.n,
    category: dagtilbudCategory(d.tp),
    subtype: d.ow,
    municipality: d.m,
    address: d.a || "",
    postalCode: d.z || "",
    city: d.c || "",
    lat: d.la,
    lng: d.lo,
    monthlyRate: d.mr || null,
    annualRate: d.ar || null,
    ownership: d.ow,
    email: d.e,
    phone: d.ph,
  };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [institutions, setInstitutions] = useState<UnifiedInstitution[]>([]);
  const [normering, setNormering] = useState<NormeringEntry[]>([]);
  const [institutionStats, setInstitutionStats] = useState<Record<string, InstitutionStats>>({});
  const [kommuneStats, setKommuneStats] = useState<Record<string, KommuneStats>>({});
  const [nationalAverages, setNationalAverages] = useState({ trivsel: 3.6, karakterer: 7.4, fravaer: 7.4 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [skoleRes, vuggestueRes, boernehaveRes, dagplejeRes, sfoRes, normeringRes, instStatsRes, komStatsRes] = await Promise.all([
          fetch("/data/skole-data.json"),
          fetch("/data/vuggestue-data.json"),
          fetch("/data/boernehave-data.json"),
          fetch("/data/dagpleje-data.json"),
          fetch("/data/sfo-data.json"),
          fetch("/data/normering-data.json").catch(() => null),
          fetch("/data/institution-stats.json").catch(() => null),
          fetch("/data/kommune-stats.json").catch(() => null),
        ]);

        if (!skoleRes.ok || !vuggestueRes.ok || !boernehaveRes.ok || !dagplejeRes.ok) {
          throw new Error("Kunne ikke indlæse data. Prøv igen senere.");
        }

        const skoleData: SchoolData = await skoleRes.json();
        const vuggestueData: CompactDagtilbudData = await vuggestueRes.json();
        const boernehaveData: CompactDagtilbudData = await boernehaveRes.json();
        const dagplejeData: CompactDagtilbudData = await dagplejeRes.json();
        const sfoData: CompactDagtilbudData = sfoRes.ok ? await sfoRes.json() : { i: [] };

        setNationalAverages(skoleData.avg);

        const unified: UnifiedInstitution[] = [];

        // Per-category dedup sets. Aldersintegreret institutions share the
        // same G-number in both vuggestue-data.json and boernehave-data.json.
        // They SHOULD appear in both category listings (they genuinely serve
        // both age groups), so we only deduplicate within each category.
        const seenSchool = new Set<string>();
        const seenVug = new Set<string>();
        const seenBh = new Set<string>();
        const seenDag = new Set<string>();
        const seenSfo = new Set<string>();

        // Schools
        for (const s of skoleData.s) {
          const u = schoolToUnified(s);
          if (u && !seenSchool.has(u.id)) {
            seenSchool.add(u.id);
            unified.push(u);
          }
        }

        // Vuggestuer (compact format) — forced category "vuggestue"
        for (const d of vuggestueData.i) {
          const u = compactDagtilbudToUnified(d, "vug");
          if (u && !seenVug.has(u.id)) {
            u.category = "vuggestue";
            if (!u.monthlyRate || !u.annualRate) {
              const rates = CHILDCARE_RATES_2025.find((r) => r.municipality === u.municipality);
              if (rates?.vuggestue) {
                u.monthlyRate = Math.round(rates.vuggestue / 12);
                u.annualRate = rates.vuggestue;
              }
            }
            seenVug.add(u.id);
            unified.push(u);
          }
        }

        // Børnehaver (compact format) — forced category "boernehave"
        for (const d of boernehaveData.i) {
          const u = compactDagtilbudToUnified(d, "bh");
          if (u && !seenBh.has(u.id)) {
            u.category = "boernehave";
            if (!u.monthlyRate || !u.annualRate) {
              const rates = CHILDCARE_RATES_2025.find((r) => r.municipality === u.municipality);
              if (rates?.boernehave) {
                u.monthlyRate = Math.round(rates.boernehave / 12);
                u.annualRate = rates.boernehave;
              }
            }
            seenBh.add(u.id);
            unified.push(u);
          }
        }

        // Dagplejere (compact format)
        for (const d of dagplejeData.i) {
          const u = compactDagtilbudToUnified(d, "dag");
          if (u && !seenDag.has(u.id)) {
            if (!u.monthlyRate || !u.annualRate) {
              const rates = CHILDCARE_RATES_2025.find((r) => r.municipality === u.municipality);
              if (rates?.dagpleje) {
                u.monthlyRate = Math.round(rates.dagpleje / 12);
                u.annualRate = rates.dagpleje;
              }
            }
            seenDag.add(u.id);
            unified.push(u);
          }
        }

        // SFO/Klub (compact format) — split into SFO and Fritidsklub categories
        const seenFritidsklub = new Set<string>();
        for (const d of sfoData.i) {
          const cat = dagtilbudCategory(d.tp);
          if (cat === "fritidsklub") {
            const u = compactDagtilbudToUnified(d, "klub");
            if (u && !seenFritidsklub.has(u.id)) {
              u.category = "fritidsklub";
              if (!u.monthlyRate || !u.annualRate) {
                const rates = CHILDCARE_RATES_2025.find((r) => r.municipality === u.municipality);
                if (rates?.fritidshjem) {
                  u.monthlyRate = Math.round(rates.fritidshjem / 12);
                  u.annualRate = rates.fritidshjem;
                }
              }
              seenFritidsklub.add(u.id);
              unified.push(u);
            }
          } else {
            const u = compactDagtilbudToUnified(d, "sfo");
            if (u && !seenSfo.has(u.id)) {
              u.category = "sfo";
              if (!u.monthlyRate || !u.annualRate) {
                const rates = CHILDCARE_RATES_2025.find((r) => r.municipality === u.municipality);
                if (rates?.sfo) {
                  u.monthlyRate = Math.round(rates.sfo / 12);
                  u.annualRate = rates.sfo;
                }
              }
              seenSfo.add(u.id);
              unified.push(u);
            }
          }
        }

        // Load normering data
        if (normeringRes && normeringRes.ok && normeringRes.headers.get("content-type")?.includes("json")) {
          const normeringRaw: CompactNormering[] = await normeringRes.json();
          setNormering(normeringRaw.map((n) => ({
            municipality: n.m,
            ageGroup: n.ag,
            year: n.y,
            ratio: n.r,
          })));
        }

        // Load per-institution stats (normering per inst, staff education)
        const mergedInstStats: Record<string, InstitutionStats> = {};
        if (instStatsRes && instStatsRes.ok && instStatsRes.headers.get("content-type")?.includes("json")) {
          const instData = await instStatsRes.json();
          for (const [id, raw] of Object.entries(instData.institutions ?? {})) {
            const r = raw as Record<string, unknown>;
            mergedInstStats[id] = {
              normering02: (r.normering02 as number) ?? null,
              normering35: (r.normering35 as number) ?? null,
              pctPaedagoger: (r.pctPaedagoger ?? r.pctPaedagog ?? null) as number | null,
              pctPaedAssistenter: (r.pctPaedAssistenter ?? r.pctPaedAssistent ?? null) as number | null,
              pctUdenPaedUdd: (r.pctUdenPaedUdd ?? r.pctIngenPaedUdd ?? null) as number | null,
              antalBoern: (r.antalBoern ?? r.boernVedNedslag ?? r.helaarBoern ?? null) as number | null,
              parentSatisfaction: (r.parentSatisfaction as number) ?? null,
              parentSatisfactionYear: (r.parentSatisfactionYear as number) ?? null,
            };
          }
        }

        // Load parent satisfaction data and merge into institution stats
        const parentSatRes = await fetch("/data/parent-satisfaction.json").catch(() => null);
        if (parentSatRes && parentSatRes.ok && parentSatRes.headers.get("content-type")?.includes("json")) {
          const satData = await parentSatRes.json();
          for (const [id, s] of Object.entries(satData.institutions ?? {} as Record<string, { overallSatisfaction?: number; kommuneSatisfaction?: number }>)) {
            const sat = s as { overallSatisfaction?: number; kommuneSatisfaction?: number };
            if (!mergedInstStats[id]) {
              mergedInstStats[id] = {
                normering02: null, normering35: null,
                pctPaedagoger: null, pctPaedAssistenter: null, pctUdenPaedUdd: null,
                antalBoern: null,
                parentSatisfaction: sat.overallSatisfaction ?? null,
                parentSatisfactionYear: 2022,
              };
            } else {
              mergedInstStats[id].parentSatisfaction = sat.overallSatisfaction ?? null;
              mergedInstStats[id].parentSatisfactionYear = 2022;
            }
          }
        }
        setInstitutionStats(mergedInstStats);

        // Load kommune-level stats (sygefravær, expenditure, sprogvurdering)
        if (komStatsRes && komStatsRes.ok && komStatsRes.headers.get("content-type")?.includes("json")) {
          const komData = await komStatsRes.json();
          const rawKom = komData.kommuner ?? {};
          // Remap JSON field names to TypeScript KommuneStats interface
          const mappedKom: Record<string, KommuneStats> = {};
          for (const [name, raw] of Object.entries(rawKom)) {
            const r = raw as Record<string, unknown>;
            mappedKom[name] = {
              code: (r.code as string) ?? "",
              avgSygefravaerDage: (r.avgSygefravaerDage as number) ?? null,
              pctPaedagogerKommune: (r.pctPaedagogerKommune ?? r.pctPaedagoger ?? null) as number | null,
              pctMedhjaelpereKommune: (r.pctMedhjaelpereKommune ?? r.pctMedhjaelpere ?? null) as number | null,
              udgiftPrBarn: (r.udgiftPrBarn as number) ?? null,
              sprogvurderingPctUdfordret: (r.sprogvurderingPctUdfordret as number) ?? null,
              dagplejeTakst: (r.dagplejeTakst as number) ?? null,
              vuggestueTakst: (r.vuggestueTakst as number) ?? null,
              boernehaveTakst: (r.boernehaveTakst as number) ?? null,
              sfoTakst: (r.sfoTakst as number) ?? null,
              antalBoern02: (r.antalBoern02 as number) ?? null,
              antalBoern35: (r.antalBoern35 as number) ?? null,
            };
          }
          setKommuneStats(mappedKom);
        }

        setInstitutions(unified);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ukendt fejl ved indlæsning af data.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const municipalities = useMemo<MunicipalitySummary[]>(() => {
    const map = new Map<string, MunicipalitySummary>();

    for (const inst of institutions) {
      let m = map.get(inst.municipality);
      if (!m) {
        const rateInfo = CHILDCARE_RATES_2025.find(
          (r) => r.municipality === inst.municipality
        );
        m = {
          municipality: inst.municipality,
          code: "",
          vuggestueCount: 0,
          boernehaveCount: 0,
          dagplejeCount: 0,
          sfoCount: 0,
          fritidsklubCount: 0,
          efterskoleCount: 0,
          folkeskoleCount: 0,
          friskoleCount: 0,
          rates: {
            dagpleje: rateInfo?.dagpleje ? Math.round(rateInfo.dagpleje / 12) : null,
            vuggestue: rateInfo?.vuggestue ? Math.round(rateInfo.vuggestue / 12) : null,
            boernehave: rateInfo?.boernehave ? Math.round(rateInfo.boernehave / 12) : null,
            sfo: rateInfo?.sfo ? Math.round(rateInfo.sfo / 12) : null,
            fritidsklub: rateInfo?.fritidshjem ? Math.round(rateInfo.fritidshjem / 12) : null,
          },
        };
        map.set(inst.municipality, m);
      }
      switch (inst.category) {
        case "vuggestue": m.vuggestueCount++; break;
        case "boernehave": m.boernehaveCount++; break;
        case "dagpleje": m.dagplejeCount++; break;
        case "sfo": m.sfoCount++; break;
        case "fritidsklub": m.fritidsklubCount++; break;
        case "efterskole": m.efterskoleCount++; break;
        case "skole":
          if (inst.subtype === "folkeskole") m.folkeskoleCount++;
          else m.friskoleCount++;
          break;
      }
    }

    return Array.from(map.values()).sort((a, b) => a.municipality.localeCompare(b.municipality, "da"));
  }, [institutions]);

  const value = useMemo<DataContextValue>(() => ({
    institutions,
    municipalities,
    normering,
    institutionStats,
    kommuneStats,
    loading,
    error,
    nationalAverages,
  }), [institutions, municipalities, normering, institutionStats, kommuneStats, loading, error, nationalAverages]);

  return <DataContext value={value}>{children}</DataContext>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
