"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import {
  createCustomerAddress,
  deleteCustomerAddress,
  setDefaultAddress,
  getCustomerAddresses,
  type AddressRecord,
} from "@/lib/addresses";

export type AddressActionResult =
  | { ok: true; addresses: AddressRecord[] }
  | { ok: false; error: string };

export interface NewAddressInput {
  recipient?: string;
  phone?: string;
  province: string;
  district: string;
  village?: string;
  detail?: string;
  makeDefault?: boolean;
}

/** Add a delivery address to the signed-in customer's address book. */
export async function addAddress(input: NewAddressInput): Promise<AddressActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "ກະລຸນາເຂົ້າສູ່ລະບົບ" };
  try {
    await createCustomerAddress(session.code, {
      recipient: input.recipient,
      phone: input.phone,
      province: input.province,
      district: input.district,
      village: input.village,
      detail: input.detail,
      makeDefault: input.makeDefault,
    });
    revalidatePath("/account");
    return { ok: true, addresses: await getCustomerAddresses(session.code) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ບໍ່ສາມາດບັນທຶກໄດ້" };
  }
}

/** Remove one address (owner-scoped). */
export async function removeAddress(id: number): Promise<AddressActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "ກະລຸນາເຂົ້າສູ່ລະບົບ" };
  try {
    await deleteCustomerAddress(id, session.code);
    revalidatePath("/account");
    return { ok: true, addresses: await getCustomerAddresses(session.code) };
  } catch {
    return { ok: false, error: "ບໍ່ສາມາດລຶບໄດ້" };
  }
}

/** Mark one address as the default. */
export async function makeDefaultAddress(id: number): Promise<AddressActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "ກະລຸນາເຂົ້າສູ່ລະບົບ" };
  try {
    await setDefaultAddress(id, session.code);
    revalidatePath("/account");
    return { ok: true, addresses: await getCustomerAddresses(session.code) };
  } catch {
    return { ok: false, error: "ບໍ່ສຳເລັດ" };
  }
}
