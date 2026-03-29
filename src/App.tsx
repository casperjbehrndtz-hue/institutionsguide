import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { DataProvider } from "@/contexts/DataContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CompareProvider } from "@/contexts/CompareContext";
import { FamilyProvider } from "@/contexts/FamilyContext";
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
const FavoritesPage = lazy(() => import("@/pages/FavoritesPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const CategoryMunicipalityPage = lazy(() => import("@/pages/CategoryMunicipalityPage"));
const CheapestPage = lazy(() => import("@/pages/CheapestPage"));
const BestSchoolPage = lazy(() => import("@/pages/BestSchoolPage"));
const VsPage = lazy(() => import("@/pages/VsPage"));
const NormeringPage = lazy(() => import("@/pages/NormeringPage"));
const NormeringKommunePage = lazy(() => import("@/pages/NormeringKommunePage"));
const FripladsPage = lazy(() => import("@/pages/FripladsPage"));
const MetodePage = lazy(() => import("@/pages/MetodePage"));
const BestValuePage = lazy(() => import("@/pages/BestValuePage"));
const BlogIndex = lazy(() => import("@/pages/BlogIndex"));
const BlogPost = lazy(() => import("@/pages/BlogPost"));
const PrissammenligningPage = lazy(() => import("@/pages/PrissammenligningPage"));

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Indlæser...">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
      <CompareProvider>
      <FamilyProvider>
      <DataProvider>
        <ScrollToTop />
        <Layout>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/vuggestue" element={<CategoryPage key="vuggestue" category="vuggestue" />} />
              <Route path="/boernehave" element={<CategoryPage key="boernehave" category="boernehave" />} />
              <Route path="/dagpleje" element={<CategoryPage key="dagpleje" category="dagpleje" />} />
              <Route path="/skole" element={<CategoryPage key="skole" category="skole" />} />
              <Route path="/sfo" element={<CategoryPage key="sfo" category="sfo" />} />
              <Route path="/kommune/:name" element={<KommunePage />} />
              <Route path="/institution/:id" element={<InstitutionPage />} />
              <Route path="/sammenlign" element={<ComparePage />} />
              <Route path="/privatliv" element={<PrivacyPage />} />
              <Route path="/vilkaar" element={<TermsPage />} />
              <Route path="/favoritter" element={<FavoritesPage />} />
              {/* Normering pages */}
              <Route path="/normering" element={<NormeringPage />} />
              <Route path="/normering/:kommune" element={<NormeringKommunePage />} />
              {/* Friplads calculator */}
              <Route path="/friplads" element={<FripladsPage />} />
              {/* Prissammenligning */}
              <Route path="/prissammenligning" element={<PrissammenligningPage />} />
              {/* Metode */}
              <Route path="/metode" element={<MetodePage />} />
              {/* Blog */}
              <Route path="/blog" element={<BlogIndex />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              {/* Programmatic SEO pages — specific routes BEFORE /:category/:municipality catch-all */}
              <Route path="/bedste-vaerdi" element={<BestValuePage />} />
              <Route path="/bedste-skole/:municipality" element={<BestSchoolPage />} />
              <Route path="/billigste-:category/:municipality" element={<CheapestPage />} />
              <Route path="/sammenlign/:comparison/:municipality" element={<VsPage />} />
              {/* Category+Municipality catch-all — must be LAST of the two-segment routes */}
              <Route path="/:category/:municipality" element={<CategoryMunicipalityPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </Layout>
      </DataProvider>
      </FamilyProvider>
      </CompareProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
