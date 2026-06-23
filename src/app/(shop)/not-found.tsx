import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center justify-center gap-4 border border-orange-100 bg-white px-6 py-20 text-center shadow-sm">
      <div className="grid h-24 w-24 place-items-center rounded-full bg-orange-50 text-4xl font-black text-orange-500">404</div>
      <h1 className="text-xl font-black text-slate-900">ບໍ່ພົບໜ້າທີ່ທ່ານຊອກຫາ</h1>
      <p className="text-sm text-gray-500">ສິນຄ້າອາດຖືກຍ້າຍ, ປິດການຂາຍ ຫຼືລິ້ງບໍ່ຖືກຕ້ອງ.</p>
      <Link
        href="/"
        className="rounded-sm bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:from-orange-600 hover:to-rose-600"
      >
        ກັບສູ່ໜ້າຫຼັກ
      </Link>
      <Link href="/products" className="text-sm font-semibold text-orange-600 hover:underline">
        ເບິ່ງສິນຄ້າທັງໝົດ
      </Link>
    </div>
  );
}
