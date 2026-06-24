import { redirect } from "next/navigation";
import { isAdmin, getAdminSession, listSalespeople, getSalesScope } from "@/lib/auth";
import OrderBuilder from "@/components/OrderBuilder";
import { adminSearchProducts, adminSearchCustomers, adminCreateOrder, adminUploadSlip, adminCustomerAddresses } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminNewOrderPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const [admin, scope] = await Promise.all([getAdminSession(), getSalesScope()]);
  // Managers can attribute to any salesperson; staff are locked to themselves.
  const salespeople = scope.all ? await listSalespeople() : [];
  return (
    <div className="w-full">
      <OrderBuilder
        search={adminSearchProducts}
        searchCustomers={adminSearchCustomers}
        create={adminCreateOrder}
        uploadSlip={adminUploadSlip}
        lookupAddresses={adminCustomerAddresses}
        salespeople={salespeople}
        defaultSaleCode={admin?.code ?? null}
      />
    </div>
  );
}
