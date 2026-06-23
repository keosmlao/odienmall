// Order status constants — NO server-only / db imports, so both client and
// server components can import these safely.
//
// The ic_trans (CAE) record is created ONLY when the customer pays — so an order
// in ic_trans is already paid. Before payment it's just a QR holder (no ic_trans).
// Web status:
//   pending   → unpaid: QR holder only, no ic_trans row yet (ລໍຖ້າຊຳລະ)
//   awaiting_confirmation → ic_trans.trans_flag = 34 (paid, waiting for admin)
//   paid      → ic_trans.trans_flag = 44 (admin confirmed / issued the bill)
//   shipping  → bill in odg_tms_detail, sent_end IS NULL   (ກຳລັງຈັດສົ່ງ)
//   completed → bill in odg_tms_detail, sent_end IS NOT NULL (ສົ່ງສຳເລັດ)
//   cancelled → ic_trans.is_cancel = 1
export const ORDER_STATUSES = [
  "pending",
  "cod",
  "awaiting_confirmation",
  "paid",
  "shipping",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "ລໍຖ້າຊຳລະ",
  cod: "COD ລໍຖ້າຈັດສົ່ງ",
  awaiting_confirmation: "ຊຳລະແລ້ວ ລໍຖ້າຢືນຢັນ",
  paid: "ລໍຖ້າຈັດສົ່ງ",
  shipping: "ກຳລັງຈັດສົ່ງ",
  completed: "ຈັດສົ່ງສຳເລັດ",
  cancelled: "ຍົກເລີກ",
};

// Derive the status of an EXISTING ic_trans order from live SML signals.
// A COD order (flag 34, not yet in delivery) is "cod" (placed, cash on delivery);
// a transfer order at flag 34 is paid-awaiting-confirmation.
export function deriveOrderStatus(input: {
  isCancel: boolean;
  transFlag: number;
  inTms: boolean;
  tmsSentEnd: boolean;
  paymentMethod?: string;
}): OrderStatus {
  if (input.isCancel) return "cancelled";
  if (input.inTms) return input.tmsSentEnd ? "completed" : "shipping";
  if (input.transFlag === 34) return input.paymentMethod === "cod" ? "cod" : "awaiting_confirmation";
  return "paid";
}
