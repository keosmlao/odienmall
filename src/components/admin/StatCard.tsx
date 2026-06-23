// Reusable KPI card for the admin dashboard / report pages.
// `icon` is an SVG path string; `tone` colours the icon chip.

const CARD_STYLE: Record<string, string> = {
  brand: "border-l-[3px] border-l-orange-500 bg-gradient-to-br from-orange-50/15 via-white to-white hover:shadow-orange-500/8 hover:border-orange-500",
  green: "border-l-[3px] border-l-emerald-500 bg-gradient-to-br from-emerald-50/15 via-white to-white hover:shadow-emerald-500/8 hover:border-emerald-500",
  amber: "border-l-[3px] border-l-amber-500 bg-gradient-to-br from-amber-50/15 via-white to-white hover:shadow-amber-500/8 hover:border-amber-500",
  blue: "border-l-[3px] border-l-blue-500 bg-gradient-to-br from-blue-50/15 via-white to-white hover:shadow-blue-500/8 hover:border-blue-500",
  slate: "border-l-[3px] border-l-slate-400 bg-gradient-to-br from-slate-50/15 via-white to-white hover:shadow-slate-400/8 hover:border-slate-400",
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
      className={`rounded-2xl border border-slate-100 p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
        CARD_STYLE[tone] ?? CARD_STYLE.slate
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">{label}</span>
        {icon && (
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-all duration-300 ${ICON_STYLE[tone] ?? ICON_STYLE.slate}`}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d={icon} />
            </svg>
          </span>
        )}
      </div>
      <div className={`mt-4 text-2xl font-black tracking-tight sm:text-[1.8rem] leading-none ${accent ? "text-price" : "text-slate-900"}`}>
        {value}
      </div>
      {hint && <div className="mt-2 text-xs font-semibold text-slate-400">{hint}</div>}
    </div>
  );
}
