import { useTrack } from "@/contexts/TrackContext";
import { Baby, GraduationCap } from "lucide-react";

export default function LifeStageToggle() {
  const { track, setTrack } = useTrack();
  const isDaycare = track === "daycare";
  return (
    <div
      role="tablist"
      aria-label="Livsfase"
      className="inline-flex p-1 rounded-xl bg-bg-card border border-border"
    >
      <button
        role="tab"
        aria-selected={isDaycare}
        onClick={() => setTrack("daycare")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors min-h-[36px] ${
          isDaycare ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground"
        }`}
      >
        <Baby className="w-4 h-4" />
        Dagtilbud
      </button>
      <button
        role="tab"
        aria-selected={!isDaycare}
        onClick={() => setTrack("school")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors min-h-[36px] ${
          !isDaycare ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground"
        }`}
      >
        <GraduationCap className="w-4 h-4" />
        Folkeskole
      </button>
    </div>
  );
}
