import "server-only";
import { query, queryOne } from "./db";
import { composeAddress } from "./lao-locations";

// Customer address book (odg_ecom.customer_addresses). A logged-in customer can save
// many delivery addresses; one is snapshotted onto each order at checkout.

export interface AddressRecord {
  id: number;
  recipient: string | null;
  phone: string | null;
  province: string;
  district: string;
  village: string | null;
  detail: string | null;
  isDefault: boolean;
  /** One-line composed address (detail, ບ້ານ, ເມືອງ, ແຂວງ). */
  label: string;
}

export interface AddressInput {
  recipient?: string | null;
  phone?: string | null;
  province: string;
  district: string;
  village?: string | null;
  detail?: string | null;
  makeDefault?: boolean;
}

type Row = {
  id: number;
  recipient: string | null;
  phone: string | null;
  province: string;
  district: string;
  village: string | null;
  detail: string | null;
  is_default: boolean;
};

function toRecord(r: Row): AddressRecord {
  return {
    id: r.id,
    recipient: r.recipient,
    phone: r.phone,
    province: r.province,
    district: r.district,
    village: r.village,
    detail: r.detail,
    isDefault: r.is_default,
    label: composeAddress(r),
  };
}

/** All saved addresses for a customer, default first then newest. */
export async function getCustomerAddresses(customerCode: string): Promise<AddressRecord[]> {
  if (!customerCode) return [];
  const rows = await query<Row>(
    `select id, recipient, phone, province, district, village, detail, is_default
       from odg_ecom.customer_addresses
      where customer_code = $1
      order by is_default desc, id desc`,
    [customerCode],
  );
  return rows.map(toRecord);
}

/** A single address, scoped to its owner (returns null if not theirs). */
export async function getCustomerAddress(
  id: number,
  customerCode: string,
): Promise<AddressRecord | null> {
  if (!customerCode || !Number.isFinite(id)) return null;
  const row = await queryOne<Row>(
    `select id, recipient, phone, province, district, village, detail, is_default
       from odg_ecom.customer_addresses
      where id = $1 and customer_code = $2`,
    [id, customerCode],
  );
  return row ? toRecord(row) : null;
}

/** Insert a new address. First address (or makeDefault) becomes the default. */
export async function createCustomerAddress(
  customerCode: string,
  input: AddressInput,
): Promise<AddressRecord> {
  const province = input.province?.trim();
  const district = input.district?.trim();
  if (!customerCode) throw new Error("customer required");
  if (!province || !district) throw new Error("ກະລຸນາເລືອກ ແຂວງ ແລະ ເມືອງ");

  const existing = await queryOne<{ n: number }>(
    `select count(*)::int as n from odg_ecom.customer_addresses where customer_code = $1`,
    [customerCode],
  );
  const isDefault = input.makeDefault || (existing?.n ?? 0) === 0;

  if (isDefault) {
    await query(
      `update odg_ecom.customer_addresses set is_default = false where customer_code = $1`,
      [customerCode],
    );
  }
  const row = await queryOne<Row>(
    `insert into odg_ecom.customer_addresses
       (customer_code, recipient, phone, province, district, village, detail, is_default)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     returning id, recipient, phone, province, district, village, detail, is_default`,
    [
      customerCode,
      input.recipient?.trim() || null,
      input.phone?.trim() || null,
      province,
      district,
      input.village?.trim() || null,
      input.detail?.trim() || null,
      isDefault,
    ],
  );
  return toRecord(row as Row);
}

/** Delete one address (owner-scoped). Re-points the default if needed. */
export async function deleteCustomerAddress(id: number, customerCode: string): Promise<void> {
  if (!customerCode || !Number.isFinite(id)) return;
  const removed = await queryOne<{ is_default: boolean }>(
    `delete from odg_ecom.customer_addresses
      where id = $1 and customer_code = $2
      returning is_default`,
    [id, customerCode],
  );
  // If the default was removed, promote the newest remaining address.
  if (removed?.is_default) {
    await query(
      `update odg_ecom.customer_addresses set is_default = true
        where id = (
          select id from odg_ecom.customer_addresses
           where customer_code = $1 order by id desc limit 1
        )`,
      [customerCode],
    );
  }
}

/** Make one address the default (owner-scoped). */
export async function setDefaultAddress(id: number, customerCode: string): Promise<void> {
  if (!customerCode || !Number.isFinite(id)) return;
  await query(
    `update odg_ecom.customer_addresses set is_default = false where customer_code = $1`,
    [customerCode],
  );
  await query(
    `update odg_ecom.customer_addresses set is_default = true where id = $1 and customer_code = $2`,
    [id, customerCode],
  );
}
