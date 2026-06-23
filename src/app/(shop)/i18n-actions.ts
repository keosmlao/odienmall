"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, toLocale } from "@/lib/i18n";

/** Persist the chosen UI language in the `om_lang` cookie (1 year). */
export async function setLocale(value: string): Promise<void> {
  const locale = toLocale(value);
  const c = await cookies();
  c.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
