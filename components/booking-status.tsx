import { BOOKING_STATUS_LABELS, BOOKING_STATUS_STYLES } from "@/lib/constants";
import type { BookingStatus } from "@/lib/api";

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${BOOKING_STATUS_STYLES[status]}`}>
      {BOOKING_STATUS_LABELS[status]}
    </span>
  );
}

const INVOICE_STYLES = { issued: "bg-[#e8f4fb] text-[#007cc2]", paid: "bg-[#eaf5ee] text-[#1c673e]", void: "bg-slate-100 text-slate-500" } as const;
const INVOICE_LABELS = { issued: "Invoice issued", paid: "Paid", void: "Invoice void" } as const;

export function BookingInvoiceBadge({ status }: { status?: "issued" | "paid" | "void" | null }) {
  if (!status) return <span className="text-xs text-slate-400">No invoice</span>;
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${INVOICE_STYLES[status]}`}>{INVOICE_LABELS[status]}</span>;
}
