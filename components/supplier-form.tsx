"use client";

import { FormEvent, useState } from "react";
import { suppliersApi, type Supplier } from "@/lib/api";
import {
  SUPPLIER_COUNTRIES,
  SUPPLIER_TYPES,
  SUPPLIER_TYPE_LABELS,
  countryName,
} from "@/lib/constants";
import { ErrorNote, Modal } from "@/components/modal";

const input =
  "mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-[#007cc2] focus:ring-4 focus:ring-[#007cc2]/15 disabled:opacity-60";

/** Add a supplier, or edit one when `supplier` is given. */
export function SupplierForm({
  supplier,
  defaultType,
  onClose,
  onSaved,
}: {
  supplier?: Supplier;
  defaultType?: string;
  onClose: () => void;
  onSaved: (s: Supplier) => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) || "").trim();
    const body = {
      name: get("name"),
      type: get("type"),
      contactName: get("contactName"),
      email: get("email"),
      phone: get("phone"),
      city: get("city"),
      country: get("country"),
      website: get("website"),
      notes: get("notes"),
    };
    setBusy(true);
    setError("");
    try {
      onSaved(supplier ? await suppliersApi.update(supplier.id, body) : await suppliersApi.create(body));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the supplier.");
      setBusy(false);
    }
  }

  return (
    <Modal title={supplier ? "Edit supplier" : "Add supplier"} onClose={onClose} wide>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold sm:col-span-2">
          Name *
          <input required name="name" defaultValue={supplier?.name} maxLength={160} disabled={busy} className={input} />
        </label>
        <label className="text-sm font-semibold">
          Type *
          <select required name="type" defaultValue={supplier?.type ?? defaultType ?? "accommodation"} disabled={busy} className={input}>
            {SUPPLIER_TYPES.map((t) => (
              <option key={t} value={t}>
                {SUPPLIER_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Contact person
          <input name="contactName" defaultValue={supplier?.contactName ?? ""} maxLength={120} disabled={busy} className={input} />
        </label>
        <label className="text-sm font-semibold">
          Email
          <input type="email" name="email" defaultValue={supplier?.email ?? ""} disabled={busy} className={input} />
        </label>
        <label className="text-sm font-semibold">
          Phone
          <input name="phone" defaultValue={supplier?.phone ?? ""} placeholder="+254 700 000 000" disabled={busy} className={input} />
        </label>
        <label className="text-sm font-semibold">
          City
          <input name="city" defaultValue={supplier?.city ?? ""} maxLength={80} disabled={busy} className={input} />
        </label>
        <label className="text-sm font-semibold">
          Country
          <select name="country" defaultValue={supplier?.country ?? ""} disabled={busy} className={input}>
            <option value="">Not set</option>
            {supplier?.country && !SUPPLIER_COUNTRIES.includes(supplier.country) && (
              <option value={supplier.country}>{countryName(supplier.country)}</option>
            )}
            {SUPPLIER_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {countryName(c)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold sm:col-span-2">
          Website
          <input type="url" name="website" defaultValue={supplier?.website ?? ""} placeholder="https://" disabled={busy} className={input} />
        </label>
        <label className="text-sm font-semibold sm:col-span-2">
          Notes
          <textarea
            name="notes"
            defaultValue={supplier?.notes ?? ""}
            rows={3}
            maxLength={1000}
            disabled={busy}
            placeholder="Rates, capacity, payment terms…"
            className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal outline-none focus:border-[#007cc2] focus:ring-4 focus:ring-[#007cc2]/15"
          />
        </label>
        <div className="sm:col-span-2">
          <ErrorNote message={error} />
        </div>
        <div className="flex justify-end gap-3 sm:col-span-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="rounded-xl bg-[#007cc2] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#006ba8] disabled:opacity-60">
            {busy ? "Saving…" : supplier ? "Save changes" : "Add supplier"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
