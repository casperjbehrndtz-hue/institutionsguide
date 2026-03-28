import { useEffect, useRef, useState, type ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  animation?: "fade-up" | "fade-in";
}

export default function ScrollReveal({ children, className = "", animation = "fade-up" }: ScrollRevealProps) {
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

  return (
    <div ref={ref} className={`${animClass} ${isVisible ? "visible" : ""} ${className}`}>
      {children}
    </div>
  );
}
