"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { GroupMain } from "@/lib/types";

// Premium Lazada-style navigation dropdown:
//  - Desktop: Opens an elegant full-width category Mega Menu with a left vertical rail of categories and a grid of subcategories. Shows a backdrop blur overlay on the main viewport when active for focusing.
//  - Mobile: Opens a modern slide-in accordion drawer with a smooth backdrop blur.
const ICON = {
  menu: "M4 6h16M4 12h16M4 18h16",
  chevronRight: "M9 6l6 6-6 6",
  chevronDown: "M6 9l6 6 6-6",
  close: "M6 6l12 12M18 6L6 18",
};

const FEATURED = [
  { href: "/products", label: "ສິນຄ້າທັງໝົດ" },
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
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

export default function MegaMenu({ groups }: { groups: GroupMain[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMain, setActiveMain] = useState<string | null>(groups[0]?.code ?? null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Auto-close menu when cursor moves far away
  useEffect(() => {
    if (!menuOpen) return;
    const handleScroll = () => setMenuOpen(false);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [menuOpen]);

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
      <style>{`
        @keyframes slideDownMenu {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down-menu {
          animation: slideDownMenu 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes backdropFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-backdrop-fade-in {
          animation: backdropFadeIn 0.25s ease-out forwards;
        }
      `}</style>

      {/* ---------- Desktop Navigation Bar ---------- */}
      <div
        className="relative hidden border-b border-slate-100 bg-white sm:block z-40 shadow-xs"
        onMouseLeave={() => setMenuOpen(false)}
      >
        <div className="mx-auto flex max-w-[1400px] items-center gap-1.5 px-4 text-sm">
          {/* Dropdown Trigger */}
          <button
            type="button"
            onMouseEnter={() => setMenuOpen(true)}
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            className={`flex items-center gap-2 px-5 py-3.5 font-bold transition-all duration-200 cursor-pointer ${
              menuOpen
                ? "bg-orange-50/60 text-orange-600 border-b-2 border-orange-500"
                : "text-slate-700 hover:bg-slate-50 hover:text-orange-600"
            }`}
          >
            <Icon d={ICON.menu} className="h-4.5 w-4.5 stroke-[2.5]" />
            ໝວດສິນຄ້າທັງໝົດ
            <Icon
              d={ICON.chevronDown}
              className={`h-3.5 w-3.5 opacity-60 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          <span className="mx-2 h-5 w-px bg-slate-200/80" />

          {/* Featured Links */}
          {FEATURED.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="px-4 py-3.5 font-semibold text-slate-600 transition duration-150 hover:text-orange-600 hover:bg-slate-50/50"
            >
              {f.label}
            </Link>
          ))}
        </div>

        {/* Mega Menu Dropdown Panel */}
        {menuOpen && groups.length > 0 && (
          <div className="absolute inset-x-0 top-full z-50 animate-slide-down-menu">
            <div className="mx-auto max-w-[1400px] px-4">
              <div className="flex overflow-hidden rounded-b-2xl border border-slate-200/80 bg-white shadow-xl">
                {/* Left Pane: Parent Categories list */}
                <ul className="w-72 shrink-0 bg-slate-50/60 py-3 border-r border-slate-100 space-y-0.5">
                  {groups.map((g) => {
                    const isSelected = active?.code === g.code;
                    return (
                      <li key={g.code} className="px-2">
                        <Link
                          href={`/group/${encodeURIComponent(g.code)}`}
                          onMouseEnter={() => setActiveMain(g.code)}
                          onClick={() => setMenuOpen(false)}
                          className={`flex items-center justify-between gap-2 rounded-xl px-4 py-3 text-xs font-bold transition-all duration-150 ${
                            isSelected
                              ? "bg-orange-50 text-orange-600 shadow-xs border-l-4 border-orange-500 pl-3"
                              : "text-slate-650 hover:bg-white hover:text-slate-900 hover:shadow-2xs"
                          }`}
                        >
                          <span className="truncate">{g.name}</span>
                          {g.subs.length > 0 && (
                            <Icon d={ICON.chevronRight} className={`h-3.5 w-3.5 shrink-0 transition-transform ${isSelected ? "text-orange-500 translate-x-0.5" : "opacity-35"}`} />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                {/* Right Pane: Subcategories list (flyout grid) */}
                <div className="min-h-[22rem] flex-1 p-6.5 bg-white">
                  {active && (
                    <div className="space-y-4">
                      {/* Active category header banner */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <Link
                          href={`/group/${encodeURIComponent(active.code)}`}
                          onClick={() => setMenuOpen(false)}
                          className="group/hdr flex items-baseline gap-2 text-base font-black text-slate-900"
                        >
                          <span>{active.name}</span>
                          <span className="text-xs font-semibold text-orange-500 group-hover/hdr:underline">
                            ເບິ່ງທັງໝົດ →
                          </span>
                        </Link>
                      </div>

                      {/* Subcategories grid */}
                      {active.subs.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
                          {active.subs.map((s) => (
                            <Link
                              key={s.code}
                              href={`/group/${encodeURIComponent(active.code)}/${encodeURIComponent(s.code)}`}
                              onClick={() => setMenuOpen(false)}
                              className="group flex items-center justify-between gap-2 rounded-xl border border-slate-100/70 bg-slate-50/40 px-4 py-3 text-xs transition duration-200 hover:border-orange-200 hover:bg-orange-50/30 hover:shadow-sm"
                            >
                              <span className="truncate font-bold text-slate-700 group-hover:text-orange-950">{s.name}</span>
                              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-400 group-hover:bg-orange-200/60 group-hover:text-orange-700 transition-colors">
                                {s.productCount}
                              </span>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs font-semibold text-slate-400 italic py-6">ບໍ່ມີໝວດຍ່ອຍ</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Viewport backdrop focus blur when desktop menu is open */}
      {menuOpen && (
        <div className="animate-backdrop-fade-in fixed inset-0 top-[108px] z-30 hidden bg-slate-950/15 backdrop-blur-[2px] sm:block pointer-events-none" />
      )}

      {/* ---------- Mobile Navigation Trigger Bar ---------- */}
      <div className="border-b border-slate-100 bg-white sm:hidden shadow-xs">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex w-full items-center gap-2 px-4 py-3 text-sm font-black text-slate-700 cursor-pointer"
        >
          <Icon d={ICON.menu} className="h-5 w-5 text-slate-500" />
          ໝວດສິນຄ້າທັງໝົດ
        </button>
      </div>

      {/* ---------- Mobile Navigation Drawer Accordion ---------- */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          {/* Overlay backdrop */}
          <button
            type="button"
            aria-label="ປິດ"
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Side Drawer Panel */}
          <aside className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col overflow-hidden rounded-r-2xl bg-white shadow-2xl transition-transform duration-300">
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-orange-500 to-rose-600 px-4.5 py-4 text-white">
              <span className="font-black text-sm tracking-wide">ໝວດສິນຄ້າທັງໝົດ</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="ປິດ"
                className="rounded-full bg-white/10 p-1.5 transition hover:bg-white/20 cursor-pointer"
              >
                <Icon d={ICON.close} className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
              <Link
                href="/products"
                onClick={() => setDrawerOpen(false)}
                className="block rounded-xl bg-slate-50 px-4.5 py-3 text-xs font-black text-slate-800 transition hover:bg-slate-100 shadow-2xs"
              >
                ສິນຄ້າທັງໝົດ
              </Link>

              {/* Category list items */}
              <div className="space-y-2">
                {groups.map((g) => {
                  const isExpanded = expanded === g.code;
                  return (
                    <div
                      key={g.code}
                      className={`overflow-hidden rounded-xl border border-slate-100 transition-all ${
                        isExpanded ? "bg-slate-50/20 border-slate-200" : "bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setExpanded((c) => (c === g.code ? null : g.code))}
                        className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-xs font-bold transition-all cursor-pointer ${
                          isExpanded ? "text-orange-700 bg-slate-50/50" : "text-slate-700"
                        }`}
                      >
                        <span className="truncate">{g.name}</span>
                        {g.subs.length > 0 && (
                          <Icon
                            d={ICON.chevronDown}
                            className={`h-4 w-4 shrink-0 opacity-40 transition-transform duration-200 ${
                              isExpanded ? "rotate-180 text-orange-600" : ""
                            }`}
                          />
                        )}
                      </button>

                      {/* Subcategories drawer expanded */}
                      {isExpanded && g.subs.length > 0 && (
                        <div className="bg-slate-50/30 border-t border-slate-100 pb-2.5 pt-1.5 px-2.5 space-y-1">
                          <Link
                            href={`/group/${encodeURIComponent(g.code)}`}
                            onClick={() => setDrawerOpen(false)}
                            className="block rounded-lg px-4 py-2 text-[11px] font-black text-slate-800 hover:bg-slate-100"
                          >
                            ເບິ່ງທັງໝົດ ({g.productCount})
                          </Link>
                          {g.subs.map((s) => (
                            <Link
                              key={s.code}
                              href={`/group/${encodeURIComponent(g.code)}/${encodeURIComponent(s.code)}`}
                              onClick={() => setDrawerOpen(false)}
                              className="flex items-center justify-between gap-2 rounded-lg px-4 py-2 text-[11px] font-semibold text-slate-650 hover:bg-slate-100 hover:text-slate-900"
                            >
                              <span className="truncate">{s.name}</span>
                              <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-black text-slate-400">
                                {s.productCount}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
