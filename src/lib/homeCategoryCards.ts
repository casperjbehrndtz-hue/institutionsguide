import { Building2, GraduationCap, Users, Home, BookOpen, Gamepad2, School, Landmark } from "lucide-react";
import type { TranslationStrings } from "@/lib/translations/types";
import type { Language } from "@/lib/translations/types";

export function getCategoryCards(t: TranslationStrings, language: Language) {
  const featured = [
    {
      category: "skole" as const, label: t.categories.skole, icon: GraduationCap,
      iconColor: "text-indigo-600 dark:text-indigo-400", bgColor: "bg-indigo-50 dark:bg-indigo-900/30",
      href: "/skole", desc: t.ageGroups.skole,
      cta: language === "da" ? "Se skoler" : "See schools",
      metric: language === "da" ? "Trivsel, karakterer og fravær" : "Well-being, grades and absence",
    },
    {
      category: "vuggestue" as const, label: t.categories.vuggestue, icon: Home,
      iconColor: "text-green-600 dark:text-green-400", bgColor: "bg-green-50 dark:bg-green-900/30",
      href: "/vuggestue", desc: t.ageGroups.vuggestue,
      cta: language === "da" ? "Se vuggestuer" : "See nurseries",
      metric: language === "da" ? "Normering, priser og kvalitetsdata" : "Staff ratios, prices and quality data",
    },
    {
      category: "boernehave" as const, label: t.categories.boernehave, icon: Building2,
      iconColor: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-900/30",
      href: "/boernehave", desc: t.ageGroups.boernehave,
      cta: language === "da" ? "Se børnehaver" : "See kindergartens",
      metric: language === "da" ? "Normering, priser og kvalitetsdata" : "Staff ratios, prices and quality data",
    },
    {
      category: "efterskole" as const, label: t.categories.efterskole, icon: School,
      iconColor: "text-pink-600 dark:text-pink-400", bgColor: "bg-pink-50 dark:bg-pink-900/30",
      href: "/efterskole", desc: t.ageGroups.efterskole,
      cta: language === "da" ? "Se efterskoler" : "See boarding schools",
      metric: language === "da" ? "Profiler, priser og ledige pladser" : "Profiles, prices and available spots",
    },
  ];
  const other = [
    { category: "dagpleje" as const, label: t.categories.dagpleje, icon: Users, iconColor: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-900/30", href: "/dagpleje", desc: t.ageGroups.dagpleje, cta: language === "da" ? "Udforsk" : "Explore" },
    { category: "sfo" as const, label: t.categories.sfo, icon: BookOpen, iconColor: "text-purple-600 dark:text-purple-400", bgColor: "bg-purple-50 dark:bg-purple-900/30", href: "/sfo", desc: t.ageGroups.sfo, cta: language === "da" ? "Udforsk" : "Explore" },
    { category: "fritidsklub" as const, label: t.categories.fritidsklub, icon: Gamepad2, iconColor: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-50 dark:bg-orange-900/30", href: "/fritidsklub", desc: t.ageGroups.fritidsklub, cta: language === "da" ? "Udforsk" : "Explore" },
    { category: "gymnasium" as const, label: t.categories.gymnasium, icon: Landmark, iconColor: "text-teal-600 dark:text-teal-400", bgColor: "bg-teal-50 dark:bg-teal-900/30", href: "/gymnasium", desc: t.ageGroups.gymnasium, cta: language === "da" ? "Udforsk" : "Explore" },
  ];
  return { featured, other };
}
