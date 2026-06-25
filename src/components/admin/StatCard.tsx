// Reusable KPI card for the admin dashboard / report pages.
// `icon` is an SVG path string; `tone` colours the icon chip.

const CARD_STYLE: Record<string, string> = {
  brand: "border-slate-200 bg-white",
  green: "border-slate-200 bg-white",
  amber: "border-slate-200 bg-white",
  blue: "border-slate-200 bg-white",
  slate: "border-slate-200 bg-white",
};

const ICON_STYLE: Record<string, string> = {
  brand: "border-orange-200 bg-orange-50 text-orange-600",
  green: "border-emerald-200 bg-emerald-50 text-emerald-600",
  amber: "border-amber-200 bg-amber-50 text-amber-600",
  blue: "border-blue-200 bg-blue-50 text-blue-600",
  slate: "border-slate-200 bg-slate-50 text-slate-500",
};

const STRIP_STYLE: Record<string, string> = {
  brand: "bg-orange-500",
  green: "bg-emerald-500",
  amber: "bg-amber-400",
  blue: "bg-cyan-500",
  slate: "bg-slate-400",
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
      className={`relative overflow-hidden rounded-lg border p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md ${
        CARD_STYLE[tone] ?? CARD_STYLE.slate
      }`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 ${STRIP_STYLE[tone] ?? STRIP_STYLE.slate}`} />
      <div className="flex items-start justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
        {icon && (
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-md border ${ICON_STYLE[tone] ?? ICON_STYLE.slate}`}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
              <path d={icon} />
            </svg>
          </span>
        )}
      </div>
      <div className={`mt-2 text-2xl font-black leading-none ${accent ? "text-price" : "text-slate-950"}`}>
        {value}
      </div>
      {hint && <div className="mt-2 text-xs font-semibold text-slate-500">{hint}</div>}
    </div>
  );
}
