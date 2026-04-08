import type { UnifiedInstitution } from "@/lib/types";

interface Props {
  inst: UnifiedInstitution;
  onSelect: (inst: UnifiedInstitution) => void;
  language: "da" | "en";
}

export default function GymnasiumCard({ inst, onSelect, language }: Props) {
  return (
    <button
      onClick={() => onSelect(inst)}
      className="w-full text-left card p-4 hover:shadow-md transition-shadow cursor-pointer flex items-start gap-4"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3 className="font-semibold text-foreground text-sm truncate">{inst.name}</h3>
          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
            {inst.subtype.toUpperCase()}
          </span>
        </div>
        <p className="text-xs text-muted">
          {inst.municipality ? `${inst.municipality}` : ""}
          {inst.city ? ` \u00b7 ${inst.city}` : ""}
          {inst.address ? ` \u00b7 ${inst.address}` : ""}
        </p>
      </div>

      {/* Quality metrics */}
      <div className="shrink-0 flex gap-4 items-center text-right">
        {inst.quality?.k != null && (
          <div>
            <p className="font-mono text-sm font-bold text-foreground">{inst.quality.k.toFixed(1)}</p>
            <p className="text-[10px] text-muted uppercase">{language === "da" ? "Snit" : "Avg"}</p>
          </div>
        )}
        {inst.quality?.fp != null && (
          <div>
            <p className="font-mono text-sm font-bold text-foreground">{inst.quality.fp.toFixed(1)}%</p>
            <p className="text-[10px] text-muted uppercase">{language === "da" ? "Frafald" : "Dropout"}</p>
          </div>
        )}
      </div>
    </button>
  );
}
