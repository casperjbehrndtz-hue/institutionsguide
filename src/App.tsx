import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { DataProvider } from "@/contexts/DataContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Layout from "@/components/shared/Layout";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { ScrollToTop } from "@/components/shared/ScrollToTop";

const HomePage = lazy(() => import("@/pages/HomePage"));
const CategoryPage = lazy(() => import("@/pages/CategoryPage"));
const KommunePage = lazy(() => import("@/pages/KommunePage"));
const ComparePage = lazy(() => import("@/pages/ComparePage"));
const InstitutionPage = lazy(() => import("@/pages/InstitutionPage"));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
      <DataProvider>
        <ScrollToTop />
        <Layout>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/vuggestue" element={<CategoryPage category="vuggestue" />} />
              <Route path="/boernehave" element={<CategoryPage category="boernehave" />} />
              <Route path="/dagpleje" element={<CategoryPage category="dagpleje" />} />
              <Route path="/skole" element={<CategoryPage category="skole" />} />
              <Route path="/sfo" element={<CategoryPage category="sfo" />} />
              <Route path="/kommune/:name" element={<KommunePage />} />
              <Route path="/institution/:id" element={<InstitutionPage />} />
              <Route path="/sammenlign" element={<ComparePage />} />
              <Route path="/privatliv" element={<PrivacyPage />} />
              <Route path="/vilkaar" element={<TermsPage />} />
              <Route path="*" element={<HomePage />} />
            </Routes>
          </Suspense>
        </Layout>
      </DataProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
