"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Plus } from "lucide-react";
import { quotationsApi, type Quotation, type RequestStatus } from "@/lib/api";
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_STYLES,
  SUPPLIER_TYPES,
  SUPPLIER_TYPE_LABELS,
  formatDate,
  formatMoney,
} from "@/lib/constants";
import { ConfirmDialog, ErrorNote } from "@/components/modal";
import { QuotationForm } from "@/components/quotation-form";

/** Quotes from suppliers for this request (internal: teams never see them). */
export function QuotationsPanel({
  reference,
  requestStatus,
}: {
  reference: string;
  requestStatus: RequestStatus;
}) {
  const [items, setItems] = useState<Quotation[] | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<"new" | Quotation | null>(null);
  const [toDelete, setToDelete] = useState<Quotation | null>(null);
  const [busyId, setBusyId] = useState("");
  const closed = requestStatus === "cancelled" || requestStatus === "rejected";

  const load = useCallback(async () => {
    try {
      setItems(await quotationsApi.forRequest(reference));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load quotations.");
    }
  }, [reference]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(q: Quotation, fn: (id: string) => Promise<unknown>) {
    setBusyId(q.id);
    setError("");
    try {
      await fn(q.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work.");
    } finally {
      setBusyId("");
    }
  }

  const assigned = (items ?? []).filter((q) => q.status === "accepted");
  // The lowest received price per service and currency, to help compare.
  const lowest = new Map<string, number>();
  for (const q of items ?? []) {
    if (q.amount == null || !["received", "accepted"].includes(q.status)) continue;
    const key = `${q.serviceType}|${q.currency}`;
    lowest.set(key, Math.min(lowest.get(key) ?? Infinity, q.amount));
  }
  const compared = (q: Quotation) =>
    q.amount != null &&
    ["received", "accepted"].includes(q.status) &&
    lowest.get(`${q.serviceType}|${q.currency}`) === q.amount &&
    (items ?? []).filter((x) => x.serviceType === q.serviceType && x.currency === q.currency && x.amount != null).length > 1;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold">Supplier quotations</h3>
          <p className="text-xs text-slate-500">Internal costs. Only managers can see these; teams never do.</p>
        </div>
        {!closed && (
          <button
            onClick={() => setForm("new")}
            className="inline-flex items-center gap-2 rounded-xl bg-[#007cc2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#006ba8]"
          >
            <Plus className="size-4" /> Add quotation
          </button>
        )}
      </div>

      <ErrorNote message={error} />

      {assigned.length > 0 && (
        <div className="mt-4 rounded-xl bg-[#eaf5ee] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1c673e]">Assigned suppliers</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {assigned.map((q) => (
              <li key={q.id} className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-[#1c673e]">
                {SUPPLIER_TYPE_LABELS[q.serviceType]}: {q.supplier.name}
                {q.amount != null && <span className="font-normal"> · {formatMoney(q.amount, q.currency)}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {items === null && !error ? (
        <p className="mt-4 text-sm text-slate-500" aria-busy="true">Loading…</p>
      ) : items && items.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 py-8 text-center text-sm text-slate-500">
          No quotations yet. Add one when a supplier sends a price, or when you ask for one.
        </p>
      ) : (
        <div className="mt-4 space-y-5">
          {SUPPLIER_TYPES.map((type) => {
            const group = (items ?? []).filter((q) => q.serviceType === type);
            if (!group.length) return null;
            return (
              <div key={type}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {SUPPLIER_TYPE_LABELS[type]}
                </p>
                <ul className="mt-2 space-y-2">
                  {group.map((q) => (
                    <li
                      key={q.id}
                      className={`rounded-xl border p-3 sm:p-4 ${
                        q.status === "accepted" ? "border-[#9fd1b2] bg-[#f6fbf8]" : "border-slate-200"
                      } ${q.status === "rejected" ? "opacity-60" : ""}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold">
                            {q.supplier.name}
                            {!q.supplier.isActive && <span className="ml-2 text-xs font-normal text-slate-400">(inactive)</span>}
                          </p>
                          <p className="text-sm text-slate-600">{q.description}</p>
                          {q.notes && <p className="mt-1 text-xs text-slate-500">{q.notes}</p>}
                          <p className="mt-1 text-xs text-slate-400">
                            {q.supplier.contactName && `${q.supplier.contactName} · `}
                            {q.supplier.phone && `${q.supplier.phone} · `}
                            {q.validUntil ? `Valid until ${formatDate(q.validUntil)}` : "No expiry date"}
                            {q.expired && <span className="ml-1 font-semibold text-red-600">· expired</span>}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            {q.amount == null ? <span className="text-sm font-semibold text-slate-400">No price yet</span> : formatMoney(q.amount, q.currency)}
                          </p>
                          <div className="mt-1 flex flex-wrap justify-end gap-1.5">
                            {compared(q) && (
                              <span className="rounded-full bg-[#eaf5ee] px-2.5 py-0.5 text-xs font-semibold text-[#1c673e]">Lowest</span>
                            )}
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${QUOTE_STATUS_STYLES[q.status]}`}>
                              {QUOTE_STATUS_LABELS[q.status]}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1 border-t border-slate-100 pt-2 text-xs font-semibold">
                        {q.status === "received" && (
                          <button
                            disabled={busyId === q.id}
                            onClick={() => act(q, quotationsApi.accept)}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#1c673e] px-3 py-1.5 text-white hover:bg-[#15522f] disabled:opacity-60"
                          >
                            <Check className="size-3.5" /> Accept
                          </button>
                        )}
                        {(q.status === "requested" || q.status === "received") && (
                          <button onClick={() => setForm(q)} className="rounded-lg px-3 py-1.5 text-[#007cc2] hover:bg-slate-50">
                            {q.status === "requested" ? "Enter price" : "Edit"}
                          </button>
                        )}
                        {q.status !== "rejected" && (
                          <button disabled={busyId === q.id} onClick={() => act(q, quotationsApi.reject)} className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                            Reject
                          </button>
                        )}
                        {(q.status === "accepted" || q.status === "rejected") && (
                          <button disabled={busyId === q.id} onClick={() => act(q, quotationsApi.reopen)} className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                            Reopen
                          </button>
                        )}
                        {q.status !== "accepted" && (
                          <button onClick={() => setToDelete(q)} className="rounded-lg px-3 py-1.5 text-red-600 hover:bg-red-50">
                            Delete
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {form && (
        <QuotationForm
          reference={reference}
          quotation={form === "new" ? undefined : form}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            load();
          }}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete quotation?"
          danger
          confirmLabel="Delete"
          message={
            <>
              Delete the quotation from <strong>{toDelete.supplier.name}</strong>? This can&apos;t be undone.
            </>
          }
          onClose={() => setToDelete(null)}
          onConfirm={async () => {
            await quotationsApi.remove(toDelete.id);
            setToDelete(null);
            await load();
          }}
        />
      )}
    </section>
  );
}
