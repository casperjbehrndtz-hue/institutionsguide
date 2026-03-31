import { MapPin, Loader2 } from "lucide-react";
import PreferenceSlider from "./PreferenceSlider";
import type { DimensionConfig, InstitutionCategory } from "@/lib/preferenceConfig";
import { DIMENSIONS_BY_CATEGORY, categoryHasFinder } from "@/lib/preferenceConfig";

const ALL_CATEGORY_OPTIONS: { key: InstitutionCategory; da: string; en: string; emoji: string }[] = [
  { key: "vuggestue", da: "Vuggestue", en: "Nursery", emoji: "👶" },
  { key: "boernehave", da: "Børnehave", en: "Kindergarten", emoji: "🧒" },
  { key: "dagpleje", da: "Dagpleje", en: "Childminder", emoji: "🏠" },
  { key: "skole", da: "Skole", en: "School", emoji: "🎓" },
  { key: "sfo", da: "SFO", en: "After-school", emoji: "📚" },
  { key: "efterskole", da: "Efterskole", en: "Boarding school", emoji: "🏫" },
];
const CATEGORY_OPTIONS = ALL_CATEGORY_OPTIONS.filter((o) => categoryHasFinder(o.key));

interface Props {
  category: InstitutionCategory;
  onCategoryChange: (c: InstitutionCategory) => void;
  weights: Record<string, number>;
  onWeightChange: (key: string, value: number) => void;
  language: "da" | "en";
  hasLocation: boolean;
  nearMeLoading: boolean;
  onNearMe: () => void;
}

export default function PreferencePanel({
  category,
  onCategoryChange,
  weights,
  onWeightChange,
  language,
  hasLocation,
  nearMeLoading,
  onNearMe,
}: Props) {
  const dimensions: DimensionConfig[] = DIMENSIONS_BY_CATEGORY[category] ?? [];

  return (
    <div className="space-y-4">
      {/* Category pills */}
      <div>
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
          {language === "da" ? "Hvad søger du?" : "What are you looking for?"}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => onCategoryChange(opt.key)}
              className={`text-sm px-3 py-1.5 rounded-full border transition-all font-medium ${
                category === opt.key
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-bg-card border-border text-muted hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {opt.emoji} {language === "da" ? opt.da : opt.en}
            </button>
          ))}
        </div>
      </div>

      {/* Location toggle */}
      {dimensions.some((d) => d.key === "distance") && !hasLocation && (
        <button
          onClick={onNearMe}
          disabled={nearMeLoading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-dashed border-primary/30 text-primary hover:bg-primary/5 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {nearMeLoading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <MapPin className="w-4 h-4" />}
          {language === "da" ? "Aktiver placering for afstands-rangering" : "Enable location for distance ranking"}
        </button>
      )}

      {hasLocation && dimensions.some((d) => d.key === "distance") && (
        <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 rounded-lg px-3 py-2">
          <MapPin className="w-3.5 h-3.5" />
          {language === "da" ? "Placering aktiv — afstand indgår i ranking" : "Location active — distance included in ranking"}
        </div>
      )}

      {/* Sliders */}
      <div>
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
          {language === "da" ? "Hvad er vigtigt for jer?" : "What matters to you?"}
        </p>
        <div className="space-y-0.5">
          {dimensions.map((dim) => (
            <PreferenceSlider
              key={dim.key}
              dimKey={dim.key}
              icon={dim.icon}
              label={language === "da" ? dim.label.da : dim.label.en}
              goodLabel={language === "da" ? dim.goodLabel.da : dim.goodLabel.en}
              value={weights[dim.key] ?? 0}
              onChange={onWeightChange}
              language={language}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
