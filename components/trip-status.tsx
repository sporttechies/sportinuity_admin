import { TRIP_STATUS_LABELS, TRIP_STATUS_STYLES } from "@/lib/constants";
import type { TripStatus } from "@/lib/api";

export function TripStatusBadge({ status }: { status: TripStatus }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${TRIP_STATUS_STYLES[status]}`}>
      {TRIP_STATUS_LABELS[status]}
    </span>
  );
}
