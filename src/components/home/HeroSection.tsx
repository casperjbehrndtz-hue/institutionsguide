import { useRef } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, SlidersHorizontal, Loader2 } from "lucide-react";
import { dataVersions, formatDataDate } from "@/lib/dataVersions";

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
        <div className="absolute inset-0 bg-gradient-to-b from-primary/60 via-primary/50 to-primary/70" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-10 sm:py-14 text-center">
        <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight mb-1.5">
          {heroTitle}
        </h1>
        <p className="text-white/80 text-sm sm:text-base max-w-lg mx-auto mb-5">
          {heroSubtitle}
        </p>

        <div className="max-w-lg mx-auto mb-3">
          <div className="relative">
            <label htmlFor="hero-search" className="sr-only">{language === "da" ? "Søg institution" : "Search institution"}</label>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted/50 pointer-events-none" />
            <input
              id="hero-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === "da" ? "Søg postnummer, by eller institution..." : "Search postal code, city or institution..."}
              className="w-full py-3.5 pl-12 pr-4 text-base rounded-xl bg-[var(--color-bg-card)] text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent shadow-xl transition-shadow"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <button
            onClick={onNearMe}
            disabled={nearMeLoading}
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors disabled:opacity-60"
          >
            {nearMeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
            {language === "da" ? "Find tæt på mig" : "Find near me"}
          </button>
          <span className="text-white/30">|</span>
          <Link
            to="/find"
            className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {language === "da" ? "Find den rette for jer" : "Find your perfect match"}
          </Link>
        </div>

        <p className="text-[12px] sm:text-[13px] text-white/50 mt-5 font-medium tracking-wide">
          {language === "da"
            ? `${institutionCount.toLocaleString("da-DK")} institutioner · ${municipalityCount} kommuner · Opdateret ${formatDataDate(dataVersions.overall.lastUpdated, "da")}`
            : `${institutionCount.toLocaleString("da-DK")} institutions · ${municipalityCount} municipalities · Updated ${formatDataDate(dataVersions.overall.lastUpdated, "en")}`}
        </p>
      </div>
    </section>
  );
}
