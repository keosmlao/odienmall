import "server-only";

const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 8;
const BLOCK_MS = 5 * 60 * 1000;
const MAX_KEYS = 5000;

type Bucket = { count: number; first: number; blockedUntil: number };
const buckets = new Map<string, Bucket>();

export interface ChatRateResult {
  allowed: boolean;
  retryAfterSec: number;
}

export function checkAndRecordChatMessage(key: string): ChatRateResult {
  const now = Date.now();
  if (buckets.size > MAX_KEYS) prune(now);
  const safeKey = key || "unknown";
  let b = buckets.get(safeKey);
  if (b && b.blockedUntil > now) {
    return { allowed: false, retryAfterSec: Math.ceil((b.blockedUntil - now) / 1000) };
  }
  if (!b || now - b.first > WINDOW_MS) {
    b = { count: 0, first: now, blockedUntil: 0 };
    buckets.set(safeKey, b);
  }
  b.count += 1;
  if (b.count > MAX_PER_WINDOW) {
    b.blockedUntil = now + BLOCK_MS;
    return { allowed: false, retryAfterSec: Math.ceil(BLOCK_MS / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

function prune(now: number): void {
  for (const [k, b] of buckets) {
    if (b.blockedUntil <= now && now - b.first > WINDOW_MS) buckets.delete(k);
  }
}
