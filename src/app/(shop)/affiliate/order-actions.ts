"use server";

import { getSession } from "@/lib/auth";
import { getAffiliateByCustomer } from "@/lib/affiliates";
import {
  searchOrderProducts,
  searchOrderCustomers,
  getOrderCustomer,
  saveAssistedCustomer,
  buildManualOrder,
  type OrderProductHit,
  type OrderCustomerHit,
} from "@/lib/order-builder";
import { composeAddress } from "@/lib/lao-locations";

async function activeAffiliate() {
  const session = await getSession();
  if (!session?.code) return null;
  const aff = await getAffiliateByCustomer(session.code);
  return aff && aff.status === "active" ? aff : null;
}

export async function affiliateSearchProducts(q: string): Promise<OrderProductHit[]> {
  if (!(await activeAffiliate())) return [];
  return searchOrderProducts(q);
}

export async function affiliateSearchCustomers(q: string): Promise<OrderCustomerHit[]> {
  if (!(await activeAffiliate())) return [];
  return searchOrderCustomers(q);
}

export type BuildResult =
  | { ok: true; orderNo: string; total: number; link: string }
  | { ok: false; error: string };

export async function affiliateCreateOrder(input: {
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
}): Promise<BuildResult> {
  const aff = await activeAffiliate();
  if (!aff) return { ok: false, error: "ສະເພາະນາຍໜ້າທີ່ active" };
  if (!input.name?.trim() || !input.phone?.trim()) return { ok: false, error: "ກະລຸນາໃສ່ຊື່ ແລະ ເບີໂທ" };
  if (!input.items?.length) return { ok: false, error: "ກະລຸນາເພີ່ມສິນຄ້າ" };
  try {
    const customerRef = input.customerCode?.trim() || null;
    const selected = customerRef ? await getOrderCustomer(customerRef) : null;
    if (customerRef && !selected) {
      return { ok: false, error: "ບໍ່ພົບຂໍ້ມູນລູກຄ້າ" };
    }
    const customerCode = selected?.source === "erp" ? selected.code : null;
    if (customerCode) {
      if (customerCode === aff.customerCode) {
        return { ok: false, error: "ບໍ່ສາມາດສ້າງອໍເດີໃຫ້ບັນຊີນາຍໜ້າຂອງຕົນເອງ" };
      }
    }
    // Attribute commission to this affiliate (self-referral is dropped server-side).
    const res = await buildManualOrder({ ...input, customerCode, referralCode: aff.code });
    if (!customerRef) {
      await saveAssistedCustomer({
        name: input.name,
        phone: input.phone,
        address: composeAddress(input),
        createdBy: `affiliate:${aff.code}`,
      });
    }
    return { ok: true, ...res };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ສ້າງບໍ່ສຳເລັດ" };
  }
}
