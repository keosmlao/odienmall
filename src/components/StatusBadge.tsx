import { STATUS_LABEL, type OrderStatus } from "@/lib/order-constants";

const STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-750 ring-amber-200/60",
  cod: "bg-orange-50 text-orange-750 ring-orange-200/60",
  awaiting_confirmation: "bg-blue-50 text-blue-700 ring-blue-200/60",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
  shipping: "bg-indigo-50 text-indigo-700 ring-indigo-200/60",
  completed: "bg-emerald-100 text-emerald-800 ring-emerald-200/80",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-200/80",
};

export default function StatusBadge({ status }: { status: OrderStatus | string }) {
  const label = STATUS_LABEL[status as OrderStatus] ?? status;
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase ring-1 ring-inset ${
        STYLE[status] ?? "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {label}
    </span>
  );
}
