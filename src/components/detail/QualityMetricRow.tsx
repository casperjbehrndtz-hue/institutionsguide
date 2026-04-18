import { useState, useEffect, useRef } from "react";

export default function QualityMetricRow({ label, percentile, value, delay = 0, lang = "da", badge }: {
  label: string;
  percentile: number;
  value: string;
  delay?: number;
  lang?: string;
  badge?: string;
}) {
  const [barWidth, setBarWidth] = useState(0);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setTimeout(() => setBarWidth(percentile), delay);
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [percentile, delay]);

  const color = percentile >= 75 ? "#0d7c5f" : percentile >= 40 ? "#b8860b" : "#c0392b";
  const bg = percentile >= 75 ? "rgba(13,124,95,0.07)" : percentile >= 40 ? "rgba(184,134,11,0.07)" : "rgba(192,57,43,0.07)";

  const rankLabel = percentile >= 90
    ? "Top 10%"
    : percentile >= 75
    ? "Top 25%"
    : percentile >= 60
    ? (lang === "da" ? "Over middel" : "Above avg")
    : percentile >= 40
    ? (lang === "da" ? "Middel" : "Average")
    : percentile >= 25
    ? (lang === "da" ? "Under middel" : "Below avg")
    : percentile >= 10
    ? (lang === "da" ? "Bund 25%" : "Bottom 25%")
    : (lang === "da" ? "Bund 10%" : "Bottom 10%");

  return (
    <div
      ref={rowRef}
      className="py-3 border-b border-border/20"
    >
      {/* Mobile: stacked layout */}
      <div className="flex items-center justify-between gap-2 sm:hidden mb-1.5">
        <span className="text-xs text-muted font-medium truncate">
          {label}
          {badge && <span className="ml-1 text-[8px] px-1 py-0.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 font-semibold align-middle">{badge}</span>}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-xs font-medium text-foreground">{value}</span>
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full tracking-wide whitespace-nowrap"
            style={{ color, backgroundColor: bg }}
          >
            {rankLabel}
          </span>
        </div>
      </div>
      <div className="h-1 bg-border/30 rounded-full overflow-hidden sm:hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${barWidth}%`,
            backgroundColor: color,
            transition: "width 0.9s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>

      {/* Desktop: grid layout */}
      <div
        className="hidden sm:grid items-center gap-3"
        style={{ gridTemplateColumns: "minmax(70px, 140px) 1fr auto auto" }}
      >
        <span className="text-[13px] text-muted font-medium truncate">
          {label}
          {badge && <span className="ml-1 text-[9px] px-1 py-0.5 rounded bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 font-semibold align-middle">{badge}</span>}
        </span>
        <div className="h-1 bg-border/30 rounded-full overflow-hidden min-w-[40px]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${barWidth}%`,
              backgroundColor: color,
              transition: "width 0.9s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        </div>
        <span className="font-mono text-sm font-medium text-foreground text-right">{value}</span>
        <span
          className="text-[10px] font-bold text-center px-2 py-0.5 rounded-full tracking-wide whitespace-nowrap"
          style={{ color, backgroundColor: bg }}
        >
          {rankLabel}
        </span>
      </div>
    </div>
  );
}
