// Shared CORS configuration for all edge functions

const ALLOWED_ORIGINS = [
  "https://www.institutionsguiden.dk",
  "https://institutionsguiden.dk",
  "https://institutionsguide.vercel.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const isAllowed = ALLOWED_ORIGINS.includes(origin);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "https://www.institutionsguiden.dk",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-admin-key, x-api-key",
    "Access-Control-Max-Age": "86400",
  };
}

export function handleCorsPreflightOrGetHeaders(req: Request): { corsHeaders: Record<string, string>; preflightResponse?: Response } {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return { corsHeaders, preflightResponse: new Response(null, { headers: corsHeaders }) };
  }
  return { corsHeaders };
}
