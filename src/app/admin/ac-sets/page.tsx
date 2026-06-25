import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAcSets } from "@/lib/products-admin";
import { formatKip } from "@/lib/format";
import AcSetForm from "./AcSetForm";
import { removeAcSet } from "./actions";

export default async function AcSetsPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const sets = await getAcSets();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">ຊຸດແອ (AC Sets)</h1>
        <p className="mt-1 text-sm text-gray-500">
          ຈັດຄູ່ Indoor [C] + Outdoor [H] — storefront ຈະສະແດງເປັນຊຸດດຽວ ລາຄາລວມ
        </p>
      </div>

      <AcSetForm />

      {sets.length === 0 ? (
        <p className="text-sm text-gray-400">ຍັງບໍ່ມີຊຸດ — ເພີ່ມດ້ານເທິງ</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-xs">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Indoor [C]</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Outdoor [H]</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">ລາຄາຊຸດ</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-600">Stock</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sets.map((s) => {
                const setPrice =
                  s.priceC != null && s.priceH != null ? s.priceC + s.priceH : null;
                const setStock = Math.min(s.stockC, s.stockH);
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5">
                      <p className="font-mono text-[10px] text-gray-400">{s.codeC}</p>
                      <p className="truncate max-w-xs text-gray-700">{s.nameC}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-mono text-[10px] text-gray-400">{s.codeH}</p>
                      <p className="truncate max-w-xs text-gray-700">{s.nameH}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-orange-600">
                      {setPrice ? formatKip(setPrice) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={setStock > 0 ? "text-green-600 font-semibold" : "text-rose-500"}>
                        {setStock > 0 ? `${setStock} ຊຸດ` : "ໝົດ"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <form action={async () => { "use server"; await removeAcSet(s.id); }}>
                        <button
                          type="submit"
                          className="rounded px-2 py-1 text-[10px] font-bold text-rose-500 hover:bg-rose-50"
                        >
                          ລຶບ
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
