import type {
  UnifiedInstitution,
  NormeringEntry,
  SchoolQuality,
  InstitutionStats,
} from "@/lib/types";

export interface LocalizedText {
  da: string;
  en: string;
}

export interface MetricScore {
  key: string;
  label: LocalizedText;
  score: number;
  value: string;
  icon: string;
}

export interface ScoreResult {
  overall: number;
  grade: "A" | "B" | "C" | "D" | "E";
  metrics: MetricScore[];
  pros: LocalizedText[];
  cons: LocalizedText[];
  recommendation: LocalizedText;
}

const DAGTILBUD_CATEGORIES = new Set([
  "vuggestue",
  "boernehave",
  "dagpleje",
  "sfo",
]);

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function linearMap(
  value: number,
  inMin: number,
  inMax: number,
  outMin = 0,
  outMax = 100,
): number {
  return clamp(
    outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin),
  );
}

function toGrade(score: number): ScoreResult["grade"] {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "E";
}

function fmt(n: number, decimals = 1): string {
  return n.toFixed(decimals).replace(".", ",");
}

// --- School scoring ---

interface WeightedMetric {
  key: string;
  label: LocalizedText;
  weight: number;
  score: number;
  value: string;
  icon: string;
}

function scoreSchool(q: SchoolQuality): {
  metrics: MetricScore[];
  overall: number;
} {
  const raw: (WeightedMetric | null)[] = [
    q.ts != null
      ? {
          key: "trivsel",
          label: { da: "Trivsel", en: "Well-being" },
          weight: 0.2,
          score: linearMap(q.ts, 3.5, 4.3),
          value: fmt(q.ts),
          icon: "😊",
        }
      : null,
    q.k != null
      ? {
          key: "karakterer",
          label: { da: "Karakterer", en: "Grades" },
          weight: 0.2,
          score: linearMap(q.k, 5.0, 10.0),
          value: fmt(q.k),
          icon: "📝",
        }
      : null,
    q.fp != null
      ? {
          key: "fravaer",
          label: { da: "Fravær", en: "Absence" },
          weight: 0.15,
          score: linearMap(q.fp, 12, 3),
          value: `${fmt(q.fp)}%`,
          icon: "📅",
        }
      : null,
    q.kp != null
      ? {
          key: "kompetence",
          label: {
            da: "Kompetencedækning",
            en: "Teacher qualification coverage",
          },
          weight: 0.15,
          score: linearMap(q.kp, 70, 100),
          value: `${fmt(q.kp, 0)}%`,
          icon: "🎓",
        }
      : null,
    q.kv != null
      ? {
          key: "klassestorrelse",
          label: { da: "Klassestørrelse", en: "Class size" },
          weight: 0.15,
          score: linearMap(q.kv, 28, 12),
          value: `${fmt(q.kv, 1)} elever`,
          icon: "👥",
        }
      : null,
    q.sr != null
      ? {
          key: "undervisningseffekt",
          label: { da: "Undervisningseffekt", en: "Teaching effectiveness" },
          weight: 0.15,
          score:
            q.sr === "Over niveau"
              ? 100
              : q.sr === "På niveau"
                ? 60
                : q.sr === "Under niveau"
                  ? 20
                  : 50,
          value: q.sr,
          icon: "📈",
        }
      : null,
  ];

  const available = raw.filter((m): m is WeightedMetric => m != null);
  if (available.length === 0) {
    return { metrics: [], overall: 50 };
  }

  const totalWeight = available.reduce((s, m) => s + m.weight, 0);
  const scale = 1 / totalWeight;

  const overall = Math.round(
    available.reduce((s, m) => s + m.score * m.weight * scale, 0),
  );

  const metrics: MetricScore[] = available.map((m) => ({
    key: m.key,
    label: m.label,
    score: Math.round(m.score),
    value: m.value,
    icon: m.icon,
  }));

  return { metrics, overall };
}

// --- Dagtilbud scoring ---

