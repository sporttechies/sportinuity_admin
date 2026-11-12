"use client";

import { FormEvent, useMemo, useState } from "react";
import { invoicesApi, type Invoice, type InvoiceContext } from "@/lib/api";
import { currencyOptions, formatMoney } from "@/lib/constants";
import { ErrorNote, Modal } from "@/components/modal";

const input =
  "mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-[#007cc2] focus:ring-4 focus:ring-[#007cc2]/15";
const label = "block text-xs font-semibold text-slate-600";

const cents = (n: number) => Math.round(n * 100);

/** Create a draft invoice (or edit one): a price per traveller class. */
export function InvoiceForm({
  reference,
  context,
  invoice,
  onSaved,
  onClose,
}: {
  reference: string;
  context: InvoiceContext;
  invoice?: Invoice;
  onSaved: (invoice: Invoice) => void;
  onClose: () => void;
}) {
  const currencies = useMemo(() => currencyOptions(), []);
  const [currency, setCurrency] = useState(invoice?.currency || context.defaults.currency);
  const [taxRate, setTaxRate] = useState(String(invoice?.taxRate ?? context.defaults.taxRate));
  const [dueDate, setDueDate] = useState(invoice?.dueDate || "");
  const [notes, setNotes] = useState(invoice?.notes || "");
  // Prefill prices from the draft's lines ("Regular traveller - Event").
  const [prices, setPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      context.classes.map((c) => {
        const line = invoice?.items.find((i) => i.description.startsWith(`${c.label} traveller`));
        return [c.type, line ? String(line.unitPrice) : ""];
      }),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const totals = useMemo(() => {
    const subtotal = context.classes.reduce((sum, c) => sum + cents(Number(prices[c.type] || 0) * c.count), 0);
    const tax = Math.round((subtotal * (Number(taxRate) || 0)) / 100);
    return { subtotal: subtotal / 100, tax: tax / 100, total: (subtotal + tax) / 100 };
  }, [context.classes, prices, taxRate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const parsed: Record<string, number> = {};
    for (const c of context.classes) {
      const value = prices[c.type];
      if (value === "" || Number.isNaN(Number(value)) || Number(value) < 0)
        return setError(`Enter a price for ${c.label} travellers (0 or more).`);
      parsed[c.type] = Number(value);
    }
    const tax = Number(taxRate);
    if (Number.isNaN(tax) || tax < 0 || tax > 100) return setError("Tax must be between 0 and 100.");
    setBusy(true);
    try {
      const body = { currency, taxRate: tax, dueDate: dueDate || null, notes: notes.trim() || null, prices: parsed };
      onSaved(
        invoice
          ? await invoicesApi.update(invoice.id, body)
          : await invoicesApi.create({ reference, ...body }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the invoice.");
      setBusy(false);
    }
  }

  return (
    <Modal title={invoice ? "Edit draft invoice" : "New invoice"} onClose={busy ? () => {} : onClose} wide>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <p className="text-sm font-bold">Price per traveller</p>
          <p className="text-xs text-slate-500">One price for each class on this request. Amounts are calculated for you.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {context.classes.map((c) => (
              <label key={c.type} className={label}>
                {c.label} · {c.count} traveller{c.count === 1 ? "" : "s"}
                <input
                  required
                  inputMode="decimal"
                  type="number"
                  min="0"
                  step="0.01"
                  value={prices[c.type]}
                  onChange={(e) => setPrices({ ...prices, [c.type]: e.target.value })}
                  className={input}
                  placeholder="0.00"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className={`${label} sm:col-span-2`}>
            Currency
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={input}>
              {!currencies.some((c) => c.code === currency) && <option value={currency}>{currency}</option>}
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </label>
          <label className={label}>
            Tax (%)
            <input type="number" min="0" max="100" step="0.01" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className={input} />
          </label>
          <label className={label}>
            Due date
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={input} />
            <span className="mt-1 block text-[11px] font-normal text-slate-400">
              Left empty: {context.defaults.paymentTermsDays} days after issuing.
            </span>
          </label>
          <label className={`${label} sm:col-span-2`}>
            Notes (shown on the invoice)
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={2000} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal outline-none focus:border-[#007cc2] focus:ring-4 focus:ring-[#007cc2]/15" />
          </label>
        </div>

        <dl className="ml-auto grid max-w-xs grid-cols-2 gap-x-4 gap-y-1 rounded-xl bg-slate-50 p-4 text-sm">
          <dt className="text-slate-500">Subtotal</dt><dd className="text-right font-medium">{formatMoney(totals.subtotal, currency)}</dd>
          {Number(taxRate) > 0 && (<><dt className="text-slate-500">Tax ({Number(taxRate)}%)</dt><dd className="text-right font-medium">{formatMoney(totals.tax, currency)}</dd></>)}
          <dt className="font-bold">Total</dt><dd className="text-right font-bold">{formatMoney(totals.total, currency)}</dd>
        </dl>

        <ErrorNote message={error} />
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={busy} className="rounded-xl bg-[#007cc2] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#006ba8] disabled:opacity-60">
            {busy ? "Saving…" : "Save & preview"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
