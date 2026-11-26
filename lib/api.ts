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
  assignees?: { id: string; name: string; role: StaffRole }[];
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
  assignee?: string; // "me", "none" or a manager id
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
    rostersToReview?: number;
  };
  recent: LogisticsRequest[];
  upcoming: LogisticsRequest[];
};

export type RosterStatus = "draft" | "submitted" | "approved" | "changes_requested";

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
  rosterStatus?: RosterStatus;
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
  isTeamSport: boolean;
  maxPlayers: number | null;
  edition: string | null;
  ageCategory: string | null;
  coach: { name: string | null; email: string | null; phone: string | null };
  rosterSubmittedAt: string | null;
  rosterStatus: RosterStatus;
  rosterReviewNote: string | null;
  rosterReviewedAt: string | null;
};

export type Edition = {
  id: string;
  name: string;
  isOpen: boolean;
  teams: number;
  createdAt: string;
};

export type Player = {
  id: string;
  fullName: string;
  dateOfBirth: string | null;
  jerseyNumber: string | null;
  position: string | null;
  photoUrl: string | null;
  hasDocument: boolean;
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

// ---- editions + squads ----------------------------------------------------------
export const editionsApi = {
  list: async () =>
    (await request<{ data: Edition[] }>("/api/manager/editions")).data,
  create: async (name: string, isOpen = true) =>
    (await request<{ data: Edition }>("/api/manager/editions", {
      method: "POST",
      body: json({ name, isOpen }),
    })).data,
  update: async (id: string, patch: { name?: string; isOpen?: boolean }) =>
    (await request<{ data: Edition }>(`/api/manager/editions/${id}`, {
      method: "PATCH",
      body: json(patch),
    })).data,
  remove: (id: string) =>
    request<void>(`/api/manager/editions/${id}`, { method: "DELETE" }),
};

export const rosterApi = {
  players: async (teamId: string) =>
    (await request<{
      data: {
        limit: number | null;
        players: Player[];
        submittedAt: string | null;
        status: RosterStatus;
        reviewNote: string | null;
        reviewedAt: string | null;
      };
    }>(`/api/manager/teams/${teamId}/players`)).data,
  review: async (teamId: string, body: { decision: "approve" | "request_changes"; note?: string | null }) =>
    (await request<{ data: { status: RosterStatus; reviewNote: string | null; reviewedAt: string | null } }>(
      `/api/manager/teams/${teamId}/roster/review`,
      { method: "POST", body: json(body) },
    )).data,
  /** Private documents need the token, so they're fetched and opened from a blob. */
  async openDocument(teamId: string, playerId: string) {
    const win = window.open("", "_blank");
    try {
      const response = await fetch(
        `${API_URL}/api/manager/teams/${teamId}/players/${playerId}/document`,
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );
      if (!response.ok) throw new ApiError("Could not open the document", response.status);
      const url = URL.createObjectURL(await response.blob());
      if (win) win.location.href = url;
      else window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      win?.close();
      throw error;
    }
  },
};

// ---- suppliers ----------------------------------------------------------------
export type Supplier = {
  id: string;
  name: string;
  type: import("./constants").SupplierType;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  notes: string | null;
  isActive: boolean;
  quotations: number;
  accepted: number;
  createdAt: string;
};

export type SupplierInput = {
  name: string;
  type: string;
  contactName?: string;
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
  website?: string;
  notes?: string;
  isActive?: boolean;
};

export const suppliersApi = {
  list: async (params: { type?: string; q?: string; active?: boolean; limit?: number; offset?: number } = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") search.set(k, String(v));
    });
    return request<{ data: Supplier[]; total: number; counts: Record<string, number> }>(
      `/api/suppliers?${search}`,
    );
  },
  create: async (body: SupplierInput) =>
    (await request<{ data: Supplier }>("/api/suppliers", { method: "POST", body: json(body) })).data,
  update: async (id: string, body: Partial<SupplierInput>) =>
    (await request<{ data: Supplier }>(`/api/suppliers/${id}`, { method: "PATCH", body: json(body) })).data,
  remove: (id: string) => request<void>(`/api/suppliers/${id}`, { method: "DELETE" }),
};

