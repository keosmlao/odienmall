import { redirect } from "next/navigation";
import { getSession, getCustomerProfile } from "@/lib/auth";
import { getAffiliateDashboard } from "@/lib/affiliates";
import { SITE_URL } from "@/lib/config";
import { formatKip } from "@/lib/format";
import { COMMISSION_STATUS_LABEL, type CommissionStatus } from "@/lib/affiliate-constants";
import { STATUS_LABEL, type OrderStatus } from "@/lib/order-constants";
import AffiliateLinkBuilder from "./AffiliateLinkBuilder";
import ApplyAffiliateButton from "./ApplyAffiliateButton";
import StorePageHeader from "@/components/StorePageHeader";

export const dynamic = "force-dynamic";

export default async function AffiliatePage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/affiliate");

  const [dash, profile] = await Promise.all([
    getAffiliateDashboard(session.code),
    getCustomerProfile(session.code),
  ]);
  const aff = dash.affiliate;
  const needsVerification = Boolean(
    aff && (!aff.emailVerifiedAt || !aff.bankCode || !aff.accountName || !aff.accountNo),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <section className="!p-0">
        <StorePageHeader
          title="ໂປຣແກຣມນາຍໜ້າ"
          subtitle="ແບ່ງປັນສິນຄ້າ OdienMall ແລະຮັບຄ່ານາຍໜ້າເມື່ອອໍເດີສຳເລັດ"
        />
      </section>

      {/* Not yet applied */}
      {!aff && (
        <div className="grid overflow-hidden rounded-sm border border-orange-100 bg-white shadow-sm md:grid-cols-[1fr_280px]">
          <div className="p-7 sm:p-9">
          <span className="inline-flex rounded bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">ODIENMALL AFFILIATE</span>
          <h2 className="mb-2.5 mt-4 text-xl font-black text-slate-900">ຫາລາຍໄດ້ໂດຍການແນະນຳ</h2>
          <p className="mb-6 text-sm leading-relaxed text-slate-500">
            ສະໝັກເປັນນາຍໜ້າ ແລ້ວແບ່ງປັນລິ້ງສິນຄ້າຂອງທ່ານ. ເມື່ອລູກຄ້າສັ່ງຊື້ຜ່ານລິ້ງຂອງທ່ານ
            ແລະ ຄຳສັ່ງຊື້ສຳເລັດ ທ່ານຈະໄດ້ຮັບຄ່ານາຍໜ້າ.
          </p>
          <ApplyAffiliateButton email={profile?.email ?? null} />
          </div>
          <div className="relative hidden bg-gradient-to-br from-orange-500 to-rose-500 p-8 text-white md:flex md:flex-col md:justify-center">
            <span className="text-6xl font-black text-white/20">%</span>
            <strong className="mt-3 text-2xl">ແບ່ງປັນ · ຂາຍ · ຮັບລາຍໄດ້</strong>
            <p className="mt-3 text-xs leading-6 text-white/80">ລະບົບຈະບັນທຶກອໍເດີຈາກລິ້ງຂອງທ່ານອັດຕະໂນມັດ.</p>
          </div>
        </div>
      )}

      {needsVerification && (
        <div className="rounded-sm border border-orange-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">ຕື່ມຂໍ້ມູນ Affiliate ໃຫ້ຄົບ</h2>
          <p className="mb-5 mt-1 text-sm text-slate-500">
            ກະລຸນາຢືນຢັນ email ແລະໃສ່ບັນຊີທະນາຄານສຳລັບຮັບຄ່ານາຍໜ້າ.
          </p>
          <ApplyAffiliateButton email={profile?.email ?? null} />
        </div>
      )}

      {/* Pending approval */}
      {aff?.status === "pending" && (
        <div className="rounded-sm border border-amber-100 bg-amber-50/50 p-6 text-amber-800 shadow-sm">
          <h2 className="mb-1 font-bold text-sm">ກຳລັງລໍຖ້າອະນຸມັດ</h2>
          <p className="text-xs leading-relaxed text-amber-700/90">
            ການສະໝັກຂອງທ່ານຖືກສົ່ງແລ້ວ. ທີມງານຈະກວດສອບ ແລະ ອະນຸມັດໃຫ້ໄວໆນີ້.
          </p>
        </div>
      )}

      {/* Suspended */}
      {aff?.status === "suspended" && (
        <div className="rounded-sm border border-slate-200 bg-slate-100 p-6 text-slate-600 shadow-sm">
          <h2 className="mb-1 font-bold text-sm">ບັນຊີນາຍໜ້າຖືກລະງັບ</h2>
          <p className="text-xs leading-relaxed text-slate-500">ກະລຸນາຕິດຕໍ່ທີມງານສຳລັບຂໍ້ມູນເພີ່ມເຕີມ.</p>
        </div>
      )}

      {/* Active dashboard */}
      {aff?.status === "active" && (
        <div className="space-y-6">
          <div className="rounded-sm border border-slate-100 bg-white p-6 shadow-sm">
            <AffiliateLinkBuilder base={SITE_URL} code={aff.code} />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="ຈຳນວນຄລິກ" value={dash.clicks.toLocaleString()} />
            <Stat label="ຄຳສັ່ງຊື້" value={dash.referredOrders.toLocaleString()} />
            <Stat label="ຄ້າງຈ່າຍ" value={formatKip(dash.earned)} accent />
            <Stat label="ຈ່າຍແລ້ວ" value={formatKip(dash.paid)} />
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_4px_30px_rgba(0,0,0,0.015)]">
            <h2 className="mb-4 font-bold text-slate-900 pb-2 border-b border-slate-50">ຄຳສັ່ງຊື້ທີ່ແນະນຳ</h2>
            {dash.recentOrders.length === 0 ? (
              <p className="py-10 text-center text-xs font-semibold text-slate-400 italic">ຍັງບໍ່ມີປະຫວັດຄຳສັ່ງຊື້</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {dash.recentOrders.map((o) => (
                  <div key={o.orderNo} className="flex items-center justify-between gap-3 py-3.5">
                    <div>
                      <div className="font-bold text-slate-800 text-sm tracking-tight">{o.orderNo}</div>
                      <div className="text-[11px] font-semibold text-slate-450 mt-0.5">
                        {new Date(o.createdAt).toLocaleDateString("lo-LA")} ·{" "}
                        {STATUS_LABEL[o.status as OrderStatus] ?? o.status} · {formatKip(o.subtotal)}
                      </div>
                    </div>
                    <div className="text-right">
                      {o.commissionAmount != null ? (
                        <>
                          <div className="font-extrabold text-price text-sm">{formatKip(o.commissionAmount)}</div>
                          <div className="mt-1">
                            <CommissionBadge status={o.commissionStatus} />
                          </div>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-sm border border-slate-100 bg-white p-4 shadow-sm transition hover:border-orange-100 hover:shadow-md">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
      <div className={`mt-1.5 text-base font-black tracking-tight ${accent ? "text-price" : "text-slate-950"}`}>
        {value}
      </div>
    </div>
  );
}

function CommissionBadge({ status }: { status: CommissionStatus | null }) {
  if (!status) return null;
  const cls =
    status === "paid" 
      ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
      : "bg-amber-50 text-amber-700 border border-amber-100";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {COMMISSION_STATUS_LABEL[status]}
    </span>
  );
}
