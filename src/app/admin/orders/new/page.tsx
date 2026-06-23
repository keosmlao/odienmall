import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import OrderBuilder from "@/components/OrderBuilder";
import { adminSearchProducts, adminSearchCustomers, adminCreateOrder, adminUploadSlip, adminCustomerAddresses } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminNewOrderPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  return (
    <div className="w-full">
      <OrderBuilder
        search={adminSearchProducts}
        searchCustomers={adminSearchCustomers}
        create={adminCreateOrder}
        uploadSlip={adminUploadSlip}
        lookupAddresses={adminCustomerAddresses}
      />
    </div>
  );
}
