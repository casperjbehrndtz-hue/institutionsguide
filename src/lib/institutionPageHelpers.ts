import type { UnifiedInstitution, InstitutionStats } from "@/lib/types";
import type { PercentileEntry } from "@/hooks/usePercentiles";
import type { ScoreResult } from "@/lib/institutionScore";

/** Map category slug to its route path */
export function categoryPath(cat: string): string {
  const paths: Record<string, string> = {
    vuggestue: "/vuggestue", boernehave: "/boernehave", dagpleje: "/dagpleje",
    skole: "/skole", sfo: "/sfo", fritidsklub: "/fritidsklub", efterskole: "/efterskole", gymnasium: "/gymnasium",
  };
  return paths[cat] || "/";
}

/** Build structured context object for the AI chat */
export function buildChatContext(
  inst: UnifiedInstitution, instStats: InstitutionStats | undefined, municipalityAvgPrice: number | null,
  scoreResult: ScoreResult, percentiles: PercentileEntry[] | null,
) {
  return {
    name: inst.name, category: inst.category, municipality: inst.municipality,
    monthly_rate: inst.monthlyRate ?? null, municipality_avg_price: municipalityAvgPrice,
    yearly_price: inst.yearlyPrice ?? null, ownership: inst.ownership ?? null,
    normering_ratio: instStats?.normering02 ?? instStats?.normering35 ?? null,
    normering_age_group: instStats?.normering02 != null ? "0-2" : instStats?.normering35 != null ? "3-5" : null,
    pct_paedagoger: instStats?.pctPaedagoger ?? null,
    pct_uden_paed_udd: instStats?.pctUdenPaedUdd ?? null,
    parent_satisfaction: instStats?.parentSatisfaction ?? null,
    antal_boern: instStats?.antalBoern ?? null,
    trivsel: inst.quality?.ts ?? null, trivsel_social: inst.quality?.tsi ?? null,
    karakterer: inst.quality?.k ?? null, fravaer_pct: inst.quality?.fp ?? null,
    kompetencedaekning_pct: inst.quality?.kp ?? null, klassestorrelse: inst.quality?.kv ?? null,
    undervisningseffekt: inst.quality?.sr ?? null, elever_pr_laerer: inst.quality?.epl ?? null,
    undervisningstid_pr_elev: inst.quality?.upe ?? null,
    score: scoreResult.overall, grade: scoreResult.grade,
    address: `${inst.address}, ${inst.postalCode} ${inst.city}`,
    percentile_rankings: percentiles?.map((p) => `${p.label}: ${p.value} (${p.percentile}. percentil)`) ?? [],
  };
}

/** Build FAQ items for JSON-LD rich snippets on institution pages */
export function buildInstitutionFaqs(
  inst: UnifiedInstitution,
  catLabel: string,
  nearby: (UnifiedInstitution & { dist: number })[],
  institutionStats: Record<string, InstitutionStats>,
): { q: string; a: string }[] {
  const isDagtilbud = ["vuggestue", "boernehave", "dagpleje", "sfo"].includes(inst.category);
  const faqs: { q: string; a: string }[] = [];

  if (inst.address) {
    faqs.push({ q: `Hvor ligger ${inst.name}?`, a: `${inst.name} ligger på ${inst.address}, ${inst.postalCode} ${inst.city} i ${inst.municipality} Kommune.` });
  }
  if (inst.monthlyRate && inst.monthlyRate > 0) {
    faqs.push({ q: `Hvad koster ${inst.name}?`, a: `Månedsprisen for ${inst.name} er ${inst.monthlyRate.toLocaleString("da-DK")} kr. i 2026.${inst.ownership ? ` ${inst.name} er en ${inst.ownership} institution.` : ""}` });
  }
  if (isDagtilbud && institutionStats) {
    const statsKey = inst.id.replace(/^(vug|bh|dag|sfo)-/, "");
    const iStats = institutionStats[statsKey];
    let normeringVal: number | null = null;
    let ageGroup = "";
    if (inst.category === "vuggestue" && iStats?.normering02) { normeringVal = iStats.normering02; ageGroup = "0-2 år"; }
    else if (inst.category === "boernehave" && iStats?.normering35) { normeringVal = iStats.normering35; ageGroup = "3-5 år"; }
    if (normeringVal && normeringVal > 0) {
      faqs.push({ q: `Hvad er normeringen i ${inst.municipality} for ${ageGroup}?`, a: `Den gennemsnitlige normering i ${inst.municipality} er ${normeringVal} børn per voksen for ${ageGroup} (data fra Danmarks Statistik, 2023).` });
    }
  }
  if (inst.category === "skole" && inst.quality?.k) {
    faqs.push({ q: `Hvad er karaktersnittet på ${inst.name}?`, a: `${inst.name} har et karaktersnit på ${inst.quality.k}${inst.quality.ts ? ` (landsgennemsnit: ~7.0). Trivslen er ${inst.quality.ts}/5` : " (landsgennemsnit: ~7.0)"}.` });
  }
  if (inst.category === "skole" && inst.quality?.ts && inst.quality?.k) {
    faqs.push({ q: `Er ${inst.name} en god skole?`, a: `${inst.name} har en samlet kvalitetsvurdering baseret på trivsel (${inst.quality.ts}/5), karaktersnit (${inst.quality.k})${inst.quality.kp ? ` og kompetencedækning (${inst.quality.kp}%)` : ""}. Se den fulde vurdering på Institutionsguiden.` });
  }
  if (nearby.length >= 3) {
    faqs.push({ q: `Hvilke andre ${catLabel.toLowerCase()}r ligger tæt på ${inst.name}?`, a: `De nærmeste ${catLabel.toLowerCase()}r er ${nearby[0].name} (${nearby[0].dist.toFixed(1)} km), ${nearby[1].name} (${nearby[1].dist.toFixed(1)} km) og ${nearby[2].name} (${nearby[2].dist.toFixed(1)} km). Se alle ${catLabel.toLowerCase()}r i ${inst.municipality} på Institutionsguiden.` });
  }

  return faqs;
}
