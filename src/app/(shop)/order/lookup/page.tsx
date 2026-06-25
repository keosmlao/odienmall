import { Suspense } from "react";
import LookupForm from "./LookupForm";
import LookupResults from "./LookupResults";

export const metadata = { title: "ຕິດຕາມຄຳສັ່ງຊື້" };
export const dynamic = "force-dynamic";

export default async function OrderLookupPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  const sp = await searchParams;
  const phone = sp.phone?.trim() ?? "";

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-extrabold text-gray-900">ຕິດຕາມຄຳສັ່ງຊື້</h1>
        <p className="mt-1 text-sm text-gray-500">ໃສ່ເບີໂທທີ່ໃຊ້ສັ່ງຊື້ ເພື່ອກວດສຶກຄຳສັ່ງຊື້ຂອງທ່ານ</p>
      </div>

      <LookupForm initial={phone} />

      {phone && (
        <Suspense fallback={<div className="mt-6 text-center text-sm text-gray-400">ກຳລັງຄົ້ນຫາ...</div>}>
          <LookupResults phone={phone} />
        </Suspense>
      )}
    </div>
  );
}
