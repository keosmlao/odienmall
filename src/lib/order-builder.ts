import "server-only";
import { getProducts } from "./catalog";
import { createOrder, type OrderInputItem } from "./orders";
import { SITE_URL } from "./config";
import { query, queryOne } from "./db";
import { composeAddress, districtsOf, LAO_PROVINCES } from "./lao-locations";
import { toShippingMethod } from "./shipping-constants";

// Shared logic for staff/affiliate-created orders ("order on behalf of a
// customer"). Reuses the normal createOrder pipeline (server-side re-pricing,
// pending snapshot + QR), then returns a shareable payment link.

export interface OrderProductHit {
  code: string;
  name: string;
  price: number | null;
  unit: string | null;
  stock: number;
}

export interface OrderCustomerHit {
  code: string;
  source: "erp" | "local";
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

/** Read-only ERP customer search for staff/affiliate assisted orders. */
export async function searchOrderCustomers(q: string): Promise<OrderCustomerHit[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const like = `%${term}%`;
  const [erp, local] = await Promise.all([
    query<Omit<OrderCustomerHit, "source">>(
    `select code,
            coalesce(nullif(name_1,''), nullif(name_2,''), code) as name,
            nullif(coalesce(nullif(telephone,''), nullif(sms_phonenumber,'')), '') as phone,
            nullif(email,'') as email,
            nullif(coalesce(nullif(address,''), nullif(home_address,'')), '') as address
       from public.ar_customer
      where coalesce(status,0) = 0
        and (
          code ilike $1
          or name_1 ilike $1
          or name_2 ilike $1
          or telephone ilike $1
          or sms_phonenumber ilike $1
          or email ilike $1
        )
      order by case when code = $2 then 0 else 1 end, name_1
      limit 20`,
    [like, term],
    ),
    query<Omit<OrderCustomerHit, "source">>(
      `select 'local:' || id::text as code, name,
              nullif(phone,'') as phone, nullif(email,'') as email,
              nullif(address,'') as address
         from ecom.assisted_customers
        where name ilike $1 or phone ilike $1 or coalesce(email,'') ilike $1
        order by updated_at desc
        limit 20`,
      [like],
    ),
  ]);
  return [
    ...erp.map((customer) => ({ ...customer, source: "erp" as const })),
    ...local.map((customer) => ({ ...customer, source: "local" as const })),
  ].slice(0, 20);
}

/** Validate an ERP customer code without writing to the ERP. */
export async function getOrderCustomer(code: string): Promise<OrderCustomerHit | null> {
  if (code.startsWith("local:")) {
    const id = Number(code.slice(6));
    if (!Number.isInteger(id) || id <= 0) return null;
    const local = await queryOne<Omit<OrderCustomerHit, "source">>(
      `select 'local:' || id::text as code, name,
              nullif(phone,'') as phone, nullif(email,'') as email,
              nullif(address,'') as address
         from ecom.assisted_customers where id = $1`,
      [id],
    );
    return local ? { ...local, source: "local" } : null;
  }
  const erp = await queryOne<Omit<OrderCustomerHit, "source">>(
    `select code,
            coalesce(nullif(name_1,''), nullif(name_2,''), code) as name,
            nullif(coalesce(nullif(telephone,''), nullif(sms_phonenumber,'')), '') as phone,
            nullif(email,'') as email,
            nullif(coalesce(nullif(address,''), nullif(home_address,'')), '') as address
       from public.ar_customer
      where code = $1 and coalesce(status,0) = 0`,
    [code],
  );
  return erp ? { ...erp, source: "erp" } : null;
}

/** Save/reuse a non-ERP customer so future assisted orders can find them. */
export async function saveAssistedCustomer(input: {
  name: string;
  phone: string;
  address?: string;
  createdBy?: string;
}): Promise<void> {
  const name = input.name.trim();
  const phone = input.phone.trim();
  if (!name || !phone) return;
  const existing = await queryOne<{ id: string }>(
    `select id from ecom.assisted_customers where phone = $1 order by id limit 1`,
    [phone],
  );
  if (existing) {
    await query(
      `update ecom.assisted_customers
          set name = $2, address = coalesce(nullif($3,''), address),
              updated_at = now()
        where id = $1`,
      [existing.id, name, input.address?.trim() ?? ""],
    );
    return;
  }
  await query(
    `insert into ecom.assisted_customers (name, phone, address, created_by)
     values ($1,$2,nullif($3,''),$4)`,
    [name, phone, input.address?.trim() ?? "", input.createdBy ?? null],
  );
}

/** Product search for the order builder (web items, priced). */
export async function searchOrderProducts(q: string): Promise<OrderProductHit[]> {
  const term = q.trim();
  if (term.length < 1) return [];
  const page = await getProducts({ search: term, page: 1, pageSize: 20, sort: "newest" });
  return page.items.map((p) => ({
    code: p.code,
    name: p.name,
    price: p.price,
    unit: p.unit,
    stock: p.stock,
  }));
}

export interface ManualOrderInput {
  customerCode?: string | null;
  name: string;
  phone: string;
  province?: string;
  district?: string;
  village?: string;
  detail?: string;
  shippingMethod?: string;
  note?: string;
  voucherCode?: string | null;
  items: OrderInputItem[];
  /** Affiliate referral code to attribute commission (affiliate-created orders). */
  referralCode?: string | null;
  paymentMethod?: string;
}

export interface ManualOrderResult {
  orderNo: string;
  total: number;
  link: string;
}

/** Create a pending order on behalf of a customer; returns the pay link. */
export async function buildManualOrder(input: ManualOrderInput): Promise<ManualOrderResult> {
  const province = input.province?.trim() ?? "";
  const district = input.district?.trim() ?? "";
  const village = input.village?.trim() ?? "";
  const detail = input.detail?.trim() ?? "";
  // Prefer a structured Lao address; otherwise accept a free-text address
  // (assisted orders often have only the customer's raw address string).
  const structured =
    LAO_PROVINCES.some((item) => item.name === province) && districtsOf(province).includes(district);
  const address = structured
    ? composeAddress({ province, district, village, detail })
    : [village && `ບ້ານ ${village}`, district && `ເມືອງ ${district}`, province && `ແຂວງ ${province}`, detail]
        .filter(Boolean)
        .join(", ")
        .trim();
  if (!address) {
    throw new Error("ກະລຸນາໃສ່ທີ່ຢູ່ສົ່ງເຄື່ອງ");
  }
  const shippingMethod = toShippingMethod(input.shippingMethod);
  const { orderNo, subtotal, shippingFee, discount, memberDiscount, pointsValue } = await createOrder(
    {
      name: input.name,
      phone: input.phone,
      address,
      note: input.note,
      customerCode: input.customerCode ?? null,
      referralCode: input.referralCode ?? null,
      voucherCode: input.voucherCode ?? null,
      paymentMethod: input.paymentMethod || "transfer",
      shippingMethod,
    },
    input.items,
  );
  const total = Math.max(0, subtotal + shippingFee - discount - memberDiscount - pointsValue);
  return { orderNo, total, link: `${SITE_URL}/order/${orderNo}` };
}
