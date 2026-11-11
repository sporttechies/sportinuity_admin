"use client";

import { ReactNode, useEffect, useState } from "react";
import { X } from "lucide-react";

export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-[#0a0b0d]/40 p-0 backdrop-blur-[1px] sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`app-scroll flex max-h-[92dvh] w-full flex-col overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${
          wide ? "sm:max-w-3xl" : "sm:max-w-md"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return message ? (
    <p
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700"
    >
      {message}
    </p>
  ) : null;
}

/** Runs an async action, keeping the dialog open and showing the error on failure. */
function useAction(run: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function go() {
    setBusy(true);
    setError("");
    try {
      await run();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }
  return { busy, error, go };
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger = false,
  onConfirm,
  onClose,
}: {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const { busy, error, go } = useAction(onConfirm);
  return (
    <Modal title={title} onClose={busy ? () => {} : onClose}>
      <div className="space-y-4">
        <div className="text-sm text-slate-600">{message}</div>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={go}
            disabled={busy}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-[#007cc2] hover:bg-[#006ba8]"
            }`}
          >
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** Asks for the reason shown to the team when a request is not approved. */
export function RejectDialog({
  reference,
  onReject,
  onClose,
}: {
  reference: string;
  onReject: (reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const valid = reason.trim().length >= 3;
  const { busy, error, go } = useAction(() => onReject(reason.trim()));
  return (
    <Modal title={`Reject ${reference}`} onClose={busy ? () => {} : onClose}>
      <div className="space-y-4">
        <label className="block text-sm font-semibold">
          Reason (sent to the team)
          <textarea
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            maxLength={1000}
            className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal outline-none focus:border-[#007cc2] focus:ring-4 focus:ring-[#007cc2]/15"
          />
        </label>
        <ErrorNote message={error} />
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={go}
            disabled={busy || !valid}
            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {busy ? "Rejecting…" : "Reject request"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
