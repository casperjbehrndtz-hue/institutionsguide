import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import SEOHead from "@/components/shared/SEOHead";

export default function NotFoundPage() {
  const { language } = useLanguage();
  const isDa = language === "da";

  return (
    <>
      <SEOHead
        title={isDa ? "Siden blev ikke fundet" : "Page not found"}
        description={isDa ? "Siden du leder efter findes ikke." : "The page you are looking for does not exist."}
        path="/404"
        noIndex
      />

      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="card p-10 text-center max-w-md">
          <p className="text-6xl font-bold text-primary mb-4">404</p>
          <h1 className="font-display text-2xl font-bold text-foreground mb-3">
            {isDa ? "Siden blev ikke fundet" : "Page not found"}
          </h1>
          <p className="text-muted mb-8">
            {isDa
              ? "Siden du leder efter findes ikke eller er blevet flyttet."
              : "The page you are looking for does not exist or has been moved."}
          </p>
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
