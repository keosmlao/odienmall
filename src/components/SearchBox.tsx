"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatKip } from "@/lib/format";
import { useT } from "@/lib/i18n-context";
import { suggestProducts, type ProductSuggestion } from "@/app/(shop)/search-actions";

const STORAGE_KEY = "odienmall_recent_searches";
const POPULAR = ["ຕູ້ເຢັນ", "ແອ", "ໂທລະພາບ", "ເຄື່ອງຊັກຜ້າ", "ພັດລົມ", "Smart Home"];

export default function SearchBox() {
  const params = useSearchParams();
  const router = useRouter();
  const t = useT();
  const initial = params.get("q") ?? "";
  const [query, setQuery] = useState(initial);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      return Array.isArray(stored)
        ? stored.filter((item): item is string => typeof item === "string").slice(0, 6)
        : [];
    } catch {
      return [];
    }
  });
  const root = useRef<HTMLDivElement>(null);
  const [hits, setHits] = useState<ProductSuggestion[]>([]);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  // Live product suggestions (debounced). All setState happens inside the timer
  // callback, never synchronously in the effect body.
  useEffect(() => {
    const term = query.trim();
    let alive = true;
    const t = setTimeout(() => {
      if (!alive) return;
      if (term.length < 2) {
        setHits([]);
        return;
      }
      suggestProducts(term).then((r) => {
        if (alive) setHits(r);
      });
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query]);

  function remember(value: string) {
    const term = value.trim();
    if (!term) return;
    const next = [term, ...recent.filter((item) => item.toLowerCase() !== term.toLowerCase())].slice(0, 6);
    setRecent(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function clearRecent() {
    setRecent([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  const suggestions = query.trim()
    ? [...recent, ...POPULAR].filter((item, index, all) =>
        item.toLowerCase().includes(query.trim().toLowerCase()) &&
        all.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index,
      ).slice(0, 6)
    : [];

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    remember(term);
    setOpen(false);
    window.dispatchEvent(new Event("routeChangeStart"));
    router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <div ref={root} className="relative w-full">
    <form
      onSubmit={handleSubmit}
      className="flex w-full items-center"
    >
      <div className="flex h-10 sm:h-11 w-full items-center overflow-hidden rounded-lg border-2 border-orange-400 bg-white transition focus-within:border-orange-500 focus-within:shadow-[0_0_0_4px_rgba(249,115,22,0.10)]">
        <input
          type="text"
          name="q"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
          placeholder={t("search.placeholder")}
          className="h-full flex-1 min-w-0 bg-transparent pl-3.5 pr-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none sm:pl-4 sm:pr-3"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOpen(true);
            }}
            className="grid h-8 w-8 shrink-0 place-items-center text-slate-400 hover:text-slate-700"
            aria-label="ລ້າງຄຳຄົ້ນຫາ"
          >
            ×
          </button>
        )}
        <button
          type="submit"
          className="h-full shrink-0 bg-gradient-to-r from-orange-500 to-rose-500 px-4 text-xs font-bold text-white transition hover:from-orange-600 hover:to-rose-600 sm:px-7 sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer"
          aria-label={t("search.button")}
        >
          <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.4}>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" strokeLinecap="round" />
          </svg>
          <span className="hidden sm:inline">{t("search.button")}</span>
        </button>
      </div>
    </form>

    {open && (
      <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-sm border border-slate-100 bg-white shadow-[0_16px_36px_rgba(15,23,42,0.16)]">
        {query.trim() ? (
          <div className="py-2">
            <Link
              href={`/search?q=${encodeURIComponent(query.trim())}`}
              onClick={() => {
                remember(query);
                setOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-orange-600 hover:bg-orange-50"
            >
              <span className="text-lg">⌕</span>
              ຄົ້ນຫາ “{query.trim()}”
            </Link>
            {hits.length > 0 && (
              <div className="border-y border-slate-50 py-1">
                {hits.map((h) => (
                  <Link
                    key={h.code}
                    href={`/product/${encodeURIComponent(h.code)}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded bg-slate-100">
                      {h.imageUrl ? (
                        <Image src={h.imageUrl} alt="" width={36} height={36} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-slate-300">▣</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 text-sm text-slate-700">{h.name}</span>
                      {h.price != null && <span className="text-xs font-bold text-orange-600">{formatKip(h.price)}</span>}
                    </span>
                  </Link>
                ))}
              </div>
            )}
            {suggestions.map((term) => (
              <Link
                key={term}
                href={`/search?q=${encodeURIComponent(term)}`}
                onClick={() => {
                  remember(term);
                  setOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-orange-600"
              >
                <span className="text-slate-300">⌕</span>
                {term}
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid gap-0 sm:grid-cols-2">
            {recent.length > 0 && (
              <div className="border-b border-slate-100 p-4 sm:border-b-0 sm:border-r">
                <div className="mb-3 flex items-center justify-between">
                  <strong className="text-xs text-slate-700">ຄົ້ນຫາລ່າສຸດ</strong>
                  <button type="button" onClick={clearRecent} className="text-[11px] text-slate-400 hover:text-rose-500">
                    ລ້າງ
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recent.map((term) => (
                    <Link
                      key={term}
                      href={`/search?q=${encodeURIComponent(term)}`}
                      onClick={() => setOpen(false)}
                      className="rounded bg-slate-100 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                    >
                      {term}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div className={`p-4 ${recent.length === 0 ? "sm:col-span-2" : ""}`}>
              <strong className="mb-3 block text-xs text-slate-700">ຄຳຄົ້ນຫານິຍົມ</strong>
              <div className="flex flex-wrap gap-2">
                {POPULAR.map((term) => (
                  <Link
                    key={term}
                    href={`/search?q=${encodeURIComponent(term)}`}
                    onClick={() => {
                      remember(term);
                      setOpen(false);
                    }}
                    className="rounded border border-orange-100 bg-orange-50/60 px-2.5 py-1.5 text-xs text-orange-600 hover:border-orange-300"
                  >
                    {term}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    )}
    </div>
  );
}
