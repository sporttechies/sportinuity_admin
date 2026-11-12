import type { InvoiceStatus } from "@/lib/api";
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_STYLES } from "@/lib/constants";

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${INVOICE_STATUS_STYLES[status]}`}>
      {INVOICE_STATUS_LABELS[status]}
    </span>
  );
}
