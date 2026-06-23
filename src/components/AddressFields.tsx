"use client";

import { LAO_PROVINCES, districtsOf } from "@/lib/lao-locations";

export type AddressFormValue = {
  recipient: string;
  phone: string;
  province: string;
  district: string;
  village: string;
  detail: string;
};

export const EMPTY_ADDRESS: AddressFormValue = {
  recipient: "",
  phone: "",
  province: "",
  district: "",
  village: "",
  detail: "",
};

// Structured Lao delivery-address inputs: ແຂວງ → ເມືອງ (dependent) → ບ້ານ + detail.
// Controlled — parent owns the value. `showContact` adds recipient + phone rows.
export default function AddressFields({
  value,
  onChange,
  showContact = false,
}: {
  value: AddressFormValue;
  onChange: (next: AddressFormValue) => void;
  showContact?: boolean;
}) {
  const districts = districtsOf(value.province);
  const set = (patch: Partial<AddressFormValue>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-3">
      {showContact && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ຊື່ຜູ້ຮັບ">
            <input
              value={value.recipient}
              onChange={(e) => set({ recipient: e.target.value })}
              className="inp"
              placeholder="ຊື່ຜູ້ຮັບສິນຄ້າ"
            />
          </Field>
          <Field label="ເບີໂທຜູ້ຮັບ">
            <input
              value={value.phone}
              onChange={(e) => set({ phone: e.target.value })}
              inputMode="tel"
              className="inp"
              placeholder="020 XXXX XXXX"
            />
          </Field>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="ແຂວງ *">
          <select
            required
            value={value.province}
            onChange={(e) => set({ province: e.target.value, district: "" })}
            className="inp"
          >
            <option value="">— ເລືອກແຂວງ —</option>
            {LAO_PROVINCES.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="ເມືອງ *">
          <select
            required
            value={value.district}
            onChange={(e) => set({ district: e.target.value })}
            disabled={!value.province}
            className="inp disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="">{value.province ? "— ເລືອກເມືອງ —" : "ເລືອກແຂວງກ່ອນ"}</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="ບ້ານ">
        <input
          value={value.village}
          onChange={(e) => set({ village: e.target.value })}
          className="inp"
          placeholder="ຊື່ບ້ານ"
        />
      </Field>
      <Field label="ລາຍລະອຽດເພີ່ມເຕີມ">
        <input
          value={value.detail}
          onChange={(e) => set({ detail: e.target.value })}
          className="inp"
          placeholder="ເລກເຮືອນ, ຖະໜົນ, ຈຸດສັງເກດ (ຖ້າມີ)"
        />
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-gray-600">{label}</span>
      {children}
    </label>
  );
}
