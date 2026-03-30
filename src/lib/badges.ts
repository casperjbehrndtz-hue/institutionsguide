/**
 * Shared badge color definitions for quality and category badges.
 * All colors use dark-mode-safe tokens or explicit dark variants.
 */

/** Quality badge based on a numeric score (used in BestSchoolPage / BestValuePage) */
export function qualityBadge(
  score: number | undefined,
): { label: string; color: string } | null {
  if (score === undefined) return null;
  if (score >= 4)
    return {
      label: "Fremragende",
      color: "bg-[#E1F5EE] text-[#085041] dark:bg-[#085041]/30 dark:text-[#34D399]",
    };
  if (score >= 3)
    return {
      label: "God",
      color: "bg-[#DBEAFE] text-[#1E40AF] dark:bg-[#1E40AF]/30 dark:text-[#93C5FD]",
    };
  if (score >= 2)
    return {
      label: "Middel",
      color: "bg-[#FAEEDA] text-[#633806] dark:bg-[#633806]/30 dark:text-[#FBBF24]",
    };
  return {
    label: "Under middel",
    color: "bg-[#FCEBEB] text-[#791F1F] dark:bg-[#791F1F]/30 dark:text-[#F87171]",
  };
}

/** Quality badge based on the overall quality indicator (o: 1/0/-1) */
export function qualityLevelBadge(
  o: number | undefined,
  language: "da" | "en" = "da",
): { label: string; className: string } | null {
  if (o === undefined) return null;
  if (o === 1)
    return {
      label: language === "da" ? "Over middel" : "Above avg",
      className: "bg-[#E1F5EE] text-[#085041] dark:bg-[#085041]/30 dark:text-[#34D399]",
    };
  if (o === 0)
    return {
      label: language === "da" ? "Middel" : "Average",
      className: "bg-[#FAEEDA] text-[#633806] dark:bg-[#633806]/30 dark:text-[#FBBF24]",
    };
  return {
    label: language === "da" ? "Under middel" : "Below avg",
    className: "bg-[#FCEBEB] text-[#791F1F] dark:bg-[#791F1F]/30 dark:text-[#F87171]",
  };
}

/** Inline style variant for map popup HTML (cannot use Tailwind classes) */
export function qualityBadgeInlineColors(
  o: number | undefined,
): { bg: string; text: string } | null {
  if (o === undefined) return null;
  if (o === 1) return { bg: "#E1F5EE", text: "#085041" };
  if (o === 0) return { bg: "#FAEEDA", text: "#633806" };
  return { bg: "#FCEBEB", text: "#791F1F" };
}

/** Score-based inline colors (for InstitutionReport nearby badges) */
export function scoreBadgeInlineColors(
  overall: number | null,
): { bg: string; text: string } | null {
  if (overall == null) return null;
  if (overall >= 65) return { bg: "#E1F5EE", text: "#085041" };
  if (overall >= 45) return { bg: "#FAEEDA", text: "#633806" };
  return { bg: "#FCEBEB", text: "#791F1F" };
}

/** Category badge colors — dark-mode safe */
export const CATEGORY_BADGE_COLORS: Record<string, string> = {
  vuggestue: "bg-[#DCFCE7] text-[#166534] dark:bg-[#166534]/30 dark:text-[#86EFAC]",
  boernehave: "bg-[#DBEAFE] text-[#1E40AF] dark:bg-[#1E40AF]/30 dark:text-[#93C5FD]",
  dagpleje: "bg-[#FEF3C7] text-[#92400E] dark:bg-[#92400E]/30 dark:text-[#FCD34D]",
  skole: "bg-[#E0E7FF] text-[#3730A3] dark:bg-[#3730A3]/30 dark:text-[#A5B4FC]",
  sfo: "bg-[#F3E8FF] text-[#6B21A8] dark:bg-[#6B21A8]/30 dark:text-[#D8B4FE]",
  fritidsklub: "bg-[#FFF7ED] text-[#9A3412] dark:bg-[#9A3412]/30 dark:text-[#FDBA74]",
  efterskole: "bg-[#FDF2F8] text-[#9D174D] dark:bg-[#9D174D]/30 dark:text-[#F9A8D4]",
};
