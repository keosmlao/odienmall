"use client";

import { createContext, useContext } from "react";
import { DEFAULT_LOCALE, t as translate, type Locale } from "./i18n";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** Provides the active locale (resolved server-side from the cookie) to client components. */
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** Returns a `t(key)` bound to the active locale, for use in client components. */
export function useT(): (key: string) => string {
  const locale = useContext(LocaleContext);
  return (key: string) => translate(key, locale);
}
