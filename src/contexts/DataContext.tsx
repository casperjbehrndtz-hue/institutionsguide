import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react";
import type {
  UnifiedInstitution,
  CompactSchool,
  MunicipalitySummary,
  NormeringEntry,
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
  loading: boolean;
  error: string | null;
  nationalAverages: { trivsel: number; karakterer: number; fravaer: number };
}

const DataContext = createContext<DataContextValue | null>(null);

function mapSchoolType(t: "f" | "p" | "e"): string {
  switch (t) {
    case "f": return "folkeskole";
    case "p": return "friskole";
    case "e": return "efterskole";
    default: return "skole";
  }
}

function schoolToUnified(s: CompactSchool): UnifiedInstitution | null {
  if (!s.la || !s.lo) return null;
  return {
    id: `school-${s.id}`,
    name: s.n,
    category: "skole",
    subtype: mapSchoolType(s.t),
    municipality: s.m.replace(" Kommune", ""),
    address: s.a,
    postalCode: s.z,
    city: s.c,
    lat: s.la,
    lng: s.lo,
    monthlyRate: s.sfo ? s.sfo : null,
    annualRate: s.sfo ? s.sfo * 12 : null,
    leader: s.l,
    web: s.w,
    email: s.e,
    quality: s.q,
  };
}

function dagtilbudCategory(type: string): "vuggestue" | "boernehave" | "dagpleje" | "sfo" {
  switch (type) {
    case "dagpleje": return "dagpleje";
    case "sfo":
    case "klub": return "sfo";
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
  const [nationalAverages, setNationalAverages] = useState({ trivsel: 3.6, karakterer: 7.4, fravaer: 7.4 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [skoleRes, vuggestueRes, boernehaveRes, dagplejeRes, sfoRes, normeringRes] = await Promise.all([
          fetch("/data/skole-data.json"),
          fetch("/data/vuggestue-data.json"),
          fetch("/data/boernehave-data.json"),
          fetch("/data/dagpleje-data.json"),
          fetch("/data/sfo-data.json"),
          fetch("/data/normering-data.json").catch(() => null),
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

        const seen = new Set<string>();
        const unified: UnifiedInstitution[] = [];

        // Schools
        for (const s of skoleData.s) {
          const u = schoolToUnified(s);
          if (u && !seen.has(u.id)) {
            seen.add(u.id);
            unified.push(u);
          }
        }

        // Vuggestuer (compact format) — forced category "vuggestue"
        for (const d of vuggestueData.i) {
          const u = compactDagtilbudToUnified(d, "vug");
          if (u && !seen.has(u.id)) {
            u.category = "vuggestue";
            if (!u.monthlyRate || !u.annualRate) {
              const rates = CHILDCARE_RATES_2025.find((r) => r.municipality === u.municipality);
              if (rates?.vuggestue) {
                u.monthlyRate = Math.round(rates.vuggestue / 12);
                u.annualRate = rates.vuggestue;
              }
            }
            seen.add(u.id);
            unified.push(u);
          }
        }

        // Børnehaver (compact format) — forced category "boernehave"
        for (const d of boernehaveData.i) {
          const u = compactDagtilbudToUnified(d, "bh");
          if (u && !seen.has(u.id)) {
            u.category = "boernehave";
            if (!u.monthlyRate || !u.annualRate) {
              const rates = CHILDCARE_RATES_2025.find((r) => r.municipality === u.municipality);
              if (rates?.boernehave) {
                u.monthlyRate = Math.round(rates.boernehave / 12);
                u.annualRate = rates.boernehave;
              }
            }
            seen.add(u.id);
            unified.push(u);
          }
        }

        // Dagplejere (compact format)
        for (const d of dagplejeData.i) {
          const u = compactDagtilbudToUnified(d, "dag");
          if (u && !seen.has(u.id)) {
            if (!u.monthlyRate || !u.annualRate) {
              const rates = CHILDCARE_RATES_2025.find((r) => r.municipality === u.municipality);
              if (rates?.dagpleje) {
                u.monthlyRate = Math.round(rates.dagpleje / 12);
                u.annualRate = rates.dagpleje;
              }
            }
            seen.add(u.id);
            unified.push(u);
          }
        }

        // SFO/Klub (compact format) — fill missing prices from municipal rates
        for (const d of sfoData.i) {
          const u = compactDagtilbudToUnified(d, "sfo");
          if (u && !seen.has(u.id)) {
            u.category = "sfo";
            if (!u.monthlyRate || !u.annualRate) {
              const rates = CHILDCARE_RATES_2025.find((r) => r.municipality === u.municipality);
              if (rates?.sfo) {
                u.monthlyRate = Math.round(rates.sfo / 12);
                u.annualRate = rates.sfo;
              }
            }
            seen.add(u.id);
            unified.push(u);
          }
        }

        // Load normering data
        if (normeringRes && normeringRes.ok) {
          const normeringRaw: CompactNormering[] = await normeringRes.json();
          setNormering(normeringRaw.map((n) => ({
            municipality: n.m,
            ageGroup: n.ag,
            year: n.y,
            ratio: n.r,
          })));
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
          folkeskoleCount: 0,
          friskoleCount: 0,
          rates: {
            dagpleje: rateInfo?.dagpleje ? Math.round(rateInfo.dagpleje / 12) : null,
            vuggestue: rateInfo?.vuggestue ? Math.round(rateInfo.vuggestue / 12) : null,
            boernehave: rateInfo?.boernehave ? Math.round(rateInfo.boernehave / 12) : null,
            sfo: rateInfo?.sfo ? Math.round(rateInfo.sfo / 12) : null,
          },
        };
        map.set(inst.municipality, m);
      }
      switch (inst.category) {
        case "vuggestue": m.vuggestueCount++; break;
        case "boernehave": m.boernehaveCount++; break;
        case "dagpleje": m.dagplejeCount++; break;
        case "sfo": m.sfoCount++; break;
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
    loading,
    error,
    nationalAverages,
  }), [institutions, municipalities, normering, loading, error, nationalAverages]);

  return <DataContext value={value}>{children}</DataContext>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
