import "server-only";

// Minimal AI client via fetch — no SDK dependency. Used by the customer chat
// assistant. OpenAI/ChatGPT is preferred when OPENAI_API_KEY is configured;
// Anthropic remains as a fallback for older deployments. Returns null when no
// API key is configured or on any error, so callers can gracefully fall back to
// a human admin.
const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-5.4-mini";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-haiku-4-5-20251001";

export function aiConfigured(): boolean {
  return !!(process.env.OPENAI_API_KEY?.trim() || process.env.ANTHROPIC_API_KEY?.trim());
}

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

function readOpenAiText(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const direct = (data as { output_text?: unknown }).output_text;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const output = (data as { output?: unknown }).output;
  if (!Array.isArray(output)) return null;
  const parts: string[] = [];
  for (const item of output) {
    const content = (item as { content?: unknown })?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      const b = block as { type?: unknown; text?: unknown };
      if ((b.type === "output_text" || b.type === "text") && typeof b.text === "string") {
        parts.push(b.text);
      }
    }
  }
  const text = parts.join("").trim();
  return text || null;
}

async function openAiComplete(
  system: string,
  messages: AiMessage[],
  opts: { maxTokens?: number; temperature?: number },
): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: system,
        input: messages.map((m) => ({ role: m.role, content: m.content })),
        max_output_tokens: opts.maxTokens ?? 600,
        temperature: opts.temperature ?? 0.3,
        store: false,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.error("openAiComplete HTTP", res.status, await res.text().catch(() => ""));
      return null;
    }
    return readOpenAiText(await res.json());
  } catch (e) {
    clearTimeout(timer);
    console.error("openAiComplete failed:", e);
    return null;
  }
}

async function anthropicComplete(
  system: string,
  messages: AiMessage[],
  opts: { maxTokens?: number; temperature?: number },
): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: opts.maxTokens ?? 600,
        temperature: opts.temperature ?? 0.3,
        system,
        messages,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.error("anthropicComplete HTTP", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim();
    return text || null;
  } catch (e) {
    clearTimeout(timer);
    console.error("anthropicComplete failed:", e);
    return null;
  }
}

/** One AI completion. Returns the text reply, or null if unavailable. */
export async function aiComplete(
  system: string,
  messages: AiMessage[],
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<string | null> {
  return (await openAiComplete(system, messages, opts)) ?? (await anthropicComplete(system, messages, opts));
}
