import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, GitCompareArrows } from "lucide-react";
import ShareButton from "@/components/shared/ShareButton";
import { useFavorites } from "@/hooks/useFavorites";
import { useCompare } from "@/contexts/CompareContext";
import type { UnifiedInstitution } from "@/lib/types";
import type { TranslationStrings } from "@/lib/translations/types";

interface ActionBarProps {
  inst: UnifiedInstitution;
  cameFrom: string | undefined;
  categoryPath: string;
  language: string;
  t: TranslationStrings;
  onCompareToast: (msg: string) => void;
}

export default function ActionBar({ inst, cameFrom, categoryPath, language, t, onCompareToast }: ActionBarProps) {
  const navigate = useNavigate();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { addToCompare, removeFromCompare, isInCompare } = useCompare();

  return (
    <div className="max-w-[1020px] mx-auto px-4 pt-4 pb-2 flex items-center justify-between">
      <button
        onClick={() => {
          if (cameFrom) {
            navigate(cameFrom);
          } else {
            navigate(categoryPath);
          }
        }}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline cursor-pointer bg-transparent border-none p-0"
      >
        <ArrowLeft className="w-4 h-4" />
        {language === "da" ? "Tilbage" : "Back"}
      </button>
      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            if (isInCompare(inst.id)) {
              removeFromCompare(inst.id);
              onCompareToast(language === "da" ? "Fjernet fra sammenligning" : "Removed from comparison");
            } else {
              addToCompare(inst);
              onCompareToast(language === "da" ? "Tilføjet til sammenligning" : "Added to comparison");
            }
          }}
          className={`p-2 rounded-lg hover:bg-primary/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${isInCompare(inst.id) ? "bg-primary/10" : ""}`}
          aria-label={language === "da" ? "Sammenlign" : "Compare"}
        >
          <GitCompareArrows className={`w-5 h-5 transition-colors ${isInCompare(inst.id) ? "text-primary" : "text-muted hover:text-primary"}`} />
        </button>
        <ShareButton title={inst.name} url={`/institution/${inst.id}`} />
        <button
          onClick={() => toggleFavorite(inst.id)}
          className="p-2 rounded-lg hover:bg-red-50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label={isFavorite(inst.id) ? t.favorites.removeFavorite : t.favorites.addFavorite}
        >
          <Heart className={`w-6 h-6 transition-colors ${isFavorite(inst.id) ? "text-red-500 fill-red-500" : "text-muted hover:text-red-400"}`} />
        </button>
      </div>
    </div>
  );
}
