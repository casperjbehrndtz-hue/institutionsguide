import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react";
import type {
  UnifiedInstitution,
  CompactSchool,
  MunicipalitySummary,
  NormeringEntry,
  InstitutionStats,
  KommuneStats,
  SchoolExtraStats,
  SFOStats,
  TilsynRapport,
  GymnasiumInstitution,
  GymnasiumQuality,
} from "@/lib/types";
import { CHILDCARE_RATES_2025 } from "@/lib/childcare/rates";
import { schoolToUnified, compactDagtilbudToUnified, dagtilbudCategory, type CompactDagtilbudData, type CompactNormering } from "@/lib/dataTransform";

interface SchoolData {
  s: CompactSchool[];
  avg: { trivsel: number; karakterer: number; fravaer: number };
}

interface DataContextValue {
  institutions: UnifiedInstitution[];
  municipalities: MunicipalitySummary[];
  normering: NormeringEntry[];
  institutionStats: Record<string, InstitutionStats>;
  kommuneStats: Record<string, KommuneStats>;
  schoolExtraStats: Record<string, SchoolExtraStats>;
  sfoStats: Record<string, SFOStats>;
  tilsynRapporter: Record<string, TilsynRapport[]>;
  loading: boolean;
  supplementaryLoading: boolean;
  error: string | null;
  nationalAverages: { trivsel: number; karakterer: number; fravaer: number };
}

