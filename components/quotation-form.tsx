"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { quotationsApi, suppliersApi, type Quotation, type Supplier } from "@/lib/api";
import {
  SUPPLIER_TYPES,
  SUPPLIER_TYPE_LABELS,
  currencyOptions,
  type SupplierType,
} from "@/lib/constants";
import { ErrorNote, Modal } from "@/components/modal";

const input =
  "mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-[#007cc2] focus:ring-4 focus:ring-[#007cc2]/15 disabled:opacity-60";

const LAST_CURRENCY = "sportinuity_quote_currency";

/** Record a quotation (or a price request) for a supplier; edit one when `quotation` is given. */
export function QuotationForm({
  reference,
  quotation,
  onClose,
  onSaved,
}: {
  reference: string;
  quotation?: Quotation;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [supplierId, setSupplierId] = useState(quotation?.supplier.id ?? "");
  const [serviceType, setServiceType] = useState<string>(quotation?.serviceType ?? "");
  const [waiting, setWaiting] = useState(quotation ? quotation.status === "requested" : false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const currencies = useMemo(() => currencyOptions(), []);
  const [currency] = useState(() => {
    if (quotation) return quotation.currency;
    try {
      return localStorage.getItem(LAST_CURRENCY) || "USD";
    } catch {
      return "USD";
    }
  });

  useEffect(() => {
    let cancelled = false;
    suppliersApi
      .list({ active: true, limit: 200 })
      .then((r) => !cancelled && setSuppliers(r.data))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load suppliers."));
    return () => {
      cancelled = true;
    };
  }, []);

  function pickSupplier(id: string) {
    setSupplierId(id);
    const s = suppliers?.find((x) => x.id === id);
    if (s && !quotation) setServiceType(s.type);
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) || "").trim();
    const amount = get("amount");
    if (!waiting && amount === "") return setError("Enter the quoted amount, or mark it as awaiting a price.");
    const body = {
      serviceType: serviceType || undefined,
      description: get("description"),
      amount: waiting && amount === "" ? null : Number(amount),
      currency: get("currency") || "USD",
      validUntil: get("validUntil") || null,
      notes: get("notes") || null,
      status: (waiting && amount === "" ? "requested" : "received") as "requested" | "received",
    };
    setBusy(true);
    setError("");
    try {
      if (quotation) await quotationsApi.update(quotation.id, body);
      else await quotationsApi.create(reference, { ...body, supplierId });
      try {
        localStorage.setItem(LAST_CURRENCY, body.currency);
      } catch {
        /* optional convenience */
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the quotation.");
      setBusy(false);
    }
  }

  return (
    <Modal title={quotation ? "Edit quotation" : "Add quotation"} onClose={busy ? () => {} : onClose} wide>
      {suppliers && suppliers.length === 0 && !quotation ? (
        <p className="text-sm text-slate-600">
          You have no active suppliers yet.{" "}
          <Link href="/suppliers" className="font-semibold text-[#007cc2] hover:underline">
            Add a supplier
          </Link>{" "}
          first, then come back to record its quotation.
        </p>
      ) : (
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold sm:col-span-2">
            Supplier *
            {quotation ? (
              <input disabled value={quotation.supplier.name} className={input} />
            ) : (
              <select
                required
                value={supplierId}
                onChange={(e) => pickSupplier(e.target.value)}
                disabled={busy || !suppliers}
                className={input}
              >
                <option value="" disabled>
                  {suppliers ? "Choose a supplier" : "Loading…"}
                </option>
                {SUPPLIER_TYPES.map((t) => {
                  const group = suppliers?.filter((s) => s.type === t) ?? [];
                  return group.length ? (
                    <optgroup key={t} label={SUPPLIER_TYPE_LABELS[t]}>
                      {group.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {s.city ? ` · ${s.city}` : ""}
                        </option>
                      ))}
                    </optgroup>
                  ) : null;
                })}
              </select>
            )}
          </label>
          <label className="text-sm font-semibold">
            Service
            <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} disabled={busy} className={input}>
              <option value="">Same as supplier</option>
              {SUPPLIER_TYPES.map((t: SupplierType) => (
                <option key={t} value={t}>
                  {SUPPLIER_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Valid until
            <input type="date" name="validUntil" defaultValue={quotation?.validUntil ?? ""} disabled={busy} className={input} />
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            What is quoted *
            <input
              required
              name="description"
              defaultValue={quotation?.description}
              maxLength={500}
              placeholder="e.g. 20 twin rooms, 3 nights, breakfast included"
              disabled={busy}
              className={input}
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
            <input
              type="checkbox"
              checked={waiting}
              onChange={(e) => setWaiting(e.target.checked)}
              className="size-4 accent-[#007cc2]"
            />
            I&apos;ve asked for a price and am still waiting for it
          </label>
          <label className="text-sm font-semibold">
            Amount {waiting ? "" : "*"}
            <input
              name="amount"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              defaultValue={quotation?.amount ?? ""}
              disabled={busy}
              className={input}
            />
          </label>
          <label className="text-sm font-semibold">
            Currency
            <select name="currency" defaultValue={currency} disabled={busy} className={input}>
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            Notes
            <textarea
              name="notes"
              defaultValue={quotation?.notes ?? ""}
              rows={2}
              maxLength={1000}
              disabled={busy}
              placeholder="Terms, what's excluded, who you spoke to…"
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
            <button type="submit" disabled={busy || (!quotation && !supplierId)} className="rounded-xl bg-[#007cc2] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#006ba8] disabled:opacity-60">
              {busy ? "Saving…" : quotation ? "Save changes" : "Add quotation"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
