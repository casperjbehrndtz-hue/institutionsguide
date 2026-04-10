import type { SchoolQuality, SchoolExtraStats } from "@/lib/types";
import type { LocalizedText, MetricScore, WeightedMetric } from "./types";
import { linearMap, fmt, toGrade, weightedOverall, toMetricScores } from "./utils";

export function scoreSchool(q: SchoolQuality, schoolExtra?: SchoolExtraStats): {
  metrics: MetricScore[];
  overall: number | null;
} {
  const raw: (WeightedMetric | null)[] = [
    q.ts != null
      ? {
          key: "trivsel",
          label: { da: "Trivsel", en: "Well-being" },
          weight: 0.2,
          score: linearMap(q.ts, 3.5, 4.3),
          value: fmt(q.ts),
          icon: "smile",
        }
      : null,
    q.k != null
      ? {
          key: "karakterer",
          label: { da: "Karakterer", en: "Grades" },
          weight: 0.2,
          score: linearMap(q.k, 5.0, 10.0),
          value: fmt(q.k),
          icon: "pencil-line",
        }
      : null,
    q.fp != null
      ? {
          key: "fravaer",
          label: { da: "Fravær", en: "Absence" },
          weight: 0.15,
          score: linearMap(q.fp, 12, 3),
          value: `${fmt(q.fp)}%`,
          icon: "calendar-x",
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
          icon: "graduation-cap",
        }
      : null,
    q.kv != null
      ? {
          key: "klassestorrelse",
          label: { da: "Klassestørrelse", en: "Class size" },
          weight: 0.15,
          score: linearMap(q.kv, 28, 12),
          value: `${fmt(q.kv, 1)} elever`,
          icon: "users",
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
          icon: "trending-up",
        }
      : null,
    q.oug != null
      ? {
          key: "overgang_ungdomsudd",
          label: { da: "Overgang til ungdomsudd.", en: "Transition to youth education" },
          weight: 0.1,
          score: linearMap(q.oug, 50, 95),
          value: `${fmt(q.oug)}%`,
          icon: "arrow-up-right",
        }
      : schoolExtra?.transitionGymnasiumPct != null
        ? {
            key: "overgang_gymnasium",
            label: { da: "Overgang til gymnasium", en: "Transition to upper secondary" },
            weight: 0.1,
            score: linearMap(schoolExtra.transitionGymnasiumPct, 40, 80),
            value: `${fmt(schoolExtra.transitionGymnasiumPct)}%`,
            icon: "arrow-up-right",
          }
        : null,
    q.srd != null
      ? {
          key: "socref_forskel",
          label: { da: "Socioøkonomisk reference", en: "Socioeconomic reference" },
          weight: 0.05,
          score: linearMap(q.srd, -1.5, 1.5),
          value: `${q.srd >= 0 ? "+" : ""}${fmt(q.srd)}`,
          icon: "scale",
        }
      : null,
  ];

  const available = raw.filter((m): m is WeightedMetric => m != null);
  if (available.length === 0) {
    return { metrics: [], overall: null };
  }

  return { metrics: toMetricScores(available), overall: weightedOverall(available) };
}

export function schoolProsAndCons(
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

  if (q.oug != null) {
    if (q.oug >= 85) {
      pros.push({
        da: `Høj overgang til ungdomsuddannelse (${fmt(q.oug)}%)`,
        en: `High transition rate to youth education (${fmt(q.oug)}%)`,
      });
    } else if (q.oug < 65) {
      cons.push({
        da: `Lavere overgang til ungdomsuddannelse (${fmt(q.oug)}%)`,
        en: `Lower transition rate to youth education (${fmt(q.oug)}%)`,
      });
    }
  }

  return { pros: pros.slice(0, 4), cons: cons.slice(0, 3) };
}

export function schoolRecommendation(
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
