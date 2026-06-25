import { getActiveFlashDeals } from "@/lib/flash";
import ProductGrid from "@/components/ProductGrid";
import FlashCountdown from "@/components/FlashCountdown";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Flash Sale — OdienMall" };

export default async function FlashSalesPage() {
  const flash = await getActiveFlashDeals(60);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 sm:text-2xl">
            ⚡ Flash Sale
          </h1>
          <p className="mt-1 text-sm text-gray-500">ສ່ວນຫຼຸດພິເສດ — ຊ່ວງເວລາຈຳກັດ</p>
        </div>
        {flash.endsAt && (
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-1">ໝົດ Flash ໃນ</p>
            <FlashCountdown endsAt={flash.endsAt} />
          </div>
        )}
      </div>

      {flash.products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-20 text-center">
          <div className="text-4xl">⚡</div>
          <p className="mt-3 text-base font-semibold text-gray-500">ຂະນະນີ້ບໍ່ມີ Flash Sale</p>
          <p className="mt-1 text-sm text-gray-400">ກວດຄືນໃໝ່ໃນພາຍຫຼັງ</p>
          <Link href="/products" className="mt-5 inline-block rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-dark">
            ເບິ່ງສິນຄ້າທັງໝົດ
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-600">
              {flash.products.length} ລາຍການ
            </span>
            <span>ກຳລັງຫຼຸດລາຄາຢູ່</span>
          </div>
          <ProductGrid products={flash.products} />
        </>
      )}
    </div>
  );
}
