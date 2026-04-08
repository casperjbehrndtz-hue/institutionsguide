import { PencilLine, Heart, UserCheck, Star, Coins, Lightbulb, type LucideIcon } from "lucide-react";
import type { InstitutionCategory } from "@/lib/preferenceConfig";

export interface Preset {
  id: string;
  label: { da: string; en: string };
  icon: LucideIcon;
  weights: Record<string, number>;
  categories: InstitutionCategory[];
}

export const PRESETS: Preset[] = [
  {
    id: "academic",
    label: { da: "Akademisk fokus", en: "Academic focus" },
    icon: PencilLine,
    weights: { karakterer: 90, kompetence: 70, trivsel: 40, fravaer: 50, klassestorrelse: 30, elevPrLaerer: 40 },
    categories: ["skole"],
  },
  {
    id: "wellbeing",
    label: { da: "Trygt miljø", en: "Safe environment" },
    icon: Heart,
    weights: { trivsel: 90, fravaer: 70, klassestorrelse: 60, elevPrLaerer: 50, karakterer: 20, kompetence: 30 },
    categories: ["skole"],
  },
  {
    id: "individual",
    label: { da: "Individuel opmærksomhed", en: "Individual attention" },
    icon: UserCheck,
    weights: { elevPrLaerer: 100, undervisningstid: 80, klassestorrelse: 70, trivsel: 40, karakterer: 30 },
    categories: ["skole"],
  },
  {
    id: "allround",
    label: { da: "Bedste overalt", en: "Best overall" },
    icon: Star,
    weights: { trivsel: 70, karakterer: 70, fravaer: 60, kompetence: 60, klassestorrelse: 50, elevPrLaerer: 50 },
    categories: ["skole"],
  },
  {
    id: "quality-care",
    label: { da: "Bedste kvalitet", en: "Best quality" },
    icon: Star,
    weights: { normering: 90, uddannelse: 80, tilfredshed: 70, price: 20 },
    categories: ["vuggestue", "boernehave", "dagpleje", "sfo"],
  },
  {
    id: "budget",
    label: { da: "Billigst muligt", en: "Lowest price" },
    icon: Coins,
    weights: { price: 100, normering: 30, uddannelse: 10, tilfredshed: 20 },
    categories: ["vuggestue", "boernehave", "dagpleje", "sfo", "efterskole"],
  },
  {
    id: "nearby-care",
    label: { da: "God og billig", en: "Good and affordable" },
    icon: Lightbulb,
    weights: { normering: 60, tilfredshed: 50, price: 60, uddannelse: 30 },
    categories: ["vuggestue", "boernehave", "dagpleje", "sfo"],
  },
];
