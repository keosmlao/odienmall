import { STATUS_LABEL } from "@/lib/order-constants";

// Lazada-style vertical order-tracking timeline. Transfer orders pay up front;
// COD orders are placed then paid on delivery.
const TRANSFER_FLOW = ["pending", "awaiting_confirmation", "paid", "shipping", "completed"] as const;
const COD_FLOW = ["cod", "paid", "shipping", "completed"] as const;

const HINT: Record<string, string> = {
  pending: "ລໍຖ້າລູກຄ້າຊຳລະເງິນ",
  cod: "ຮັບຄຳສັ່ງຊື້ — ຈ່າຍປາຍທາງ",
  awaiting_confirmation: "ຊຳລະເງິນແລ້ວ ລໍຖ້າຮ້ານຢືນຢັນ",
  paid: "ຮ້ານກຽມສິນຄ້າ ລໍຖ້າຈັດສົ່ງ",
  shipping: "ພັດສະດຸກຳລັງເດີນທາງຫາທ່ານ",
  completed: "ຈັດສົ່ງສຳເລັດ — ຂອບໃຈ 🎉",
};

export default function OrderTrackSteps({
  status,
  paymentMethod,
}: {
  status: string;
  paymentMethod?: string;
}) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-rose-500 text-white">✕</span>
        ຄຳສັ່ງຊື້ນີ້ຖືກຍົກເລີກ
      </div>
    );
  }

  const steps = (paymentMethod === "cod" || status === "cod" ? COD_FLOW : TRANSFER_FLOW) as readonly string[];
  const idx = Math.max(0, steps.indexOf(status));

  return (
    <ol className="relative">
      {steps.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        const last = i === steps.length - 1;
        return (
          <li key={s} className="relative flex gap-3 pb-5 last:pb-0">
            {/* connector line */}
            {!last && (
              <span
                className={`absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-0.5 ${i < idx ? "bg-emerald-400" : "bg-slate-200"}`}
              />
            )}
            {/* dot */}
            <span
              className={`relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                done
                  ? "bg-emerald-500 text-white"
                  : active
                    ? "bg-brand text-white ring-4 ring-brand-light"
                    : "bg-slate-200 text-slate-400"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <div className={`pt-0.5 ${active ? "" : "opacity-80"}`}>
              <div className={`text-sm font-bold ${active ? "text-brand-dark" : done ? "text-slate-700" : "text-slate-400"}`}>
                {STATUS_LABEL[s as keyof typeof STATUS_LABEL] ?? s}
              </div>
              <div className="text-xs text-slate-400">{HINT[s] ?? ""}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
