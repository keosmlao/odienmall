"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveProfile, fetchDistricts, fetchVillages } from "./actions";
import type { GeoItem } from "@/lib/lao-geo";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 disabled:opacity-60";

export default function ProfileForm({
  initial,
  provinces,
  initialDistricts,
  initialVillages,
  addressPoints,
  birthdayPoints,
}: {
  initial: { name: string; village: string; district: string; province: string; address: string; birthday: string; sex: string };
  provinces: GeoItem[];
  initialDistricts: GeoItem[];
  initialVillages: GeoItem[];
  addressPoints: number;
  birthdayPoints: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [f, setF] = useState(initial);
  const [districts, setDistricts] = useState<GeoItem[]>(initialDistricts);
  const [villages, setVillages] = useState<GeoItem[]>(initialVillages);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function onProvince(code: string) {
    setF((p) => ({ ...p, province: code, district: "", village: "" }));
    setDistricts([]); setVillages([]);
    if (!code) return;
    setLoadingGeo(true);
    fetchDistricts(code).then((d) => setDistricts(d)).finally(() => setLoadingGeo(false));
  }
  function onDistrict(code: string) {
    setF((p) => ({ ...p, district: code, village: "" }));
    setVillages([]);
    if (!code) return;
    setLoadingGeo(true);
    fetchVillages(code).then((v) => setVillages(v)).finally(() => setLoadingGeo(false));
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const addressDone = !!(f.village && f.district && f.province);
  const birthdayDone = !!(f.birthday && (f.sex === "1" || f.sex === "2"));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await saveProfile(f);
      if (res.ok) {
        setMsg({ ok: true, text: res.awarded > 0 ? `ບັນທຶກສຳເລັດ — ໄດ້ຮັບ +${res.awarded} ແຕ້ມ 🎉` : "ບັນທຶກສຳເລັດ" });
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error });
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Name */}
      <fieldset className="rounded-2xl border border-slate-100 p-4">
        <legend className="px-1 text-sm font-black text-slate-700">ຊື່</legend>
        <input value={f.name} onChange={set("name")} disabled={pending} className={inputCls} placeholder="ຊື່ ແລະ ນາມສະກຸນ" />
      </fieldset>

      {/* Address block — cascading dropdowns from the ERP geo tables */}
      <fieldset className="rounded-2xl border border-slate-100 p-4">
        <legend className="flex items-center gap-2 px-1 text-sm font-black text-slate-700">
          ທີ່ຢູ່
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${addressDone ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
            {addressDone ? "✓ ຄົບ" : `+${addressPoints} ແຕ້ມ`}
          </span>
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">ແຂວງ</label>
            <select value={f.province} onChange={(e) => onProvince(e.target.value)} disabled={pending} className={inputCls}>
              <option value="">— ເລືອກແຂວງ —</option>
              {provinces.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">ເມືອງ</label>
            <select value={f.district} onChange={(e) => onDistrict(e.target.value)} disabled={pending || !f.province || loadingGeo} className={inputCls}>
              <option value="">{f.province ? "— ເລືອກເມືອງ —" : "ເລືອກແຂວງກ່ອນ"}</option>
              {districts.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">ບ້ານ</label>
            <select value={f.village} onChange={set("village")} disabled={pending || !f.district || loadingGeo} className={inputCls}>
              <option value="">{f.district ? "— ເລືອກບ້ານ —" : "ເລືອກເມືອງກ່ອນ"}</option>
              {villages.map((v) => <option key={v.code} value={v.code}>{v.name}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-semibold text-slate-500">ລາຍລະອຽດເພີ່ມ (ບໍ່ບັງຄັບ)</label>
          <input value={f.address} onChange={set("address")} disabled={pending} className={inputCls} placeholder="ເຮືອນເລກທີ, ຊອຍ…" />
        </div>
      </fieldset>

      {/* Birthday + gender — 0.5 pt */}
      <fieldset className="rounded-2xl border border-slate-100 p-4">
        <legend className="flex items-center gap-2 px-1 text-sm font-black text-slate-700">
          ວັນເກີດ & ເພດ
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${birthdayDone ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
            {birthdayDone ? "✓ ຄົບ" : `+${birthdayPoints} ແຕ້ມ`}
          </span>
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">ວັນເດືອນປີເກີດ</label>
            <input type="date" value={f.birthday} onChange={set("birthday")} disabled={pending} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">ເພດ</label>
            <select value={f.sex} onChange={set("sex")} disabled={pending} className={inputCls}>
              <option value="">— ເລືອກ —</option>
              <option value="1">ຊາຍ</option>
              <option value="2">ຍິງ</option>
            </select>
          </div>
        </div>
      </fieldset>

      {msg && (
        <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
          {msg.text}
        </p>
      )}

      <button type="submit" disabled={pending}
        className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 text-sm font-bold text-white transition hover:shadow-md disabled:opacity-60">
        {pending ? "ກຳລັງບັນທຶກ…" : "ບັນທຶກຂໍ້ມູນ"}
      </button>
    </form>
  );
}
