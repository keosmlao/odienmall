// Shared admin UI primitives — clean, light, modern theme. Server-safe (no
// "use client"), so these compose into both server and client admin pages.
// Same export surface as before, so every admin page restyles automatically.
import Link from "next/link";
import type { ReactNode } from "react";

/* -------------------------------------------------------------------------- */
/* Page header — title block + optional back link + right-aligned actions.     */
/* -------------------------------------------------------------------------- */
export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3">
      {back && (
        <Link
          href={back.href}
          className="inline-flex w-fit items-center gap-1.5 text-xs font-bold text-slate-550 transition hover:text-orange-600 bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-xs active:scale-97"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-[13px] font-semibold text-slate-450">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Card — clean white surface with a hairline border and elegant SaaS shadow.  */
/* -------------------------------------------------------------------------- */
export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.02),0_12px_24px_-4px_rgba(15,23,42,0.03)] transition-all duration-300 hover:shadow-md hover:border-slate-300/80 ${
        padded ? "p-5 sm:p-6" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
      <h2 className="text-sm font-black tracking-tight text-slate-800">{children}</h2>
      {hint && <span className="text-[11px] font-bold text-slate-400">{hint}</span>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Badge / status pill with ambient dot indicators.                             */
/* -------------------------------------------------------------------------- */
const BADGE_TONE: Record<string, string> = {
  brand: "bg-orange-50 text-orange-700 ring-orange-200/60",
  gray: "bg-slate-100 text-slate-600 ring-slate-200/85",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
  amber: "bg-amber-50 text-amber-700 ring-amber-200/60",
  rose: "bg-rose-50 text-rose-700 ring-rose-200/60",
  blue: "bg-blue-50 text-blue-700 ring-blue-200/60",
  price: "bg-rose-50 text-rose-700 ring-rose-200/60",
};

const DOT_COLOR: Record<string, string> = {
  brand: "bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.4)]",
  green: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]",
  amber: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]",
  rose: "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.4)]",
  blue: "bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.4)]",
};

export function Badge({
  tone = "gray",
  children,
}: {
  tone?: keyof typeof BADGE_TONE | string;
  children: ReactNode;
}) {
  const dot = DOT_COLOR[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.75 text-[10px] font-extrabold uppercase tracking-wider ring-1 ring-inset ${
        BADGE_TONE[tone] ?? BADGE_TONE.gray
      }`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot} shrink-0`} />}
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty state.                                                                */
/* -------------------------------------------------------------------------- */
export function EmptyState({
  title,
  hint,
  icon,
  children,
}: {
  title: ReactNode;
  hint?: ReactNode;
  icon?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-xs">
      {icon && (
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-orange-50/80 text-orange-500 border border-orange-100 shadow-xs">
          <svg viewBox="0 0 24 24" className="h-6.5 w-6.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d={icon} />
          </svg>
        </span>
      )}
      <p className="text-sm font-bold text-slate-800">{title}</p>
      {hint && <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed font-semibold text-slate-400">{hint}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Data table — consistent shell + cell classes.                              */
/* -------------------------------------------------------------------------- */
export function TableShell({
  children,
  minWidth = 640,
}: {
  children: ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="thin-scroll overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
      <table className="w-full text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export const THEAD = "border-b border-slate-100 bg-slate-50/70 text-left font-bold text-slate-400";
export const TH = "px-4.5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-400";
export const TBODY = "divide-y divide-slate-100 bg-white";
export const TR = "transition duration-150 hover:bg-slate-50/30";
export const TD = "px-4.5 py-4 align-middle text-sm text-slate-650 font-semibold";

/* -------------------------------------------------------------------------- */
/* Buttons — brand-orange primary, hairline secondary.                         */
/* -------------------------------------------------------------------------- */
export const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 px-4.5 py-2.5 text-sm font-bold text-white shadow-sm shadow-orange-500/10 hover:shadow-orange-500/20 active:scale-97 transition-all duration-300 disabled:opacity-60 disabled:pointer-events-none cursor-pointer";
export const BTN_SECONDARY =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-250 bg-white px-4.5 py-2.5 text-sm font-bold text-slate-650 hover:border-slate-350 hover:bg-slate-50 active:scale-97 transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

export function ButtonLink({
  href,
  children,
  variant = "secondary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link href={href} className={variant === "primary" ? BTN_PRIMARY : BTN_SECONDARY}>
      {children}
    </Link>
  );
}
