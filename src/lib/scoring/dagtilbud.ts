import type {
  UnifiedInstitution,
  NormeringEntry,
  InstitutionStats,
  SFOStats,
} from "@/lib/types";
import type { LocalizedText, MetricScore, WeightedMetric } from "./types";
import { linearMap, fmt, toGrade, weightedOverall, toMetricScores } from "./utils";

export function scoreDagtilbud(
  inst: UnifiedInstitution,
  normering: NormeringEntry[],
  municipalityAvgPrice: number | null,
  instStats?: InstitutionStats,
  sfoStats?: SFOStats,
): { metrics: MetricScore[]; overall: number | null } {
  const available: WeightedMetric[] = [];

  if (inst.monthlyRate != null && municipalityAvgPrice != null && municipalityAvgPrice > 0) {
    const pctDiff = (inst.monthlyRate - municipalityAvgPrice) / municipalityAvgPrice;
    const score = linearMap(pctDiff, 0.2, -0.2);
    available.push({
      key: "pris",
      label: { da: "Pris", en: "Price" },
      weight: 0.25,
      score,
      value: `${Math.round(inst.monthlyRate).toLocaleString("da-DK")} kr./md.`,
      icon: "coins",
    });
  }

  // Prefer per-institution normering from instStats, fall back to kommune-level
  const ageGroup =
    inst.category === "vuggestue" || inst.category === "dagpleje"
      ? "0-2"
      : "3-5";
  const instNormering = instStats
    ? (ageGroup === "0-2" ? instStats.normering02 : instStats.normering35)
    : null;

  const normeringRatio = (() => {
    if (instNormering != null) return instNormering;
    const entries = normering.filter(
      (n) =>
        n.municipality.toLowerCase() === inst.municipality.toLowerCase() &&
        n.ageGroup === ageGroup,
    );
    const latest = entries.sort((a, b) => b.year - a.year)[0];
    return latest?.ratio ?? null;
  })();

  if (normeringRatio != null) {
    const goodRatio = ageGroup === "0-2" ? 3.0 : 6.0;
    const badRatio = ageGroup === "0-2" ? 4.5 : 9.0;
    const score = linearMap(normeringRatio, badRatio, goodRatio);
    available.push({
      key: "normering",
      label: { da: "Normering", en: "Staff ratio" },
      weight: 0.25,
      score,
      value: `${fmt(normeringRatio)} børn/voksen`,
      icon: "baby",
    });
  }

  // Staff education level (per institution)
  if (instStats?.pctPaedagoger != null) {
    const score = linearMap(instStats.pctPaedagoger, 35, 80);
    available.push({
      key: "uddannelse",
      label: { da: "Personaleuddannelse", en: "Staff education" },
      weight: 0.2,
      score,
      value: `${instStats.pctPaedagoger.toFixed(0)}% pædagoger`,
      icon: "graduation-cap",
    });
  }

  // Parent satisfaction (BTU)
  if (instStats?.parentSatisfaction != null) {
    const score = linearMap(instStats.parentSatisfaction, 3.0, 5.0);
    available.push({
      key: "tilfredshed",
      label: { da: "Forældretilfredshed", en: "Parent satisfaction" },
      weight: 0.2,
      score,
      value: `${fmt(instStats.parentSatisfaction)} / 5`,
      icon: "heart",
    });
  }

  if (inst.ownership) {
    const ownershipScores: Record<string, number> = {
      kommunal: 70,
      selvejende: 75,
      privat: 60,
    };
    const key = inst.ownership.toLowerCase();
    const score = ownershipScores[key] ?? 65;
    available.push({
      key: "ejerskab",
      label: { da: "Ejerskab", en: "Ownership" },
      weight: 0.1,
      score,
      value: inst.ownership,
      icon: "landmark",
    });
  }

  // SFO-specific staff quality metric from kommune-level SFO data
  if (inst.category === "sfo" && sfoStats?.pctPaedagoger != null) {
    const score = linearMap(sfoStats.pctPaedagoger, 25, 65);
    available.push({
      key: "sfo_personale",
      label: { da: "SFO-personalekvalitet", en: "SFO staff quality" },
      weight: 0.2,
      score,
      value: `${fmt(sfoStats.pctPaedagoger)}% pædagoger`,
      icon: "user-check",
    });
  }

  // If no metrics or only ejerskab, there's not enough meaningful data
  const meaningful = available.filter((m) => m.key !== "ejerskab");
  if (meaningful.length === 0) {
    return { metrics: [], overall: null };
  }

  return { metrics: toMetricScores(available), overall: weightedOverall(available) };
}

