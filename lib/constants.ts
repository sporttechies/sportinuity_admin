import type { InvoiceStatus, RequestStatus } from "./api";

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

// ---- invoices ----------------------------------------------------------------

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  issued: "Issued",
  paid: "Paid",
  void: "Void",
};
export const INVOICE_STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  issued: "bg-[#e8f4fb] text-[#007cc2]",
  paid: "bg-[#eaf5ee] text-[#1c673e]",
  void: "bg-red-50 text-red-700",
};

export function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** [{code, label}] for a currency picker, e.g. "KES - Kenyan Shilling". */
export function currencyOptions(): { code: string; label: string }[] {
  let codes: string[];
  try {
    codes = Intl.supportedValuesOf("currency");
  } catch {
    codes = ["USD", "EUR", "GBP", "KES", "UGX", "TZS", "ZAR", "NGN", "GHS", "AED"];
  }
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames(["en"], { type: "currency" });
  } catch {
    /* labels fall back to the code */
  }
  return codes.map((code) => ({ code, label: `${code} - ${names?.of(code) ?? code}` }));
}

// ---- suppliers ---------------------------------------------------------------
export type SupplierType = "accommodation" | "transport" | "catering" | "other";

export const SUPPLIER_TYPE_LABELS: Record<SupplierType, string> = {
  accommodation: "Accommodation",
  transport: "Transport",
  catering: "Catering",
  other: "Other",
};

export const SUPPLIER_TYPE_STYLES: Record<SupplierType, string> = {
  accommodation: "bg-[#e8f4fb] text-[#007cc2]",
  transport: "bg-[#fff4dc] text-[#a36a00]",
  catering: "bg-[#eaf5ee] text-[#1c673e]",
  other: "bg-slate-100 text-slate-600",
};

export const SUPPLIER_TYPES = Object.keys(SUPPLIER_TYPE_LABELS) as SupplierType[];

export const SUPPLIER_COUNTRIES = [
  "KE","UG","TZ","RW","BI","ET","SS","SO","NG","GH","ZA","ZM","ZW","MW","MZ","BW","NA","CD",
  "CM","SN","CI","EG","MA","TN","DZ","GB","US","CA","FR","DE","ES","IT","NL","PT","AE","QA",
  "TR","IN","CN","JP","BR","AU",
];

export type QuoteStatus = "requested" | "received" | "accepted" | "rejected";
export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  requested: "Awaiting price",
  received: "Received",
  accepted: "Accepted",
  rejected: "Rejected",
};
export const QUOTE_STATUS_STYLES: Record<QuoteStatus, string> = {
  requested: "bg-[#fff4dc] text-[#a36a00]",
  received: "bg-[#e8f4fb] text-[#007cc2]",
  accepted: "bg-[#eaf5ee] text-[#1c673e]",
  rejected: "bg-slate-100 text-slate-500",
};

// ---- Sports Travel ------------------------------------------------------------
export const TRIP_STATUS_LABELS = { draft: "Draft", published: "Published", closed: "Closed", archived: "Archived" } as const;
export const TRIP_STATUS_STYLES = {
  draft: "bg-slate-100 text-slate-600",
  published: "bg-[#eaf5ee] text-[#1c673e]",
  closed: "bg-[#fff4dc] text-[#a36a00]",
  archived: "bg-slate-100 text-slate-400",
} as const;
export const AUDIENCE_LABELS = { fans: "Fans", groups: "Groups", organisers: "Organisers" } as const;
export const ITINERARY_KIND_LABELS = {
  flight: "Flight",
  accommodation: "Accommodation",
  transfer: "Transfer",
  meal: "Meal",
  activity: "Activity",
  event: "Event",
  free_time: "Free time",
  other: "Other",
} as const;

export const BOOKING_STATUS_LABELS = { pending: "Pending", confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled" } as const;
export const BOOKING_STATUS_STYLES = {
  pending: "bg-[#fff4dc] text-[#a36a00]",
  confirmed: "bg-[#e8f4fb] text-[#007cc2]",
  completed: "bg-[#eaf5ee] text-[#1c673e]",
  cancelled: "bg-slate-100 text-slate-500",
} as const;
export const CUSTOMER_TYPE_LABELS = { fan: "Fan", group: "Group", organiser: "Organiser" } as const;
