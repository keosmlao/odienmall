import { STATUS_LABEL } from "@/lib/order-constants";

// Visual fulfilment progress. `cancelled` is shown as a distinct terminal state.
// Transfer orders pay first; COD orders are placed then paid on delivery.
const TRANSFER_FLOW = ["pending", "awaiting_confirmation", "paid", "shipping", "completed"] as const;
const COD_FLOW = ["cod", "shipping", "completed"] as const;

export default function OrderTimeline({
  status,
  paymentMethod,
}: {
  status: string;
  paymentMethod?: string;
}) {
  const FLOW = paymentMethod === "cod" || status === "cod" ? COD_FLOW : TRANSFER_FLOW;
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-red-500 text-white">✕</span>
        {STATUS_LABEL.cancelled}
      </div>
    );
  }

  const steps = FLOW as readonly string[];
  const idx = Math.max(0, steps.indexOf(status));
  const last = steps.length - 1;

  return (
    <ol className="flex items-start overflow-x-auto pb-1">
      {steps.map((s, i) => {
        const done = i <= idx;
        return (
          <li key={s} className={`flex items-center ${i < last ? "flex-1" : ""}`}>
            <div className="flex w-16 shrink-0 flex-col items-center gap-1 sm:w-24">
              <span
                className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold transition ${
                  done ? "bg-brand text-white" : "bg-gray-200 text-gray-400"
                } ${i === idx ? "ring-4 ring-brand-light" : ""}`}
              >
                {i < idx ? "✓" : i + 1}
              </span>
              <span className={`text-center text-[11px] leading-tight ${done ? "font-medium text-gray-700" : "text-gray-400"}`}>
                {STATUS_LABEL[s as keyof typeof STATUS_LABEL] ?? s}
              </span>
            </div>
            {i < last && (
              <span className={`mt-4 h-0.5 flex-1 ${i < idx ? "bg-brand" : "bg-gray-200"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
