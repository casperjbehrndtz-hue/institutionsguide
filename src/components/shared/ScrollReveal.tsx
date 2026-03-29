import { useEffect, useRef, useState, type ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  animation?: "fade-up" | "fade-in";
  /** Apply staggered entrance to direct children (cards/list items) */
  stagger?: boolean;
}

export default function ScrollReveal({ children, className = "", animation = "fade-up", stagger = false }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const animClass = animation === "fade-up" ? "scroll-fade-up" : "scroll-fade-in";
  const staggerClass = stagger ? "stagger-children" : "";

  return (
    <div ref={ref} className={`${animClass} ${staggerClass} ${isVisible ? "visible" : ""} ${className}`}>
      {children}
    </div>
  );
}
