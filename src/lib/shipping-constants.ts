// Shipping method constants — NO server-only / db imports, so both client and
// server components can import these safely (mirrors payment-constants.ts).

export const SHIPPING_METHODS = ["odien", "thanjai"] as const;

export type ShippingMethod = (typeof SHIPPING_METHODS)[number];

export const SHIPPING_LABEL: Record<ShippingMethod, string> = {
  odien: "ໂອດ້ຽນຂົນສົ່ງ",
  thanjai: "ຂົນສົ່ງທັນໃຈ",
};

export const SHIPPING_HINT: Record<ShippingMethod, string> = {
  odien: "ບໍລິການຈັດສົ່ງຂອງ OdienMall",
  thanjai: "ບໍລິການຂົນສົ່ງດ່ວນ ທັນໃຈ Express",
};

/** Normalise an untrusted value to a valid method (defaults to Odien). */
export function toShippingMethod(v: unknown): ShippingMethod {
  return (SHIPPING_METHODS as readonly string[]).includes(v as string)
    ? (v as ShippingMethod)
    : "odien";
}

/** Delivery is currently free for every offered shipping method. */
export const SHIPPING_FEE: Record<ShippingMethod, number> = {
  odien: 0,
  thanjai: 0,
};

/** Free shipping when the cart subtotal reaches this (LAK). 0 = disabled. */
export const FREE_SHIPPING_OVER = 0;

/**
 * Authoritative delivery fee for an order. Used by the checkout (display) AND
 * re-computed server-side in createOrder (never trust a client-sent fee).
 */
export function computeShippingFee(method: string, subtotal: number): number {
  if (FREE_SHIPPING_OVER > 0 && subtotal >= FREE_SHIPPING_OVER) return 0;
  return SHIPPING_FEE[toShippingMethod(method)] ?? 0;
}
