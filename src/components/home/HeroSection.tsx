import { useRef, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, Loader2 } from "lucide-react";
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
        <div className="absolute inset-0 bg-primary/85" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-16 pb-20 sm:pt-20 sm:pb-24 lg:pt-24 lg:pb-28 text-center">
        <h1 className="font-display text-[2rem] sm:text-5xl lg:text-[3.5rem] font-semibold text-white leading-[1.08] mb-5 tracking-tight">
          {heroTitle}
        </h1>
        <p className="text-white/70 text-base sm:text-lg max-w-xl mx-auto mb-9 leading-relaxed">
          {heroSubtitle}
        </p>

        {/* Search bar */}
        <div className="max-w-xl mx-auto" role="search">
          <div className="relative">
            <label htmlFor="hero-search" className="sr-only">{language === "da" ? "Søg institution" : "Search institution"}</label>
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/50 pointer-events-none" />
            <input
              id="hero-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === "da" ? "Søg postnummer, by eller institution..." : "Search postal code, city or institution..."}
              className="w-full py-4 pl-14 pr-5 text-base rounded-full bg-white text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent shadow-[0_12px_40px_rgba(0,0,0,0.25)]"
              autoComplete="off"
            />
          </div>

          {/* Subtle secondary actions */}
          <div className="flex items-center justify-center gap-6 mt-5 text-sm">
            <button
              onClick={onNearMe}
              disabled={nearMeLoading}
              className="inline-flex items-center gap-1.5 text-white/70 hover:text-white transition-colors disabled:opacity-60 underline-offset-4 hover:underline"
            >
              {nearMeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
              {language === "da" ? "Find tæt på mig" : "Find near me"}
            </button>
            <Link
              to="/find"
              className="inline-flex items-center gap-1.5 text-white/70 hover:text-white transition-colors underline-offset-4 hover:underline"
            >
              {language === "da" ? "Find den rette for jer" : "Find your perfect match"}
            </Link>
          </div>
        </div>
      </div>

      {/* Trust bar — subtle strip at bottom of hero */}
      <div className="relative z-10 border-t border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-white/60 text-[13px]">
          <div className="flex items-baseline gap-2">
            <span className="text-white font-display text-lg font-semibold tabular-nums">
              <AnimatedNumber value={institutionCount} format={formatCount} duration={1200} />
            </span>
            <span>{language === "da" ? "institutioner" : "institutions"}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-white font-display text-lg font-semibold tabular-nums">{municipalityCount}</span>
            <span>{language === "da" ? "kommuner" : "municipalities"}</span>
          </div>
          <div className="hidden sm:flex items-baseline gap-2">
            <span className="text-white font-display text-lg font-semibold tabular-nums">
              {formatDataDate(dataVersions.overall.lastUpdated, language === "da" ? "da" : "en")}
            </span>
            <span>{language === "da" ? "senest opdateret" : "last updated"}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
