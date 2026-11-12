"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, Plus, Trash2 } from "lucide-react";
import { invoicesApi, type Invoice, type InvoiceContext } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/constants";
import { ConfirmDialog, ErrorNote, Modal } from "@/components/modal";
import { InvoiceForm } from "@/components/invoice-form";
import { InvoicePreview } from "@/components/invoice-preview";
import { InvoiceStatusBadge } from "@/components/invoice-status";

function VoidDialog({ invoice, onVoid, onClose }: { invoice: Invoice; onVoid: (reason: string) => Promise<void>; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal title={`Void ${invoice.number}`} onClose={busy ? () => {} : onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          A voided invoice stays on record, marked VOID, and can&apos;t be reissued. Create a new invoice if the team still owes money.
        </p>
        <label className="block text-sm font-semibold">
          Reason
          <textarea autoFocus value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal outline-none focus:border-[#007cc2] focus:ring-4 focus:ring-[#007cc2]/15" />
        </label>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel</button>
          <button
            disabled={busy || reason.trim().length < 3}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await onVoid(reason.trim());
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not void the invoice.");
                setBusy(false);
              }
            }}
            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {busy ? "Voiding…" : "Void invoice"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** Invoices for one request: create, preview, issue, mark paid, void. */
export function InvoicesPanel({ reference, onChanged }: { reference: string; onChanged?: () => void }) {
  const [context, setContext] = useState<InvoiceContext | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [previewing, setPreviewing] = useState<Invoice | null>(null);
  const [voiding, setVoiding] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState<Invoice | null>(null);
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    try {
      setContext(await invoicesApi.context(reference));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load invoices.");
    }
  }, [reference]);

  useEffect(() => {
    load();
  }, [load]);

  const changed = async () => {
    await load();
    onChanged?.();
  };

  async function togglePaid(invoice: Invoice) {
    setBusyId(invoice.id);
    setError("");
    try {
      await invoicesApi.setPaid(invoice.id, invoice.status !== "paid");
      await changed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the invoice.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-bold">Invoices</h3>
        {context?.canCreate && (
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-[#007cc2] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#006ba8]">
            <Plus className="size-4" /> New invoice
          </button>
        )}
      </div>

      <div className="mt-3 space-y-3">
        <ErrorNote message={error} />
        {!context && !error && <p className="text-sm text-slate-500" aria-busy="true">Loading…</p>}
        {context && !context.canCreate && context.reason && context.invoices.length === 0 && (
          <p className="text-sm text-slate-500">{context.reason}</p>
        )}
        {context && context.canCreate && context.invoices.length === 0 && (
          <p className="text-sm text-slate-500">No invoices yet. Create one to price this trip per traveller.</p>
        )}

        <ul className="divide-y divide-slate-100">
          {context?.invoices.map((inv) => (
            <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {inv.number || "Draft invoice"} · {formatMoney(inv.total, inv.currency)}
                </p>
                <p className="text-xs text-slate-500">
                  {inv.status === "draft"
                    ? "Not sent yet"
                    : `Issued ${formatDate(inv.issueDate)}${inv.dueDate ? ` · due ${formatDate(inv.dueDate)}` : ""}`}
                  {inv.paidAt ? ` · paid ${formatDate(inv.paidAt)}` : ""}
                  {inv.status === "void" && inv.voidReason ? ` · ${inv.voidReason}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <InvoiceStatusBadge status={inv.status} />
                <button onClick={() => setPreviewing(inv)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-[#007cc2] hover:bg-[#e8f4fb]">
                  <Eye className="size-4" /> {inv.status === "draft" ? "Preview & issue" : "View"}
                </button>
                {(inv.status === "issued" || inv.status === "paid") && (
                  <button disabled={busyId === inv.id} onClick={() => togglePaid(inv)} className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                    {inv.status === "paid" ? "Mark unpaid" : "Mark paid"}
                  </button>
                )}
                {inv.status === "issued" && (
                  <button onClick={() => setVoiding(inv)} className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50">Void</button>
                )}
                {inv.status === "draft" && (
                  <button onClick={() => setDeleting(inv)} aria-label="Delete draft" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {creating && context && (
        <InvoiceForm
          reference={reference}
          context={context}
          onClose={() => setCreating(false)}
          onSaved={async (invoice) => {
            setCreating(false);
            await changed();
            setPreviewing(invoice); // always review the PDF before it goes out
          }}
        />
      )}
      {editing && context && (
        <InvoiceForm
          reference={reference}
          context={context}
          invoice={editing}
          onClose={() => setEditing(null)}
          onSaved={async (invoice) => {
            setEditing(null);
            await changed();
            setPreviewing(invoice);
          }}
        />
      )}
      {previewing && (
        <InvoicePreview
          invoice={previewing}
          onClose={() => setPreviewing(null)}
          onChanged={async (invoice) => {
            setPreviewing(invoice);
            await changed();
          }}
          onEdit={() => {
            setEditing(previewing);
            setPreviewing(null);
          }}
        />
      )}
      {voiding && (
        <VoidDialog
          invoice={voiding}
          onClose={() => setVoiding(null)}
          onVoid={async (reason) => {
            await invoicesApi.void(voiding.id, reason);
            setVoiding(null);
            await changed();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete this draft?"
          danger
          confirmLabel="Delete draft"
          message="The draft is removed. Nothing was sent to the team."
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await invoicesApi.remove(deleting.id);
            setDeleting(null);
            await changed();
          }}
        />
      )}
    </section>
  );
}
