"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { awardProfileAddress, awardProfileBirthday } from "@/lib/engage-points";
import { getDistricts, getVillages, type GeoItem } from "@/lib/lao-geo";

/** Cascade dropdown helpers (called from the client on province/district change). */
export async function fetchDistricts(provinceCode: string): Promise<GeoItem[]> {
  return getDistricts(String(provinceCode || "").trim());
}
export async function fetchVillages(amperCode: string): Promise<GeoItem[]> {
  return getVillages(String(amperCode || "").trim());
}

export type SaveResult =
  | { ok: true; awarded: number }
  | { ok: false; error: string };

export interface ProfileInput {
  name: string; // name_1
  village: string; // tambon (ບ້ານ)
  district: string; // amper (ເມືອງ)
  province: string; // province (ແຂວງ)
  address: string; // free-text detail (optional)
  birthday: string; // yyyy-mm-dd or ""
  sex: string; // "1" male | "2" female | ""
}

export async function saveProfile(input: ProfileInput): Promise<SaveResult> {
  const session = await getSession();
  if (!session?.code) return { ok: false, error: "ກະລຸນາເຂົ້າສູ່ລະບົບກ່ອນ" };

  const name = (input.name || "").trim().slice(0, 100);
  const village = (input.village || "").trim();
  const district = (input.district || "").trim();
  const province = (input.province || "").trim();
  const address = (input.address || "").trim();
  const sex = input.sex === "1" || input.sex === "2" ? Number(input.sex) : 0;
  const birthday = /^\d{4}-\d{2}-\d{2}$/.test(input.birthday) ? input.birthday : null;

  try {
    // ERP write (UPDATE only — the check_ar_type trigger is INSERT-only, so this is safe).
    await query(
      `update public.ar_customer
          set name_1 = case when $8 <> '' then $8 else name_1 end,
              tambon = $2, amper = $3, province = $4,
              address = case when $5 <> '' then $5 else address end,
              sex = $6,
              birth_day = coalesce($7::date, birth_day)
        where code = $1`,
      [session.code, village, district, province, address, sex, birthday, name],
    );
  } catch (e) {
    console.error("saveProfile failed:", e);
    return { ok: false, error: "ບັນທຶກບໍ່ສຳເລັດ ກະລຸນາລອງໃໝ່" };
  }

  // Award engagement points (idempotent — once per customer, only if complete).
  const [a, b] = await Promise.all([
    awardProfileAddress(session.code).catch(() => 0),
    awardProfileBirthday(session.code).catch(() => 0),
  ]);
  const awarded = a + b;

  revalidatePath("/account");
  revalidatePath("/account/profile");
  return { ok: true, awarded };
}
