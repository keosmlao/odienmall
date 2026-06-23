// SML transport_type choices available when admin confirms a web order.
// Client-safe: no database or server-only imports.
export const ADMIN_TRANSPORTS = [
  { code: "02-0001", label: "ຂົວຫຼວງ" },
  { code: "02-0002", label: "ດອນຕິ້ວ" },
  { code: "02-0007", label: "ໂພນສະອາດ" },
  { code: "02-0003", label: "ປາກເຊ" },
] as const;

export type AdminTransportCode = (typeof ADMIN_TRANSPORTS)[number]["code"];

export function toAdminTransportCode(value: string): AdminTransportCode | null {
  return ADMIN_TRANSPORTS.some((option) => option.code === value)
    ? (value as AdminTransportCode)
    : null;
}

export function adminTransportLabel(code: string): string {
  return ADMIN_TRANSPORTS.find((option) => option.code === code)?.label ?? code;
}
