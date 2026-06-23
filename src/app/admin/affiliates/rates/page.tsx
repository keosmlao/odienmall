import { redirect } from "next/navigation";
import { isAdmin, isManager } from "@/lib/auth";
import { getCommissionRates } from "@/lib/affiliates";
import { RATE_SCOPE_LABEL } from "@/lib/affiliate-constants";
import { PageHeader, Card, CardTitle, Badge, EmptyState } from "@/components/admin/ui";
import { DefaultRateForm, AddRateForm, RateDeleteButton } from "../RateControls";

export const dynamic = "force-dynamic";

export default async function AdminCommissionRates() {
  if (!(await isAdmin())) redirect("/admin/login");
  if (!(await isManager())) redirect("/admin");

  const rates = await getCommissionRates();
  const def = rates.find((r) => r.scope === "default");
  const overrides = rates.filter((r) => r.scope !== "default");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="ອັດຕາຄ່ານາຍໜ້າ"
        subtitle="ການຄິດໄລ່ໃຊ້ລຳດັບ: ສິນຄ້າ → ໝວດ → ຍີ່ຫໍ້ → ຄ່າເລີ່ມຕົ້ນ."
        back={{ href: "/admin/affiliates", label: "ກັບໄປລາຍຊື່ນາຍໜ້າ" }}
      />

      <Card>
        <CardTitle>ຄ່າເລີ່ມຕົ້ນ</CardTitle>
        <DefaultRateForm current={def?.ratePct ?? 0} />
      </Card>

      <Card className="mt-5">
        <CardTitle>ເພີ່ມອັດຕາສະເພາະ</CardTitle>
        <AddRateForm />
      </Card>

      <Card className="mt-5">
        <CardTitle>ອັດຕາສະເພາະ</CardTitle>
        {overrides.length === 0 ? (
          <EmptyState title="ຍັງບໍ່ມີອັດຕາສະເພາະ" />
        ) : (
          <div className="divide-y divide-gray-100">
            {overrides.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div>
                  <div className="flex items-center gap-2 text-gray-700">
                    {r.refName ?? r.refKey}
                    <Badge tone="gray">{RATE_SCOPE_LABEL[r.scope]}</Badge>
                  </div>
                  <div className="font-mono text-xs text-gray-400">{r.refKey}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900">{r.ratePct}%</span>
                  <RateDeleteButton id={r.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
