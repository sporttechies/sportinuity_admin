import { STATUS_LABELS, STATUS_STYLES } from "@/lib/constants";
import type { RequestStatus } from "@/lib/api";

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
        STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
