import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import SEOHead from "@/components/shared/SEOHead";
import JsonLd from "@/components/shared/JsonLd";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { Calendar, ArrowRight, BookOpen, Clock } from "lucide-react";
import ScrollReveal from "@/components/shared/ScrollReveal";

interface BlogPostSummary {
  slug: string;
  title: string;
  meta_description: string | null;
  module: string | null;
  published_at: string | null;
  content_html: string;
}

function estimateReadTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return Math.max(1, Math.round(text.split(" ").length / 200));
}

const MODULE_LINKS: Record<string, { path: string; label: string }> = {
  dagtilbud: { path: "/", label: "Institutionsguide" },
  skole: { path: "/skole", label: "Skoleguide" },
  normering: { path: "/normering", label: "Normeringstabel" },
  friplads: { path: "/friplads", label: "Fripladsberegner" },
};

export default function BlogIndex() {
  const { language } = useLanguage();
  const isDa = language === "da";
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    async function fetchPosts() {
      if (!supabase) { setFetchError(true); setLoading(false); return; }
      const { data, error } = await supabase
        .from("blog_posts")
        .select("slug, title, meta_description, module, published_at, content_html")
        .eq("locale", language)
        .order("published_at", { ascending: false });

      if (error) {
        setFetchError(true);
      } else if (data) {
        setPosts(data as BlogPostSummary[]);
      }
      setLoading(false);
    }
    fetchPosts();
  }, [language]);

  const formatDate = (iso: string | null) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString(isDa ? "da-DK" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const pageTitle = isDa
    ? "Blog — Viden om børnepasning, skoler og dagtilbud"
    : "Blog — Knowledge about childcare and schools";
  const pageDesc = isDa
    ? "Artikler om vuggestuer, børnehaver, dagpleje, skoler, normering og fripladstilskud i Danmark."
    : "Articles about nurseries, kindergartens, childminders, schools, staff ratios and childcare subsidies in Denmark.";

  return (
    <>
      <SEOHead title={pageTitle} description={pageDesc} path="/blog" />
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: isDa ? "Institutionsguide Blog" : "Institutionsguide Blog",
        url: "https://www.institutionsguiden.dk/blog",
        description: pageDesc,
        publisher: {
          "@type": "Organization",
          name: "Institutionsguide.dk",
          url: "https://www.institutionsguiden.dk",
        },
        inLanguage: language,
      }} />

      <Breadcrumbs items={[
        { label: isDa ? "Forside" : "Home", href: "/" },
        { label: "Blog" },
      ]} />

      {/* Hero */}
      <ScrollReveal><section className="px-4 py-10 sm:py-14 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              {isDa ? "Viden & Guides" : "Knowledge & Guides"}
            </h1>
          </div>
          <p className="text-muted text-sm max-w-xl">
            {isDa
              ? "Artikler om børnepasning, skoler, normering og fripladstilskud — skrevet til forældre der skal vælge det bedste til deres barn."
              : "Articles about childcare, schools, staff ratios and subsidies — written for parents choosing the best for their child."}
          </p>
        </div>
      </section></ScrollReveal>

      {/* Article list */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-6 space-y-3">
                <div className="h-4 w-24 bg-muted/30 animate-pulse rounded" />
                <div className="h-5 w-full bg-muted/30 animate-pulse rounded" />
                <div className="h-3 w-2/3 bg-muted/30 animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : fetchError ? (
          <div className="text-center py-16">
            <BookOpen className="h-10 w-10 text-muted mx-auto mb-4" />
            <p className="text-muted">
              {isDa ? "Kunne ikke indlæse artikler — prøv igen senere." : "Could not load articles — please try again later."}
            </p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-10 w-10 text-muted/30 mx-auto mb-4" />
            <p className="text-muted">
              {isDa ? "Ingen artikler endnu." : "No articles yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-border/50">
            {posts.map((post) => {
              const moduleLink = post.module ? MODULE_LINKS[post.module.toLowerCase()] : null;

              return (
                <article key={post.slug} className="py-6 first:pt-0 last:pb-0 group">
                  <Link to={`/blog/${post.slug}`} className="block">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                          {post.title}
                        </h2>
                        {post.meta_description && (
                          <p className="mt-1.5 text-sm text-muted line-clamp-2">
                            {post.meta_description}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-3 flex-wrap">
                          {post.published_at && (
                            <span className="flex items-center gap-1.5 text-xs text-muted">
                              <Calendar className="h-3 w-3" />
                              {formatDate(post.published_at)}
                            </span>
                          )}
                          <span className="flex items-center gap-1.5 text-xs text-muted">
                            <Clock className="h-3 w-3" />
                            {estimateReadTime(post.content_html)} min
                          </span>
                          {post.module && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                              {post.module}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted group-hover:text-primary transition-colors shrink-0 mt-1.5" />
                    </div>
                  </Link>

                  {moduleLink && (
                    <Link
                      to={moduleLink.path}
                      className="inline-flex items-center gap-1 mt-2 text-xs text-primary font-medium hover:underline"
                    >
                      → {isDa ? `Prøv ${moduleLink.label}` : `Try ${moduleLink.label}`}
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
