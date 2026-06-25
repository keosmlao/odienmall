"use client";

import { useState, useTransition } from "react";
import type { AddressRecord } from "@/lib/addresses";
import AddressFields, { EMPTY_ADDRESS, type AddressFormValue } from "@/components/AddressFields";
import { addAddress, removeAddress, makeDefaultAddress } from "./address-actions";

// Customer address book on the account page: list, add, set-default, delete.
export default function AddressBook({ initial }: { initial: AddressRecord[] }) {
  const [addresses, setAddresses] = useState(initial);
  const [open, setOpen] = useState(initial.length === 0);
  const [value, setValue] = useState<AddressFormValue>(EMPTY_ADDRESS);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; addresses?: AddressRecord[]; error?: string }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok && res.addresses) {
        setAddresses(res.addresses);
        after?.();
      } else {
        setError(res.error ?? "ເກີດຂໍ້ຜິດພາດ");
      }
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.province || !value.district) {
      setError("ກະລຸນາເລືອກ ແຂວງ ແລະ ເມືອງ");
      return;
    }
    run(
      () =>
        addAddress({
          recipient: value.recipient,
          phone: value.phone,
          province: value.province,
          district: value.district,
          village: value.village,
          detail: value.detail,
        }),
      () => {
        setValue(EMPTY_ADDRESS);
        setOpen(false);
      },
    );
  }

  return (
    <div
      id="addresses"
      className="scroll-mt-20 rounded-2xl border border-slate-100/80 bg-white p-6 shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">ທີ່ຢູ່ຈັດສົ່ງ</h2>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-xl border border-orange-200 px-4 py-2 text-xs font-semibold text-orange-600 transition hover:bg-orange-50/50"
        >
          {open ? "ປິດ" : "+ ເພີ່ມທີ່ຢູ່"}
        </button>
      </div>

      {addresses.length === 0 && !open && (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-xs font-medium text-slate-400">
          ຍັງບໍ່ມີທີ່ຢູ່ບັນທຶກໄວ້
        </p>
      )}

      {addresses.length > 0 && (
        <div className="space-y-3">
          {addresses.map((a) => (
            <div
              key={a.id}
              className={`rounded-2xl border p-4 transition-all duration-200 hover:shadow-sm ${
                a.isDefault ? "border-orange-200 bg-orange-50/20" : "border-slate-150/60 bg-slate-50/30"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">
                      {a.recipient || "ທີ່ຢູ່"}
                    </span>
                    {a.isDefault && (
                      <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[9px] font-extrabold text-orange-700 tracking-wider uppercase">
                        ຄ່າເລີ່ມຕົ້ນ
                      </span>
                    )}
                  </div>
                  {a.phone && <div className="text-xs font-semibold text-slate-400 mt-0.5">{a.phone}</div>}
                  <div className="mt-1.5 text-xs font-medium text-slate-600 leading-relaxed">{a.label}</div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {!a.isDefault && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => makeDefaultAddress(a.id))}
                      className="text-[11px] font-bold text-slate-650 hover:text-slate-900 transition disabled:opacity-50 cursor-pointer"
                    >
                      ຕັ້ງເປັນຄ່າເລີ່ມຕົ້ນ
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => removeAddress(a.id))}
                    className="text-[11px] font-bold text-rose-500 hover:text-rose-700 transition disabled:opacity-50 cursor-pointer"
                  >
                    ລຶບ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <form onSubmit={submit} className="mt-4 rounded-2xl border border-orange-150 bg-orange-50/10 p-5">
          <AddressFields value={value} onChange={setValue} showContact />
          {error && (
            <p className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-600">{error}</p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-orange-600 hover:shadow disabled:opacity-60 cursor-pointer"
            >
              {pending ? "ກຳລັງບັນທຶກ..." : "ບັນທຶກທີ່ຢູ່"}
            </button>
            {addresses.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setValue(EMPTY_ADDRESS);
                  setError(null);
                }}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                ຍົກເລີກ
              </button>
            )}
          </div>
        </form>
      )}

      {error && !open && (
        <p className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-600">{error}</p>
      )}
    </div>
  );
}
