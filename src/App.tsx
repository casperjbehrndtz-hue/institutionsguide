import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { DataProvider } from "@/contexts/DataContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CompareProvider } from "@/contexts/CompareContext";
import { FamilyProvider } from "@/contexts/FamilyContext";
import Layout from "@/components/shared/Layout";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { ScrollToTop } from "@/components/shared/ScrollToTop";

// Auto-reload on stale chunk failures (e.g. after deploy)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyRetry(fn: () => Promise<any>) {
  return lazy(() =>
    fn().catch(() => {
      window.location.reload();
      return new Promise(() => {}); // never resolves — page is reloading
    })
  );
}

const HomePage = lazyRetry(() => import("@/pages/HomePage"));
const CategoryPage = lazyRetry(() => import("@/pages/CategoryPage"));
const KommunePage = lazyRetry(() => import("@/pages/KommunePage"));
const ComparePage = lazyRetry(() => import("@/pages/ComparePage"));
const InstitutionPage = lazyRetry(() => import("@/pages/InstitutionPage"));
const PrivacyPage = lazyRetry(() => import("@/pages/PrivacyPage"));
const TermsPage = lazyRetry(() => import("@/pages/TermsPage"));
const FavoritesPage = lazyRetry(() => import("@/pages/FavoritesPage"));
const NotFoundPage = lazyRetry(() => import("@/pages/NotFoundPage"));
const CategoryMunicipalityPage = lazyRetry(() => import("@/pages/CategoryMunicipalityPage"));
const CheapestPage = lazyRetry(() => import("@/pages/CheapestPage"));
const BestSchoolPage = lazyRetry(() => import("@/pages/BestSchoolPage"));
const VsPage = lazyRetry(() => import("@/pages/VsPage"));
const NormeringPage = lazyRetry(() => import("@/pages/NormeringPage"));
const NormeringKommunePage = lazyRetry(() => import("@/pages/NormeringKommunePage"));
const FripladsPage = lazyRetry(() => import("@/pages/FripladsPage"));
const MetodePage = lazyRetry(() => import("@/pages/MetodePage"));
const BestValuePage = lazyRetry(() => import("@/pages/BestValuePage"));
const BlogIndex = lazyRetry(() => import("@/pages/BlogIndex"));
const BlogPost = lazyRetry(() => import("@/pages/BlogPost"));
const PrissammenligningPage = lazyRetry(() => import("@/pages/PrissammenligningPage"));
const AboutPage = lazyRetry(() => import("@/pages/AboutPage"));
const BestDagtilbudPage = lazyRetry(() => import("@/pages/BestDagtilbudPage"));
const TotalCostPage = lazyRetry(() => import("@/pages/TotalCostPage"));
const GuidePage = lazyRetry(() => import("@/pages/GuidePage"));

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
              <Route path="/fritidsklub" element={<CategoryPage key="fritidsklub" category="fritidsklub" />} />
              <Route path="/kommune/:name" element={<KommunePage />} />
              <Route path="/institution/:id" element={<InstitutionPage />} />
              <Route path="/sammenlign" element={<ComparePage />} />
              <Route path="/privatliv" element={<PrivacyPage />} />
              <Route path="/vilkaar" element={<TermsPage />} />
              <Route path="/om" element={<AboutPage />} />
              <Route path="/favoritter" element={<FavoritesPage />} />
              {/* Normering pages */}
              <Route path="/normering" element={<NormeringPage />} />
              <Route path="/normering/:kommune" element={<NormeringKommunePage />} />
              {/* Friplads calculator */}
              <Route path="/friplads" element={<FripladsPage />} />
              {/* Prissammenligning */}
              <Route path="/prissammenligning" element={<PrissammenligningPage />} />
              {/* Samlet pris (Total cost of childhood) */}
              <Route path="/samlet-pris" element={<TotalCostPage />} />
              {/* Guide wizard */}
              <Route path="/guide" element={<GuidePage />} />
              {/* Metode */}
              <Route path="/metode" element={<MetodePage />} />
              {/* Blog */}
              <Route path="/blog" element={<BlogIndex />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              {/* Programmatic SEO pages — specific routes BEFORE /:category/:municipality catch-all */}
              <Route path="/bedste-vaerdi" element={<BestValuePage />} />
              <Route path="/bedste-skole/:municipality" element={<BestSchoolPage />} />
              <Route path="/bedste-vuggestue/:municipality" element={<BestDagtilbudPage key="vuggestue" category="vuggestue" />} />
              <Route path="/bedste-boernehave/:municipality" element={<BestDagtilbudPage key="boernehave" category="boernehave" />} />
              <Route path="/bedste-dagpleje/:municipality" element={<BestDagtilbudPage key="dagpleje" category="dagpleje" />} />
              <Route path="/bedste-sfo/:municipality" element={<BestDagtilbudPage key="sfo" category="sfo" />} />
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
