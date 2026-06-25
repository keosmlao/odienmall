"use client";

import { useState, useEffect } from "react";
import type { TierCookieData } from "./tier-constants";

function readTierCookie(): TierCookieData | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)om_tier=([^;]+)/);
  if (!m) return null;
  try {
    return JSON.parse(decodeURIComponent(m[1])) as TierCookieData;
  } catch {
    return null;
  }
}

export function useMemberTier(): TierCookieData | null {
  const [tier, setTier] = useState<TierCookieData | null>(null);
  useEffect(() => {
    setTier(readTierCookie());
  }, []);
  return tier;
}
