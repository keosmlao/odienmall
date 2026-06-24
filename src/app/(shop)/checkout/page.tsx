import { getSession, getCustomerProfile } from "@/lib/auth";
import { getCustomerAddresses } from "@/lib/addresses";
import { getCodEnabled } from "@/lib/settings";
import { getAffiliateByCustomer } from "@/lib/affiliates";
import { listPublicVouchers } from "@/lib/vouchers";
import { OFFERED_PAYMENT_METHODS, type PaymentMethod } from "@/lib/payment-constants";
import CheckoutForm from "./CheckoutForm";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  // Prefill from the logged-in customer when available (optional — guest checkout works too).
  const session = await getSession();
  const [profile, addresses, codEnabled, affiliate, vouchers] = await Promise.all([
    session ? getCustomerProfile(session.code) : Promise.resolve(null),
    session ? getCustomerAddresses(session.code) : Promise.resolve([]),
    getCodEnabled(),
    session ? getAffiliateByCustomer(session.code) : Promise.resolve(null),
    listPublicVouchers(6).catch(() => []),
  ]);
  const isAffiliate = affiliate?.status === "active";
  // COD is offered only when the manager has it enabled.
  const offeredMethods: PaymentMethod[] = OFFERED_PAYMENT_METHODS.filter(
    (m) => m !== "cod" || codEnabled,
  );
  return (
    <CheckoutForm
      loggedIn={!!session}
      initialName={profile?.name ?? session?.name ?? ""}
      initialPhone={profile?.phone ?? ""}
      savedAddresses={addresses}
      offeredMethods={offeredMethods}
      isAffiliate={isAffiliate}
      vouchers={vouchers.map((v) => ({ code: v.code, kind: v.kind, value: v.value, minSubtotal: v.minSubtotal }))}
    />
  );
}
