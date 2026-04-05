import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import SEOHead from "@/components/shared/SEOHead";
import { CATEGORY_SLUGS, CATEGORY_LABELS_DA, type CategorySlug } from "@/lib/slugs";

const POPULAR_CATEGORIES: { slug: CategorySlug; icon: string }[] = [
  { slug: "vuggestue", icon: "👶" },
  { slug: "boernehave", icon: "🧒" },
  { slug: "dagpleje", icon: "🏠" },
  { slug: "skole", icon: "🏫" },
  { slug: "sfo", icon: "⚽" },
];

export default function NotFoundPage() {
  const { language } = useLanguage();
  const isDa = language === "da";
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      navigate(`/?q=${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <>
      <SEOHead
        title={isDa ? "Siden blev ikke fundet" : "Page not found"}
        description={isDa ? "Siden du leder efter findes ikke." : "The page you are looking for does not exist."}
        path="/404"
        noIndex
      />

      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center">
          <p className="text-6xl font-bold text-primary mb-4">404</p>
          <h1 className="font-display text-2xl font-bold text-foreground mb-3">
            {isDa ? "Siden blev ikke fundet" : "Page not found"}
          </h1>
          <p className="text-muted mb-8">
            {isDa
              ? "Siden du leder efter findes ikke eller er blevet flyttet."
              : "The page you are looking for does not exist or has been moved."}
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="relative max-w-sm mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isDa ? "Søg efter institution..." : "Search for an institution..."}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-white dark:bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
              />
            </div>
          </form>

          {/* Popular categories */}
          <p className="text-sm text-muted mb-3">
            {isDa ? "Eller udforsk en kategori:" : "Or explore a category:"}
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {POPULAR_CATEGORIES.filter((c) => CATEGORY_SLUGS.includes(c.slug)).map((c) => (
              <Link
                key={c.slug}
                to={`/${c.slug}`}
                className="card px-4 py-2 text-sm text-primary hover:bg-primary/5 transition-colors min-h-[44px] flex items-center gap-2"
              >
                <span>{c.icon}</span>
                {CATEGORY_LABELS_DA[c.slug]}
              </Link>
            ))}
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary-light transition-colors min-h-[44px]"
          >
            {isDa ? "Gå til forsiden" : "Go to homepage"}
          </Link>
        </div>
      </div>
    </>
  );
}
