import { createHash, scryptSync, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";

// Pure (no next/server-only deps) so it can be unit-tested directly.

export function timingEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Format-agnostic password check. The ERP's hash scheme is unknown, so we detect
 * it from the stored value: bcrypt ($2…), MD5/SHA-1/SHA-256 hex, or plaintext
 * fallback. If the ERP uses a bespoke scheme this returns false — add it here.
 */
export function verifyPassword(input: string, stored: string | null): boolean {
  if (!stored) return false;
  const s = stored.trim();
  if (!s) return false;
  try {
    if (/^\$2[aby]\$/.test(s)) return bcrypt.compareSync(input, s);
    // ERP scrypt scheme: "scrypt$<salt>$<hash>" where both parts are base64url.
    // The salt is fed to scrypt as its RAW base64url TEXT (not decoded); the hash
    // is the base64url-decoded derived key. Params: N=16384, r=8, p=1 (Node deps).
    if (s.startsWith("scrypt$")) {
      const [, salt, hashB64] = s.split("$");
      if (!salt || !hashB64) return false;
      const want = Buffer.from(hashB64.replace(/-/g, "+").replace(/_/g, "/"), "base64");
      if (want.length === 0) return false;
      const got = scryptSync(input, salt, want.length, {
        N: 16384,
        r: 8,
        p: 1,
        maxmem: 64 * 1024 * 1024,
      });
      return got.length === want.length && timingSafeEqual(got, want);
    }
    const lower = s.toLowerCase();
    if (/^[a-f0-9]{32}$/.test(lower)) return timingEq(createHash("md5").update(input).digest("hex"), lower);
    if (/^[a-f0-9]{40}$/.test(lower)) return timingEq(createHash("sha1").update(input).digest("hex"), lower);
    if (/^[a-f0-9]{64}$/.test(lower)) return timingEq(createHash("sha256").update(input).digest("hex"), lower);
  } catch {
    return false;
  }
  return timingEq(input, s); // plaintext fallback
}
