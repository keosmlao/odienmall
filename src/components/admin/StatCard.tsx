// Reusable KPI card for the admin dashboard / report pages.
// `icon` is an SVG path string; `tone` colours the icon chip.

const ICON_STYLE: Record<string, string> = {
  brand: "text-orange-500 bg-orange-50/80 border-orange-100/50 group-hover:bg-orange-100 group-hover:text-orange-600",
  green: "text-emerald-500 bg-emerald-50/80 border-emerald-100/50 group-hover:bg-emerald-100 group-hover:text-emerald-600",
  amber: "text-amber-500 bg-amber-50/80 border-amber-100/50 group-hover:bg-amber-100 group-hover:text-amber-600",
  blue: "text-blue-500 bg-blue-50/80 border-blue-100/50 group-hover:bg-blue-100 group-hover:text-blue-655",
  slate: "text-slate-500 bg-slate-50/80 border-slate-200/50 group-hover:bg-slate-100 group-hover:text-slate-655",
};

const HOVER_BORDER: Record<string, string> = {
  brand: "hover:border-orange-200 hover:shadow-orange-500/5",
  green: "hover:border-emerald-200 hover:shadow-emerald-500/5",
  amber: "hover:border-amber-200 hover:shadow-amber-500/5",
  blue: "hover:border-blue-200 hover:shadow-blue-500/5",
  slate: "hover:border-slate-300 hover:shadow-slate-500/5",
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
  tone?: keyof typeof HOVER_BORDER | string;
  accent?: boolean;
  hint?: string;
}) {
  const borderClass = HOVER_BORDER[tone] ?? HOVER_BORDER.slate;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${borderClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span>
        {icon && (
          <span className={`grid h-8.5 w-8.5 shrink-0 place-items-center rounded-xl border transition-all duration-300 group-hover:scale-110 ${ICON_STYLE[tone] ?? ICON_STYLE.slate}`}>
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d={icon} />
            </svg>
          </span>
        )}
      </div>
      <div className={`mt-3 text-2xl font-extrabold tracking-tight ${accent ? "text-price" : "text-slate-900"}`}>
        {value}
      </div>
      {hint && <div className="mt-2 text-xs font-semibold text-slate-500">{hint}</div>}
    </div>
  );
}
