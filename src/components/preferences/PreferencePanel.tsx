import { MapPin, Loader2, Baby, Users, Home, GraduationCap, BookOpen, School, type LucideIcon } from "lucide-react";
import PreferenceSlider from "./PreferenceSlider";
import type { DimensionConfig, InstitutionCategory } from "@/lib/preferenceConfig";
import { DIMENSIONS_BY_CATEGORY, categoryHasFinder } from "@/lib/preferenceConfig";

const ALL_CATEGORY_OPTIONS: { key: InstitutionCategory; da: string; en: string; icon: LucideIcon }[] = [
  { key: "vuggestue", da: "Vuggestue", en: "Nursery", icon: Baby },
  { key: "boernehave", da: "Børnehave", en: "Kindergarten", icon: Users },
  { key: "dagpleje", da: "Dagpleje", en: "Childminder", icon: Home },
  { key: "skole", da: "Skole", en: "School", icon: GraduationCap },
  { key: "sfo", da: "SFO", en: "After-school", icon: BookOpen },
  { key: "efterskole", da: "Efterskole", en: "Boarding school", icon: School },
];
const CATEGORY_OPTIONS = ALL_CATEGORY_OPTIONS.filter((o) => categoryHasFinder(o.key));

const RADIUS_OPTIONS = [
  { value: 5, da: "5 km", en: "5 km" },
  { value: 10, da: "10 km", en: "10 km" },
  { value: 15, da: "15 km", en: "15 km" },
  { value: 25, da: "25 km", en: "25 km" },
  { value: 50, da: "50 km", en: "50 km" },
  { value: 0, da: "Hele landet", en: "Entire country" },
];

interface Props {
  category: InstitutionCategory;
  onCategoryChange: (c: InstitutionCategory) => void;
  weights: Record<string, number>;
  onWeightChange: (key: string, value: number) => void;
  language: "da" | "en";
  hasLocation: boolean;
  nearMeLoading: boolean;
  onNearMe: () => void;
  maxDistanceKm: number;
  onMaxDistanceChange: (km: number) => void;
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
  maxDistanceKm,
  onMaxDistanceChange,
}: Props) {
  // Filter out the "distance" dimension — it's now a hard filter, not a slider
  const dimensions: DimensionConfig[] = (DIMENSIONS_BY_CATEGORY[category] ?? []).filter(
    (d) => d.key !== "distance",
  );

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
              <opt.icon className="w-3.5 h-3.5 inline-block -mt-0.5" /> {language === "da" ? opt.da : opt.en}
            </button>
          ))}
        </div>
      </div>

      {/* Location + radius */}
      <div>
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
          {language === "da" ? "Hvor bor I?" : "Where do you live?"}
        </p>
        {!hasLocation ? (
          <button
            onClick={onNearMe}
            disabled={nearMeLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-dashed border-primary/30 text-primary hover:bg-primary/5 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {nearMeLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <MapPin className="w-4 h-4" />}
            {language === "da" ? "Aktiver placering" : "Enable location"}
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 rounded-lg px-3 py-2">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {language === "da" ? "Placering aktiv" : "Location active"}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted shrink-0">
                {language === "da" ? "Max afstand:" : "Max distance:"}
              </label>
              <div className="flex flex-wrap gap-1">
                {RADIUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onMaxDistanceChange(opt.value)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all font-medium ${
                      maxDistanceKm === opt.value
                        ? "bg-primary text-white border-primary"
                        : "border-border text-muted hover:border-primary/40"
                    }`}
                  >
                    {language === "da" ? opt.da : opt.en}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

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
