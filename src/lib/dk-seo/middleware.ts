import { next } from "@vercel/edge";
import type { MiddlewareConfig, RouteMeta } from "./types";

// ── Bot User-Agent patterns ──
const BOT_PATTERNS = [
  "Googlebot", "Bingbot", "bingbot", "Slurp", "DuckDuckBot", "Baiduspider",
  "YandexBot", "YandexMobileBot", "facebookexternalhit", "Facebot", "LinkedInBot",
  "Twitterbot", "Slackbot", "WhatsApp", "TelegramBot", "ChatGPT-User", "GPTBot",
  "ClaudeBot", "Claude-Web", "Anthropic", "Applebot", "Pinterestbot", "Discordbot",
  "Embedly", "Quora Link Preview", "Redditbot", "Rogerbot", "Screaming Frog",
  "Semrushbot", "AhrefsBot", "MJ12bot", "PetalBot", "Bytespider", "DataForSeoBot",
];
const BOT_REGEX = new RegExp(BOT_PATTERNS.join("|"), "i");

const ASSET_EXT = /\.(js|css|ico|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|mp4|webm|json|xml|txt|map)$/;
const DEFAULT_SKIP_PREFIXES = ["/_next", "/api", "/functions"];

export const defaultMatcherConfig = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:js|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|mp4|webm|json|xml|txt|map)$).*)",
  ],
};

function esc(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildBreadcrumbLd(siteUrl: string, crumbs: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url.startsWith("http") ? c.url : `${siteUrl}${c.url}`,
    })),
  };
}

function buildBreadcrumbHtml(siteUrl: string, crumbs: { name: string; url: string }[]) {
  return `<nav aria-label="Breadcrumb"><ol>${crumbs
    .map((c, i) => {
      const href = c.url.startsWith("http") ? c.url : `${siteUrl}${c.url}`;
      return i < crumbs.length - 1
        ? `<li><a href="${href}">${esc(c.name)}</a> ›</li>`
        : `<li><strong>${esc(c.name)}</strong></li>`;
    })
    .join("")}</ol></nav>`;
}

