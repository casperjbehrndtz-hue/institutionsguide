import { useState, useEffect, useRef } from "react";

function AnimatedNumber({ value, suffix = "", decimals = 1, delay = 0 }: {
  value: number; suffix?: string; decimals?: number; delay?: number;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const timer = setTimeout(() => {
            const steps = 40;
            const duration = 1200;
            const increment = value / steps;
            let current = 0;
            const interval = setInterval(() => {
              current += increment;
              if (current >= value) {
                setDisplay(value);
                clearInterval(interval);
              } else {
                setDisplay(current);
              }
            }, duration / steps);
          }, delay);
          return () => clearTimeout(timer);
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value, delay]);

  return (
    <span ref={ref}>
      {display.toFixed(decimals).replace(".", ",")}{suffix}
    </span>
  );
}

const SCORE_COLOR = (s: number) =>
  s >= 7 ? "#0d7c5f" : s >= 5 ? "#b8860b" : "#c0392b";

export default function ScoreRing({ score, size = 160 }: { score: number; size?: number }) {
  const [progress, setProgress] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setProgress(score / 10); },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [score]);

  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  const color = SCORE_COLOR(score);

  return (
    <div ref={ref} className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="8"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-mono font-medium leading-none"
          style={{ fontSize: size * 0.3, color, letterSpacing: "-0.02em" }}
        >
          <AnimatedNumber value={score} />
        </span>
        <span className="text-[11px] text-muted uppercase tracking-widest mt-1">
          af 10
        </span>
      </div>
    </div>
  );
}

export { AnimatedNumber };
