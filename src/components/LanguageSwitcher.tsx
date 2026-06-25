"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, useRef, useEffect } from "react";
import { LOCALES } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n-context";
import { setLocale } from "@/app/(shop)/i18n-actions";

// Language picker (lo / th / en). Persists the choice to the om_lang cookie and
// refreshes so server components re-render in the new locale.
export default function LanguageSwitcher() {
  const router = useRouter();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (pending) {
      window.dispatchEvent(new Event("routeChangeStart"));
    } else {
      window.dispatchEvent(new Event("routeChangeComplete"));
    }
  }, [pending]);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  function choose(code: string) {
    setOpen(false);
    if (code === locale) return;
    startTransition(async () => {
      await setLocale(code);
      router.refresh();
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:text-orange-600 disabled:opacity-60"
        aria-label="Language"
      >
        <span className="text-sm leading-none">{current.flag}</span> {current.short}
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.4}>
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-32 overflow-hidden rounded-lg border border-slate-100 bg-white py-1 shadow-lg">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => choose(l.code)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-orange-50 ${
                l.code === locale ? "font-bold text-orange-600" : "text-slate-600"
              }`}
            >
              <span className="text-base leading-none">{l.flag}</span>
              <span className="flex-1">{l.label}</span>
              {l.code === locale && <span>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