function scoreDagtilbud(
  inst: UnifiedInstitution,
  normering: NormeringEntry[],
  municipalityAvgPrice: number | null,
  instStats?: InstitutionStats,
): { metrics: MetricScore[]; overall: number } {
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
      icon: "💰",
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
      icon: "👶",
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
      icon: "🎓",
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
      icon: "❤️",
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
      icon: "🏛️",
    });
  }

  if (available.length === 0) {
    return { metrics: [], overall: 50 };
  }

  const totalWeight = available.reduce((s, m) => s + m.weight, 0);
  const scale = 1 / totalWeight;
  const overall = Math.round(
    available.reduce((s, m) => s + m.score * m.weight * scale, 0),
  );

  const metrics: MetricScore[] = available.map((m) => ({
    key: m.key,
    label: m.label,
    score: Math.round(m.score),
    value: m.value,
    icon: m.icon,
  }));

  return { metrics, overall };
}

// --- Pros / Cons ---

function schoolProsAndCons(
  q: SchoolQuality,
): { pros: LocalizedText[]; cons: LocalizedText[] } {
  const pros: LocalizedText[] = [];
  const cons: LocalizedText[] = [];

  if (q.ts != null) {
    if (q.ts >= 4.0) {
      pros.push({
        da: `Høj trivsel (${fmt(q.ts)}) — over landsgennemsnittet`,
        en: `High well-being (${fmt(q.ts)}) — above national average`,
      });
    } else if (q.ts < 3.7) {
      cons.push({
        da: `Lavere trivsel (${fmt(q.ts)}) — under landsgennemsnittet`,
        en: `Lower well-being (${fmt(q.ts)}) — below national average`,
      });
    }
  }

  if (q.k != null) {
    if (q.k >= 8.0) {
      pros.push({
        da: `Høje karakterer (${fmt(q.k)}) — over landsgennemsnittet`,
        en: `High grades (${fmt(q.k)}) — above national average`,
      });
    } else if (q.k < 6.5) {
      cons.push({
        da: `Lavere karakterer (${fmt(q.k)}) — under landsgennemsnittet`,
        en: `Lower grades (${fmt(q.k)}) — below national average`,
      });
    }
  }

  if (q.fp != null) {
    if (q.fp <= 5.5) {
      pros.push({
        da: `Lavt fravær (${fmt(q.fp)}%) — top 25% nationalt`,
        en: `Low absence (${fmt(q.fp)}%) — top 25% nationally`,
      });
    } else if (q.fp > 8.0) {
      cons.push({
        da: `Højt fravær (${fmt(q.fp)}%) — over landsgennemsnittet`,
        en: `High absence (${fmt(q.fp)}%) — above national average`,
      });
    }
  }

  if (q.kp != null) {
    if (q.kp >= 95) {
      pros.push({
        da: `Høj kompetencedækning (${fmt(q.kp, 0)}%)`,
        en: `High teacher qualification coverage (${fmt(q.kp, 0)}%)`,
      });
    } else if (q.kp < 80) {
      cons.push({
        da: `Lav kompetencedækning (${fmt(q.kp, 0)}%) — under anbefalet niveau`,
        en: `Low teacher qualification coverage (${fmt(q.kp, 0)}%) — below recommended level`,
      });
    }
  }

  if (q.kv != null) {
    if (q.kv <= 18) {
      pros.push({
        da: `Små klasser (${fmt(q.kv, 1)} elever)`,
        en: `Small classes (${fmt(q.kv, 1)} students)`,
      });
    } else if (q.kv > 22) {
      cons.push({
        da: `Store klasser (${fmt(q.kv, 1)} elever) — over landsgennemsnittet`,
        en: `Large classes (${fmt(q.kv, 1)} students) — above national average`,
      });
    }
  }

  if (q.sr === "Over niveau") {
    pros.push({
      da: "Undervisningseffekt over forventet niveau",
      en: "Teaching effectiveness above expected level",
    });
  } else if (q.sr === "Under niveau") {
    cons.push({
      da: "Undervisningseffekt under forventet niveau",
      en: "Teaching effectiveness below expected level",
    });
  }

  return { pros: pros.slice(0, 4), cons: cons.slice(0, 3) };
}

