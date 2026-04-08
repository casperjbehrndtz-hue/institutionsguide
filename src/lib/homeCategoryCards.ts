import { Building2, GraduationCap, Users, Home, BookOpen, Gamepad2, School, Landmark } from "lucide-react";
import type { TranslationStrings } from "@/lib/translations/types";
import type { Language } from "@/lib/translations/types";

export function getCategoryCards(t: TranslationStrings, language: Language) {
  const featured = [
    { category: "skole" as const, label: t.categories.skole, icon: GraduationCap, iconColor: "text-indigo-600", bgColor: "bg-indigo-100 dark:bg-indigo-900/30", href: "/skole", desc: t.ageGroups.skole, cta: language === "da" ? "Se skoler" : "See schools", featured: true },
    { category: "efterskole" as const, label: t.categories.efterskole, icon: School, iconColor: "text-pink-600", bgColor: "bg-pink-100 dark:bg-pink-900/30", href: "/efterskole", desc: t.ageGroups.efterskole, cta: language === "da" ? "Se efterskoler" : "See boarding schools", featured: true },
  ];
  const other = [
    { category: "vuggestue" as const, label: t.categories.vuggestue, icon: Home, iconColor: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30", href: "/vuggestue", desc: t.ageGroups.vuggestue, cta: language === "da" ? "Udforsk" : "Explore", featured: false },
    { category: "boernehave" as const, label: t.categories.boernehave, icon: Building2, iconColor: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30", href: "/boernehave", desc: t.ageGroups.boernehave, cta: language === "da" ? "Udforsk" : "Explore", featured: false },
    { category: "dagpleje" as const, label: t.categories.dagpleje, icon: Users, iconColor: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30", href: "/dagpleje", desc: t.ageGroups.dagpleje, cta: language === "da" ? "Udforsk" : "Explore", featured: false },
    { category: "sfo" as const, label: t.categories.sfo, icon: BookOpen, iconColor: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30", href: "/sfo", desc: t.ageGroups.sfo, cta: language === "da" ? "Udforsk" : "Explore", featured: false },
    { category: "fritidsklub" as const, label: t.categories.fritidsklub, icon: Gamepad2, iconColor: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30", href: "/fritidsklub", desc: t.ageGroups.fritidsklub, cta: language === "da" ? "Udforsk" : "Explore", featured: false },
    { category: "gymnasium" as const, label: t.categories.gymnasium, icon: Landmark, iconColor: "text-teal-600", bgColor: "bg-teal-100 dark:bg-teal-900/30", href: "/gymnasium", desc: t.ageGroups.gymnasium, cta: language === "da" ? "Udforsk" : "Explore", featured: false },
  ];
  return { featured, other };
}
