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
      className="mt-4 scroll-mt-20 rounded-sm border border-gray-100 bg-white p-5 shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">ທີ່ຢູ່ຈັດສົ່ງ</h2>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-sm border border-orange-200 px-3 py-1.5 text-sm font-medium text-orange-600 transition hover:bg-orange-50"
        >
          {open ? "ປິດ" : "+ ເພີ່ມທີ່ຢູ່"}
        </button>
      </div>

      {addresses.length === 0 && !open && (
        <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-400">
          ຍັງບໍ່ມີທີ່ຢູ່ບັນທຶກໄວ້
        </p>
      )}

      {addresses.length > 0 && (
        <div className="space-y-2.5">
          {addresses.map((a) => (
            <div
              key={a.id}
              className={`rounded-sm border p-3.5 transition ${
                a.isDefault ? "border-orange-300 bg-orange-50/50" : "border-gray-100"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">
                      {a.recipient || "ທີ່ຢູ່"}
                    </span>
                    {a.isDefault && (
                      <span className="rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-semibold text-brand-dark">
                        ຄ່າເລີ່ມຕົ້ນ
                      </span>
                    )}
                  </div>
                  {a.phone && <div className="text-xs text-gray-500">{a.phone}</div>}
                  <div className="mt-0.5 text-sm text-gray-600">{a.label}</div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {!a.isDefault && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => makeDefaultAddress(a.id))}
                      className="text-xs font-medium text-brand-dark hover:underline disabled:opacity-50"
                    >
                      ຕັ້ງເປັນຄ່າເລີ່ມຕົ້ນ
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => removeAddress(a.id))}
                    className="text-xs font-medium text-rose-500 hover:underline disabled:opacity-50"
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
        <form onSubmit={submit} className="mt-3 rounded-sm border border-orange-100 bg-orange-50/30 p-4">
          <AddressFields value={value} onChange={setValue} showContact />
          {error && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-sm bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
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
                className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                ຍົກເລີກ
              </button>
            )}
          </div>
        </form>
      )}

      {error && !open && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
