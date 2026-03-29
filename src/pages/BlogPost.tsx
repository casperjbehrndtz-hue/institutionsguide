import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import SEOHead from "@/components/shared/SEOHead";
import JsonLd from "@/components/shared/JsonLd";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { Calendar, ArrowLeft, Clock, ArrowRight } from "lucide-react";
import DOMPurify from "dompurify";

interface BlogPostData {
  slug: string;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  content_html: string;
  module: string | null;
  keyword: string | null;
  published_at: string | null;
  updated_at: string;
}

interface RelatedPost {
  slug: string;
  title: string;
  meta_description: string | null;
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

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { language } = useLanguage();
  const isDa = language === "da";
  const [post, setPost] = useState<BlogPostData | null>(null);
  const [related, setRelated] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchPost() {
      if (!slug || !supabase) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("blog_posts")
        .select("slug, title, meta_title, meta_description, content_html, module, keyword, published_at, updated_at")
        .eq("slug", slug)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
        setPost(data as BlogPostData);

        // Fetch related articles
        if (data.module) {
          const { data: relatedData } = await supabase
            .from("blog_posts")
            .select("slug, title, meta_description")
            .eq("module", data.module)
            .eq("locale", language)
            .neq("slug", slug)
            .order("published_at", { ascending: false })
            .limit(3);
          if (relatedData) setRelated(relatedData as RelatedPost[]);
        }
      }
      setLoading(false);
    }
    fetchPost();
  }, [slug, language]);

  const formatDate = (iso: string | null) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString(isDa ? "da-DK" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 text-center max-w-md">
          <h1 className="font-display text-2xl font-bold mb-4">
            {isDa ? "Artikel ikke fundet" : "Article not found"}
          </h1>
          <p className="text-muted mb-6">
            {isDa ? "Denne artikel findes ikke eller er fjernet." : "This article does not exist or has been removed."}
          </p>
          <Link to="/blog" className="text-primary hover:underline font-medium">
            {isDa ? "Gå til blog" : "Go to blog"}
          </Link>
        </div>
      </div>
    );
  }

  const moduleLink = post.module ? MODULE_LINKS[post.module.toLowerCase()] : null;
  const readTime = estimateReadTime(post.content_html);
  const cleanHtml = DOMPurify.sanitize(post.content_html, {
    ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'br', 'span', 'blockquote', 'img', 'figure', 'figcaption', 'div', 'sup', 'sub'],
    ALLOWED_ATTR: ['class', 'href', 'target', 'rel', 'src', 'alt', 'width', 'height', 'id']
  });

  return (
    <>
      <SEOHead
        title={post.meta_title || post.title}
        description={post.meta_description || ""}
        path={`/blog/${post.slug}`}
      />
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: post.title,
        description: post.meta_description || "",
        url: `https://institutionsguide.dk/blog/${post.slug}`,
        datePublished: post.published_at || post.updated_at,
        dateModified: post.updated_at,
        publisher: {
          "@type": "Organization",
          name: "Institutionsguide.dk",
          url: "https://institutionsguide.dk",
        },
        inLanguage: language,
      }} />

      <Breadcrumbs items={[
        { label: isDa ? "Forside" : "Home", href: "/" },
        { label: "Blog", href: "/blog" },
        { label: post.title },
      ]} />

      <article className="max-w-3xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-primary hover:underline text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {isDa ? "Alle artikler" : "All articles"}
        </Link>

        {/* Header */}
        <header className="mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground leading-tight mb-3">
            {post.title}
          </h1>
          <div className="flex items-center gap-3 flex-wrap text-sm text-muted">
            {post.published_at && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(post.published_at)}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {readTime} min {isDa ? "læsetid" : "read"}
            </span>
            {post.module && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {post.module}
              </span>
            )}
          </div>
        </header>

        {/* Content */}
        <div
          className="prose prose-sm sm:prose-base max-w-none
            prose-headings:font-display prose-headings:text-foreground
            prose-p:text-foreground prose-p:leading-relaxed
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-table:text-sm prose-th:bg-primary/5
            prose-strong:text-foreground
            [&_.answer-box]:bg-primary/5 [&_.answer-box]:rounded-xl [&_.answer-box]:p-4 [&_.answer-box]:mb-6 [&_.answer-box]:border [&_.answer-box]:border-primary/20
            [&_.faq-item]:mb-4 [&_.faq-item_h3]:text-base [&_.faq-item_h3]:font-semibold
            [&_.references]:text-xs [&_.references]:text-muted [&_.references]:mt-8 [&_.references]:border-t [&_.references]:border-border [&_.references]:pt-4"
          dangerouslySetInnerHTML={{ __html: cleanHtml }}
        />

        {/* Module CTA */}
        {moduleLink && (
          <div className="mt-8 card p-5 bg-primary/5 border-primary/20">
            <p className="font-semibold text-foreground mb-2">
              {isDa ? `Prøv vores ${moduleLink.label}` : `Try our ${moduleLink.label}`}
            </p>
            <Link
              to={moduleLink.path}
              className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline"
            >
              {isDa ? "Gå til værktøj" : "Go to tool"} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Related articles */}
        {related.length > 0 && (
          <section className="mt-10 border-t border-border pt-8">
            <h2 className="font-display text-lg font-bold text-foreground mb-4">
              {isDa ? "Relaterede artikler" : "Related articles"}
            </h2>
            <div className="space-y-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  to={`/blog/${r.slug}`}
                  className="block card p-4 hover:border-primary/30 transition-colors group"
                >
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
                    {r.title}
                  </h3>
                  {r.meta_description && (
                    <p className="text-xs text-muted mt-1 line-clamp-1">{r.meta_description}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Suite cross-links */}
        <section className="mt-8 text-xs text-muted border-t border-border pt-4">
          <p>
            {isDa ? "Del af familien:" : "Part of the family:"}{" "}
            <a href="https://parfinans.dk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ParFinans</a> ·{" "}
            <a href="https://nemtbudget.nu" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">NemtBudget</a> ·{" "}
            <a href="https://børneskat.dk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Børneskat</a>
          </p>
        </section>
      </article>
    </>
  );
}
