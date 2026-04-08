import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  /** Duration in ms (default 800) */
  duration?: number;
  /** Format function — receives the current number, returns display string */
  format?: (n: number) => string;
  className?: string;
}

/**
 * Animates a number counting up from 0 when it scrolls into view.
 * Uses requestAnimationFrame for smooth 60fps animation.
 */
export default function AnimatedNumber({
  value,
  duration = 800,
  format = (n) => Math.round(n).toLocaleString("da-DK"),
  className,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(format(0));
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || hasAnimated.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimated.current) return;
        hasAnimated.current = true;
        observer.disconnect();

        const start = performance.now();
        function tick(now: number) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          // Ease-out cubic for natural deceleration
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(format(eased * value));
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration, format]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
