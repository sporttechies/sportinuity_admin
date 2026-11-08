const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
export async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const token =
    typeof window !== "undefined"
      ? sessionStorage.getItem("sportinuity_token")
      : null;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Request failed");
  return payload as T;
}
export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<{ token: string }>("/api/auth/manager/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () =>
    apiRequest<{ user: { name?: string; email?: string; role?: string } }>(
      "/api/auth/me",
    ),
};
export type RequestRecord = {
  id?: string;
  team?: string | null;
  event?: string | null;
  location?: string | null;
  dates?: string | null;
  people?: number | null;
  status?: string | null;
  color?: string | null;
  createdAt?: string;
};
export const logisticsApi = {
  list: () => apiRequest<{ data: RequestRecord[] }>("/api/logistics/requests"),
};
