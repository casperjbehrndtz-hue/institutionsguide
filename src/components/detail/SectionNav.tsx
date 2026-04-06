import { useEffect, useRef, useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export interface SectionDef {
  id: string;
  labelDA: string;
  labelEN: string;
}

interface SectionNavProps {
  /** Only sections whose id exists in the DOM will be shown */
  sections: SectionDef[];
}

/**
 * Sticky horizontal section nav that appears below the main navbar.
 * Uses IntersectionObserver to highlight the active section.
 * On mobile it scrolls horizontally, keeping the active tab visible.
 */
export default function SectionNav({ sections }: SectionNavProps) {
  const { language } = useLanguage();
  const [activeId, setActiveId] = useState<string>("");
  const [visible, setVisible] = useState(false);
  const [visibleSections, setVisibleSections] = useState<SectionDef[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Filter to only sections present in DOM
  useEffect(() => {
    // Use requestAnimationFrame to batch DOM reads with state updates
    const raf = requestAnimationFrame(() => {
      const present = sections.filter((s) => document.getElementById(s.id));
      setVisibleSections(present);
      if (present.length > 0 && !activeId) {
        setActiveId(present[0].id);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [sections, activeId]);

  // Show/hide the bar based on a sentinel element at the top of the details area
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-56px 0px 0px 0px" }, // 56px = navbar height (h-14)
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, []);

  // Track active section with IntersectionObserver
  useEffect(() => {
    if (visibleSections.length === 0) return;

    const elements = visibleSections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el != null);

    if (elements.length === 0) return;

    // rootMargin: offset for sticky navbar (56px) + section nav (~44px) = ~100px
    const obs = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible section
        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length > 0) {
          // Pick the one closest to the top
          const sorted = visibleEntries.sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          );
          setActiveId(sorted[0].target.id);
        }
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0 },
    );

    elements.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [visibleSections]);

  // Auto-scroll the active tab into view on mobile
  useEffect(() => {
    const btn = tabRefs.current.get(activeId);
    if (btn && scrollRef.current) {
      btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeId]);

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    // Offset for navbar (56px) + section nav (44px) + 8px breathing room
    const offset = 108;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
    setActiveId(id);
  }, []);

  if (visibleSections.length < 2) {
    // Still render sentinel for observer, but no nav
    return <div ref={sentinelRef} aria-hidden="true" />;
  }

  return (
    <>
      {/* Sentinel: placed in flow before the sections to detect scroll-past */}
      <div ref={sentinelRef} aria-hidden="true" />

      {/* Sticky bar */}
      <div
        className={`sticky top-14 z-30 glass-subtle border-b border-border/50 transition-all duration-200 ${
          visible
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        <div
          ref={scrollRef}
          className="max-w-[640px] mx-auto px-4 flex gap-1 overflow-x-auto scrollbar-hide"
          role="tablist"
          aria-label="Section navigation"
        >
          {visibleSections.map((s) => {
            const isActive = activeId === s.id;
            return (
              <button
                key={s.id}
                ref={(el) => {
                  if (el) tabRefs.current.set(s.id, el);
                }}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleClick(s.id)}
                className={`whitespace-nowrap px-3 py-2.5 text-sm font-medium font-display border-b-2 transition-colors shrink-0 ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {language === "da" ? s.labelDA : s.labelEN}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
