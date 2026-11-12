"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { invoicesApi, type BillingSettings } from "@/lib/api";
import { currencyOptions } from "@/lib/constants";
import { ErrorNote } from "@/components/modal";

const input =
  "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-[#007cc2] focus:ring-4 focus:ring-[#007cc2]/15";
const area =
  "mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal outline-none focus:border-[#007cc2] focus:ring-4 focus:ring-[#007cc2]/15";
const label = "block text-xs font-semibold text-slate-600";

type Form = { [K in keyof BillingSettings]: string };
const toForm = (s: BillingSettings): Form => ({
  companyName: s.companyName,
  companyAddress: s.companyAddress || "",
  companyEmail: s.companyEmail || "",
  companyPhone: s.companyPhone || "",
  taxNumber: s.taxNumber || "",
  paymentInstructions: s.paymentInstructions || "",
  invoiceFooter: s.invoiceFooter || "",
  defaultCurrency: s.defaultCurrency,
  defaultTaxRate: String(s.defaultTaxRate),
  paymentTermsDays: String(s.paymentTermsDays),
  bankName: s.bankName || "",
  bankAccountName: s.bankAccountName || "",
  bankAccountNumber: s.bankAccountNumber || "",
  bankSwiftCode: s.bankSwiftCode || "",
});

/** Company details and defaults printed on every invoice. */
export function BillingSettingsForm() {
  const currencies = useMemo(() => currencyOptions(), []);
  const [form, setForm] = useState<Form | null>(null);
  const [saved, setSaved] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ ok: "", error: "" });

  useEffect(() => {
    invoicesApi
      .settings()
      .then((s) => {
        setForm(toForm(s));
        setSaved(toForm(s));
      })
      .catch((e) => setMsg({ ok: "", error: e instanceof Error ? e.message : "Could not load billing settings." }));
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setMsg({ ok: "", error: "" });
    try {
      const s = await invoicesApi.saveSettings({
        companyName: form.companyName.trim(),
        companyAddress: form.companyAddress.trim() || null,
        companyEmail: form.companyEmail.trim() || null,
        companyPhone: form.companyPhone.trim() || null,
        taxNumber: form.taxNumber.trim() || null,
        paymentInstructions: form.paymentInstructions.trim() || null,
        invoiceFooter: form.invoiceFooter.trim() || null,
        defaultCurrency: form.defaultCurrency,
        defaultTaxRate: Number(form.defaultTaxRate),
        paymentTermsDays: Number(form.paymentTermsDays),
        bankName: form.bankName.trim() || null,
        bankAccountName: form.bankAccountName.trim() || null,
        bankAccountNumber: form.bankAccountNumber.trim() || null,
        bankSwiftCode: form.bankSwiftCode.trim() || null,
      });
      setForm(toForm(s));
      setSaved(toForm(s));
      setMsg({ ok: "Billing settings saved. They apply to invoices issued from now on.", error: "" });
    } catch (err) {
      setMsg({ ok: "", error: err instanceof Error ? err.message : "Could not save." });
    } finally {
      setBusy(false);
    }
  }

  if (!form) return <p className="text-sm text-slate-500" aria-busy="true">{msg.error || "Loading…"}</p>;
  const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [key]: e.target.value });
  const changed = JSON.stringify(form) !== JSON.stringify(saved);

  return (
    <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h3 className="font-bold">Billing &amp; invoices</h3>
      <p className="mt-1 text-xs text-slate-500">
        Printed on every invoice. Invoices already issued keep the details they were issued with.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className={`${label} sm:col-span-2`}>Company name<input required maxLength={120} value={form.companyName} onChange={set("companyName")} className={input} /></label>
        <label className={`${label} sm:col-span-2`}>Address<textarea rows={2} maxLength={500} value={form.companyAddress} onChange={set("companyAddress")} className={area} /></label>
        <label className={label}>Billing email<input type="email" value={form.companyEmail} onChange={set("companyEmail")} className={input} /></label>
        <label className={label}>Phone<input maxLength={60} value={form.companyPhone} onChange={set("companyPhone")} className={input} /></label>
        <label className={`${label} sm:col-span-2`}>Tax / VAT number<input maxLength={60} value={form.taxNumber} onChange={set("taxNumber")} className={input} /></label>
        <div className="rounded-xl border border-slate-200 p-4 sm:col-span-2">
          <p className="text-sm font-bold">Bank transfer details</p>
          <p className="text-xs text-slate-500">Printed at the bottom of each invoice and encoded in its “scan to pay” QR code.</p>
          {form.bankName === "Example Bank Ltd" && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
              These are sample details. Replace them with your real account before issuing invoices.
            </p>
          )}
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className={label}>Account name<input maxLength={120} value={form.bankAccountName} onChange={set("bankAccountName")} className={input} /></label>
            <label className={label}>Bank name<input maxLength={120} value={form.bankName} onChange={set("bankName")} className={input} /></label>
            <label className={label}>Account number<input maxLength={60} value={form.bankAccountNumber} onChange={set("bankAccountNumber")} className={input} /></label>
            <label className={label}>SWIFT / BIC<input maxLength={40} value={form.bankSwiftCode} onChange={set("bankSwiftCode")} className={input} /></label>
          </div>
        </div>
        <label className={`${label} sm:col-span-2`}>
          Other ways to pay (optional)
          <textarea rows={4} maxLength={1500} value={form.paymentInstructions} onChange={set("paymentInstructions")} className={area} placeholder={"Bank name, account number, mobile money details…"} />
        </label>
        <label className={`${label} sm:col-span-2`}>Footer line<input maxLength={300} value={form.invoiceFooter} onChange={set("invoiceFooter")} className={input} placeholder="Thank you for travelling with us." /></label>
        <label className={label}>
          Default currency
          <select value={form.defaultCurrency} onChange={set("defaultCurrency")} className={input}>
            {currencies.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </label>
        <label className={label}>Default tax (%)<input type="number" min="0" max="100" step="0.01" value={form.defaultTaxRate} onChange={set("defaultTaxRate")} className={input} /></label>
        <label className={label}>Payment terms (days)<input type="number" min="0" max="365" step="1" value={form.paymentTermsDays} onChange={set("paymentTermsDays")} className={input} /></label>
      </div>
      <div className="mt-4 space-y-3">
        <ErrorNote message={msg.error} />
        {msg.ok && <p role="status" className="rounded-xl bg-[#eaf5ee] px-4 py-3 text-sm font-semibold text-[#1c673e]">{msg.ok}</p>}
        <button type="submit" disabled={busy || !changed} className="rounded-xl bg-[#007cc2] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#006ba8] disabled:opacity-50">
          {busy ? "Saving…" : "Save billing settings"}
        </button>
      </div>
    </form>
  );
}
