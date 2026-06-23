// Payment method constants — NO server-only / db imports, so both client and
// server components can import these safely (mirrors order-constants.ts).

// All KNOWN methods (kept so historical orders — e.g. old COD orders — still
// resolve a label). The checkout only OFFERS the subset in OFFERED_PAYMENT_METHODS.
export const PAYMENT_METHODS = ["transfer", "cod"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  transfer: "ໂອນຜ່ານ BCEL",
  cod: "ເກັບເງິນປາຍທາງ (COD)",
};

export const PAYMENT_HINT: Record<PaymentMethod, string> = {
  transfer: "ໂອນເງິນຜ່ານ BCEL ແລ້ວສົ່ງສະລິບໃຫ້ພວກເຮົາຢືນຢັນ",
  cod: "ຈ່າຍເງິນສົດເມື່ອຮັບສິນຄ້າ",
};

/** Methods currently offered to customers at checkout. */
export const OFFERED_PAYMENT_METHODS = ["transfer", "cod"] as const;

/** Normalise an untrusted value to a valid method (defaults to BCEL transfer). */
export function toPaymentMethod(v: unknown): PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(v as string)
    ? (v as PaymentMethod)
    : "transfer";
}
