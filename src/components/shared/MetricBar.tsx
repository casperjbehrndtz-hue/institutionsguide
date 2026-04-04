import { useState, useEffect, useRef } from "react";

interface Props {
  label: string;
  value: string;
  percentile: number | null;
  percentileLabel: string | null;
  color: string;
  fillPct: number;
  delay?: number;
}

export default function MetricBar({ label, value, percentileLabel, color, fillPct, delay = 0 }: Props) {
  const [width, setWidth] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setWidth(Math.min(fillPct, 100)), delay);
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [fillPct, delay]);

  return (
    <div ref={ref} className="mb-5">
      <div className="flex flex-wrap justify-between items-baseline gap-x-2 gap-y-1 mb-2">
        <span className="text-xs sm:text-sm text-foreground font-medium min-w-0">{label}</span>
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <span className="font-mono text-base sm:text-lg font-medium text-foreground">{value}</span>
          {percentileLabel && (
            <span
              className="text-[10px] sm:text-[11px] font-medium px-2 sm:px-2.5 py-0.5 rounded-full text-white whitespace-nowrap"
              style={{ background: color }}
            >
              {percentileLabel}
            </span>
          )}
        </div>
      </div>
      <div className="h-1.5 bg-border/30 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${width}%`,
            background: color,
            transition: "width 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>
    </div>
  );
}
