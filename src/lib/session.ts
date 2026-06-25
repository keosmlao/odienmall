import { createHmac } from "crypto";
import { timingEq } from "./password";

// Stateless HMAC-signed session token. Pure crypto (no next deps) so it can be
// unit-tested directly. No DB / cookie access here.

export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days (seconds)

export interface Session {
  code: string;
  name: string;
  /** Admin role for the `om_admin` cookie ("manager" | "staff"); absent for
   *  customer sessions and legacy admin tokens. */
  role?: string;
}

// Insecure dev fallback. REFUSED in production: signing tokens with a
// publicly-known secret lets anyone forge an admin / customer session cookie.
const INSECURE_SECRET = "dev-insecure-secret-change-me";

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s !== INSECURE_SECRET) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET is missing or set to the insecure default — refusing to sign/verify sessions in production. " +
        "Set a strong random SESSION_SECRET (e.g. `openssl rand -base64 32`).",
    );
  }
  return INSECURE_SECRET;
}

export function signSession(sess: Session): string {
  const payload = Buffer.from(
    JSON.stringify({ ...sess, t: Date.now() }),
  ).toString("base64url");
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyToken(token: string): Session | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  if (!timingEq(sig, expected)) return null;
  try {
    const obj = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof obj.t === "number" && Date.now() - obj.t > SESSION_MAX_AGE * 1000) return null;
    if (!obj.code) return null;
    return {
      code: String(obj.code),
      name: String(obj.name ?? ""),
      ...(obj.role ? { role: String(obj.role) } : {}),
    };
  } catch {
    return null;
  }
}

// ── Generic short-lived signed payload (e.g. a pending LINE-link identity) ────
export function signPayload(obj: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify({ ...obj, t: Date.now() })).toString("base64url");
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyPayload<T = Record<string, unknown>>(token: string, maxAgeSec: number): T | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  if (!timingEq(sig, expected)) return null;
  try {
    const obj = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof obj.t !== "number" || Date.now() - obj.t > maxAgeSec * 1000) return null;
    return obj as T;
  } catch {
    return null;
  }
}
