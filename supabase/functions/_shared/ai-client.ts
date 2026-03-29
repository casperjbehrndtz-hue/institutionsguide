// Shared AI client config — supports Google Gemini direct
// All edge functions use this instead of calling the API directly

const GEMINI_DIRECT_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

const DEFAULT_TIMEOUT_MS = 30_000;

type Provider = "google";

interface AIConfig {
  url: string;
  headers: Record<string, string>;
  provider: Provider;
}

export function getAIConfig(): AIConfig {
  const googleKey = Deno.env.get("GOOGLE_API_KEY");
  if (googleKey) {
    return {
      url: GEMINI_DIRECT_URL,
      headers: {
        Authorization: `Bearer ${googleKey}`,
        "Content-Type": "application/json",
      },
      provider: "google",
    };
  }

  throw new Error("No AI API key configured (set GOOGLE_API_KEY)");
}

export function resolveModel(model: string): string {
  return model.replace(/^google\//, "");
}

// Fetch with timeout — prevents edge functions from hanging indefinitely
export async function fetchAI(
  url: string,
  init: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("AI request timeout — try again");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Safe JSON extraction from AI response content
export function extractJSON(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw);
  } catch { /* fall through */ }

  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch?.[1]) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch { /* fall through */ }
  }

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI did not return valid JSON");
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("AI returned invalid JSON format");
  }
}
