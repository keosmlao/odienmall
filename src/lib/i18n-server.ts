import "server-only";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, toLocale, type Locale } from "./i18n";

/** Read the active locale from the `om_lang` cookie (server components/actions). */
export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  return toLocale(c.get(LOCALE_COOKIE)?.value);
}
