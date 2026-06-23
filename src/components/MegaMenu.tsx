"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { GroupMain } from "@/lib/types";

// Lazada-style primary navigation:
//  - Desktop: a persistent "ໝວດສິນຄ້າທັງໝົດ ☰" trigger that opens a two-pane mega
//    panel — a vertical rail of group_mains on the left, the hovered main's
//    group_subs flying out on the right — plus a few featured links.
//  - Mobile: the same trigger opens a slide-in drawer (accordion of group_mains).
// Data is fetched once on the server by GroupMenu.tsx and passed in.

const ICON = {
  menu: "M4 6h16M4 12h16M4 18h16",
  chevronRight: "M9 6l6 6-6 6",
  chevronDown: "M6 9l6 6 6-6",
  close: "M6 6l12 12M18 6L6 18",
};

const FEATURED = [
  { href: "/products", label: "ສິນຄ້າທັງໝົด" },
  { href: "/products?sort=newest", label: "ສິນຄ້າໃໝ່" },
  { href: "/brands", label: "ແບຣນ" },
];

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

export default function MegaMenu({ groups }: { groups: GroupMain[] }) {
  const [menuOpen, setMenuOpen] = useState(false); // desktop hover panel
  const [activeMain, setActiveMain] = useState<string | null>(groups[0]?.code ?? null);
  const [drawerOpen, setDrawerOpen] = useState(false); // mobile drawer
  const [expanded, setExpanded] = useState<string | null>(null); // mobile accordion

  // The menu and drawer are closed by each link's onClick on navigation; the
  // desktop panel also closes on mouse-leave. Body scroll is locked only while
  // the mobile drawer is open.
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  const active = groups.find((g) => g.code === activeMain) ?? groups[0] ?? null;

  return (
    <>
      {/* ---------- Desktop ---------- */}
      <div
        className="relative hidden border-b border-slate-100 bg-white sm:block shadow-[0_1px_3px_rgba(0,0,0,0.01)]"
        onMouseLeave={() => setMenuOpen(false)}
      >
        <div className="mx-auto flex max-w-[1400px] items-center gap-1.5 px-4 text-sm">
          <button
            type="button"
            onMouseEnter={() => setMenuOpen(true)}
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            className={`flex items-center gap-2 rounded-sm px-4 py-3 font-semibold transition-all duration-200 ${
              menuOpen ? "bg-orange-50 text-orange-600" : "text-slate-650 hover:bg-orange-50 hover:text-orange-600"
            }`}
          >
            <Icon d={ICON.menu} className="h-4.5 w-4.5 text-slate-700" />
            ໝວດສິນຄ້າທັງໝົດ
            <Icon
              d={ICON.chevronDown}
              className={`h-3.5 w-3.5 opacity-60 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          <span className="mx-1 h-5 w-px bg-slate-200/60" />

          {FEATURED.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="rounded-lg px-4 py-3 font-medium text-slate-650 transition-all duration-200 hover:bg-slate-50 hover:text-slate-900"
            >
              {f.label}
            </Link>
          ))}
        </div>

        {menuOpen && groups.length > 0 && (
          <div className="absolute inset-x-0 top-full z-50">
            <div className="mx-auto max-w-[1400px] px-4">
              <div className="flex overflow-hidden rounded-b-sm border border-slate-100 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.10)]">
                {/* left rail: group_mains */}
                <ul className="w-64 shrink-0 bg-slate-50/50 py-3 border-r border-slate-100">
                  {groups.map((g) => (
                    <li key={g.code} className="px-2">
                      <Link
                        href={`/group/${encodeURIComponent(g.code)}`}
                        onMouseEnter={() => setActiveMain(g.code)}
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center justify-between gap-2 rounded-lg px-3.5 py-2.5 text-sm transition-all duration-150 ${
                          active?.code === g.code
                            ? "border-l-3 border-orange-500 bg-white font-bold text-orange-600 shadow-sm"
                            : "text-slate-650 hover:bg-white/60 hover:text-slate-900"
                        }`}
                      >
                        <span className="truncate">{g.name}</span>
                        {g.subs.length > 0 && (
                          <Icon d={ICON.chevronRight} className="h-3.5 w-3.5 shrink-0 opacity-40" />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>

                {/* right flyout: subs of the active main */}
                <div className="min-h-[20rem] flex-1 p-6 bg-white">
                  {active && (
                    <>
                      <Link
                        href={`/group/${encodeURIComponent(active.code)}`}
                        onClick={() => setMenuOpen(false)}
                        className="mb-4 inline-flex items-center gap-1.5 text-base font-bold text-slate-900 hover:text-brand"
                      >
                        {active.name}
                        <span className="text-xs font-semibold text-slate-400 hover:underline">
                          ເບິ່ງທັງໝົດ →
                        </span>
                      </Link>

                      {active.subs.length > 0 ? (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 lg:grid-cols-3">
                          {active.subs.map((s) => (
                            <Link
                              key={s.code}
                              href={`/group/${encodeURIComponent(active.code)}/${encodeURIComponent(s.code)}`}
                              onClick={() => setMenuOpen(false)}
                              className="flex items-center justify-between gap-2 rounded-sm border border-transparent px-4 py-3 text-sm text-slate-600 transition hover:border-orange-100 hover:bg-orange-50 hover:text-orange-600"
                            >
                              <span className="truncate font-medium">{s.name}</span>
                              <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">{s.productCount}</span>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-450 italic">ບໍ່ມີໝວດຍ່ອຍ</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---------- Mobile trigger ---------- */}
      <div className="border-b border-slate-100 bg-white sm:hidden shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex w-full items-center gap-2 px-4 py-3.5 text-sm font-semibold text-slate-700"
        >
          <Icon d={ICON.menu} className="h-5 w-5 text-slate-600" />
          ໝວດສິນຄ້າທັງໝົດ
        </button>
      </div>

      {/* ---------- Mobile drawer ---------- */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <button
            type="button"
            aria-label="ປິດ"
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[84%] max-w-xs flex-col overflow-hidden rounded-r-sm bg-white shadow-2xl transition-transform">
            <div className="flex items-center justify-between bg-gradient-to-r from-orange-500 to-rose-500 px-4.5 py-4 text-white">
              <span className="font-bold text-base">ໝວດສິນຄ້າທັງໝົດ</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="ປິດ"
                className="rounded-full bg-white/10 p-1.5 transition hover:bg-white/20"
              >
                <Icon d={ICON.close} className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-3">
              <Link
                href="/products"
                onClick={() => setDrawerOpen(false)}
                className="mb-2 block rounded-xl bg-slate-50 px-4 py-3 font-bold text-slate-800 transition hover:bg-slate-100"
              >
                ສິນຄ້າທັງໝົດ
              </Link>

              <div className="space-y-1">
                {groups.map((g) => (
                  <div key={g.code} className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
                    <button
                      type="button"
                      onClick={() => setExpanded((c) => (c === g.code ? null : g.code))}
                      className={`flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left text-sm font-semibold transition ${
                        expanded === g.code ? "text-slate-900 bg-slate-50/50" : "text-slate-700"
                      }`}
                    >
                      <span>{g.name}</span>
                      {g.subs.length > 0 && (
                        <Icon
                          d={ICON.chevronDown}
                          className={`h-4 w-4 shrink-0 opacity-40 transition-transform duration-250 ${
                            expanded === g.code ? "rotate-180" : ""
                          }`}
                        />
                      )}
                    </button>

                    {expanded === g.code && g.subs.length > 0 && (
                      <div className="bg-slate-50/30 border-t border-slate-100/50 pb-2 pt-1 px-2 space-y-0.5">
                        <Link
                          href={`/group/${encodeURIComponent(g.code)}`}
                          onClick={() => setDrawerOpen(false)}
                          className="block rounded-lg px-5 py-2.5 text-xs font-bold text-slate-900 hover:bg-slate-100"
                        >
                          ເບິ່ງທັງໝົດ ({g.productCount})
                        </Link>
                        {g.subs.map((s) => (
                          <Link
                            key={s.code}
                            href={`/group/${encodeURIComponent(g.code)}/${encodeURIComponent(s.code)}`}
                            onClick={() => setDrawerOpen(false)}
                            className="flex items-center justify-between gap-2 rounded-lg px-5 py-2 text-xs font-medium text-slate-650 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <span className="truncate">{s.name}</span>
                            <span className="shrink-0 rounded bg-slate-100 px-1 py-0.5 text-[9px] font-bold text-slate-400">{s.productCount}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
