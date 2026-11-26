"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, FileText, Pencil } from "lucide-react";
import { bookingsApi, type Booking, type BookingTraveller, type CustomerType } from "@/lib/api";
import { CUSTOMER_TYPE_LABELS, formatDate, formatDateRange, formatDateTime, formatMoney } from "@/lib/constants";
import { Modal, ErrorNote } from "@/components/modal";
import { BookingInvoiceBadge, BookingStatusBadge } from "@/components/booking-status";
import { TravellersEditor } from "@/components/travellers-editor";

const input =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal outline-none focus:border-[#007cc2] focus:ring-2 focus:ring-[#007cc2]/20";
const btn = "rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60";
const primary = "rounded-xl bg-[#007cc2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#006ba8] disabled:opacity-60";

const EVENT_LABELS: Record<string, string> = {
  created: "Booking created", confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled",
  travellers_updated: "Travellers updated", invoice_issued: "Invoice issued", invoice_paid: "Marked paid",
  invoice_unpaid: "Marked unpaid", invoice_voided: "Invoice voided",
};

type Dialog = null | "contact" | "travellers" | "cancel" | "invoice";

export default function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const [b, setB] = useState<Booking | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);

  const load = useCallback(async () => {
    try {
      setB(await bookingsApi.get(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the booking.");
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  async function run(fn: () => Promise<Booking | void>) {
    setBusy(true);
    setError("");
    try {
      const next = await fn();
      if (next) setB(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function openInvoice() {
    const tab = window.open("", "_blank");
    try {
      const url = URL.createObjectURL(await bookingsApi.invoicePdf(id));
      if (tab) tab.location.href = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      tab?.close();
      setError(e instanceof Error ? e.message : "Could not open the invoice.");
    }
  }

  if (!b) {
    return (
      <div className="space-y-4">
        <Link href="/travel/bookings" className="inline-flex items-center gap-1 text-sm font-semibold text-[#007cc2]"><ChevronLeft className="size-4" />Bookings</Link>
        {error ? <ErrorNote message={error} /> : <p className="text-sm text-slate-500" aria-busy="true">Loading…</p>}
      </div>
    );
  }

  const open = b.status === "pending" || b.status === "confirmed";
  const invoiceLive = !!b.invoice && b.invoice.status !== "void";
  const money = (c: number) => formatMoney(c / 100, b.currency);

  return (
    <div className="space-y-6">
      <Link href="/travel/bookings" className="inline-flex items-center gap-1 text-sm font-semibold text-[#007cc2]"><ChevronLeft className="size-4" />Bookings</Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{b.reference}</h1>
            <BookingStatusBadge status={b.status} />
            <BookingInvoiceBadge status={b.invoice?.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            <Link href={`/travel/${b.packageId}`} className="font-semibold text-[#007cc2] hover:underline">{b.package.title}</Link>
            {" · "}{b.package.destination} · {formatDateRange(b.package.startDate, b.package.endDate)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {b.status === "pending" && <button disabled={busy} onClick={() => run(() => bookingsApi.setStatus(b.id, "confirmed"))} className={primary}>Confirm booking</button>}
          {b.status === "confirmed" && <button disabled={busy} onClick={() => run(() => bookingsApi.setStatus(b.id, "completed"))} className={primary}>Mark completed</button>}
          {open && !b.invoice && <button disabled={busy} onClick={() => setDialog("invoice")} className={b.status === "confirmed" ? primary : btn}>Issue invoice</button>}
          {open && <button disabled={busy} onClick={() => setDialog("cancel")} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50">Cancel booking</button>}
        </div>
      </header>

      <ErrorNote message={error} />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-5 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Travellers <span className="font-normal text-slate-400">· {b.seats}</span></h2>
              {open && (
                <button disabled={busy || invoiceLive} onClick={() => setDialog("travellers")} title={invoiceLive ? "Locked once an invoice is issued" : undefined} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#007cc2] hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline">
                  <Pencil className="size-4" />Change
                </button>
              )}
            </div>
            <ul className="divide-y divide-slate-100">
              {(b.travellers ?? []).map((t) => (
                <li key={t.id} className="flex flex-wrap items-baseline justify-between gap-x-4 py-2.5 text-sm">
                  <span className="font-medium">{t.firstName} {t.lastName}{t.category === "child" && <span className="ml-2 text-xs text-slate-400">Child</span>}</span>
                  <span className="text-xs text-slate-500">
                    {[t.singleRoom && "Single room", t.documentNumber && `ID ${t.documentNumber}`, t.dietary].filter(Boolean).join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-bold">History</h2>
            <ol className="space-y-3">
              {[...(b.events ?? [])].reverse().map((e) => (
                <li key={e.id} className="text-sm">
                  <p className="font-semibold">{EVENT_LABELS[e.action] ?? e.action}</p>
                  {e.note && <p className="text-slate-500">{e.note}</p>}
                  <p className="text-xs text-slate-400">{formatDateTime(e.createdAt)}{e.actorName ? ` · ${e.actorName}` : ""}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Customer</h2>
              <button onClick={() => setDialog("contact")} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#007cc2] hover:underline"><Pencil className="size-4" />Edit</button>
            </div>
            <p className="font-semibold">{b.organisation || b.contactName}</p>
            <p className="text-slate-500">{CUSTOMER_TYPE_LABELS[b.customerType]}{b.organisation ? ` · ${b.contactName}` : ""}</p>
            {b.contactEmail && <p className="mt-2"><a className="text-[#007cc2] hover:underline" href={`mailto:${b.contactEmail}`}>{b.contactEmail}</a></p>}
            {b.contactPhone && <p><a className="text-[#007cc2] hover:underline" href={`tel:${b.contactPhone}`}>{b.contactPhone}</a></p>}
            {b.notes && <p className="mt-3 whitespace-pre-line text-slate-600"><span className="font-semibold">Customer notes: </span>{b.notes}</p>}
            {b.managerNotes && <p className="mt-2 whitespace-pre-line text-slate-600"><span className="font-semibold">Internal: </span>{b.managerNotes}</p>}
            {b.cancelReason && <p className="mt-2 text-slate-600"><span className="font-semibold">Cancelled: </span>{b.cancelReason}</p>}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
            <h2 className="mb-3 font-bold">Price</h2>
            <dl className="space-y-2">
              <div className="flex justify-between"><dt className="text-slate-500">{b.seats} × {money(b.unitPriceCents)}</dt><dd>{money(b.seats * b.unitPriceCents)}</dd></div>
              {b.singleRooms > 0 && <div className="flex justify-between"><dt className="text-slate-500">{b.singleRooms} × single room</dt><dd>{money(b.singleRooms * b.singleSupplementCents)}</dd></div>}
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold"><dt>Total</dt><dd>{money(b.totalCents)}</dd></div>
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
            <h2 className="mb-3 font-bold">Invoice</h2>
            {!b.invoice ? (
              <p className="text-slate-500">{open ? "Not invoiced yet. Customers pay by bank transfer once it's issued." : "No invoice was issued."}</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between"><span className="font-semibold">{b.invoice.number}</span><BookingInvoiceBadge status={b.invoice.status} /></div>
                <p className="text-slate-500">Issued {formatDate(b.invoice.issuedAt)}{b.invoice.dueDate ? ` · due ${formatDate(b.invoice.dueDate)}` : ""}</p>
                {b.invoice.paidAt && <p className="text-slate-500">Paid {formatDate(b.invoice.paidAt)}</p>}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button onClick={openInvoice} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"><FileText className="size-4" />View PDF</button>
                  {b.invoice.status === "issued" && <button disabled={busy} onClick={() => run(() => bookingsApi.markPaid(b.id, true))} className="rounded-xl bg-[#17633e] px-3 py-2 text-sm font-semibold text-white hover:bg-[#124f31] disabled:opacity-60">Mark paid</button>}
                  {b.invoice.status === "paid" && <button disabled={busy} onClick={() => run(() => bookingsApi.markPaid(b.id, false))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60">Mark unpaid</button>}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {dialog === "contact" && <ContactDialog b={b} onClose={() => setDialog(null)} onSaved={(x) => { setB(x); setDialog(null); }} />}
      {dialog === "travellers" && <TravellersDialog b={b} onClose={() => setDialog(null)} onSaved={(x) => { setB(x); setDialog(null); }} />}
      {dialog === "cancel" && <CancelDialog b={b} onClose={() => setDialog(null)} onSaved={(x) => { setB(x); setDialog(null); }} />}
      {dialog === "invoice" && <InvoiceDialog b={b} onClose={() => setDialog(null)} onSaved={(x) => { setB(x); setDialog(null); }} />}
    </div>
  );
}

type DialogProps = { b: Booking; onClose: () => void; onSaved: (b: Booking) => void };

function useSubmit(action: () => Promise<Booking>, onSaved: (b: Booking) => void) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      onSaved(await action());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }
  return { error, busy, submit };
}

function Footer({ busy, label, onClose, danger }: { busy: boolean; label: string; onClose: () => void; danger?: boolean }) {
  return (
    <div className="flex justify-end gap-3">
      <button type="button" onClick={onClose} className={btn}>Back</button>
      <button disabled={busy} className={danger ? "rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60" : primary}>{busy ? "Saving…" : label}</button>
    </div>
  );
}

function ContactDialog({ b, onClose, onSaved }: DialogProps) {
  const [type, setType] = useState<CustomerType>(b.customerType);
  const [form, setForm] = useState<HTMLFormElement | null>(null);
  const { error, busy, submit } = useSubmit(() => {
    const f = new FormData(form!);
    const text = (k: string) => String(f.get(k) || "").trim() || null;
    return bookingsApi.update(b.id, {
      customerType: type,
      contactName: String(f.get("name") || "").trim(),
      contactEmail: text("email"),
      contactPhone: text("phone"),
      organisation: type === "fan" ? null : text("organisation"),
      notes: text("notes"),
      managerNotes: text("managerNotes"),
    });
  }, onSaved);
  return (
    <Modal title="Edit customer" onClose={onClose}>
      <form ref={setForm} onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-semibold">Customer type
          <select value={type} onChange={(e) => setType(e.target.value as CustomerType)} className={input}>
            {(Object.keys(CUSTOMER_TYPE_LABELS) as CustomerType[]).map((t) => <option key={t} value={t}>{CUSTOMER_TYPE_LABELS[t]}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold">Contact name<input name="name" required minLength={2} maxLength={120} defaultValue={b.contactName} className={input} /></label>
        {type !== "fan" && <label className="block text-sm font-semibold">Group or organisation<input name="organisation" required maxLength={160} defaultValue={b.organisation ?? ""} className={input} /></label>}
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold">Email<input name="email" type="email" maxLength={200} defaultValue={b.contactEmail ?? ""} className={input} /></label>
          <label className="block text-sm font-semibold">Phone<input name="phone" maxLength={40} defaultValue={b.contactPhone ?? ""} className={input} /></label>
        </div>
        <label className="block text-sm font-semibold">Customer notes<textarea name="notes" rows={2} maxLength={2000} defaultValue={b.notes ?? ""} className={input} /></label>
        <label className="block text-sm font-semibold">Internal notes<textarea name="managerNotes" rows={2} maxLength={2000} defaultValue={b.managerNotes ?? ""} placeholder="Not shown to the customer" className={input} /></label>
        <ErrorNote message={error} />
        <Footer busy={busy} label="Save" onClose={onClose} />
      </form>
    </Modal>
  );
}

function TravellersDialog({ b, onClose, onSaved }: DialogProps) {
  const [list, setList] = useState<Omit<BookingTraveller, "id">[]>(
    (b.travellers ?? []).map(({ id: _id, ...rest }) => rest),
  );
  const { error, busy, submit } = useSubmit(
    () => bookingsApi.setTravellers(b.id, list.map((t) => ({ ...t, firstName: t.firstName.trim(), lastName: t.lastName.trim() }))),
    onSaved,
  );
  const singles = list.filter((t) => t.singleRoom).length;
  const total = list.length * b.unitPriceCents + singles * b.singleSupplementCents;
  return (
    <Modal title="Change travellers" onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <TravellersEditor value={list} onChange={setList} hasSupplement={b.singleSupplementCents > 0 || b.singleRooms > 0} />
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-right text-sm font-bold">New total {formatMoney(total / 100, b.currency)}</p>
        <ErrorNote message={error} />
        <Footer busy={busy} label="Save travellers" onClose={onClose} />
      </form>
    </Modal>
  );
}

function CancelDialog({ b, onClose, onSaved }: DialogProps) {
  const [reason, setReason] = useState("");
  const { error, busy, submit } = useSubmit(() => bookingsApi.setStatus(b.id, "cancelled", reason.trim()), onSaved);
  return (
    <Modal title="Cancel this booking?" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-600">
          {b.seats} seat{b.seats === 1 ? "" : "s"} will be released.{b.invoice && " The unpaid invoice will be voided."} This can&apos;t be undone.
        </p>
        <label className="block text-sm font-semibold">Reason <span className="font-normal text-slate-400">(optional)</span>
          <textarea rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className={input} />
        </label>
        <ErrorNote message={error} />
        <Footer busy={busy} label="Cancel booking" onClose={onClose} danger />
      </form>
    </Modal>
  );
}

function InvoiceDialog({ b, onClose, onSaved }: DialogProps) {
  const [due, setDue] = useState("");
  const { error, busy, submit } = useSubmit(() => bookingsApi.issueInvoice(b.id, due), onSaved);
  return (
    <Modal title="Issue invoice" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-600">
          Invoice {formatMoney(b.totalCents / 100, b.currency)} for {b.organisation || b.contactName}. Travellers and price are locked once it&apos;s issued.
        </p>
        <label className="block text-sm font-semibold">Due date <span className="font-normal text-slate-400">(leave empty for your default payment terms)</span>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={input} />
        </label>
        <ErrorNote message={error} />
        <Footer busy={busy} label="Issue invoice" onClose={onClose} />
      </form>
    </Modal>
  );
}