function dagtilbudProsAndCons(
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

// --- Recommendation text ---

function schoolRecommendation(
  overall: number,
  q: SchoolQuality,
): LocalizedText {
  const strengths: { da: string; en: string }[] = [];
  const weaknesses: { da: string; en: string }[] = [];

  if (q.ts != null && q.ts >= 4.0) {
    strengths.push({ da: "trivsel", en: "well-being" });
  }
  if (q.k != null && q.k >= 8.0) {
    strengths.push({ da: "karakterer", en: "grades" });
  }
  if (q.fp != null && q.fp <= 5.5) {
    strengths.push({ da: "lavt fravær", en: "low absence" });
  }
  if (q.fp != null && q.fp > 8.0) {
    weaknesses.push({ da: "højere fravær", en: "higher absence" });
  }
  if (q.kv != null && q.kv > 22) {
    weaknesses.push({ da: "store klasser", en: "large classes" });
  }
  if (q.kp != null && q.kp < 80) {
    weaknesses.push({ da: "lav kompetencedækning", en: "low qualification coverage" });
  }

  const grade = toGrade(overall);

  if (grade === "A" || grade === "B") {
    const sDa = strengths.map((s) => s.da).join(" og ");
    const sEn = strengths.map((s) => s.en).join(" and ");
    const weakDa = weaknesses.length > 0 ? `, men har ${weaknesses.map((w) => w.da).join(" og ")} end gennemsnittet` : "";
    const weakEn = weaknesses.length > 0 ? `, but has ${weaknesses.map((w) => w.en).join(" and ")} than average` : "";
    return {
      da: `Skolen scorer godt${sDa ? ` på ${sDa}` : ""}${weakDa}. Anbefalet for familier der prioriterer fagligt niveau.`,
      en: `The school scores well${sEn ? ` on ${sEn}` : ""}${weakEn}. Recommended for families prioritizing academic quality.`,
    };
  }

  if (grade === "C") {
    return {
      da: "Skolen ligger omkring landsgennemsnittet på de fleste parametre. Et solidt valg med gennemsnitlige resultater.",
      en: "The school is around the national average on most parameters. A solid choice with average results.",
    };
  }

  return {
    da: "Skolen ligger under landsgennemsnittet på flere parametre. Undersøg lokale forhold nærmere før valg.",
    en: "The school is below the national average on several parameters. Investigate local conditions further before choosing.",
  };
}

function dagtilbudRecommendation(
  overall: number,
  inst: UnifiedInstitution,
  normering: NormeringEntry[],
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

// --- Main export ---

export function computeScore(
  inst: UnifiedInstitution,
  _nearby: UnifiedInstitution[],
  normering: NormeringEntry[],
  municipalityAvgPrice: number | null,
  instStats?: InstitutionStats,
): ScoreResult {
  const isSchool = inst.category === "skole";

  if (isSchool && inst.quality) {
    const { metrics, overall } = scoreSchool(inst.quality);
    const { pros, cons } = schoolProsAndCons(inst.quality);
    const recommendation = schoolRecommendation(overall, inst.quality);
    return { overall, grade: toGrade(overall), metrics, pros, cons, recommendation };
  }

  if (DAGTILBUD_CATEGORIES.has(inst.category)) {
    const { metrics, overall } = scoreDagtilbud(inst, normering, municipalityAvgPrice, instStats);
    const { pros, cons } = dagtilbudProsAndCons(inst, normering, municipalityAvgPrice, instStats);
    const recommendation = dagtilbudRecommendation(overall, inst, normering, municipalityAvgPrice);
    return { overall, grade: toGrade(overall), metrics, pros, cons, recommendation };
  }

  return {
    overall: 50,
    grade: "C",
    metrics: [],
    pros: [],
    cons: [],
    recommendation: {
      da: "Ikke nok data til at beregne en score.",
      en: "Not enough data to compute a score.",
    },
  };
}
