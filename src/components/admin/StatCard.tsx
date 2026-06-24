// Reusable KPI card for the admin dashboard / report pages.
// `icon` is an SVG path string; `tone` colours the icon chip.

const CARD_STYLE: Record<string, string> = {
  brand: "bg-gradient-to-br from-orange-500/[0.03] to-white border-slate-200/70 hover:border-orange-300/80 hover:shadow-lg hover:shadow-orange-500/[0.03] hover:-translate-y-[2px]",
  green: "bg-gradient-to-br from-emerald-500/[0.03] to-white border-slate-200/70 hover:border-emerald-300/80 hover:shadow-lg hover:shadow-emerald-500/[0.03] hover:-translate-y-[2px]",
  amber: "bg-gradient-to-br from-amber-500/[0.03] to-white border-slate-200/70 hover:border-amber-300/80 hover:shadow-lg hover:shadow-amber-500/[0.03] hover:-translate-y-[2px]",
  blue: "bg-gradient-to-br from-blue-500/[0.03] to-white border-slate-200/70 hover:border-blue-300/80 hover:shadow-lg hover:shadow-blue-500/[0.03] hover:-translate-y-[2px]",
  slate: "bg-gradient-to-br from-slate-500/[0.02] to-white border-slate-200/70 hover:border-slate-350 hover:shadow-md hover:-translate-y-[2px]",
};

const ICON_STYLE: Record<string, string> = {
  brand: "bg-orange-50 text-orange-600 ring-1 ring-orange-200/50 shadow-sm shadow-orange-100/50",
  green: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/50 shadow-sm shadow-emerald-100/50",
  amber: "bg-amber-50 text-amber-600 ring-1 ring-amber-200/50 shadow-sm shadow-amber-100/50",
  blue: "bg-blue-50 text-blue-600 ring-1 ring-blue-200/50 shadow-sm shadow-blue-100/50",
  slate: "bg-slate-50 text-slate-500 ring-1 ring-slate-200/50 shadow-sm shadow-slate-100/50",
};

export default function StatCard({
  label,
  value,
  icon,
  tone = "slate",
  accent,
  hint,
}: {
  label: string;
  value: string;
  icon?: string;
  tone?: keyof typeof CARD_STYLE | string;
  accent?: boolean;
  hint?: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-4.5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] transition-all duration-300 ${
        CARD_STYLE[tone] ?? CARD_STYLE.slate
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span>
        {icon && (
          <span className={`grid h-9.5 w-9.5 shrink-0 place-items-center rounded-xl transition-all duration-300 ${ICON_STYLE[tone] ?? ICON_STYLE.slate}`}>
            <svg viewBox="0 0 24 24" className="h-5.5 w-5.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d={icon} />
            </svg>
          </span>
        )}
      </div>
      <div className={`mt-2 text-2xl font-black leading-none tracking-tight ${accent ? "text-price" : "text-slate-900"}`}>
        {value}
      </div>
      {hint && <div className="mt-2 text-xs font-semibold text-slate-400">{hint}</div>}
    </div>
  );
}
