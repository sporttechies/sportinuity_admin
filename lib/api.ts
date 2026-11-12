const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const TOKEN_KEY = "sportinuity_token";

// ---- types -----------------------------------------------------------------
export type RequestStatus =
  | "new"
  | "in_review"
  | "quoted"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "rejected";

export type Manager = { id: string; email: string; name: string; role: string };

export type Traveller = {
  id?: string;
  index?: number;
  category: "adult" | "child" | "infant";
  firstName: string;
  lastName: string;
  type: string;
  documentNumber: string | null;
  dietary: string | null;
};

export type RequestEvent = {
  id: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  actorRole: string | null;
  actorName: string | null;
  createdAt: string;
};

export type LogisticsRequest = {
  id: string;
  uuid: string;
  reference: string;
  teamId: string | null;
  team: string | null; // null for older requests made before team accounts
  teamSport?: string | null;
  teamCountry?: string | null;
  teamLogoPath: string | null;
  event: string;
  from: string | null;
  location: string;
  departure: string | null;
  returnDate: string | null;
  people: number;
  status: RequestStatus;
  rejectionReason: string | null;
  managerNotes: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  contact: { name: string | null; email: string | null; phone: string | null };
  travellers?: Traveller[];
  events?: RequestEvent[];
};

export type RequestList = {
  data: LogisticsRequest[];
  total: number;
  limit: number;
  offset: number;
  counts: Record<string, number>;
};

export type RequestListParams = {
  status?: string; // comma separated
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  teamId?: string;
  limit?: number;
  offset?: number;
};

export type RequestPatch = {
  event?: string;
  from?: string | null;
  location?: string;
  departure?: string | null;
  returnDate?: string | null;
  managerNotes?: string | null;
  contact?: { name?: string; email?: string; phone?: string };
  travellers?: {
    firstName: string;
    lastName: string;
    type: string;
    documentNumber: string;
    dietary: string;
    category: string;
  }[];
};

export type Dashboard = {
  byStatus: Record<string, number>;
  totals: {
    requests: number;
    active: number;
    awaitingAction: number;
    confirmed: number;
    travellers: number;
    teams: number;
  };
  recent: LogisticsRequest[];
  upcoming: LogisticsRequest[];
};

export type TeamSummary = {
  id: string;
  name: string;
  sport: string;
  country: string;
  city: string | null;
  logoPath: string | null;
  createdAt: string;
  adminName: string | null;
  adminEmail: string | null;
  accountStatus: "active" | "disabled";
  requestCount: number;
  pendingCount: number;
};

export type TeamDetail = {
  id: string;
  name: string;
  sport: string;
  country: string;
  city: string | null;
  logoPath: string | null;
  createdAt: string;
  admins: {
    id: string;
    name: string;
    email: string;
    accountStatus: string;
  }[];
  requestCounts: Record<string, number>;
  requests: LogisticsRequest[];
};

// ---- http ------------------------------------------------------------------
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const getToken = () =>
  typeof window === "undefined" ? null : sessionStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) =>
  sessionStorage.setItem(TOKEN_KEY, token);
export function signOut() {
  sessionStorage.removeItem(TOKEN_KEY);
  window.location.replace("/login");
}

