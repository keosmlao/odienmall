import "server-only";

// Generic HTTP SMS gateway. Vendor-agnostic so it works with any Lao SMS
// provider that exposes an HTTP API (most do). All best-effort: a missing
// config or a failed send NEVER throws to the caller.
//
// Env config:
//   SMS_API_URL        — gateway endpoint (required to enable SMS)
//   SMS_API_METHOD     — GET | POST                       (default GET)
//   SMS_PARAM_TO       — query/body param name for the number   (default "to")
//   SMS_PARAM_TEXT     — query/body param name for the message  (default "text")
//   SMS_PARAM_SENDER   — query/body param name for the sender   (default "from")
//   SMS_SENDER         — sender id / from value          (optional)
//   SMS_EXTRA_PARAMS   — extra static params, urlencoded ("key=abc&type=1")
//   SMS_AUTH_HEADER    — value for the Authorization header (optional)
//   SMS_BODY_TEMPLATE  — JSON POST body with {to}/{text} placeholders (optional;
//                        when set, sends application/json POST instead of params)

export function smsConfigured(): boolean {
  return Boolean(process.env.SMS_API_URL?.trim());
}

/** Normalise a Lao number to international digits (no +). e.g. "020 5992..." → "8562059..." */
export function normalizeLaoPhone(raw: string): string | null {
  let p = (raw || "").replace(/[^0-9]/g, "");
  if (!p) return null;
  if (p.startsWith("856")) return p;
  if (p.startsWith("0")) p = p.slice(1);
  return "856" + p;
}

const TIMEOUT_MS = 8000;

/** Send one SMS, best-effort. Returns true on a 2xx gateway response. */
export async function sendSms(phone: string, message: string): Promise<boolean> {
  if (!smsConfigured()) return false;
  const to = normalizeLaoPhone(phone);
  if (!to) return false;

  const url = process.env.SMS_API_URL!.trim();
  const method = (process.env.SMS_API_METHOD || "GET").toUpperCase();
  const toParam = process.env.SMS_PARAM_TO || "to";
  const textParam = process.env.SMS_PARAM_TEXT || "text";
  const senderParam = process.env.SMS_PARAM_SENDER || "from";
  const sender = process.env.SMS_SENDER?.trim();
  const authHeader = process.env.SMS_AUTH_HEADER?.trim();

  try {
    const headers: Record<string, string> = {};
    if (authHeader) headers["Authorization"] = authHeader;
    const signal = AbortSignal.timeout(TIMEOUT_MS);

    // JSON POST mode (template with {to}/{text} placeholders).
    const tmpl = process.env.SMS_BODY_TEMPLATE?.trim();
    if (tmpl) {
      const body = tmpl
        .replace(/\{to\}/g, to)
        .replace(/\{text\}/g, JSON.stringify(message).slice(1, -1));
      headers["Content-Type"] = "application/json";
      const res = await fetch(url, { method: "POST", headers, body, signal });
      return res.ok;
    }

    // Param mode (GET query string or form POST).
    const params = new URLSearchParams();
    params.set(toParam, to);
    params.set(textParam, message);
    if (sender) params.set(senderParam, sender);
    const extra = process.env.SMS_EXTRA_PARAMS?.trim();
    if (extra) for (const [k, v] of new URLSearchParams(extra)) params.set(k, v);

    if (method === "POST") {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      const res = await fetch(url, { method: "POST", headers, body: params.toString(), signal });
      return res.ok;
    }
    const sep = url.includes("?") ? "&" : "?";
    const res = await fetch(`${url}${sep}${params.toString()}`, { method: "GET", headers, signal });
    return res.ok;
  } catch (e) {
    console.error("sendSms failed:", e);
    return false;
  }
}
