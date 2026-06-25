import "server-only";

// Minimal AI client via fetch — no SDK dependency. Used by the customer chat
// assistant. Provider precedence: a LOCAL OpenAI-compatible server (Ollama /
// LM Studio / llama.cpp / vLLM) when LOCAL_AI_BASE_URL is set, then OpenAI
// (OPENAI_API_KEY), then Anthropic (ANTHROPIC_API_KEY). Returns null when no
// provider is configured or on any error, so callers can gracefully fall back
// to a human admin.
const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-5.4-mini";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-haiku-4-5-20251001";

// Local / self-hosted, OpenAI-compatible /chat/completions endpoint. Set
// LOCAL_AI_BASE_URL to e.g. http://localhost:11434/v1 (Ollama) or
// http://localhost:1234/v1 (LM Studio). LOCAL_AI_API_KEY is usually unneeded
// for localhost but some gateways (vLLM, LiteLLM) require one.
const LOCAL_AI_BASE_URL = process.env.LOCAL_AI_BASE_URL?.trim().replace(/\/+$/, "") || "";
const LOCAL_AI_MODEL = process.env.LOCAL_AI_MODEL?.trim() || "llama3.1";
const LOCAL_AI_TIMEOUT_MS = Math.max(10_000, Number(process.env.LOCAL_AI_TIMEOUT_MS || 180_000));
const LOCAL_AI_OLLAMA_URL = LOCAL_AI_BASE_URL.replace(/\/v1$/, "");
const LOCAL_AI_MAYBE_OLLAMA =
  LOCAL_AI_BASE_URL.includes("localhost") ||
  LOCAL_AI_BASE_URL.includes("127.0.0.1") ||
  LOCAL_AI_BASE_URL.includes(":11434");

export function aiConfigured(): boolean {
  return !!(LOCAL_AI_BASE_URL || process.env.OPENAI_API_KEY?.trim() || process.env.ANTHROPIC_API_KEY?.trim());
}

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

export type AiProvider = "local" | "openai" | "anthropic" | "none";

export interface AiCompletionResult {
  text: string | null;
  provider: AiProvider;
  model: string | null;
  ok: boolean;
  error: string | null;
  latencyMs: number;
}

