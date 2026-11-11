import type { RequestStatus } from "./api";

// Labels as managers see them. "confirmed" is what the UI calls Approved.
export const STATUS_LABELS: Record<RequestStatus, string> = {
  new: "New",
  in_review: "In review",
  quoted: "Quoted",
  confirmed: "Approved",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

export const STATUS_STYLES: Record<RequestStatus, string> = {
  new: "bg-[#f0e9fb] text-[#7650ab]",
  in_review: "bg-[#e8f4fb] text-[#007cc2]",
  quoted: "bg-[#fff4dc] text-[#a36a00]",
  confirmed: "bg-[#eaf5ee] text-[#1c673e]",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-slate-100 text-slate-500",
  rejected: "bg-red-50 text-red-700",
};

export const ALL_STATUSES = Object.keys(STATUS_LABELS) as RequestStatus[];

// Mirrors MANAGER_TRANSITIONS in the backend; the server stays the authority.
export const NEXT_STATUSES: Record<RequestStatus, RequestStatus[]> = {
  new: ["in_review", "quoted", "confirmed", "rejected", "cancelled"],
  in_review: ["in_review", "quoted", "confirmed", "rejected", "cancelled"],
  quoted: ["in_review", "quoted", "confirmed", "rejected", "cancelled"],
  confirmed: ["completed", "cancelled"],
  rejected: ["in_review"],
  completed: [],
  cancelled: [],
};

export const SPORTS = [
  "Football","Rugby","Basketball","Netball","Volleyball","Handball","Hockey",
  "Cricket","Athletics","Swimming","Tennis","Boxing","Cycling","Golf",
  "Martial arts","Multi-sport","Other",
];

export function countryName(code?: string | null) {
  if (!code) return "";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}

export function formatDate(value?: string | null) {
  if (!value) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateRange(from?: string | null, to?: string | null) {
  if (!from && !to) return "Dates to confirm";
  return from && to ? `${formatDate(from)} – ${formatDate(to)}` : formatDate(from || to);
}

export function formatDateTime(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
}
