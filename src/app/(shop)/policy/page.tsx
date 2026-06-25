import Link from "next/link";
import type { Metadata } from "next";
import { POLICIES, POLICY_SLUGS } from "@/lib/pages-content";

export const metadata: Metadata = { title: "ນະໂຍບາຍ" };

const ICONS: Record<string, string> = {
  shipping: "🚚",
  returns: "↩️",
  privacy: "🔒",
  terms: "📋",
};

export default function PolicyIndexPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 p-6 text-white">
        <h1 className="text-xl font-bold">ນະໂຍບາຍ ແລະ ເງື່ອນໄຂ</h1>
        <p className="mt-1 text-sm text-slate-300">ຂໍ້ມູນການໃຊ້ງານ, ການຈັດສົ່ງ ແລະ ຄວາມເປັນສ່ວນຕົວ</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {POLICY_SLUGS.map((slug) => {
          const p = POLICIES[slug];
          return (
            <Link
              key={slug}
              href={`/policy/${slug}`}
              className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-orange-200 hover:shadow-md"
            >
              <span className="text-3xl">{ICONS[slug] ?? "📄"}</span>
              <div>
                <div className="font-semibold text-slate-800">{p.title}</div>
                <div className="mt-0.5 line-clamp-1 text-xs text-slate-400">{p.body[0]}</div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
        ສອບຖາມເພີ່ມຕຶ່ມ:{" "}
        <a href="tel:+8562059929992" className="font-semibold text-brand-dark hover:underline">
          020 5992 9992
        </a>
        {" "}ຫຼື{" "}
        <Link href="/chat" className="font-semibold text-brand-dark hover:underline">
          live chat
        </Link>
      </div>
    </div>
  );
}
