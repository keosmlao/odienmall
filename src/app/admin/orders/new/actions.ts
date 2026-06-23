"use server";

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getAdminSession, isAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import {
  searchOrderProducts,
  searchOrderCustomers,
  getOrderCustomer,
  saveAssistedCustomer,
  buildManualOrder,
  type OrderProductHit,
  type OrderCustomerHit,
} from "@/lib/order-builder";
import { getCustomerAddresses } from "@/lib/addresses";
import { logAudit } from "@/lib/audit";
import { composeAddress } from "@/lib/lao-locations";

export interface SavedAddr {
  id: number;
  recipient: string | null;
  phone: string | null;
  province: string;
  district: string;
  village: string | null;
  detail: string | null;
  isDefault: boolean;
  label: string;
}

/** A registered customer's saved delivery addresses (ecom.customer_addresses). */
export async function adminCustomerAddresses(code: string): Promise<SavedAddr[]> {
  if (!(await isAdmin())) return [];
  const c = (code || "").trim();
  if (!c || c.startsWith("local:")) return []; // only registered ERP customers have an address book
  const list = await getCustomerAddresses(c).catch(() => []);
  return list.map((a) => ({
    id: a.id,
    recipient: a.recipient,
    phone: a.phone,
    province: a.province,
    district: a.district,
    village: a.village,
    detail: a.detail,
    isDefault: a.isDefault,
    label: a.label,
  }));
}

export type SlipResult = { ok: true; url: string } | { ok: false; error: string };

/** Attach a transfer slip (image the customer sent) to an assisted order. */
export async function adminUploadSlip(orderNo: string, formData: FormData): Promise<SlipResult> {
  if (!(await isAdmin())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  const file = formData.get("slip");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "ກະລຸນາເລືອກໄຟລ໌ສະລິບ" };
  if (!file.type.startsWith("image/")) return { ok: false, error: "ຮອງຮັບສະເພາະຮູບພາບ" };
  if (file.size > 8 * 1024 * 1024) return { ok: false, error: "ໄຟລ໌ໃຫຍ່ເກີນ 8MB" };
  try {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const dir = path.join(process.cwd(), "public", "uploads", "slips");
    await mkdir(dir, { recursive: true });
    const fname = `${orderNo.replace(/[^a-zA-Z0-9_-]/g, "")}-${randomUUID().slice(0, 8)}.${ext}`;
    await writeFile(path.join(dir, fname), Buffer.from(await file.arrayBuffer()));
    const url = `/uploads/slips/${fname}`;
    await query(`update ecom.onepay_payments set slip_url = $2 where order_no = $1`, [orderNo, url]);
    await logAudit({ action: "order.slip.upload", entity: orderNo, detail: url });
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ອັບໂຫຼດບໍ່ສຳເລັດ" };
  }
}

export async function adminSearchProducts(q: string): Promise<OrderProductHit[]> {
  if (!(await isAdmin())) return [];
  return searchOrderProducts(q);
}

export async function adminSearchCustomers(q: string): Promise<OrderCustomerHit[]> {
  if (!(await isAdmin())) return [];
  return searchOrderCustomers(q);
}

export type BuildResult =
  | { ok: true; orderNo: string; total: number; link: string }
  | { ok: false; error: string };

export async function adminCreateOrder(input: {
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
  items: { code: string; qty: number }[];
  paymentMethod?: string;
}): Promise<BuildResult> {
  if (!(await isAdmin())) return { ok: false, error: "ບໍ່ໄດ້ຮັບອະນຸຍາດ" };
  if (!input.name?.trim() || !input.phone?.trim()) return { ok: false, error: "ກະລຸນາໃສ່ຊື່ ແລະ ເບີໂທ" };
  if (!input.items?.length) return { ok: false, error: "ກະລຸນາເພີ່ມສິນຄ້າ" };
  try {
    const customerRef = input.customerCode?.trim() || null;
    const selected = customerRef ? await getOrderCustomer(customerRef) : null;
    if (customerRef && !selected) {
      return { ok: false, error: "ບໍ່ພົບຂໍ້ມູນລູກຄ້າໃນລະບົບ" };
    }
    const customerCode = selected?.source === "erp" ? selected.code : null;
    const res = await buildManualOrder({ ...input, customerCode });
    if (!customerRef) {
      const admin = await getAdminSession();
      await saveAssistedCustomer({
        name: input.name,
        phone: input.phone,
        address: composeAddress(input),
        createdBy: admin?.code ?? "admin",
      });
    }
    await logAudit({ action: "order.manual.create", entity: res.orderNo, detail: `admin; ${res.total} LAK` });
    return { ok: true, ...res };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ສ້າງບໍ່ສຳເລັດ" };
  }
}
