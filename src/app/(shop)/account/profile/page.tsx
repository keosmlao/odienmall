import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { getPointRules } from "@/lib/engage-points";
import { getProvinces, getDistricts, getVillages } from "@/lib/lao-geo";
import ProfileForm from "./ProfileForm";

export const metadata: Metadata = { title: "ຂໍ້ມູນສ່ວນຕົວ" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/account/profile");

  const [row, rules] = await Promise.all([
    queryOne<{
      name_1: string | null;
      tambon: string | null; amper: string | null; province: string | null;
      address: string | null; birth_day: Date | null; sex: number | null;
    }>(
      `select name_1, tambon, amper, province, address, birth_day, sex from public.ar_customer where code = $1`,
      [session.code],
    ),
    getPointRules(),
  ]);

  const initial = {
    name: row?.name_1 ?? "",
    village: row?.tambon ?? "",
    district: row?.amper ?? "",
    province: row?.province ?? "",
    address: row?.address ?? "",
    birthday: row?.birth_day ? row.birth_day.toISOString().slice(0, 10) : "",
    sex: row?.sex === 1 || row?.sex === 2 ? String(row.sex) : "",
  };

  // Geo dropdowns: all provinces, plus the current province's districts and the
  // current district's villages (so the saved selection shows up pre-filled).
  const [provinces, initialDistricts, initialVillages] = await Promise.all([
    getProvinces(),
    initial.province ? getDistricts(initial.province) : Promise.resolve([]),
    initial.district ? getVillages(initial.district) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-slate-800">ຂໍ້ມູນສ່ວນຕົວ</h1>
        <Link href="/account" className="text-xs font-bold text-orange-600 hover:underline">‹ ບັນຊີ</Link>
      </div>
      <p className="rounded-xl bg-orange-50 px-4 py-3 text-xs font-semibold text-orange-700">
        ຕື່ມຂໍ້ມູນໃຫ້ຄົບ ຮັບແຕ້ມສະສົມ — ທີ່ຢູ່ຄົບ +{rules.addressPoints} ແຕ້ມ · ວັນເກີດ+ເພດ +{rules.birthdayPoints} ແຕ້ມ
      </p>
      <ProfileForm
        initial={initial}
        provinces={provinces}
        initialDistricts={initialDistricts}
        initialVillages={initialVillages}
        addressPoints={rules.addressPoints}
        birthdayPoints={rules.birthdayPoints}
      />
    </div>
  );
}
