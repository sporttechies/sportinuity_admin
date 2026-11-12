"use client";

import { useEffect, useState } from "react";
import { Download, ExternalLink, Mail, Pencil, Send } from "lucide-react";
import { invoicesApi, type EmailResult, type Invoice } from "@/lib/api";
import { ErrorNote, Modal } from "@/components/modal";
import { InvoiceStatusBadge } from "@/components/invoice-status";

/**
 * Shows the real PDF. Drafts can only be issued (and emailed) from here, so a
 * manager always sees exactly what the team will receive first.
 */
export function InvoicePreview({
  invoice,
  onClose,
  onChanged,
  onEdit,
}: {
  invoice: Invoice;
  onClose: () => void;
  onChanged: (invoice: Invoice) => void;
  onEdit?: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [warning, setWarning] = useState("");

  // Reload the PDF whenever what it shows changes (e.g. after issuing).
  const version = `${invoice.id}:${invoice.status}:${invoice.total}:${invoice.number}`;
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setUrl(null);
    setLoadError("");
    invoicesApi
      .pdf(invoice.id)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((e) => !cancelled && setLoadError(e instanceof Error ? e.message : "Could not load the preview."));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  async function run(
    job: () => Promise<{ invoice: Invoice; email: EmailResult | null }>,
    action: "issued" | "resent",
  ) {
    setBusy(true);
    setError("");
    setNotice("");
    setWarning("");
    try {
      const { invoice: updated, email } = await job();
      onChanged(updated);
      const who = email?.recipients?.length ? ` (${email.recipients.join(", ")})` : "";
      if (email?.status === "sent") {
        setNotice(action === "issued" ? `Invoice issued and emailed to the team${who}.` : `A copy has been emailed to the team${who}.`);
      } else if (email) {
        setWarning(
          `${action === "issued" ? "The invoice was issued" : "Nothing was sent"}, but the email ${
            email.status === "skipped" ? "was skipped" : "could not be sent"
          }: ${email.reason || "unknown reason"}. ${action === "issued" ? "Use “Email again” once that's fixed. " : ""}The team can still download it from their request page.`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const isDraft = invoice.status === "draft";
  const canResend = invoice.status === "issued" || invoice.status === "paid";
  const filename = `${invoice.number || `draft-${invoice.requestReference}`}.pdf`;

  return (
    <Modal title={isDraft ? "Preview invoice" : `Invoice ${invoice.number}`} onClose={busy ? () => {} : onClose} wide>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-slate-600">
            {invoice.team} · {invoice.requestReference}
          </span>
          <InvoiceStatusBadge status={invoice.status} />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          {url ? (
            <iframe title="Invoice PDF preview" src={url} className="h-[62dvh] w-full bg-white" />
          ) : loadError ? (
            <p className="p-6 text-sm text-red-700">{loadError}</p>
          ) : (
            <p className="p-6 text-sm text-slate-500" aria-busy="true">Preparing preview…</p>
          )}
        </div>
        <p className="text-xs text-slate-500">
          Phone or tablet not showing the preview? Use “Open PDF” below.
        </p>

        {isDraft && (
          <p className="rounded-xl bg-[#fff4dc] px-3.5 py-3 text-sm text-[#7a5200]">
            This is a draft. Issuing it gives it an invoice number, locks it, and emails this PDF to {invoice.team}&apos;s
            admins and the request contact.
          </p>
        )}
        <ErrorNote message={error} />
        {warning && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-sm font-medium text-amber-900">{warning}</p>}
        {notice && <p role="status" className="rounded-xl bg-[#eaf5ee] px-3.5 py-3 text-sm font-semibold text-[#1c673e]">{notice}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {url && (
              <>
                <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold hover:bg-slate-50">
                  <ExternalLink className="size-4" /> Open PDF
                </a>
                <a href={url} download={filename} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold hover:bg-slate-50">
                  <Download className="size-4" /> Download
                </a>
              </>
            )}
            {isDraft && onEdit && (
              <button onClick={onEdit} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold hover:bg-slate-50">
                <Pencil className="size-4" /> Edit
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
              Close
            </button>
            {isDraft && (
              <button
                onClick={() => run(() => invoicesApi.issue(invoice.id), "issued")}
                disabled={busy || !url}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#007cc2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#006ba8] disabled:opacity-60"
              >
                <Send className="size-4" /> {busy ? "Issuing…" : "Issue & email to team"}
              </button>
            )}
            {canResend && (
              <button
                onClick={() => run(() => invoicesApi.resend(invoice.id), "resent")}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#007cc2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#006ba8] disabled:opacity-60"
              >
                <Mail className="size-4" /> {busy ? "Sending…" : "Email again"}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