export function dagtilbudProsAndCons(
  inst: UnifiedInstitution,
  normering: NormeringEntry[],
  municipalityAvgPrice: number | null,
  instStats?: InstitutionStats,
): { pros: LocalizedText[]; cons: LocalizedText[] } {
  const pros: LocalizedText[] = [];
  const cons: LocalizedText[] = [];

  if (inst.monthlyRate != null && municipalityAvgPrice != null && municipalityAvgPrice > 0) {
    const diff = municipalityAvgPrice - inst.monthlyRate;
    const pctDiff = diff / municipalityAvgPrice;
    if (pctDiff > 0.05) {
      pros.push({
        da: `${Math.round(diff)} kr./md. billigere end kommunegennemsnittet`,
        en: `DKK ${Math.round(diff)}/mo. cheaper than municipality average`,
      });
    } else if (pctDiff < -0.05) {
      cons.push({
        da: `${Math.round(Math.abs(diff))} kr./md. dyrere end kommunegennemsnittet`,
        en: `DKK ${Math.round(Math.abs(diff))}/mo. more expensive than municipality average`,
      });
    }
  }

  // Normering — prefer per-institution, fallback to kommune
  const ageGroup =
    inst.category === "vuggestue" || inst.category === "dagpleje"
      ? "0-2"
      : "3-5";
  const instNormering = instStats
    ? (ageGroup === "0-2" ? instStats.normering02 : instStats.normering35)
    : null;
  const ratio = (() => {
    if (instNormering != null) return instNormering;
    const entries = normering.filter(
      (n) =>
        n.municipality.toLowerCase() === inst.municipality.toLowerCase() &&
        n.ageGroup === ageGroup,
    );
    return entries.sort((a, b) => b.year - a.year)[0]?.ratio ?? null;
  })();

  if (ratio != null) {
    const recommended = ageGroup === "0-2" ? 3.0 : 6.0;
    if (ratio <= recommended) {
      pros.push({
        da: `God normering (${fmt(ratio)} børn/voksen)`,
        en: `Good staff ratio (${fmt(ratio)} children/adult)`,
      });
    } else if (ratio > recommended * 1.15) {
      cons.push({
        da: `Normering ${fmt(ratio)} børn/voksen — over anbefalet niveau`,
        en: `Staff ratio ${fmt(ratio)} children/adult — above recommended level`,
      });
    }
  }

  // Staff education
  if (instStats?.pctPaedagoger != null) {
    if (instStats.pctPaedagoger >= 65) {
      pros.push({
        da: `Høj andel uddannede pædagoger (${instStats.pctPaedagoger.toFixed(0)}%)`,
        en: `High share of qualified pedagogues (${instStats.pctPaedagoger.toFixed(0)}%)`,
      });
    } else if (instStats.pctPaedagoger < 45) {
      cons.push({
        da: `Lav andel uddannede pædagoger (${instStats.pctPaedagoger.toFixed(0)}%)`,
        en: `Low share of qualified pedagogues (${instStats.pctPaedagoger.toFixed(0)}%)`,
      });
    }
  }

  // Parent satisfaction
  if (instStats?.parentSatisfaction != null) {
    if (instStats.parentSatisfaction >= 4.2) {
      pros.push({
        da: `Høj forældretilfredshed (${fmt(instStats.parentSatisfaction)} / 5)`,
        en: `High parent satisfaction (${fmt(instStats.parentSatisfaction)} / 5)`,
      });
    } else if (instStats.parentSatisfaction < 3.5) {
      cons.push({
        da: `Lavere forældretilfredshed (${fmt(instStats.parentSatisfaction)} / 5)`,
        en: `Lower parent satisfaction (${fmt(instStats.parentSatisfaction)} / 5)`,
      });
    }
  }

  if (inst.ownership) {
    const key = inst.ownership.toLowerCase();
    if (key === "selvejende") {
      pros.push({
        da: "Selvejende institution — uafhængig drift",
        en: "Self-governing institution — independent operation",
      });
    } else if (key === "kommunal") {
      pros.push({
        da: "Kommunal institution — kommunalt tilsyn",
        en: "Municipal institution — municipal oversight",
      });
    }
  }

  return { pros: pros.slice(0, 4), cons: cons.slice(0, 3) };
}

export function dagtilbudRecommendation(
  overall: number,
  inst: UnifiedInstitution,
  _normering: NormeringEntry[],
  municipalityAvgPrice: number | null,
): LocalizedText {
  const grade = toGrade(overall);
  const catDa =
    inst.category === "vuggestue"
      ? "vuggestue"
      : inst.category === "boernehave"
        ? "børnehave"
        : inst.category === "dagpleje"
          ? "dagpleje"
          : "SFO";
  const catEn =
    inst.category === "vuggestue"
      ? "nursery"
      : inst.category === "boernehave"
        ? "kindergarten"
        : inst.category === "dagpleje"
          ? "childminder"
          : "after-school care";

  const pricePart = (() => {
    if (inst.monthlyRate == null || municipalityAvgPrice == null || municipalityAvgPrice === 0)
      return null;
    const pct = ((inst.monthlyRate - municipalityAvgPrice) / municipalityAvgPrice) * 100;
    if (pct < -5) return { da: "prismæssigt attraktiv", en: "competitively priced" };
    if (pct > 5) return { da: "over gennemsnitsprisen", en: "above average price" };
    return { da: "gennemsnitligt prissat", en: "average priced" };
  })();

  const ownerDa = inst.ownership ? inst.ownership.toLowerCase() : null;
  const ownerEn = ownerDa === "kommunal" ? "municipal" : ownerDa === "selvejende" ? "self-governing" : ownerDa === "privat" ? "private" : null;

  if (grade === "A" || grade === "B") {
    const pDa = pricePart ? `${pricePart.da} ` : "";
    const pEn = pricePart ? `${pricePart.en} ` : "";
    const oDa = ownerDa ? `${ownerDa.charAt(0).toUpperCase() + ownerDa.slice(1)} institution` : "";
    const oEn = ownerEn ? `${ownerEn.charAt(0).toUpperCase() + ownerEn.slice(1)} institution` : "";
    return {
      da: `En ${pDa}${catDa} med gode vilkår. ${oDa ? `${oDa}.` : ""}`.trim(),
      en: `A ${pEn}${catEn} with good conditions. ${oEn ? `${oEn}.` : ""}`.trim(),
    };
  }

  if (grade === "C") {
    return {
      da: `En gennemsnitlig ${catDa} i kommunen. Overvej at besøge stedet for at danne dit eget indtryk.`,
      en: `An average ${catEn} in the municipality. Consider visiting to form your own impression.`,
    };
  }

  return {
    da: `Denne ${catDa} scorer under gennemsnittet. Undersøg alternativer i nærområdet.`,
    en: `This ${catEn} scores below average. Explore alternatives in the area.`,
  };
}