const DataContext = createContext<DataContextValue | null>(null);

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    if (!res.headers.get("content-type")?.includes("json")) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [institutions, setInstitutions] = useState<UnifiedInstitution[]>([]);
  const [normering, setNormering] = useState<NormeringEntry[]>([]);
  const [institutionStats, setInstitutionStats] = useState<Record<string, InstitutionStats>>({});
  const [kommuneStats, setKommuneStats] = useState<Record<string, KommuneStats>>({});
  const [schoolExtraStats, setSchoolExtraStats] = useState<Record<string, SchoolExtraStats>>({});
  const [sfoStats, setSfoStats] = useState<Record<string, SFOStats>>({});
  const [tilsynRapporter, setTilsynRapporter] = useState<Record<string, TilsynRapport[]>>({});
  const [nationalAverages, setNationalAverages] = useState({ trivsel: 3.6, karakterer: 7.4, fravaer: 7.4 });
  const [loading, setLoading] = useState(true);
  const [supplementaryLoading, setSupplementaryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCore() {
      try {
        const [skoleRes, vuggestueRes, boernehaveRes, dagplejeRes, sfoRes, gymnasiumRes, fritidsklubSupRes] = await Promise.all([
          fetch("/data/skole-data.json"),
          fetch("/data/vuggestue-data.json"),
          fetch("/data/boernehave-data.json"),
          fetch("/data/dagpleje-data.json"),
          fetch("/data/sfo-data.json"),
          fetch("/data/gymnasium-data.json").catch(() => null),
          fetch("/data/fritidsklub-supplement.json").catch(() => null),
        ]);

        if (!skoleRes.ok || !vuggestueRes.ok || !boernehaveRes.ok || !dagplejeRes.ok) {
          throw new Error("Kunne ikke indlæse data. Prøv igen senere.");
        }

        const skoleData: SchoolData = await skoleRes.json();
        const vuggestueData: CompactDagtilbudData = await vuggestueRes.json();
        const boernehaveData: CompactDagtilbudData = await boernehaveRes.json();
        const dagplejeData: CompactDagtilbudData = await dagplejeRes.json();
        const sfoData: CompactDagtilbudData = sfoRes.ok ? await sfoRes.json() : { i: [] };

        if (cancelled) return;
        setNationalAverages(skoleData.avg);

        const unified: UnifiedInstitution[] = [];

        const seenSchool = new Set<string>();
        const seenVug = new Set<string>();
        const seenBh = new Set<string>();
        const seenDag = new Set<string>();
        const seenSfo = new Set<string>();

        const schoolsByBase = new Map<string, UnifiedInstitution[]>();
        for (const s of skoleData.s) {
          const u = schoolToUnified(s);
          if (!u || seenSchool.has(u.id)) continue;
          seenSchool.add(u.id);
          const base = u.name.replace(/ - .*$/, "").replace(/, afd\.? .*$/i, "").trim();
          const key = `${base}__${u.municipality}`;
          if (!schoolsByBase.has(key)) schoolsByBase.set(key, []);
          schoolsByBase.get(key)!.push(u);
        }
        for (const group of schoolsByBase.values()) {
          if (group.length === 1) {
            unified.push(group[0]);
          } else {
            const best = group.reduce((a, b) => {
              const scoreA = Object.values(a.quality ?? {}).filter(v => v != null).length;
              const scoreB = Object.values(b.quality ?? {}).filter(v => v != null).length;
              return scoreB > scoreA ? b : a;
            });
            unified.push(best);
          }
        }

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

        if (fritidsklubSupRes && fritidsklubSupRes.ok) {
          try {
            const supData: CompactDagtilbudData = await fritidsklubSupRes.json();
            for (const d of (supData.i || [])) {
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
            }
          } catch { /* ignore parse errors */ }
        }

        if (gymnasiumRes && gymnasiumRes.ok && gymnasiumRes.headers.get("content-type")?.includes("json")) {
          const gymData = await gymnasiumRes.json();
          const gymList: GymnasiumInstitution[] = gymData.gymnasiums ?? [];
          const seenGym = new Set<string>();
          for (const g of gymList) {
            const id = g.id;
            if (seenGym.has(id)) continue;
            if (!g.lat && !g.lng) continue;
            seenGym.add(id);

            const gymQuality = g.quality as GymnasiumQuality | undefined;
            const quality = gymQuality ? {
              k: gymQuality.karaktersnit ?? undefined,
              fp: gymQuality.frafaldPct ?? undefined,
              oug: gymQuality.overgangVideregaaendePct ?? undefined,
            } : undefined;

            unified.push({
              id,
              name: g.name,
              category: "gymnasium",
              subtype: g.type,
              municipality: g.municipality,
              address: g.address || "",
              postalCode: g.postalCode || "",
              city: g.city || "",
              lat: g.lat,
              lng: g.lng,
              monthlyRate: null,
              annualRate: null,
              web: g.web,
              email: g.email,
              quality,
            });
          }
          for (const g of gymList) {
            if (!seenGym.has(g.id) && g.name) {
              seenGym.add(g.id);
              const gymQuality = g.quality as GymnasiumQuality | undefined;
              const quality = gymQuality ? {
                k: gymQuality.karaktersnit ?? undefined,
                fp: gymQuality.frafaldPct ?? undefined,
              } : undefined;
              unified.push({
                id: g.id,
                name: g.name,
                category: "gymnasium",
                subtype: g.type,
                municipality: g.municipality || "",
                address: g.address || "",
                postalCode: g.postalCode || "",
                city: g.city || "",
                lat: g.lat || 0,
                lng: g.lng || 0,
                monthlyRate: null,
                annualRate: null,
                web: g.web,
                email: g.email,
                quality,
              });
            }
          }
        }

        if (!cancelled) {
          setInstitutions(unified);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Ukendt fejl ved indlæsning af data.");
          setLoading(false);
        }
      }
    }

    function loadSupplementary() {
      const tasks: Promise<void>[] = [];

      tasks.push(
        fetchJson<CompactNormering[]>("/data/normering-data.json").then((data) => {
          if (cancelled || !data) return;
          setNormering(data.map((n) => ({
            municipality: n.m,
            ageGroup: n.ag,
            year: n.y,
            ratio: n.r,
          })));
        })
      );

      tasks.push(
        Promise.all([
          fetchJson<{ institutions?: Record<string, Record<string, unknown>> }>("/data/institution-stats.json"),
          fetchJson<{ institutions?: Record<string, { overallSatisfaction?: number; kommuneSatisfaction?: number }> }>("/data/parent-satisfaction.json"),
        ]).then(([instData, satData]) => {
          if (cancelled) return;
          const merged: Record<string, InstitutionStats> = {};
          if (instData?.institutions) {
            for (const [id, raw] of Object.entries(instData.institutions)) {
              const r = raw as Record<string, unknown>;
              merged[id] = {
                normering02: (r.normering02 as number) ?? null,
                normering35: (r.normering35 as number) ?? null,
                pctPaedagoger: (r.pctPaedagoger ?? r.pctPaedagog ?? null) as number | null,
                pctPaedAssistenter: (r.pctPaedAssistenter ?? r.pctPaedAssistent ?? null) as number | null,
                pctUdenPaedUdd: (r.pctUdenPaedUdd ?? r.pctIngenPaedUdd ?? null) as number | null,
                antalBoern: (r.antalBoern ?? null) as number | null,
                parentSatisfaction: (r.parentSatisfaction as number) ?? null,
                parentSatisfactionYear: (r.parentSatisfactionYear as number) ?? null,
              };
            }
          }
          if (satData?.institutions) {
            for (const [id, s] of Object.entries(satData.institutions)) {
              const sat = s as { overallSatisfaction?: number; kommuneSatisfaction?: number };
              if (!merged[id]) {
                merged[id] = {
                  normering02: null, normering35: null,
                  pctPaedagoger: null, pctPaedAssistenter: null, pctUdenPaedUdd: null,
                  antalBoern: null,
                  parentSatisfaction: sat.overallSatisfaction ?? null,
                  parentSatisfactionYear: 2022,
                };
              } else {
                merged[id].parentSatisfaction = sat.overallSatisfaction ?? null;
                merged[id].parentSatisfactionYear = 2022;
              }
            }
          }
          setInstitutionStats(merged);
        })
      );

      tasks.push(
        fetchJson<{ kommuner?: Record<string, Record<string, unknown>> }>("/data/kommune-stats.json").then((data) => {
          if (cancelled || !data?.kommuner) return;
          const mapped: Record<string, KommuneStats> = {};
          for (const [name, raw] of Object.entries(data.kommuner)) {
            const r = raw as Record<string, unknown>;
            mapped[name] = {
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
          setKommuneStats(mapped);
        })
      );

      tasks.push(
        fetchJson<{ kommuner?: Record<string, Record<string, unknown>> }>("/data/school-extra-stats.json").then((data) => {
          if (cancelled || !data?.kommuner) return;
          const mapped: Record<string, SchoolExtraStats> = {};
          for (const [name, raw] of Object.entries(data.kommuner)) {
            const r = raw as Record<string, unknown>;
            mapped[name] = {
              municipality: (r.municipality as string) ?? name,
              avgClassSize: (r.avgClassSize as number) ?? null,
              specialEducationPct: (r.specialEducationPct as number) ?? null,
              transitionGymnasiumPct: (r.transitionGymnasiumPct as number) ?? null,
              transitionErhvervPct: (r.transitionErhvervPct as number) ?? null,
            };
          }
          setSchoolExtraStats(mapped);
        })
      );

      tasks.push(
        fetchJson<{ kommuner?: Record<string, Record<string, unknown>> }>("/data/sfo-stats.json").then((data) => {
          if (cancelled || !data?.kommuner) return;
          const mapped: Record<string, SFOStats> = {};
          for (const [name, raw] of Object.entries(data.kommuner)) {
            const r = raw as Record<string, unknown>;
            mapped[name] = {
              municipality: (r.municipality as string) ?? name,
              enrolledChildren: (r.enrolledChildren as number) ?? null,
              pctPaedagoger: (r.pctPaedagoger as number) ?? null,
              pctMedhjaelpere: (r.pctMedhjaelpere as number) ?? null,
              pctAssistenter: (r.pctAssistenter as number) ?? null,
              totalStaff: (r.totalStaff as number) ?? null,
            };
          }
          setSfoStats(mapped);
        })
      );

      tasks.push(
        fetchJson<{ institutions?: Record<string, TilsynRapport[]> }>("/data/tilsynsrapporter.json").then((data) => {
          if (cancelled || !data?.institutions) return;
          const mapped: Record<string, TilsynRapport[]> = {};
          for (const [id, reports] of Object.entries(data.institutions)) {
            mapped[id] = (reports as TilsynRapport[]).map((r) => ({
              institutionName: r.institutionName ?? "",
              municipality: r.municipality ?? "",
              tilsynDate: r.tilsynDate ?? null,
              overallVerdict: r.overallVerdict ?? "tilfredsstillende",
              strengths: r.strengths ?? [],
              concerns: r.concerns ?? [],
              followUpRequired: !!r.followUpRequired,
              skaerpetTilsyn: !!r.skaerpetTilsyn,
              summary: r.summary ?? "",
              sourceUrl: r.sourceUrl,
            }));
          }
          setTilsynRapporter(mapped);
        })
      );

      Promise.allSettled(tasks).then(() => {
        if (!cancelled) setSupplementaryLoading(false);
      });
    }

    loadCore();
    loadSupplementary();

    return () => { cancelled = true; };
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
          gymnasiumCount: 0,
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
        case "gymnasium": m.gymnasiumCount++; break;
        case "skole":
          if (inst.subtype === "folkeskole") m.folkeskoleCount++;
          else m.friskoleCount++;
          break;
      }
    }

    return Array.from(map.values())
      .filter((m) => m.municipality !== "Christiansø")
      .sort((a, b) => a.municipality.localeCompare(b.municipality, "da"));
  }, [institutions]);

  const value = useMemo<DataContextValue>(() => ({
    institutions,
    municipalities,
    normering,
    institutionStats,
    kommuneStats,
    schoolExtraStats,
    sfoStats,
    tilsynRapporter,
    loading,
    supplementaryLoading,
    error,
    nationalAverages,
  }), [institutions, municipalities, normering, institutionStats, kommuneStats, schoolExtraStats, sfoStats, tilsynRapporter, loading, supplementaryLoading, error, nationalAverages]);

  return <DataContext value={value}>{children}</DataContext>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
