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
    <div className="mb-6">
      {back && (
        <Link
          href={back.href}
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-orange-600"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Card — clean white surface with a hairline border.                          */
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
      className={`rounded-xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] ${
        padded ? "p-4 sm:p-5" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="text-sm font-bold tracking-tight text-slate-800">{children}</h2>
      {hint && <span className="text-xs font-medium text-slate-400">{hint}</span>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Badge / status pill.                                                        */
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

export function Badge({
  tone = "gray",
  children,
}: {
  tone?: keyof typeof BADGE_TONE | string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ring-1 ring-inset ${
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
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
      {icon && (
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-orange-50 text-orange-400">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={icon} /></svg>
        </span>
      )}
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {hint && <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-400">{hint}</p>}
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
    <div className="thin-scroll overflow-x-auto rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <table className="w-full text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export const THEAD = "border-b border-slate-100 bg-slate-50 text-left font-semibold text-slate-500";
export const TH = "px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400";
export const TBODY = "divide-y divide-slate-100";
export const TR = "transition duration-150 hover:bg-orange-50/30";
export const TD = "px-4 py-4 align-middle text-sm text-slate-600";

/* -------------------------------------------------------------------------- */
/* Buttons — brand-orange primary, hairline secondary.                         */
/* -------------------------------------------------------------------------- */
export const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-orange-500/20 transition hover:bg-orange-600 active:scale-[.98] disabled:opacity-60 disabled:pointer-events-none";
export const BTN_SECONDARY =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-orange-300 hover:text-orange-600 active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none";

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
