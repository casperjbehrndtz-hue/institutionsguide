import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://institutionsguiden.dk";
const BLOG_TABLE = "blog_posts";
const BLOG_URL_PREFIX = "/blog/";
const CORS_ORIGIN = "https://institutionsguiden.dk";
const AUTH_SECRETS = ["SEO_GENERATE_SECRET"];

function corsHeaders(origin?: string) {
  return {
    "Access-Control-Allow-Origin": origin ?? CORS_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function base64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlEncodeJSON(obj: Record<string, unknown>): string {
  return base64url(new TextEncoder().encode(JSON.stringify(obj)));
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN .*-----/g, "")
    .replace(/-----END .*-----/g, "")
    .replace(/\s/g, "");
  const raw = atob(b64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

async function createGoogleAccessToken(
  serviceAccount: { client_email: string; private_key: string },
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const headerB64 = base64urlEncodeJSON(header);
  const payloadB64 = base64urlEncodeJSON(payload as unknown as Record<string, unknown>);
  const signingInput = `${headerB64}.${payloadB64}`;

  const keyData = pemToArrayBuffer(serviceAccount.private_key);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const jwt = `${signingInput}.${base64url(signature)}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error(`Google OAuth token exchange failed: ${tokenRes.status} ${text}`);
  }

  const { access_token } = await tokenRes.json();
  return access_token as string;
}

interface GSCRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

async function fetchGSCData(
  accessToken: string,
  dimensions: string[],
  rowLimit: number,
): Promise<GSCRow[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 28);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate: fmt(startDate),
      endDate: fmt(endDate),
      dimensions,
      rowLimit,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GSC API error: ${res.status} ${text}`);
  }

  const data = await res.json();
  return (data.rows ?? []) as GSCRow[];
}

function extractSlug(pageUrl: string): string | null {
  try {
    const u = new URL(pageUrl);
    const path = u.pathname;
    if (!path.startsWith(BLOG_URL_PREFIX)) return null;
    const slug = path.slice(BLOG_URL_PREFIX.length).replace(/\/$/, "");
    return slug || null;
  } catch {
    return null;
  }
}

async function handleFullSync(supabase: ReturnType<typeof createClient>) {
  const gscJson = Deno.env.get("GSC_SERVICE_ACCOUNT_JSON");
  if (!gscJson) {
    return { ok: true, message: "GSC not configured yet - set GSC_SERVICE_ACCOUNT_JSON" };
  }

  let serviceAccount: { client_email: string; private_key: string };
  try {
    serviceAccount = JSON.parse(atob(gscJson));
  } catch (e) {
    throw new Error(`Failed to parse GSC_SERVICE_ACCOUNT_JSON: ${e}`);
  }

  const accessToken = await createGoogleAccessToken(serviceAccount);

  const [pageRows, queryRows] = await Promise.all([
    fetchGSCData(accessToken, ["page"], 500),
    fetchGSCData(accessToken, ["page", "query"], 1000),
  ]);

  const queryMap = new Map<string, Array<{ query: string; clicks: number; impressions: number; position: number; ctr: number }>>();
  for (const row of queryRows) {
    const page = row.keys[0];
    const query = row.keys[1];
    if (!queryMap.has(page)) queryMap.set(page, []);
    queryMap.get(page)!.push({
      query,
      clicks: row.clicks,
      impressions: row.impressions,
      position: row.position,
      ctr: row.ctr,
    });
  }

  for (const [page, queries] of queryMap) {
    queries.sort((a, b) => b.impressions - a.impressions);
    queryMap.set(page, queries.slice(0, 10));
  }

  const { data: blogPosts } = await supabase
    .from(BLOG_TABLE)
    .select("slug, published_at");

  const blogPostMap = new Map<string, { published_at?: string }>();
  if (blogPosts) {
    for (const post of blogPosts) {
      blogPostMap.set(post.slug, { published_at: post.published_at });
    }
  }

  const now = new Date();
  let upsertCount = 0;
  let refreshCount = 0;

  for (const row of pageRows) {
    const pageUrl = row.keys[0];
    const slug = extractSlug(pageUrl);
    if (!slug) continue;

    const topQueries = queryMap.get(pageUrl) ?? [];

    let needsRefresh = false;
    let refreshReason: string | null = null;

    const pos = row.position;
    const ctr = row.ctr;

    if (pos >= 4 && pos <= 15 && ctr < 0.03) {
      needsRefresh = true;
      refreshReason = "low_ctr_high_position";
    } else if (pos >= 11 && pos <= 20) {
      needsRefresh = true;
      refreshReason = "declining_position";
    } else if (row.impressions === 0) {
      const post = blogPostMap.get(slug);
      if (post) {
        const publishedDate = new Date(post.published_at ?? now.toISOString());
        const daysSincePublished = (now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSincePublished > 30) {
          needsRefresh = true;
          refreshReason = "zero_impressions";
        }
      }
    } else if (pos >= 1 && pos <= 5) {
      const post = blogPostMap.get(slug);
      if (post) {
        const publishedDate = new Date(post.published_at ?? now.toISOString());
        const daysSincePublished = (now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSincePublished > 90) {
          needsRefresh = true;
          refreshReason = "stale_content";
        }
      }
    }

    const record = {
      slug,
      url: pageUrl,
      impressions: row.impressions,
      clicks: row.clicks,
      avg_position: row.position,
      ctr: row.ctr,
      top_queries: topQueries,
      needs_refresh: needsRefresh,
      refresh_reason: refreshReason,
      updated_at: now.toISOString(),
    };

    const { error } = await supabase
      .from("seo_performance")
      .upsert(record, { onConflict: "slug" });

    if (error) {
      console.error(`Failed to upsert seo_performance for ${slug}:`, error.message);
    } else {
      upsertCount++;
      if (needsRefresh) refreshCount++;
    }
  }

  // Discover new keywords
  const existingSlugs = new Set<string>();
  for (const row of pageRows) {
    const slug = extractSlug(row.keys[0]);
    if (slug) existingSlugs.add(slug.toLowerCase());
  }

  const { data: existingKeywords } = await supabase
    .from("seo_discovered_keywords")
    .select("query");

  const existingKeywordSet = new Set<string>();
  if (existingKeywords) {
    for (const kw of existingKeywords) {
      existingKeywordSet.add(kw.query.toLowerCase());
    }
  }

  const queryAgg = new Map<string, { impressions: number; clicks: number; position: number; count: number }>();
  for (const row of queryRows) {
    const query = row.keys[1];
    const existing = queryAgg.get(query);
    if (existing) {
      existing.impressions += row.impressions;
      existing.clicks += row.clicks;
      existing.position += row.position;
      existing.count++;
    } else {
      queryAgg.set(query, { impressions: row.impressions, clicks: row.clicks, position: row.position, count: 1 });
    }
  }

  let discoveredCount = 0;
  for (const [query, agg] of queryAgg) {
    if (agg.impressions <= 50) continue;
    const queryLower = query.toLowerCase();

    let matchesExisting = false;
    for (const slug of existingSlugs) {
      if (queryLower.includes(slug) || slug.includes(queryLower.replace(/\s+/g, "-"))) {
        matchesExisting = true;
        break;
      }
    }
    if (matchesExisting) continue;
    if (existingKeywordSet.has(queryLower)) continue;

    const { error } = await supabase
      .from("seo_discovered_keywords")
      .upsert({
        query,
        impressions: agg.impressions,
        clicks: agg.clicks,
        avg_position: agg.position / agg.count,
        status: "new",
        discovered_at: now.toISOString(),
      }, { onConflict: "query" });

    if (!error) discoveredCount++;
  }

  return {
    ok: true,
    tracked_pages: upsertCount,
    pages_needing_refresh: refreshCount,
    discovered_keywords: discoveredCount,
  };
}

async function handleStatus(supabase: ReturnType<typeof createClient>) {
  const { count: totalPages } = await supabase
    .from("seo_performance")
    .select("*", { count: "exact", head: true });

  const { data: refreshRows } = await supabase
    .from("seo_performance")
    .select("refresh_reason")
    .eq("needs_refresh", true);

  const refreshByReason: Record<string, number> = {};
  if (refreshRows) {
    for (const row of refreshRows) {
      const reason = row.refresh_reason ?? "unknown";
      refreshByReason[reason] = (refreshByReason[reason] ?? 0) + 1;
    }
  }

  const { count: discoveredKeywords } = await supabase
    .from("seo_discovered_keywords")
    .select("*", { count: "exact", head: true })
    .eq("status", "new");

  return {
    ok: true,
    total_tracked_pages: totalPages ?? 0,
    pages_needing_refresh: refreshByReason,
    discovered_keywords: discoveredKeywords ?? 0,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req.headers.get("origin") ?? undefined) });
  }

  const headers = corsHeaders(req.headers.get("origin") ?? undefined);

  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const validTokens = AUTH_SECRETS.map((s) => Deno.env.get(s)).filter(Boolean);

  if (!token || !validTokens.includes(token)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = (body as Record<string, string>).action ?? "full_sync";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let result: Record<string, unknown>;

    switch (action) {
      case "full_sync":
        result = await handleFullSync(supabase);
        break;
      case "status":
        result = await handleStatus(supabase);
        break;
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("seo-analytics error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
});
