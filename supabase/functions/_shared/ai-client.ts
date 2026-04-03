// Shared AI client config — uses Anthropic Claude API
// All edge functions use this instead of calling the API directly

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_TIMEOUT_MS = 120_000;

interface AIConfig {
  url: string;
  headers: Record<string, string>;
}

export function getAIConfig(): AIConfig {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("No ANTHROPIC_API_KEY configured");

  return {
    url: ANTHROPIC_URL,
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
  };
}

export function resolveModel(): string {
  return "claude-sonnet-4-20250514";
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
