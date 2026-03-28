import type { ReactNode } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompare } from "@/contexts/CompareContext";
import SuiteBar from "./SuiteBar";
import Navbar from "./Navbar";
import Footer from "./Footer";
import CookieConsent from "./CookieConsent";

export default function Layout({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const { compareList } = useCompare();
  const hasCompareItems = compareList.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-bg text-foreground">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-[9999] focus:bg-primary focus:text-white focus:px-4 focus:py-2">
        {t.nav.skipToContent}
      </a>
      <header>
        <SuiteBar />
        <Navbar />
      </header>
      <main id="main-content" className={`flex-1 ${hasCompareItems ? "pb-24" : ""}`}>{children}</main>
      <Footer />
      <CookieConsent />
    </div>
  );
}
