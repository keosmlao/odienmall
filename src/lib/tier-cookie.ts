import "server-only";
import { cookies } from "next/headers";
import type { TierCookieData } from "./tier-constants";

const COOKIE_NAME = "om_tier";
const MAX_AGE = 30 * 24 * 60 * 60;

export async function setTierCookie(data: TierCookieData): Promise<void> {
  (await cookies()).set(COOKIE_NAME, JSON.stringify(data), {
    httpOnly: false, // must be JS-readable for Header client component
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearTierCookie(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
