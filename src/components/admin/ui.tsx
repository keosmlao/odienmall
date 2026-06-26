import Link from "next/link";
import type { ReactNode } from "react";

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
    <header className="mb-6">
      {back && (
        <Link
          href={back.href}
          className="adm-focus mb-2.5 inline-flex w-fit items-center gap-1 text-xs font-bold text-slate-500 transition hover:text-orange-600"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[22px] font-black leading-tight tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{actions}</div>}
      </div>
    </header>
  );
}

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
    <section className={`adm-panel relative overflow-hidden ${padded ? "p-4 sm:p-5" : ""} ${className}`}>
      {children}
    </section>
  );
}

export function CardTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-1 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-sm font-black text-slate-900">{children}</h2>
      {hint && <span className="text-xs font-semibold leading-5 text-slate-500 sm:text-right">{hint}</span>}
    </div>
  );
}

const BADGE_TONE: Record<string, string> = {
  brand: "bg-orange-50 text-orange-700",
  gray: "bg-slate-100 text-slate-600",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  blue: "bg-cyan-50 text-cyan-700",
  price: "bg-rose-50 text-rose-700",
};

const DOT_COLOR: Record<string, string> = {
  brand: "bg-orange-500",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  blue: "bg-blue-500",
  gray: "bg-slate-400",
  price: "bg-rose-500",
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
      className={`inline-flex min-h-6 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${
        BADGE_TONE[tone] ?? BADGE_TONE.gray
      }`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_COLOR[tone] ?? DOT_COLOR.gray}`} />
      {children}
    </span>
  );
}

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
    <div className="adm-panel px-6 py-14 text-center">
      {icon && (
        <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
            <path d={icon} />
          </svg>
        </span>
      )}
      <p className="text-sm font-black text-slate-900">{title}</p>
      {hint && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{hint}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

export function TableShell({
  children,
  minWidth = 640,
}: {
  children: ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="thin-scroll -mx-3 overflow-x-auto border-y border-slate-200 bg-white sm:mx-0 sm:rounded-lg sm:border">
      <table className="w-full text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export const THEAD = "border-b border-slate-200 bg-slate-50 text-left text-slate-500";
export const TH = "px-4 py-3 text-[10px] font-black uppercase tracking-wider";
export const TBODY = "divide-y divide-slate-100 bg-white";
export const TR = "transition hover:bg-orange-50/30";
export const TD = "px-4 py-3 align-middle text-sm font-semibold text-slate-700";

export const BTN_PRIMARY =
  "adm-focus inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-bold text-white shadow-sm shadow-orange-500/25 transition hover:bg-orange-600 disabled:pointer-events-none disabled:opacity-60";
export const BTN_SECONDARY =
  "adm-focus inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-50";

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