function localAiRequestError(e: unknown, url: string): string {
  if (e instanceof DOMException && e.name === "AbortError") {
    return `Local AI timeout: ຕໍ່ ${url} ບໍ່ທັນໃນ ${Math.round(LOCAL_AI_TIMEOUT_MS / 1000)} ວິນາທີ`;
  }
  if (e instanceof TypeError && e.message === "fetch failed") {
    const cause = (e as Error & { cause?: { code?: string; message?: string } }).cause;
    const detail = cause?.code || cause?.message;
    return `Local AI connection failed: ຕໍ່ ${url} ບໍ່ໄດ້${detail ? ` (${detail})` : ""}. ກວດວ່າ Ollama ເປີດຢູ່ ແລະ LOCAL_AI_BASE_URL ຖືກຕ້ອງ.`;
  }
  return e instanceof Error ? e.message : "Local AI request failed";
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


/** Ollama native chat endpoint. Needed for thinking models like Qwen3 because
 *  its OpenAI-compatible endpoint can stream reasoning with empty content. */
async function ollamaNativeComplete(
  system: string,
  messages: AiMessage[],
  opts: { maxTokens?: number; temperature?: number },
): Promise<AiCompletionResult | null> {
  if (!LOCAL_AI_OLLAMA_URL || !LOCAL_AI_MAYBE_OLLAMA) return null;

  const started = Date.now();
  const ctrl = new AbortController();
  const url = `${LOCAL_AI_OLLAMA_URL}/api/chat`;
  const timer = setTimeout(() => ctrl.abort(), LOCAL_AI_TIMEOUT_MS);
  const headers: Record<string, string> = { "content-type": "application/json" };
  const key = process.env.LOCAL_AI_API_KEY?.trim();
  if (key) headers.authorization = `Bearer ${key}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: LOCAL_AI_MODEL,
        messages: [{ role: "system", content: system }, ...messages],
        stream: false,
        think: false,
        options: {
          num_ctx: 4096,
          num_predict: opts.maxTokens ?? 300,
          temperature: opts.temperature ?? 0.3,
        },
      }),
      signal: ctrl.signal,
    });
    const body = await res.text().catch(() => "");
    clearTimeout(timer);
    if (!res.ok) {
      // Not an Ollama server; let the OpenAI-compatible path try next.
      if (res.status === 404 || res.status === 405) return null;
      const error = `Ollama HTTP ${res.status}${body ? `: ${body.slice(0, 500)}` : ""}`;
      console.error("ollamaNativeComplete HTTP", res.status, body);
      return { text: null, provider: "local", model: LOCAL_AI_MODEL, ok: false, error, latencyMs: Date.now() - started };
    }
    const data = JSON.parse(body) as { message?: { content?: unknown }; error?: unknown };
    const text = typeof data.message?.content === "string" ? data.message.content.trim() : "";
    return {
      text: text || null,
      provider: "local",
      model: LOCAL_AI_MODEL,
      ok: !!text,
      error: text ? null : "Ollama returned no message content",
      latencyMs: Date.now() - started,
    };
  } catch (e) {
    clearTimeout(timer);
    console.error("ollamaNativeComplete failed:", e);
    return {
      text: null,
      provider: "local",
      model: LOCAL_AI_MODEL,
      ok: false,
      error: localAiRequestError(e, url),
      latencyMs: Date.now() - started,
    };
  }
}

/** Local / self-hosted OpenAI-compatible server (Ollama, LM Studio, vLLM, …). */
async function localComplete(
  system: string,
  messages: AiMessage[],
  opts: { maxTokens?: number; temperature?: number },
): Promise<AiCompletionResult | null> {
  if (!LOCAL_AI_BASE_URL) return null;
  const ollama = await ollamaNativeComplete(system, messages, opts);
  if (ollama?.text || ollama?.error) return ollama;

  const started = Date.now();
  const ctrl = new AbortController();
  const url = `${LOCAL_AI_BASE_URL}/chat/completions`;
  // Local models on CPU can be slow. Keep the timer active until the whole
  // streaming body is consumed, not just until response headers arrive.
  const timer = setTimeout(() => ctrl.abort(), LOCAL_AI_TIMEOUT_MS);
  const headers: Record<string, string> = { "content-type": "application/json" };
  const key = process.env.LOCAL_AI_API_KEY?.trim();
  if (key) headers.authorization = `Bearer ${key}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: LOCAL_AI_MODEL,
        messages: [{ role: "system", content: system }, ...messages],
        max_tokens: opts.maxTokens ?? 300,
        temperature: opts.temperature ?? 0.3,
        stream: true,
        ...(LOCAL_AI_MAYBE_OLLAMA ? { options: { num_ctx: 8192 } } : {}),
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      clearTimeout(timer);
      const error = `Local AI HTTP ${res.status}${body ? `: ${body.slice(0, 500)}` : ""}`;
      console.error("localComplete HTTP", res.status, body);
      return { text: null, provider: "local", model: LOCAL_AI_MODEL, ok: false, error, latencyMs: Date.now() - started };
    }
    // Read SSE stream and concatenate all delta content chunks.
    const text = await (async () => {
      const reader = res.body?.getReader();
      if (!reader) return null;
      const dec = new TextDecoder();
      let buf = "", out = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const data = line.replace(/^data:\s*/, "");
          if (!data || data === "[DONE]") continue;
          try {
            const delta = JSON.parse(data)?.choices?.[0]?.delta?.content;
            if (typeof delta === "string") out += delta;
          } catch { /* ignore malformed chunks */ }
        }
      }
      return out.trim() || null;
    })();
    clearTimeout(timer);
    return {
      text,
      provider: "local",
      model: LOCAL_AI_MODEL,
      ok: !!text,
      error: text ? null : "Local AI returned no message content",
      latencyMs: Date.now() - started,
    };
  } catch (e) {
    clearTimeout(timer);
    console.error("localComplete failed:", e);
    return {
      text: null,
      provider: "local",
      model: LOCAL_AI_MODEL,
      ok: false,
      error: localAiRequestError(e, url),
      latencyMs: Date.now() - started,
    };
  }
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
  const local = await localComplete(system, messages, opts);
  if (local?.text) return local;
  const openAi = await openAiComplete(system, messages, opts);
  if (openAi?.text) return openAi;
  const anthropic = await anthropicComplete(system, messages, opts);
  if (anthropic?.text) return anthropic;
  return (
    local ??
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
