type Rating = "godkendt" | "godkendt_bemærkninger" | "skærpet" | null;

interface Props {
  rating: Rating;
}

const config: Record<
  string,
  { bg: string; text: string; da: string; en: string }
> = {
  godkendt: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-800 dark:text-green-300",
    da: "Godkendt",
    en: "Approved",
  },
  godkendt_bemærkninger: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-800 dark:text-amber-300",
    da: "Godkendt med bemærkninger",
    en: "Approved with remarks",
  },
  skærpet: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-800 dark:text-red-300",
    da: "Skærpet tilsyn",
    en: "Intensified supervision",
  },
};

const unknownConfig = {
  bg: "bg-gray-100 dark:bg-gray-800",
  text: "text-gray-500 dark:text-gray-400",
  da: "Ikke vurderet",
  en: "Not rated",
};

export default function TilsynBadge({ rating }: Props) {
  const c = rating ? config[rating] ?? unknownConfig : unknownConfig;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}
      title={c.en}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          rating === "godkendt"
            ? "bg-green-500"
            : rating === "godkendt_bemærkninger"
              ? "bg-amber-500"
              : rating === "skærpet"
                ? "bg-red-500"
                : "bg-gray-400"
        }`}
      />
      {c.da}
    </span>
  );
}
