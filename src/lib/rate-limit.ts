import "server-only";

// ---------------------------------------------------------------------------
// Tiny in-memory rate limiter for the login endpoints. Keyed per caller (IP).
//
// LIMITATION: state lives in this process's memory — it resets on restart and
// does NOT coordinate across multiple instances (serverless / horizontal
// scaling). For a single self-hosted Next server it's effective; for multi-
// instance production, back it with Redis (same interface).
// ---------------------------------------------------------------------------

const WINDOW_MS = 15 * 60 * 1000; // failures counted within this sliding window
const MAX_FAILURES = 8; // failures before lockout
const BLOCK_MS = 15 * 60 * 1000; // lockout duration
const MAX_KEYS = 5000; // safety cap on the map size

type Bucket = { count: number; first: number; blockedUntil: number };
const buckets = new Map<string, Bucket>();

export const LOCKOUT_MINUTES = Math.round(BLOCK_MS / 60000);

export interface RateResult {
  allowed: boolean;
  /** Seconds until the caller may retry (only when blocked). */
  retryAfterSec: number;
}

/** Check whether `key` may attempt now (does not record anything). */
export function checkRateLimit(key: string): RateResult {
  const now = Date.now();
  const b = buckets.get(key);
  if (b && b.blockedUntil > now) {
    return { allowed: false, retryAfterSec: Math.ceil((b.blockedUntil - now) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

/** Record a failed attempt; locks the key out once MAX_FAILURES is reached. */
export function recordFailure(key: string): void {
  const now = Date.now();
  if (buckets.size > MAX_KEYS) prune(now);

  let b = buckets.get(key);
  if (!b || now - b.first > WINDOW_MS) {
    b = { count: 0, first: now, blockedUntil: 0 };
    buckets.set(key, b);
  }
  b.count += 1;
  if (b.count >= MAX_FAILURES) b.blockedUntil = now + BLOCK_MS;
}

/** Clear the key's counter after a successful attempt. */
export function recordSuccess(key: string): void {
  buckets.delete(key);
}

// Drop stale, non-blocked buckets to keep the map bounded.
function prune(now: number): void {
  for (const [k, b] of buckets) {
    if (b.blockedUntil <= now && now - b.first > WINDOW_MS) buckets.delete(k);
  }
}

// ── Generic action throttle (sliding count window) ───────────────────────────
// For anti-spam on user actions (reviews, Q&A): allow up to `max` calls per
// `windowMs`. Same in-memory limitation as above — back with Redis for multi-
// instance production.
type CountBucket = { count: number; first: number };
const counters = new Map<string, CountBucket>();

/** Record an attempt; returns true if allowed (under the limit), false if exceeded. */
export function throttle(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  if (counters.size > MAX_KEYS) {
    for (const [k, b] of counters) if (now - b.first > windowMs) counters.delete(k);
  }
  let b = counters.get(key);
  if (!b || now - b.first > windowMs) {
    b = { count: 0, first: now };
    counters.set(key, b);
  }
  b.count += 1;
  return b.count <= max;
}