export function createArticleFetcher(opts: {
  table: string;
  select: string;
  siteName: string;
  siteUrl?: string;
  urlPrefix: string;
  parentLabel: string;
  slugColumn?: string;
  statusValue?: string;
  fields?: {
    title?: string;
    metaTitle?: string;
    excerpt?: string;
    metaDescription?: string;
    content?: string;
    publishedAt?: string;
    updatedAt?: string;
    keyword?: string;
  };
}) {
  const {
    table, select, siteName, siteUrl: articleSiteUrl, urlPrefix, parentLabel,
    slugColumn = "slug", statusValue = "published", fields = {},
  } = opts;

  const titleField = fields.title || "title";
  const metaTitleField = fields.metaTitle || "meta_title";
  const excerptField = fields.excerpt || "excerpt";
  const metaDescField = fields.metaDescription || "meta_description";
  const contentField = fields.content || "content";
  const publishedField = fields.publishedAt || "published_at";
  const updatedField = fields.updatedAt || "updated_at";
  const keywordField = fields.keyword || "keyword";

  return async function fetchArticle(
    slug: string, supabaseUrl: string, supabaseKey: string,
  ): Promise<RouteMeta | null> {
    if (!supabaseKey) return null;
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/${table}?select=${select}&${slugColumn}=eq.${encodeURIComponent(slug)}&status=eq.${statusValue}&limit=1`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } },
      );
      if (!res.ok) return null;
      const rows = await res.json();
      const row = rows?.[0];
      if (!row?.[titleField]) return null;

      const title = row[metaTitleField] || row[titleField];
      const published = row[publishedField] || undefined;
      const updated = row[updatedField] || undefined;
      const content = row[contentField] || row.content_html || "";
      const wordCount = content.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
      const articleUrl = articleSiteUrl ? `${articleSiteUrl}${urlPrefix}/${slug}` : `${urlPrefix}/${slug}`;

      return {
        title: `${title} — ${siteName}`,
        description: row[metaDescField] || row[excerptField] || `Læs "${row[titleField]}" på ${siteName}.`,
        ogTitle: title,
        ogDescription: row[metaDescField] || row[excerptField] || `Artikel fra ${siteName}.`,
        ogType: "article",
        bodyContent: content,
        breadcrumbs: [
          { name: siteName, url: "/" },
          { name: parentLabel, url: urlPrefix },
          { name: row[titleField], url: `${urlPrefix}/${slug}` },
        ],
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: title,
          description: row[metaDescField] || row[excerptField] || "",
          ...(published ? { datePublished: published } : {}),
          ...(updated ? { dateModified: updated } : {}),
          author: { "@type": "Organization", name: siteName },
          publisher: { "@type": "Organization", name: siteName },
          mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
          wordCount,
          ...(row[keywordField] ? { keywords: row[keywordField] } : {}),
          inLanguage: "da",
          isAccessibleForFree: true,
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: [".answer-box", "h2", ".faq-answer"],
          },
        },
      };
    } catch {
      return null;
    }
  };
}

export function createMiddleware(cfg: MiddlewareConfig) {
  const {
    siteUrl, siteName, defaultOgImage, supabaseUrl,
    supabaseKeyEnv = "VITE_SUPABASE_PUBLISHABLE_KEY",
    lang = "da", ogLocale = "da_DK", twitterSite,
    routes, pageContent, dynamicRoutes = [], redirects = [],
    footerNav, organization, extraJsonLd = {},
    skipPrefixes = [], ecosystemLinks = [], footerTagline,
  } = cfg;

  const allSkipPrefixes = [...DEFAULT_SKIP_PREFIXES, ...skipPrefixes];
  const ogImageUrl = defaultOgImage.startsWith("http") ? defaultOgImage : `${siteUrl}${defaultOgImage}`;

  function buildJsonLd(meta: RouteMeta, pathname: string): string {
    const schemas: Record<string, unknown>[] = [];

    if (meta.jsonLd) {
      const arr = Array.isArray(meta.jsonLd) ? meta.jsonLd : [meta.jsonLd];
      schemas.push(...arr);
    } else {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: siteName,
        url: siteUrl,
        description: meta.description,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        inLanguage: lang,
        isAccessibleForFree: true,
        ...(organization ? { publisher: { "@type": "Organization", name: organization.name, url: organization.url } } : {}),
        ...extraJsonLd,
      });
    }

    if (pathname === "/" && organization) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: organization.name,
        url: organization.url,
        ...(organization.logo ? { logo: organization.logo } : {}),
        ...(organization.description ? { description: organization.description } : {}),
        ...(organization.foundingDate ? { foundingDate: organization.foundingDate } : {}),
        ...(organization.sameAs?.length ? { sameAs: organization.sameAs } : {}),
      });
    }

    if (meta.breadcrumbs?.length) {
      schemas.push(buildBreadcrumbLd(siteUrl, meta.breadcrumbs));
    }

    return schemas.map((s) => `<script type="application/ld+json">\n  ${JSON.stringify(s, null, 2)}\n  </script>`).join("\n  ");
  }

  async function getRouteMeta(pathname: string): Promise<RouteMeta> {
    const path = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
    const supabaseKey = process.env[supabaseKeyEnv] || "";

    for (const dr of dynamicRoutes) {
      if (path.startsWith(dr.prefix)) {
        const slug = path.slice(dr.prefix.length);
        if (slug) {
          const dynamic = await dr.fetch(slug, supabaseUrl, supabaseKey);
          if (dynamic) return dynamic;
        }
        return dr.fallback;
      }
    }

    const meta = routes[path] || routes["/"];
    return { ...meta, bodyContent: pageContent[path] || pageContent["/"] };
  }

  function buildEcosystemHtml(): string {
    if (!ecosystemLinks.length) return "";
    return `\n    <section>\n      <h3>Fra samme platform</h3>\n      <ul>${ecosystemLinks
      .map((l) => `\n        <li><a href="${l.url}"><strong>${esc(l.name)}</strong></a> — ${esc(l.description)}</li>`)
      .join("")}\n      </ul>\n    </section>`;
  }

  async function buildBotHTML(pathname: string): Promise<string> {
    const meta = await getRouteMeta(pathname);
    const canonicalUrl = `${siteUrl}${pathname === "/" ? "" : pathname}`.split("?")[0];
    const ogTitle = meta.ogTitle || meta.title;
    const ogDesc = meta.ogDescription || meta.description;
    const ogImage = meta.ogImage || ogImageUrl;
    const ogType = meta.ogType || "website";
    const body = meta.bodyContent || `<h1>${esc(ogTitle)}</h1><p>${esc(meta.description)}</p>`;

    const twitterSiteMeta = twitterSite
      ? `\n  <meta name="twitter:site" content="${twitterSite}" />`
      : "";

    const breadcrumbHtml = meta.breadcrumbs?.length
      ? `\n    ${buildBreadcrumbHtml(siteUrl, meta.breadcrumbs)}`
      : "";

    const ecosystemHtml = buildEcosystemHtml();
    const jsonLdHtml = buildJsonLd(meta, pathname);
    const tagline = footerTagline ? `<p>${esc(footerTagline)}</p>` : "";

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(meta.title)}</title>
  <meta name="description" content="${esc(meta.description)}" />
  <link rel="canonical" href="${canonicalUrl}" />
  <link rel="alternate" hreflang="${lang}" href="${canonicalUrl}" />
  <link rel="alternate" hreflang="x-default" href="${canonicalUrl}" />
  <meta property="og:type" content="${ogType}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:title" content="${esc(ogTitle)}" />
  <meta property="og:description" content="${esc(ogDesc)}" />
  <meta property="og:image" content="${esc(ogImage)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:locale" content="${ogLocale}" />
  <meta property="og:site_name" content="${siteName}" />
  <meta name="twitter:card" content="summary_large_image" />${twitterSiteMeta}
  <meta name="twitter:title" content="${esc(ogTitle)}" />
  <meta name="twitter:description" content="${esc(ogDesc)}" />
  <meta name="twitter:image" content="${esc(ogImage)}" />
  ${jsonLdHtml}
</head>
<body>
  <main>${breadcrumbHtml}
    ${body}${ecosystemHtml}
  </main>
  <footer>
    <p><a href="${siteUrl}">${siteName}</a></p>
    ${tagline}
    <nav>${footerNav}</nav>
  </footer>
</body>
</html>`;
  }

  return async function middleware(request: Request) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (allSkipPrefixes.some((p) => pathname.startsWith(p)) || ASSET_EXT.test(pathname)) {
      return next();
    }

    for (const r of redirects) {
      if (pathname === r.from) {
        return new Response(null, {
          status: r.status || 301,
          headers: { Location: `${siteUrl}${r.to}` },
        });
      }
    }

    const userAgent = request.headers.get("user-agent") || "";
    const isBot = BOT_REGEX.test(userAgent) || !userAgent || !userAgent.includes("Mozilla");

    if (isBot) {
      const html = await buildBotHTML(pathname);
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
        },
      });
    }

    return next();
  };
}