/** Absolute URL for an API-relative path such as a team logo. */
export function apiUrl(path?: string | null): string | null {
  if (!path) return null;
  return path.startsWith("http") ? path : `${API_URL}${path}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function request<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      "Can't reach the server. Check your connection and try again.",
      0,
    );
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Expired or revoked session (not a wrong password on the login form).
    if (response.status === 401 && token && !path.includes("/login"))
      signOut();
    throw new ApiError(data.message || "Request failed", response.status);
  }
  return data as T;
}

const qs = (params: Record<string, unknown>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
  });
  const text = search.toString();
  return text ? `?${text}` : "";
};
const ref = (reference: string) => encodeURIComponent(reference);
const json = (body: unknown) => JSON.stringify(body);

// ---- auth (names kept from the previous client) ---------------------------------
export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: Manager }>("/api/auth/login", {
      method: "POST",
      body: json({ email, password }),
    }),
  me: () => request<{ user: Manager }>("/api/auth/me"),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok?: boolean }>("/api/auth/password", {
      method: "POST",
      body: json({ currentPassword, newPassword }),
    }),
};

// ---- requests ------------------------------------------------------------------
export const requestsApi = {
  list: (params: RequestListParams = {}) =>
    request<RequestList>(`/api/logistics/requests${qs(params)}`),
  get: async (reference: string) =>
    (await request<{ data: LogisticsRequest }>(`/api/logistics/requests/${ref(reference)}`)).data,
  create: async (body: {
    teamId: string;
    event: string;
    location: string;
    from?: string;
    departure?: string;
    returnDate?: string;
    contact: { name: string; email: string; phone: string };
    travellers: NonNullable<RequestPatch["travellers"]>;
  }) =>
    (await request<{ data: LogisticsRequest }>("/api/logistics/requests", {
      method: "POST",
      body: json(body),
    })).data,
  update: async (reference: string, patch: RequestPatch) =>
    (await request<{ data: LogisticsRequest }>(`/api/logistics/requests/${ref(reference)}`, {
      method: "PATCH",
      body: json(patch),
    })).data,
  setStatus: async (reference: string, status: RequestStatus, reason?: string) =>
    (await request<{ data: LogisticsRequest }>(`/api/logistics/requests/${ref(reference)}/status`, {
      method: "POST",
      body: json({ status, reason }),
    })).data,
  approve: async (reference: string, note?: string) =>
    (await request<{ data: LogisticsRequest }>(`/api/logistics/requests/${ref(reference)}/approve`, {
      method: "POST",
      body: json({ note }),
    })).data,
  reject: async (reference: string, reason: string) =>
    (await request<{ data: LogisticsRequest }>(`/api/logistics/requests/${ref(reference)}/reject`, {
      method: "POST",
      body: json({ reason }),
    })).data,
  remove: (reference: string) =>
    request<void>(`/api/logistics/requests/${ref(reference)}`, {
      method: "DELETE",
    }),
};

/** Kept so older code using logisticsApi.list() keeps working. */
export const logisticsApi = { list: () => requestsApi.list() };

// ---- dashboard, teams, profile ----------------------------------------------------
export const managerApi = {
  dashboard: async () =>
    (await request<{ data: Dashboard }>("/api/manager/dashboard")).data,
  teams: async (q?: string) =>
    (await request<{ data: TeamSummary[] }>(`/api/manager/teams${qs({ q })}`)).data,
  team: async (id: string) =>
    (await request<{ data: TeamDetail }>(`/api/manager/teams/${id}`)).data,
  updateTeam: async (
    id: string,
    patch: {
      name?: string;
      sport?: string;
      country?: string;
      city?: string | null;
      logo?: string | null;
    },
  ) =>
    (await request<{ data: TeamDetail }>(`/api/manager/teams/${id}`, {
      method: "PATCH",
      body: json(patch),
    })).data,
  setTeamStatus: async (id: string, status: "active" | "disabled") =>
    (await request<{ data: TeamDetail }>(`/api/manager/teams/${id}/status`, {
      method: "POST",
      body: json({ status }),
    })).data,
  deleteTeam: (id: string) =>
    request<void>(`/api/manager/teams/${id}`, { method: "DELETE" }),
  updateMe: (fullName: string) =>
    request<{ user: Manager }>("/api/manager/me", {
      method: "PATCH",
      body: json({ fullName }),
    }),
};

// ---- invoices ----------------------------------------------------------------
export type InvoiceStatus = "draft" | "issued" | "paid" | "void";

export type Invoice = {
  id: string;
  number: string | null; // null while a draft
  status: InvoiceStatus;
  requestId: string;
  requestReference: string;
  teamId: string;
  team: string;
  event: string;
  currency: string;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  issueDate: string | null;
  dueDate: string | null;
  issuedAt: string | null;
  paidAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  emailedAt?: string | null;
  createdAt?: string;
  items: { description: string; quantity: number; unitPrice: number; lineTotal: number }[];
};

export type InvoiceContext = {
  invoices: Invoice[];
  classes: { type: string; label: string; count: number }[];
  defaults: { currency: string; taxRate: number; paymentTermsDays: number };
  canCreate: boolean;
  reason: string | null;
};

export type BillingSettings = {
  companyName: string;
  companyAddress: string | null;
  companyEmail: string | null;
  companyPhone: string | null;
  taxNumber: string | null;
  paymentInstructions: string | null;
  invoiceFooter: string | null;
  defaultCurrency: string;
  defaultTaxRate: number;
  paymentTermsDays: number;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankSwiftCode: string | null;
};

/** What happened when an invoice email was sent. */
export type EmailResult = {
  status: "sent" | "skipped" | "failed";
  reason?: string;
  recipients?: string[];
};

export type InvoiceInput = {
  currency?: string;
  taxRate?: number;
  dueDate?: string | null;
  notes?: string | null;
  prices?: Record<string, number>;
};

export const invoicesApi = {
  context: async (reference: string) =>
    (await request<{ data: InvoiceContext }>(`/api/invoices/for-request/${ref(reference)}`)).data,
  list: (params: { status?: string; q?: string; teamId?: string; limit?: number; offset?: number } = {}) =>
    request<{ data: Invoice[]; total: number; limit: number; offset: number }>(
      `/api/invoices${qs(params)}`,
    ),
  create: async (body: InvoiceInput & { reference: string; prices: Record<string, number> }) =>
    (await request<{ data: Invoice }>("/api/invoices", { method: "POST", body: json(body) })).data,
  update: async (id: string, patch: InvoiceInput) =>
    (await request<{ data: Invoice }>(`/api/invoices/${id}`, { method: "PATCH", body: json(patch) })).data,
  remove: (id: string) => request<void>(`/api/invoices/${id}`, { method: "DELETE" }),
  issue: async (id: string) => {
    const r = await request<{ data: Invoice; email: EmailResult | null }>(`/api/invoices/${id}/issue`, { method: "POST" });
    return { invoice: r.data, email: r.email };
  },
  resend: async (id: string) => {
    const r = await request<{ data: Invoice; email: EmailResult | null }>(`/api/invoices/${id}/resend`, { method: "POST" });
    return { invoice: r.data, email: r.email };
  },
  setPaid: async (id: string, paid: boolean) =>
    (await request<{ data: Invoice }>(`/api/invoices/${id}/${paid ? "paid" : "unpaid"}`, { method: "POST" })).data,
  void: async (id: string, reason: string) =>
    (await request<{ data: Invoice }>(`/api/invoices/${id}/void`, { method: "POST", body: json({ reason }) })).data,
  /** The PDF is behind the login, so it is fetched with the token and shown from a blob URL. */
  pdf: async (id: string): Promise<Blob> => {
    let response: Response;
    try {
      response = await fetch(`${API_URL}/api/invoices/${id}/pdf`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch {
      throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
    }
    if (!response.ok) {
      if (response.status === 401) signOut();
      const data = await response.json().catch(() => ({}));
      throw new ApiError(data.message || "Could not load the invoice PDF", response.status);
    }
    return response.blob();
  },
  settings: async () => (await request<{ data: BillingSettings }>("/api/invoices/settings")).data,
  saveSettings: async (patch: Partial<BillingSettings>) =>
    (await request<{ data: BillingSettings }>("/api/invoices/settings", { method: "PUT", body: json(patch) })).data,
};
