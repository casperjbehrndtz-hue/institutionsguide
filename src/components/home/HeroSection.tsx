import { useRef, useCallback } from "react";
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
  const formatCount = useCallback((n: number) => Math.round(n).toLocaleString("da-DK"), []);

  return (
    <section className="relative overflow-hidden bg-primary">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          poster="/og-image.png"
          className="absolute left-0 w-full min-h-full object-cover pointer-events-none"
          style={{ top: heroVideo.focus, transform: `translateY(-${heroVideo.focus})` }}
        >
          <source src={heroVideo.src} type="video/mp4" />
        </video>
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
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5 mb-8">
          <button
            onClick={onNearMe}
            disabled={nearMeLoading}
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors disabled:opacity-60"
          >
            {nearMeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
            {language === "da" ? "Find tæt på mig" : "Find near me"}
          </button>
          <span className="text-white/20">|</span>
          <Link
            to="/find"
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {language === "da" ? "Find den rette for jer" : "Find your perfect match"}
          </Link>
        </div>

        {/* Trust stats */}
        <div className="flex items-center justify-center gap-4 sm:gap-8 text-white/50 text-xs sm:text-sm font-medium flex-wrap">
          <div className="text-center">
            <p className="text-white font-display text-base sm:text-xl font-bold leading-none mb-0.5">
              <AnimatedNumber value={institutionCount} format={formatCount} duration={1200} />
            </p>
            <p>{language === "da" ? "institutioner" : "institutions"}</p>
          </div>
          <div className="w-px h-8 bg-white/20 hidden sm:block" />
          <div className="text-center">
            <p className="text-white font-display text-base sm:text-xl font-bold leading-none mb-0.5">
              {municipalityCount}
            </p>
            <p>{language === "da" ? "kommuner" : "municipalities"}</p>
          </div>
          <div className="w-px h-8 bg-white/20 hidden sm:block" />
          <div className="text-center hidden sm:block">
            <p className="text-white font-display text-base sm:text-xl font-bold leading-none mb-0.5">
              {formatDataDate(dataVersions.overall.lastUpdated, language === "da" ? "da" : "en")}
            </p>
            <p>{language === "da" ? "senest opdateret" : "last updated"}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
