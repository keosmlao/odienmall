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

export interface AiCompletionResult {
  text: string | null;
  provider: "openai" | "anthropic" | "none";
  model: string | null;
  ok: boolean;
  error: string | null;
  latencyMs: number;
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
): Promise<AiCompletionResult | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;

  const started = Date.now();
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
      const body = await res.text().catch(() => "");
      const error = `OpenAI HTTP ${res.status}${body ? `: ${body.slice(0, 500)}` : ""}`;
      console.error("openAiComplete HTTP", res.status, body);
      return { text: null, provider: "openai", model: OPENAI_MODEL, ok: false, error, latencyMs: Date.now() - started };
    }
    const text = readOpenAiText(await res.json());
    return {
      text,
      provider: "openai",
      model: OPENAI_MODEL,
      ok: !!text,
      error: text ? null : "OpenAI returned no output_text",
      latencyMs: Date.now() - started,
    };
  } catch (e) {
    clearTimeout(timer);
    console.error("openAiComplete failed:", e);
    return {
      text: null,
      provider: "openai",
      model: OPENAI_MODEL,
      ok: false,
      error: e instanceof Error ? e.message : "OpenAI request failed",
      latencyMs: Date.now() - started,
    };
  }
}

async function anthropicComplete(
  system: string,
  messages: AiMessage[],
  opts: { maxTokens?: number; temperature?: number },
): Promise<AiCompletionResult | null> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return null;
  const started = Date.now();
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
      const body = await res.text().catch(() => "");
      const error = `Anthropic HTTP ${res.status}${body ? `: ${body.slice(0, 500)}` : ""}`;
      console.error("anthropicComplete HTTP", res.status, body);
      return { text: null, provider: "anthropic", model: ANTHROPIC_MODEL, ok: false, error, latencyMs: Date.now() - started };
    }
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim();
    return {
      text: text || null,
      provider: "anthropic",
      model: ANTHROPIC_MODEL,
      ok: !!text,
      error: text ? null : "Anthropic returned no text",
      latencyMs: Date.now() - started,
    };
  } catch (e) {
    clearTimeout(timer);
    console.error("anthropicComplete failed:", e);
    return {
      text: null,
      provider: "anthropic",
      model: ANTHROPIC_MODEL,
      ok: false,
      error: e instanceof Error ? e.message : "Anthropic request failed",
      latencyMs: Date.now() - started,
    };
  }
}

export async function aiCompleteDetailed(
  system: string,
  messages: AiMessage[],
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<AiCompletionResult> {
  const openAi = await openAiComplete(system, messages, opts);
  if (openAi?.text) return openAi;
  const anthropic = await anthropicComplete(system, messages, opts);
  if (anthropic?.text) return anthropic;
  return (
    anthropic ??
    openAi ?? {
      text: null,
      provider: "none",
      model: null,
      ok: false,
      error: "No AI provider key configured",
      latencyMs: 0,
    }
  );
}

/** One AI completion. Returns the text reply, or null if unavailable. */
export async function aiComplete(
  system: string,
  messages: AiMessage[],
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<string | null> {
  return (await aiCompleteDetailed(system, messages, opts)).text;
}
