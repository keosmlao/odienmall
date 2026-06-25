import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import ImportForm from "./ImportForm";

export const dynamic = "force-dynamic";

export default async function ProductImportPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  return (
    <div>
      <PageHeader
        title="ນຳເຂົ້າຂໍ້ມູນ Overlay (CSV)"
        subtitle="ອັບເດດ description, price_note ຫຼາຍສິນຄ້າພ້ອມກັນ"
        back={{ href: "/admin/products", label: "ກັບໄປລາຍການ" }}
      />

      <div className="mx-auto max-w-2xl">
        <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm">
          <p className="font-bold text-blue-800 mb-2">ຮູບແບບ CSV:</p>
          <pre className="font-mono text-xs text-blue-700 whitespace-pre-wrap">code,description,price_note
ABC001,"ຄຳອະທິບາຍສິນຄ້າ","ສອບຖາມ 020-XXXX"
ABC002,,ໂທ 020-XXXX</pre>
          <ul className="mt-2 space-y-0.5 text-xs text-blue-700">
            <li>• ແຖວທຳອິດຕ້ອງເປັນ header: <code>code,description,price_note</code></li>
            <li>• ຄ່າວ່າງ = ບໍ່ປ່ຽນ (ເວັ້ນ column description/price_note ວ່າງ = ລຶບ)</li>
            <li>• ໃຊ້ quotes ຖ້າມີ comma ໃນຂໍ້ຄວາມ</li>
            <li>• code ຕ້ອງກົງກັບ ERP <code>ic_inventory.code</code></li>
          </ul>
        </div>

        <ImportForm />
      </div>
    </div>
  );
}
