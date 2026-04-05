import type React from "react";
import {
  Baby,
  Users,
  GraduationCap,
  Home,
  Building2,
  Coins,
  Clock,
  TreePine,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgeGroup = "0-1" | "1-2" | "2-3" | "3-5" | "6+";

export type Priority =
  | "lav-pris"
  | "lille-gruppe"
  | "uddannet-personale"
  | "taet-paa-hjemmet"
  | "fleksible-tider"
  | "naturoplevelser";

export interface WizardState {
  age: AgeGroup | null;
  priorities: Priority[];
  municipality: string;
  income: number | null;
}

export type RecommendedType = "dagpleje" | "vuggestue" | "boernehave" | "sfo";

export interface Recommendation {
  primary: RecommendedType;
  alternatives: RecommendedType[];
  reasons: { da: string; en: string }[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const STEPS = 5;
export const MAX_PRIORITIES = 3;

export const AGE_OPTIONS: { value: AgeGroup; da: string; en: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "0-1", da: "0-1 år", en: "0-1 years", icon: Baby },
  { value: "1-2", da: "1-2 år", en: "1-2 years", icon: Baby },
  { value: "2-3", da: "2-3 år", en: "2-3 years", icon: Users },
  { value: "3-5", da: "3-5 år", en: "3-5 years", icon: Users },
  { value: "6+", da: "6+ år", en: "6+ years", icon: GraduationCap },
];

export const PRIORITY_OPTIONS: { value: Priority; da: string; en: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "lav-pris", da: "Lav pris", en: "Low price", icon: Coins },
  { value: "lille-gruppe", da: "Lille gruppe", en: "Small group", icon: Users },
  { value: "uddannet-personale", da: "Uddannet personale", en: "Qualified staff", icon: GraduationCap },
  { value: "taet-paa-hjemmet", da: "Tæt på hjemmet", en: "Close to home", icon: Home },
  { value: "fleksible-tider", da: "Fleksible åbningstider", en: "Flexible hours", icon: Clock },
  { value: "naturoplevelser", da: "Naturoplevelser", en: "Nature experiences", icon: TreePine },
];

export const TYPE_LABELS_DA: Record<RecommendedType, string> = {
  dagpleje: "Dagpleje",
  vuggestue: "Vuggestue",
  boernehave: "Børnehave",
  sfo: "SFO",
};

export const TYPE_LABELS_EN: Record<RecommendedType, string> = {
  dagpleje: "Childminder",
  vuggestue: "Nursery",
  boernehave: "Kindergarten",
  sfo: "After-school care",
};

export const TYPE_ICONS: Record<RecommendedType, typeof Home> = {
  dagpleje: Users,
  vuggestue: Home,
  boernehave: Building2,
  sfo: GraduationCap,
};

export const TYPE_URL: Record<RecommendedType, string> = {
  dagpleje: "dagpleje",
  vuggestue: "vuggestue",
  boernehave: "boernehave",
  sfo: "sfo",
};

// ---------------------------------------------------------------------------
// Comparison data
// ---------------------------------------------------------------------------

export interface ComparisonRow {
  da: string;
  en: string;
  dagpleje: { da: string; en: string };
  vuggestue: { da: string; en: string };
  boernehave: { da: string; en: string };
}

export const COMPARISON_TABLE: ComparisonRow[] = [
  {
    da: "Alder",
    en: "Age",
    dagpleje: { da: "0-2 år", en: "0-2 years" },
    vuggestue: { da: "0-2 år", en: "0-2 years" },
    boernehave: { da: "3-5 år", en: "3-5 years" },
  },
  {
    da: "Typisk gruppestørrelse",
    en: "Typical group size",
    dagpleje: { da: "3-4 børn", en: "3-4 children" },
    vuggestue: { da: "10-14 børn", en: "10-14 children" },
    boernehave: { da: "20-25 børn", en: "20-25 children" },
  },
  {
    da: "Normering (børn pr. voksen)",
    en: "Staff ratio (children per adult)",
    dagpleje: { da: "3-4:1", en: "3-4:1" },
    vuggestue: { da: "3:1 (lovkrav)", en: "3:1 (legal min.)" },
    boernehave: { da: "6:1 (lovkrav)", en: "6:1 (legal min.)" },
  },
  {
    da: "Personale",
    en: "Staff",
    dagpleje: { da: "Uddannet dagplejer", en: "Trained childminder" },
    vuggestue: { da: "Pædagoger + medhjælpere", en: "Pedagogues + assistants" },
    boernehave: { da: "Pædagoger + medhjælpere", en: "Pedagogues + assistants" },
  },
  {
    da: "Rammer",
    en: "Setting",
    dagpleje: { da: "Privat hjem", en: "Private home" },
    vuggestue: { da: "Institution", en: "Institution" },
    boernehave: { da: "Institution", en: "Institution" },
  },
  {
    da: "Fordele",
    en: "Pros",
    dagpleje: { da: "Hjemlig, lille gruppe, ofte billigere", en: "Home-like, small group, often cheaper" },
    vuggestue: { da: "Uddannet personale, længere åbningstid, social stimulering", en: "Qualified staff, longer hours, social stimulation" },
    boernehave: { da: "Skoleforberedende, store legepladser, mange aktiviteter", en: "School preparation, large playgrounds, many activities" },
  },
  {
    da: "Ulemper",
    en: "Cons",
    dagpleje: { da: "Sårbar ved sygdom, færre børn at lege med", en: "Vulnerable to illness, fewer playmates" },
    vuggestue: { da: "Større grupper, kan være dyrere", en: "Larger groups, can be more expensive" },
    boernehave: { da: "Store grupper, mere støj", en: "Large groups, more noise" },
  },
];

// ---------------------------------------------------------------------------
// Recommendation engine
// ---------------------------------------------------------------------------

export function computeTypeScore(type: "dagpleje" | "vuggestue", pSet: Set<Priority>): number {
  let score = 0;
  if (type === "dagpleje") {
    if (pSet.has("lav-pris")) score += 2;
    if (pSet.has("lille-gruppe")) score += 3;
    if (pSet.has("taet-paa-hjemmet")) score += 2;
    if (pSet.has("naturoplevelser")) score += 1;
    if (pSet.has("fleksible-tider")) score += 1;
    if (pSet.has("uddannet-personale")) score -= 1;
  } else {
    if (pSet.has("uddannet-personale")) score += 3;
    if (pSet.has("fleksible-tider")) score += 2;
    if (pSet.has("naturoplevelser")) score += 1;
    if (pSet.has("lille-gruppe")) score -= 1;
    if (pSet.has("lav-pris")) score -= 1;
  }
  return score;
}

function buildReasons(type: "dagpleje" | "vuggestue", pSet: Set<Priority>): { da: string; en: string }[] {
  const reasons: { da: string; en: string }[] = [];
  if (type === "dagpleje") {
    if (pSet.has("lille-gruppe"))
      reasons.push({
        da: "Dagpleje har typisk kun 3-4 børn per voksen — perfekt til dig, der ønsker en lille gruppe.",
        en: "Childminders typically have only 3-4 children per adult — perfect for small group preference.",
      });
    if (pSet.has("lav-pris"))
      reasons.push({
        da: "Dagpleje er i de fleste kommuner billigere end vuggestue.",
        en: "Childminders are cheaper than nurseries in most municipalities.",
      });
    if (pSet.has("taet-paa-hjemmet"))
      reasons.push({
        da: "Dagplejere er spredt ud i lokalområdet, så der er ofte en tæt på dit hjem.",
        en: "Childminders are spread across neighborhoods, so there is often one close to your home.",
      });
    if (reasons.length === 0)
      reasons.push({
        da: "Dagpleje giver en hjemlig og tryg ramme med få børn og en fast voksen.",
        en: "Childminders provide a home-like, secure setting with few children and a dedicated adult.",
      });
  } else {
    if (pSet.has("uddannet-personale"))
      reasons.push({
        da: "Vuggestuer har typisk uddannede pædagoger med en pædagogisk læreplan.",
        en: "Nurseries typically have qualified pedagogues with an educational curriculum.",
      });
    if (pSet.has("fleksible-tider"))
      reasons.push({
        da: "Vuggestuer har ofte længere åbningstider end dagpleje.",
        en: "Nurseries often have longer opening hours than childminders.",
      });
    if (reasons.length === 0)
      reasons.push({
        da: "Vuggestue giver bred socialisering med andre børn og et struktureret pædagogisk miljø.",
        en: "Nursery provides broad socialization with other children and a structured pedagogical environment.",
      });
  }
  return reasons;
}

export function getRecommendation(state: WizardState): Recommendation {
  const { age, priorities } = state;
  const pSet = new Set(priorities);

  if (age === "6+") {
    return {
      primary: "sfo",
      alternatives: [],
      reasons: [
        {
          da: "Til børn over 6 år er SFO (skolefritidsordning) det naturlige valg efter skolestart.",
          en: "For children over 6, SFO (after-school care) is the natural choice after school starts.",
        },
      ],
    };
  }

  if (age === "3-5") {
    const reasons: { da: string; en: string }[] = [
      {
        da: "Til børn mellem 3-5 år er børnehave den oplagte pasningsform.",
        en: "For children aged 3-5, kindergarten is the obvious childcare type.",
      },
    ];
    if (pSet.has("naturoplevelser")) {
      reasons.push({
        da: "Mange børnehaver har fokus på udeliv og naturoplevelser — søg efter skov- eller naturbørnehaver.",
        en: "Many kindergartens focus on outdoor life and nature — look for forest or nature kindergartens.",
      });
    }
    return { primary: "boernehave", alternatives: [], reasons };
  }

  // Age 0-3: dagpleje vs vuggestue
  const dagplejeScore = computeTypeScore("dagpleje", pSet);
  const vuggestueScore = computeTypeScore("vuggestue", pSet);

  if (dagplejeScore > vuggestueScore) {
    return {
      primary: "dagpleje",
      alternatives: ["vuggestue"],
      reasons: buildReasons("dagpleje", pSet),
    };
  }
  if (vuggestueScore > dagplejeScore) {
    return {
      primary: "vuggestue",
      alternatives: ["dagpleje"],
      reasons: buildReasons("vuggestue", pSet),
    };
  }

  // Tie — default to vuggestue as "safe" recommendation
  return {
    primary: "vuggestue",
    alternatives: ["dagpleje"],
    reasons: [
      {
        da: "Både dagpleje og vuggestue passer godt til dine prioriteter. Vuggestue giver bredere sociale rammer, mens dagpleje tilbyder en mere hjemlig atmosfære.",
        en: "Both childminder and nursery fit your priorities. Nursery offers a broader social setting, while childminder provides a more home-like atmosphere.",
      },
    ],
  };
}
