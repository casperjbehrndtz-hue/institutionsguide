import { useRef, useCallback, useEffect, useState } from "react";
import { Search, MapPin } from "lucide-react";
import { dataVersions, formatDataDate } from "@/lib/dataVersions";
import AnimatedNumber from "@/components/shared/AnimatedNumber";
import Button from "@/components/ui/Button";

interface HeroSectionProps {
  heroVideo: { src: string; focus: string };
  searchInput: string;
  setSearch: (v: string) => void;
  onNearMe: () => void;
  nearMeLoading: boolean;
  language: string;
  heroTitle: string;
  heroSubtitle: string;
  institutionCount: number;
  municipalityCount: number;
}

export default function HeroSection({
  heroVideo, searchInput, setSearch, onNearMe, nearMeLoading,
  language, heroTitle, heroSubtitle, institutionCount, municipalityCount,
}: HeroSectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const formatCount = useCallback((n: number) => Math.round(n).toLocaleString("da-DK"), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const isSmallViewport = window.matchMedia("(max-width: 640px)").matches;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const saveData = conn?.saveData === true;
    const slowNetwork = conn?.effectiveType === "2g" || conn?.effectiveType === "slow-2g";
    if (isSmallViewport || saveData || slowNetwork) return;

    const idle = (cb: () => void) =>
      "requestIdleCallback" in window
        ? (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(cb)
        : setTimeout(cb, 400);
    idle(() => setShouldLoadVideo(true));
  }, []);

  return (
    <section className="relative overflow-hidden bg-primary">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/og-image.png')",
            filter: "brightness(0.45) saturate(0.45) contrast(0.95)",
          }}
        />
        {shouldLoadVideo && (
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            poster="/og-image.png"
            className="absolute left-0 w-full min-h-full object-cover pointer-events-none"
            style={{
              top: heroVideo.focus,
              transform: `translateY(-${heroVideo.focus})`,
              filter: "brightness(0.45) saturate(0.45) contrast(0.95)",
            }}
          >
            <source src={heroVideo.src} type="video/mp4" />
          </video>
        )}
        {/* Flat navy tint — primary readability layer. Stronger at 75% so video is pure texture, never content */}
        <div aria-hidden="true" className="absolute inset-0 bg-primary/75" />
        {/* Subtle vignette — focuses attention on center content without introducing mood/drama */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 0%, transparent 45%, rgba(13,28,47,0.35) 100%)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-16 pb-20 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-28 text-center">
        <h1 className="font-display text-[2.25rem] sm:text-[3.25rem] lg:text-[3.75rem] font-bold text-white leading-[1.06] mb-4 tracking-tight">
          {heroTitle}
        </h1>
        <p className="text-white/70 text-base sm:text-lg max-w-xl mx-auto mb-7 leading-relaxed">
          {heroSubtitle}
        </p>

        {/* Search bar — dominant focal point, no other element may compete */}
        <div className="max-w-xl mx-auto" role="search">
          <div className="relative">
            <label htmlFor="hero-search" className="sr-only">{language === "da" ? "Søg institution" : "Search institution"}</label>
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/70 pointer-events-none" />
            <input
              id="hero-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === "da" ? "Søg postnummer, by eller institution..." : "Search postal code, city or institution..."}
              className="w-full py-[1.375rem] pl-[3.5rem] pr-6 text-[17px] rounded-full bg-white text-foreground placeholder:text-muted/75 border border-black/5 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-primary shadow-[0_1px_2px_rgba(0,0,0,0.06),0_6px_16px_-6px_rgba(0,0,0,0.18)]"
              autoComplete="off"
            />
          </div>

          {/* Single secondary action — proper button that pairs naturally with search (geolocate as alt to typing) */}
          <div className="flex justify-center mt-5">
            <Button
              variant="secondary"
              tone="light"
              size="md"
              onClick={onNearMe}
              loading={nearMeLoading}
              leadingIcon={<MapPin className="w-4 h-4" />}
            >
              {language === "da" ? "Find tæt på mig" : "Find near me"}
            </Button>
          </div>
        </div>
      </div>

      {/* Trust bar — numbers dominant, labels supporting. Clear horizontal grid, never competes with search */}
      <div className="relative z-10 border-t border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-7 flex flex-wrap items-baseline justify-center gap-x-12 gap-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-white font-display text-2xl font-semibold tabular-nums">
              <AnimatedNumber value={institutionCount} format={formatCount} duration={1200} />
            </span>
            <span className="text-white/55 text-[12px]">{language === "da" ? "institutioner" : "institutions"}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-white font-display text-2xl font-semibold tabular-nums">{municipalityCount}</span>
            <span className="text-white/55 text-[12px]">{language === "da" ? "kommuner" : "municipalities"}</span>
          </div>
          <div className="hidden sm:flex items-baseline gap-2">
            <span className="text-white font-display text-2xl font-semibold tabular-nums">
              {formatDataDate(dataVersions.overall.lastUpdated, language === "da" ? "da" : "en")}
            </span>
            <span className="text-white/55 text-[12px]">{language === "da" ? "senest opdateret" : "last updated"}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
