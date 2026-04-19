import { useRef, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, SlidersHorizontal, Loader2 } from "lucide-react";
import { dataVersions, formatDataDate } from "@/lib/dataVersions";
import AnimatedNumber from "@/components/shared/AnimatedNumber";

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
          style={{ backgroundImage: "url('/og-image.png')" }}
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
            style={{ top: heroVideo.focus, transform: `translateY(-${heroVideo.focus})` }}
          >
            <source src={heroVideo.src} type="video/mp4" />
          </video>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/55 to-primary/80" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-14 sm:py-20 text-center">
        <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white leading-[1.15] mb-3 tracking-tight">
          {heroTitle}
        </h1>
        <p className="text-white/75 text-sm sm:text-base max-w-xl mx-auto mb-7 leading-relaxed">
          {heroSubtitle}
        </p>

        {/* Search bar */}
        <div className="max-w-xl mx-auto mb-4" role="search">
          <div className="relative">
            <label htmlFor="hero-search" className="sr-only">{language === "da" ? "Søg institution" : "Search institution"}</label>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/40 pointer-events-none" />
            <input
              id="hero-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === "da" ? "Søg postnummer, by eller institution..." : "Search postal code, city or institution..."}
              className="w-full py-4 pl-12 pr-4 text-base rounded-2xl bg-[var(--color-bg-card)] text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent shadow-2xl transition-shadow"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          <button
            onClick={onNearMe}
            disabled={nearMeLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {nearMeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            {language === "da" ? "Find tæt på mig" : "Find near me"}
          </button>
          <Link
            to="/find"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-white text-sm font-medium transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {language === "da" ? "Find den rette for jer" : "Find your perfect match"}
          </Link>
        </div>

        {/* Trust stats */}
        <div className="flex items-center justify-center gap-8 sm:gap-12 text-white/60 text-xs sm:text-sm flex-wrap">
          <div className="text-center">
            <p className="text-white font-display text-2xl sm:text-3xl font-bold leading-none mb-1 tracking-tight">
              <AnimatedNumber value={institutionCount} format={formatCount} duration={1200} />
            </p>
            <p className="tracking-wide">{language === "da" ? "institutioner" : "institutions"}</p>
          </div>
          <div className="text-center">
            <p className="text-white font-display text-2xl sm:text-3xl font-bold leading-none mb-1 tracking-tight">
              {municipalityCount}
            </p>
            <p className="tracking-wide">{language === "da" ? "kommuner" : "municipalities"}</p>
          </div>
          <div className="text-center hidden sm:block">
            <p className="text-white font-display text-2xl sm:text-3xl font-bold leading-none mb-1 tracking-tight">
              {formatDataDate(dataVersions.overall.lastUpdated, language === "da" ? "da" : "en")}
            </p>
            <p className="tracking-wide">{language === "da" ? "senest opdateret" : "last updated"}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
