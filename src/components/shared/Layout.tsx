import type { ReactNode } from "react";
import SuiteBar from "./SuiteBar";
import Footer from "./Footer";
import CookieConsent from "./CookieConsent";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-bg text-foreground">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-[9999] focus:bg-primary focus:text-white focus:px-4 focus:py-2">
        Spring til indhold
      </a>
      <SuiteBar />
      <main id="main-content" className="flex-1">{children}</main>
      <Footer />
      <CookieConsent />
    </div>
  );
}