// ---- quotations ---------------------------------------------------------------
export type Quotation = {
  id: string;
  reference: string;
  supplier: {
    id: string;
    name: string;
    type: import("./constants").SupplierType;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    isActive: boolean;
  };
  serviceType: import("./constants").SupplierType;
  description: string;
  amount: number | null;
  currency: string;
  validUntil: string | null;
  expired: boolean;
  status: import("./constants").QuoteStatus;
  notes: string | null;
  decidedAt: string | null;
  createdAt: string;
};

export type QuotationInput = {
  supplierId?: string;
  serviceType?: string;
  description: string;
  amount?: number | null;
  currency?: string;
  validUntil?: string | null;
  notes?: string | null;
  status?: "requested" | "received";
};

export const quotationsApi = {
  forRequest: async (reference: string) =>
    (await request<{ data: Quotation[] }>(`/api/quotations/for-request/${encodeURIComponent(reference)}`)).data,
  create: async (reference: string, body: QuotationInput) =>
    (await request<{ data: Quotation }>("/api/quotations", {
      method: "POST",
      body: json({ reference, ...body }),
    })).data,
  update: async (id: string, body: Partial<QuotationInput>) =>
    (await request<{ data: Quotation }>(`/api/quotations/${id}`, { method: "PATCH", body: json(body) })).data,
  accept: async (id: string) =>
    (await request<{ data: Quotation }>(`/api/quotations/${id}/accept`, { method: "POST" })).data,
  reject: async (id: string) =>
    (await request<{ data: Quotation }>(`/api/quotations/${id}/reject`, { method: "POST" })).data,
  reopen: async (id: string) =>
    (await request<{ data: Quotation }>(`/api/quotations/${id}/reopen`, { method: "POST" })).data,
  remove: (id: string) => request<void>(`/api/quotations/${id}`, { method: "DELETE" }),
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

// ---- rooming ------------------------------------------------------------------
export type RoomType = "single" | "double" | "twin" | "triple" | "quad" | "custom";

export type RoomGuest = {
  id: string;
  index: number;
  category: "adult" | "child" | "infant";
  firstName: string;
  lastName: string;
  type: "regular" | "vip" | "vvip" | "staff";
  dietary: string | null;
};

export type Room = {
  id: string;
  label: string;
  roomType: RoomType;
  capacity: number;
  notes: string | null;
  occupants: RoomGuest[];
};

export type RoomingList = {
  reference: string;
  event: string;
  destination: string;
  checkIn: string | null;
  checkOut: string | null;
  status: "draft" | "final";
  finalizedAt: string | null;
  notes: string | null;
  hotel: { name: string; description: string | null } | null;
  rooms: Room[];
  unassigned: RoomGuest[];
  proposals: { id: string; roomType: RoomType | null; travellerIds: string[]; note: string | null }[];
  travellerCount: number;
};

export const roomingApi = {
  get: async (reference: string) =>
    (await request<{ data: RoomingList }>(`/api/rooming/${ref(reference)}`)).data,
  addRooms: async (reference: string, body: { roomType: RoomType; count?: number; capacity?: number; label?: string; notes?: string }) =>
    (await request<{ data: RoomingList }>(`/api/rooming/${ref(reference)}/rooms`, { method: "POST", body: json(body) })).data,
  updateRoom: async (id: string, body: { label?: string; notes?: string | null; roomType?: RoomType; capacity?: number }) =>
    (await request<{ data: RoomingList }>(`/api/rooming/rooms/${id}`, { method: "PATCH", body: json(body) })).data,
  deleteRoom: async (id: string) =>
    (await request<{ data: RoomingList }>(`/api/rooming/rooms/${id}`, { method: "DELETE" })).data,
  setOccupants: async (roomId: string, travellerIds: string[]) =>
    (await request<{ data: RoomingList }>(`/api/rooming/rooms/${roomId}/occupants`, { method: "PUT", body: json({ travellerIds }) })).data,
  suggest: async (reference: string, body: { roomType: RoomType; vipSingle: boolean }) =>
    (await request<{ data: RoomingList }>(`/api/rooming/${ref(reference)}/suggest`, { method: "POST", body: json(body) })).data,
  clear: async (reference: string) =>
    (await request<{ data: RoomingList }>(`/api/rooming/${ref(reference)}/clear`, { method: "POST" })).data,
  saveNotes: async (reference: string, notes: string) =>
    (await request<{ data: RoomingList }>(`/api/rooming/${ref(reference)}`, { method: "PATCH", body: json({ notes }) })).data,
  finalize: async (reference: string, force = false) =>
    (await request<{ data: RoomingList }>(`/api/rooming/${ref(reference)}/finalize`, { method: "POST", body: json({ force }) })).data,
  reopen: async (reference: string) =>
    (await request<{ data: RoomingList }>(`/api/rooming/${ref(reference)}/reopen`, { method: "POST" })).data,
  pdf: async (reference: string): Promise<Blob> => {
    let response: Response;
    try {
      response = await fetch(`${API_URL}/api/rooming/${ref(reference)}/pdf`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch {
      throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
    }
    if (!response.ok) {
      if (response.status === 401) signOut();
      const data = await response.json().catch(() => ({}));
      throw new ApiError(data.message || "Could not load the rooming PDF", response.status);
    }
    return response.blob();
  },
};

// ---- meals --------------------------------------------------------------------
export type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "packed";

export type Meal = {
  id: string;
  date: string;
  type: MealType;
  time: string | null;
  venue: string | null;
  headcount: number | null;
  menu: string | null;
  notes: string | null;
  status: "planned" | "confirmed";
};

export type MealPlan = {
  reference: string;
  event: string;
  destination: string;
  checkIn: string | null;
  checkOut: string | null;
  travellerCount: number;
  meals: Meal[];
  dietary: {
    none: number;
    groups: { label: string; count: number; travellers: { id: string; name: string }[] }[];
  };
};

export type MealInput = {
  mealDate: string;
  mealType: MealType;
  mealTime?: string | null;
  venue?: string | null;
  headcount?: number | string | null;
  menu?: string | null;
  notes?: string | null;
};

export const mealsApi = {
  get: async (reference: string) => (await request<{ data: MealPlan }>(`/api/meals/${ref(reference)}`)).data,
  create: async (reference: string, body: MealInput) =>
    (await request<{ data: MealPlan }>(`/api/meals/${ref(reference)}/meals`, { method: "POST", body: json(body) })).data,
  generate: async (reference: string, types: MealType[]) =>
    (await request<{ data: MealPlan }>(`/api/meals/${ref(reference)}/generate`, { method: "POST", body: json({ types }) })).data,
  update: async (id: string, body: Partial<MealInput> & { status?: "planned" | "confirmed" }) =>
    (await request<{ data: MealPlan }>(`/api/meals/meals/${id}`, { method: "PATCH", body: json(body) })).data,
  remove: async (id: string) =>
    (await request<{ data: MealPlan }>(`/api/meals/meals/${id}`, { method: "DELETE" })).data,
  confirmAll: async (reference: string) =>
    (await request<{ data: MealPlan }>(`/api/meals/${ref(reference)}/confirm`, { method: "POST" })).data,
  pdf: async (reference: string): Promise<Blob> => {
    let response: Response;
    try {
      response = await fetch(`${API_URL}/api/meals/${ref(reference)}/pdf`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch {
      throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
    }
    if (!response.ok) {
      if (response.status === 401) signOut();
      const data = await response.json().catch(() => ({}));
      throw new ApiError(data.message || "Could not load the meal plan PDF", response.status);
    }
    return response.blob();
  },
};

// ---- transport ----------------------------------------------------------------
export type TransportMode = "flight" | "transfer" | "coach" | "train" | "ferry" | "other";

export type TransportLeg = {
  id: string;
  mode: TransportMode;
  from: string;
  to: string;
  departDate: string;
  departTime: string | null;
  arriveDate: string | null;
  arriveTime: string | null;
  carrier: string | null;
  bookingReference: string | null;
  vehicle: string | null;
  driverName: string | null;
  driverPhone: string | null;
  meetingPoint: string | null;
  status: "planned" | "confirmed";
  /** null means everyone on the request */
  passengerIds: string[] | null;
  passengerCount: number;
  passengers: string[] | null;
  notes: string | null;
  supplierId: string | null;
  supplier: string | null;
};

export type TransportPlan = {
  reference: string;
  event: string;
  origin: string | null;
  destination: string;
  travellerCount: number;
  travellers: { id: string; index: number; name: string }[];
  legs: TransportLeg[];
};

export type TransportInput = {
  mode: TransportMode;
  fromLocation: string;
  toLocation: string;
  departDate: string;
  departTime?: string | null;
  arriveDate?: string | null;
  arriveTime?: string | null;
  carrier?: string | null;
  bookingReference?: string | null;
  vehicle?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  meetingPoint?: string | null;
  supplierId?: string | null;
  notes?: string | null;
};

export const transportApi = {
  get: async (reference: string) => (await request<{ data: TransportPlan }>(`/api/transport/${ref(reference)}`)).data,
  create: async (reference: string, body: TransportInput) =>
    (await request<{ data: TransportPlan }>(`/api/transport/${ref(reference)}/legs`, { method: "POST", body: json(body) })).data,
  update: async (id: string, body: Partial<TransportInput> & { status?: "planned" | "confirmed" }) =>
    (await request<{ data: TransportPlan }>(`/api/transport/legs/${id}`, { method: "PATCH", body: json(body) })).data,
  remove: async (id: string) =>
    (await request<{ data: TransportPlan }>(`/api/transport/legs/${id}`, { method: "DELETE" })).data,
  setPassengers: async (id: string, travellerIds: string[]) =>
    (await request<{ data: TransportPlan }>(`/api/transport/legs/${id}/passengers`, { method: "PUT", body: json({ travellerIds }) })).data,
  confirmAll: async (reference: string) =>
    (await request<{ data: TransportPlan }>(`/api/transport/${ref(reference)}/confirm`, { method: "POST" })).data,
  pdf: async (reference: string): Promise<Blob> => {
    let response: Response;
    try {
      response = await fetch(`${API_URL}/api/transport/${ref(reference)}/pdf`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch {
      throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
    }
    if (!response.ok) {
      if (response.status === 401) signOut();
      const data = await response.json().catch(() => ({}));
      throw new ApiError(data.message || "Could not load the transport PDF", response.status);
    }
    return response.blob();
  },
};

// ---- messages -----------------------------------------------------------------
export type RequestMessage = {
  id: string;
  from: "manager" | "team";
  mine: boolean;
  senderName: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export const messagesApi = {
  get: async (reference: string) =>
    (await request<{ data: { reference: string; messages: RequestMessage[] } }>(`/api/messages/${ref(reference)}`)).data,
  post: async (reference: string, body: string) =>
    (await request<{ data: { reference: string; messages: RequestMessage[] } }>(`/api/messages/${ref(reference)}`, {
      method: "POST",
      body: json({ body }),
    })).data,
  unread: async () =>
    request<{ data: { reference: string; count: number }[]; total: number }>(`/api/messages/unread`),
};

// ---- staff assignments --------------------------------------------------------
export type StaffRole = "lead" | "support" | "finance" | "on_site";

export type Assignment = {
  id: string;
  managerId: string;
  name: string;
  email: string;
  role: StaffRole;
  note: string | null;
  createdAt: string;
};

export type StaffMember = { id: string; name: string; email: string; openRequests: number };

export const assignmentsApi = {
  staff: async () => (await request<{ data: StaffMember[] }>("/api/assignments/staff")).data,
  list: async (reference: string) =>
    (await request<{ data: Assignment[] }>(`/api/assignments/for/${ref(reference)}`)).data,
  assign: async (reference: string, body: { managerId: string; role: StaffRole; note?: string | null }) =>
    (await request<{ data: Assignment[] }>(`/api/assignments/for/${ref(reference)}`, { method: "POST", body: json(body) })).data,
  remove: async (id: string) =>
    (await request<{ data: Assignment[] }>(`/api/assignments/${id}`, { method: "DELETE" })).data,
};

// ---- my work ------------------------------------------------------------------
export type WorkTodo = { kind: "review" | "messages" | "quotes" | "rooming" | "meals" | "transport"; label: string; anchor: string };

export type MyWork = {
  summary: {
    assigned: number;
    needAction: number;
    unreadMessages: number;
    departingSoon: number;
    unassigned: number;
    rostersToReview: number;
  };
  items: {
    reference: string;
    team: string | null;
    event: string;
    destination: string;
    status: RequestStatus;
    travellers: number;
    role: StaffRole;
    departureDate: string | null;
    daysToDeparture: number | null;
    unread: number;
    todos: WorkTodo[];
  }[];
  unassigned: {
    reference: string;
    team: string | null;
    event: string;
    status: RequestStatus;
    departureDate: string | null;
    createdAt: string;
  }[];
};

export const myWorkApi = {
  get: async () => (await request<{ data: MyWork }>("/api/manager/my-work")).data,
};

// ---- Sports Travel: trip packages ------------------------------------------
export type TripStatus = "draft" | "published" | "closed" | "archived";
export type TripAudience = "fans" | "groups" | "organisers";
export type ItineraryKind =
  | "flight" | "accommodation" | "transfer" | "meal" | "activity" | "event" | "free_time" | "other";

export type ItineraryItem = {
  id: string;
  dayNumber: number;
  kind: ItineraryKind;
  title: string;
  details: string | null;
  startTime: string | null;
};

export type Trip = {
  id: string;
  slug: string;
  title: string;
  eventName: string | null;
  destination: string;
  country: string | null;
  startDate: string;
  endDate: string;
  summary: string | null;
  description: string | null;
  audiences: TripAudience[];
  priceCents: number;
  singleSupplementCents: number;
  currency: string;
  capacity: number | null;
  bookingDeadline: string | null;
  coverImageUrl: string | null;
  inclusions: string[];
  exclusions: string | null;
  status: TripStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  seatsTaken: number;
  itinerary?: ItineraryItem[];
};

export type TripInput = {
  title: string;
  eventName: string | null;
  destination: string;
  country: string | null;
  startDate: string;
  endDate: string;
  summary: string | null;
  description: string | null;
  audiences: TripAudience[];
  priceCents: number;
  singleSupplementCents: number;
  currency: string;
  capacity: string | number | null;
  bookingDeadline: string | null;
  coverImageUrl: string | null;
  inclusions: string[];
  exclusions: string | null;
};

export type ItineraryInput = {
  dayNumber: number;
  kind: ItineraryKind;
  title: string;
  details: string | null;
  startTime: string | null;
};

export const travelApi = {
  list: async (params: { status?: string; q?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.q) qs.set("q", params.q);
    return request<{ data: Trip[]; counts: Partial<Record<TripStatus, number>> }>(
      `/api/travel/packages${qs.toString() ? `?${qs}` : ""}`,
    );
  },
  get: async (id: string) => (await request<{ data: Trip }>(`/api/travel/packages/${id}`)).data,
  create: async (body: TripInput) =>
    (await request<{ data: Trip }>("/api/travel/packages", { method: "POST", body: json(body) })).data,
  update: async (id: string, body: Partial<TripInput>) =>
    (await request<{ data: Trip }>(`/api/travel/packages/${id}`, { method: "PATCH", body: json(body) })).data,
  setStatus: async (id: string, status: TripStatus) =>
    (await request<{ data: Trip }>(`/api/travel/packages/${id}/status`, { method: "POST", body: json({ status }) })).data,
  duplicate: async (id: string) =>
    (await request<{ data: Trip }>(`/api/travel/packages/${id}/duplicate`, { method: "POST" })).data,
  remove: async (id: string) => {
    await request(`/api/travel/packages/${id}`, { method: "DELETE" });
  },
  addItem: async (id: string, body: ItineraryInput) =>
    (await request<{ data: Trip }>(`/api/travel/packages/${id}/items`, { method: "POST", body: json(body) })).data,
  updateItem: async (itemId: string, body: Partial<ItineraryInput>) =>
    (await request<{ data: Trip }>(`/api/travel/items/${itemId}`, { method: "PATCH", body: json(body) })).data,
  removeItem: async (itemId: string) =>
    (await request<{ data: Trip }>(`/api/travel/items/${itemId}`, { method: "DELETE" })).data,
};

// ---- Sports Travel: bookings -------------------------------------------------
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type CustomerType = "fan" | "group" | "organiser";

export type BookingTraveller = {
  id?: string;
  firstName: string;
  lastName: string;
  category: "adult" | "child";
  documentNumber: string | null;
  dietary: string | null;
  singleRoom: boolean;
};

export type BookingInvoice = {
  number: string;
  status: "issued" | "paid" | "void";
  issuedAt: string;
  dueDate: string | null;
  paidAt: string | null;
  voidedAt: string | null;
};

export type Booking = {
  id: string;
  reference: string;
  status: BookingStatus;
  customerType: CustomerType;
  packageId: string;
  package: { title: string; slug: string; destination: string; eventName: string | null; startDate: string; endDate: string };
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  organisation: string | null;
  currency: string;
  unitPriceCents: number;
  singleSupplementCents: number;
  seats: number;
  singleRooms: number;
  totalCents: number;
  notes: string | null;
  managerNotes: string | null;
  cancelReason: string | null;
  invoice: BookingInvoice | null;
  createdAt: string;
  updatedAt: string;
  travellers?: BookingTraveller[];
  events?: { id: string; action: string; note: string | null; actorName: string | null; createdAt: string }[];
};

export type BookingInput = {
  customerType: CustomerType;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  organisation: string | null;
  notes: string | null;
  travellers: Omit<BookingTraveller, "id">[];
};

export const bookingsApi = {
  list: (params: { status?: string; packageId?: string; q?: string; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && v !== "" && qs.set(k, String(v)));
    return request<{ data: Booking[]; total: number; counts: Partial<Record<BookingStatus, number>> }>(
      `/api/travel/bookings${qs.toString() ? `?${qs}` : ""}`,
    );
  },
  get: async (id: string) => (await request<{ data: Booking }>(`/api/travel/bookings/${id}`)).data,
  create: async (packageId: string, body: BookingInput) =>
    (await request<{ data: Booking }>(`/api/travel/packages/${packageId}/bookings`, { method: "POST", body: json(body) })).data,
  update: async (
    id: string,
    body: Partial<Omit<BookingInput, "travellers">> & { managerNotes?: string | null },
  ) => (await request<{ data: Booking }>(`/api/travel/bookings/${id}`, { method: "PATCH", body: json(body) })).data,
  setTravellers: async (id: string, travellers: BookingInput["travellers"]) =>
    (await request<{ data: Booking }>(`/api/travel/bookings/${id}/travellers`, { method: "PUT", body: json({ travellers }) })).data,
  setStatus: async (id: string, status: "confirmed" | "completed" | "cancelled", reason?: string) =>
    (await request<{ data: Booking }>(`/api/travel/bookings/${id}/status`, { method: "POST", body: json({ status, reason: reason || null }) })).data,
  issueInvoice: async (id: string, dueDate?: string) =>
    (await request<{ data: Booking }>(`/api/travel/bookings/${id}/invoice`, { method: "POST", body: json({ dueDate: dueDate || null }) })).data,
  markPaid: async (id: string, paid: boolean) =>
    (await request<{ data: Booking }>(`/api/travel/bookings/${id}/${paid ? "paid" : "unpaid"}`, { method: "POST" })).data,
  invoicePdf: async (id: string): Promise<Blob> => {
    let response: Response;
    try {
      response = await fetch(`${API_URL}/api/travel/bookings/${id}/invoice.pdf`, {
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
};
