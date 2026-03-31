import { useCallback, useId } from "react";

interface Props {
  dimKey: string;
  icon: string;
  label: string;
  goodLabel: string;
  value: number; // 0-100
  onChange: (key: string, value: number) => void;
  language: "da" | "en";
}

const LEVEL_LABELS = {
  da: { off: "Slukket", low: "Lidt", mid: "Vigtigt", high: "Meget vigtigt" },
  en: { off: "Off", low: "Slightly", mid: "Important", high: "Very important" },
} as const;

export default function PreferenceSlider({ dimKey, icon, label, goodLabel, value, onChange, language }: Props) {
  const id = useId();
  const labels = LEVEL_LABELS[language];

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onChange(dimKey, Number(e.target.value)),
    [onChange, dimKey],
  );

  const pct = value;
  const isActive = value > 0;
  const levelLabel = value === 0 ? labels.off : value < 33 ? labels.low : value < 66 ? labels.mid : labels.high;

  return (
    <div className={`group flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors ${isActive ? "bg-primary/5" : "bg-transparent"}`}>
      <span className="text-lg shrink-0 w-7 text-center" aria-hidden>{icon}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-1">
          <label htmlFor={id} className="text-sm font-medium text-foreground truncate">
            {label}
          </label>
          <span className="text-xs text-muted ml-2 shrink-0">{levelLabel}</span>
        </div>

        <div className="relative">
          <input
            id={id}
            type="range"
            min={0}
            max={100}
            step={1}
            value={value}
            onChange={handleChange}
            className="preference-slider w-full"
            aria-label={`${label}: ${value}%`}
          />
          {/* Custom track fill */}
          <div
            className="absolute top-1/2 left-0 h-1.5 rounded-full bg-primary/60 pointer-events-none -translate-y-1/2 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        {isActive && (
          <p className="text-[11px] text-muted mt-0.5 truncate">{goodLabel}</p>
        )}
      </div>
    </div>
  );
}
