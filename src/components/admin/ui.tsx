// Shared admin UI primitives (light SaaS theme). Server-safe — no "use client",
// so these compose into both server and client admin pages.
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
    <div className="mb-8">
      {back && (
        <Link
          href={back.href}
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition-colors duration-250 hover:text-slate-800"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-3xl bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-850">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-slate-400 font-medium">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Card — standard white surface.                                              */
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
      className={`rounded-2xl border border-slate-100 bg-white/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-sm transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] ${
        padded ? "p-5 sm:p-6" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="text-sm font-bold text-slate-800 tracking-tight">{children}</h2>
      {hint && <span className="text-xs text-slate-400 font-medium">{hint}</span>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Badge / status pill.                                                        */
/* -------------------------------------------------------------------------- */
const BADGE_TONE: Record<string, string> = {
  brand: "bg-orange-50 text-orange-700 ring-orange-200/60",
  gray: "bg-slate-100 text-slate-650 ring-slate-200/85",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
  amber: "bg-amber-50 text-amber-750 ring-amber-200/60",
  rose: "bg-rose-50 text-rose-700 ring-rose-200/60",
  blue: "bg-blue-50 text-blue-700 ring-blue-200/60",
  price: "bg-rose-50 text-rose-700 ring-rose-200/60",
};

export function Badge({
  tone = "gray",
  children,
}: {
  tone?: keyof typeof BADGE_TONE | string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase ring-1 ring-inset ${
        BADGE_TONE[tone] ?? BADGE_TONE.gray
      }`}
    >
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
    <div className="rounded-2xl border border-dashed border-slate-250 bg-white/70 backdrop-blur-sm px-6 py-16 text-center shadow-sm">
      {icon && (
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-slate-50 text-slate-350 shadow-inner">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={icon} /></svg>
        </span>
      )}
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {hint && <p className="mt-1.5 text-xs text-slate-400 max-w-md mx-auto leading-relaxed">{hint}</p>}
      {children && <div className="mt-4">{children}</div>}
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
    <div className="thin-scroll overflow-x-auto rounded-2xl border border-slate-100 bg-white/95 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)]">
      <table className="w-full text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

/** <thead> class — sticky-light header row. Use with <th className={TH}>. */
export const THEAD =
  "border-b border-slate-100 bg-slate-50/80 text-left text-slate-500 font-semibold";
export const TH = "px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-450";
export const TBODY = "divide-y divide-slate-100";
export const TR = "transition duration-200 hover:bg-slate-50/50";
export const TD = "px-4 py-4 align-middle text-slate-650 text-sm";

/* -------------------------------------------------------------------------- */
/* Buttons (links + plain). For client actions, reuse these className consts.  */
/* -------------------------------------------------------------------------- */
export const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-md shadow-slate-900/10 transition-all duration-200 hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:pointer-events-none";
export const BTN_SECONDARY =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-all duration-200 hover:border-slate-350 hover:text-slate-800 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none";

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
