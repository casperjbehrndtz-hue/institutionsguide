// ─── Site Configuration ─────────────────────────────────────────────────────

export interface SiteConfig {
  /** Full site URL without trailing slash, e.g. "https://www.institutionsguiden.dk" */
  siteUrl: string;
  /** Site display name, e.g. "Institutionsguide" */
  siteName: string;
  /** Default OG image path (relative to siteUrl), e.g. "/og-image.png" */
  defaultOgImage: string;
  /** Supabase project URL */
  supabaseUrl: string;
  /** Environment variable name for Supabase anon key, defaults to "VITE_SUPABASE_PUBLISHABLE_KEY" */
  supabaseKeyEnv?: string;
  /** Language code, defaults to "da" */
  lang?: string;
  /** OG locale, defaults to "da_DK" */
  ogLocale?: string;
  /** Twitter handle (optional) */
  twitterSite?: string;
}

// ─── Middleware Configuration ────────────────────────────────────────────────

export interface RouteMeta {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  bodyContent?: string;
  /** Override JSON-LD for this page (replaces default WebApplication) */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Breadcrumb trail for this page */
  breadcrumbs?: { name: string; url: string }[];
}

export interface DynamicRouteHandler {
  /** URL path prefix to match, e.g. "/blog/" */
  prefix: string;
  /** Fetch meta for the matched slug */
  fetch: (slug: string, supabaseUrl: string, supabaseKey: string) => Promise<RouteMeta | null>;
  /** Fallback meta if fetch returns null */
  fallback: RouteMeta;
}

export interface Redirect {
  from: string;
  to: string;
  status?: 301 | 302;
}

/** Organization info for structured data */
export interface OrganizationInfo {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  foundingDate?: string;
  sameAs?: string[];
}

/** Cross-site link for ecosystem linking */
export interface EcosystemLink {
  name: string;
  url: string;
  description: string;
}

export interface MiddlewareConfig extends SiteConfig {
  /** Static route meta definitions */
  routes: Record<string, RouteMeta>;
  /** Rich HTML content for bot rendering, keyed by path */
  pageContent: Record<string, string>;
  /** Dynamic route handlers (blog, articles, etc.) */
  dynamicRoutes?: DynamicRouteHandler[];
  /** Server-side redirects */
  redirects?: Redirect[];
  /** Footer HTML for bot pages */
  footerNav: string;
  /** Organization info for homepage JSON-LD */
  organization?: OrganizationInfo;
  /** Default WebApplication JSON-LD extras */
  extraJsonLd?: Record<string, unknown>;
  /** Additional path prefixes to skip */
  skipPrefixes?: string[];
  /** Links to sister sites in the ecosystem */
  ecosystemLinks?: EcosystemLink[];
  /** Short tagline for footer */
  footerTagline?: string;
}
