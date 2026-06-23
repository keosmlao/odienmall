import Link from "next/link";
import type { Metadata } from "next";
import { FAQS, POLICIES } from "@/lib/pages-content";
import FaqAccordion from "./FaqAccordion";

export const metadata: Metadata = { title: "ຊ່ວຍເຫຼືອ & ຄຳຖາມທີ່ພົບເລື້ອຍ" };

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-black text-slate-900">ສູນຊ່ວຍເຫຼືອ</h1>
      <p className="mt-1 text-sm text-slate-500">ຄຳຖາມທີ່ພົບເລື້ອຍ — ຖ້າບໍ່ພົບຄຳຕອບ ແຊັດຫາພວກເຮົາໄດ້ເລີຍ</p>

      <div className="mt-5">
        <FaqAccordion items={FAQS} />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-5">
        <h2 className="text-sm font-bold text-slate-800">ນະໂຍບາຍ</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {Object.entries(POLICIES).map(([slug, p]) => (
            <Link key={slug} href={`/policy/${slug}`} className="rounded-lg border border-slate-100 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-orange-200 hover:text-orange-600">
              {p.title} →
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-orange-50 p-5 text-center">
        <p className="text-sm font-semibold text-orange-700">ຍັງມີຄຳຖາມ?</p>
        <p className="mt-1 text-xs text-orange-600">ໂທ 020 5992 9992 ຫຼື ກົດປຸ່ມແຊັດ 💬 ມຸມຂວາລຸ່ມ</p>
      </div>
    </div>
  );
}
