import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Trash2 } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useFavorites } from "@/hooks/useFavorites";
import SEOHead from "@/components/shared/SEOHead";
import JsonLd from "@/components/shared/JsonLd";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { breadcrumbSchema } from "@/lib/schema";
import { SkeletonHero, SkeletonCardGrid } from "@/components/shared/Skeletons";
import { formatDKK } from "@/lib/format";
import PriceAlertSignup from "@/components/alerts/PriceAlertSignup";
import RecentlyViewed from "@/components/shared/RecentlyViewed";

export default function FavoritesPage() {
  const { institutions, loading } = useData();
  const { t, language } = useLanguage();
  const { favorites, toggleFavorite, clearFavorites } = useFavorites();
  const [showConfirm, setShowConfirm] = useState(false);

  const isDa = language === "da";
  const categoryLabels: Record<string, string> = {
    vuggestue: t.categories.vuggestue,
    boernehave: t.categories.boernehave,
    dagpleje: t.categories.dagpleje,
    skole: t.categories.skole,
    sfo: t.categories.sfo,
    fritidsklub: isDa ? "Fritidsklub" : "Youth club",
    efterskole: isDa ? "Efterskole" : "Boarding school",
  };

  const favoriteInstitutions = useMemo(() => {
    return favorites
      .map((id) => institutions.find((i) => i.id === id))
      .filter(Boolean) as typeof institutions;
  }, [favorites, institutions]);

  if (loading) {
    return (<><SkeletonHero /><SkeletonCardGrid count={3} /></>);
  }

  return (
    <>
      <SEOHead
        title={t.favorites.title}
        description={language === "da" ? "Dine gemte favorit-institutioner." : "Your saved favorite institutions."}
        path="/favoritter"
        noIndex
      />
      <JsonLd data={breadcrumbSchema([
        { name: language === "da" ? "Forside" : "Home", url: "https://institutionsguiden.dk/" },
        { name: t.favorites.title, url: "https://institutionsguiden.dk/favoritter" },
      ])} />

      <Breadcrumbs items={[
        { label: language === "da" ? "Forside" : "Home", href: "/" },
        { label: t.favorites.title },
      ]} />

      <section className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground flex items-center gap-3">
            <Heart className="w-8 h-8 text-red-500 fill-red-500" />
            {t.favorites.title}
          </h1>
          {favoriteInstitutions.length > 0 && (
            <button
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors min-h-[44px]"
            >
              <Trash2 className="w-4 h-4" />
              {t.favorites.clearAll}
            </button>
          )}
        </div>

        {favoriteInstitutions.length === 0 ? (
          <div className="card p-12 text-center">
            <Heart className="w-12 h-12 text-muted mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold text-foreground mb-2">
              {t.favorites.emptyTitle}
            </h2>
            <p className="text-muted mb-6">{t.favorites.emptyMessage}</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary-light transition-colors min-h-[44px]"
            >
              {t.favorites.backToHome}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {favoriteInstitutions.map((inst) => (
              <div key={inst.id} className="card transition-transform">
                <div className="flex items-start p-4 gap-3">
                  <button
                    onClick={() => toggleFavorite(inst.id)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
                    aria-label={t.favorites.removeFavorite}
                  >
                    <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                  </button>
                  <Link to={`/institution/${inst.id}`} className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{inst.name}</p>
                        <p className="text-xs text-muted">{inst.address}, {inst.postalCode} {inst.city}</p>
                        <p className="text-xs text-muted">{inst.municipality}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {categoryLabels[inst.category] || inst.category}
                        </span>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="font-mono text-sm font-medium text-primary">
                          {formatDKK(inst.monthlyRate)}
                        </p>
                        <span className="text-xs text-muted">{t.common.perMonth}</span>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            ))}
            <p className="text-center text-sm text-muted pt-4">
              {favoriteInstitutions.length} / 20 {language === "da" ? "favoritter" : "favorites"}
            </p>
          </div>
        )}
      </section>

      {/* Price alert signup */}
      {favoriteInstitutions.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 pb-8">
          <PriceAlertSignup />
        </section>
      )}

      {/* Recently viewed */}
      <RecentlyViewed />

      {/* Confirm clear dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" role="dialog" aria-modal="true" onClick={() => setShowConfirm(false)}>
          <div className="bg-bg-card rounded-xl shadow-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <p className="text-foreground font-medium mb-2">
              {language === "da" ? "Ryd alle favoritter?" : "Clear all favorites?"}
            </p>
            <p className="text-sm text-muted mb-5">
              {language === "da"
                ? `${favoriteInstitutions.length} favoritter vil blive fjernet.`
                : `${favoriteInstitutions.length} favorites will be removed.`}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-border/30 transition-colors min-h-[44px]"
              >
                {language === "da" ? "Annuller" : "Cancel"}
              </button>
              <button
                onClick={() => { clearFavorites(); setShowConfirm(false); }}
                className="px-4 py-2 text-sm rounded-lg bg-destructive text-white hover:bg-destructive/90 transition-colors min-h-[44px]"
              >
                {language === "da" ? "Ryd alle" : "Clear all"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
