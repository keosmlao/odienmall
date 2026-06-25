import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getAdminCustomers } from "@/lib/customers-admin";
import { firstParam, parsePage } from "@/lib/params";
import { formatKip } from "@/lib/format";
import {
  PageHeader,
  EmptyState,
  TableShell,
  THEAD,
  TH,
  TBODY,
  TR,
  TD,
  BTN_SECONDARY,
} from "@/components/admin/ui";
import CustomerSearch from "./CustomerSearch";

export const dynamic = "force-dynamic";

// Tier codes with discounts get premium styling; others get neutral gray
const PREMIUM = new Set(["10104", "10105", "10106"]);

function TierBadge({ code, name, discount }: { code: string | null; name: string | null; discount: string | null }) {
  if (!name) return <span className="text-gray-300">—</span>;
  const isPremium = code ? PREMIUM.has(code) : false;
  const isBlack = code === "10106";
  const isPlat = code === "10105";
  const cls = isBlack
    ? "bg-slate-900 text-white ring-slate-700"
    : isPlat
    ? "bg-slate-100 text-slate-700 ring-slate-300"
    : isPremium
    ? "bg-amber-50 text-amber-700 ring-amber-200"
    : "bg-gray-50 text-gray-500 ring-gray-200";
  const icon = isBlack ? "✦" : isPlat ? "💎" : isPremium ? "👑" : null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${cls}`}>
      {icon && <span>{icon}</span>}
      <span>{name}</span>
      {discount && <span className="opacity-70">{discount}</span>}
    </span>
  );
}

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  const sp = await searchParams;
  const q = firstParam(sp.q)?.trim() || "";
  const page = parsePage(sp.page);

  const list = await getAdminCustomers({ search: q, page, pageSize: 30 });
  const qParam = q ? `&q=${encodeURIComponent(q)}` : "";

  return (
    <div>
      <PageHeader
        title="ລູກຄ້າ"
        subtitle="ສະມາຊິກ (reg_group=member) — ຂໍ້ມູນຕິດຕໍ່ ແລະ ປະຫວັດການຊື້"
      />

      <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm shadow-gray-200/40">
        <CustomerSearch search={q} />
      </div>

      <p className="mb-2 text-xs text-gray-400">
        ພົບ {list.total.toLocaleString()} ລູກຄ້າ{q && <> ສຳລັບ “{q}”</>}
      </p>

      {list.items.length === 0 ? (
        <EmptyState
          title="ບໍ່ພົບລູກຄ້າ"
          icon="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
        />
      ) : (
        <TableShell minWidth={720}>
          <thead className={THEAD}>
            <tr>
              <th className={TH}>ລູກຄ້າ</th>
              <th className={TH}>ເບີໂທ</th>
              <th className={TH}>ຂັ້ນ</th>
              <th className={`${TH} text-right`}>ອໍເດີ</th>
              <th className={`${TH} text-right`}>ຍອດໃຊ້ຈ່າຍ</th>
              <th className={TH}>ສັ່ງຊື້ຫຼ້າສຸດ</th>
            </tr>
          </thead>
          <tbody className={TBODY}>
            {list.items.map((c) => (
              <tr key={c.code} className={TR}>
                <td className={TD}>
                  <Link
                    href={`/admin/customers/${encodeURIComponent(c.code)}`}
                    className="font-semibold text-brand-dark hover:underline"
                  >
                    {c.name}
                  </Link>
                  <div className="text-xs text-gray-400">{c.code}</div>
                </td>
                <td className={TD}>{c.phone ?? "—"}</td>
                <td className={TD}>
                  <TierBadge code={c.tierCode} name={c.tierName} discount={c.tierDiscount} />
                </td>
                <td className={`${TD} text-right`}>{c.orderCount}</td>
                <td className={`${TD} text-right font-semibold text-price`}>
                  {formatKip(c.totalSpent)}
                </td>
                <td className={`${TD} text-gray-400`}>
                  {c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString("lo-LA") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      {list.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          {page > 1 && (
            <Link href={`/admin/customers?page=${page - 1}${qParam}`} className={BTN_SECONDARY}>
              ກ່ອນໜ້າ
            </Link>
          )}
          <span className="text-gray-400">ໜ້າ {page} / {list.totalPages}</span>
          {page < list.totalPages && (
            <Link href={`/admin/customers?page=${page + 1}${qParam}`} className={BTN_SECONDARY}>
              ຕໍ່ໄປ
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
