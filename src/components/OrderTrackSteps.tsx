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
  compact = false,
}: {
  status: string;
  paymentMethod?: string;
  compact?: boolean;
}) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4 text-sm font-bold text-rose-600">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-200">✕</span>
        <span>
          <span className="block">ຄຳສັ່ງຊື້ນີ້ຖືກຍົກເລີກ</span>
          <span className="mt-0.5 block text-xs font-normal text-rose-500">ຕິດຕໍ່ຮ້ານ ຖ້າທ່ານໄດ້ຊຳລະເງິນແລ້ວ</span>
        </span>
      </div>
    );
  }

  const steps = (paymentMethod === "cod" || status === "cod" ? COD_FLOW : TRANSFER_FLOW) as readonly string[];
  const idx = Math.max(0, steps.indexOf(status));

  return (
    <ol
      className={compact ? "relative" : "grid gap-0 md:grid"}
      style={compact ? undefined : { gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        const last = i === steps.length - 1;
        return (
          <li
            key={s}
            className={
              compact
                ? "relative flex gap-3 pb-5 last:pb-0"
                : "relative flex gap-3 pb-5 last:pb-0 md:flex-col md:items-center md:gap-2 md:pb-0 md:text-center"
            }
          >
            {/* connector line */}
            {!last && (
              <span
                className={`absolute left-[17px] top-9 h-[calc(100%-1.25rem)] w-0.5 md:left-[calc(50%+18px)] md:top-[17px] md:h-0.5 md:w-[calc(100%-36px)] ${
                  i < idx ? "bg-orange-500" : "bg-slate-200"
                }`}
              />
            )}
            {/* dot */}
            <span
              className={`relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 text-xs font-black transition ${
                done
                  ? "border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-100"
                  : active
                    ? "border-orange-500 bg-white text-orange-600 ring-4 ring-orange-100"
                    : "border-slate-200 bg-white text-slate-400"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <div className={`pt-0.5 md:px-2 ${active ? "" : "opacity-80"}`}>
              <div className={`text-sm font-bold ${active ? "text-orange-600" : done ? "text-slate-700" : "text-slate-400"}`}>
                {STATUS_LABEL[s as keyof typeof STATUS_LABEL] ?? s}
              </div>
              {!compact && <div className="mt-0.5 text-[11px] leading-4 text-slate-400">{HINT[s] ?? ""}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
