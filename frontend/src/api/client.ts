export const CATEGORIES = [
  "sedan",
  "suv",
  "hatchback",
  "coupe",
  "convertible",
  "truck",
  "van",
  "ev",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: "user" | "admin";
}

export interface Vehicle {
  id: number;
  make: string;
  model: string;
  year: number;
  category: Category;
  price: string;
  quantity: number;
  image_url: string | null;
  description: string | null;
}

export type VehicleInput = Omit<Vehicle, "id">;
export type VehicleUpdate = Omit<Vehicle, "id" | "quantity">;
export type VehicleFilters = Partial<
  Record<"make" | "model" | "category" | "min_price" | "max_price", string>
>;

export interface CheckoutItem {
  vehicle_id: number;
  quantity: number;
}

export interface CheckoutResponse {
  items: Vehicle[];
}

export interface RegisterInput {
  email: string;
  password: string;
  full_name: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface ValidationIssue {
  loc: Array<string | number>;
  msg: string;
  type?: string;
}

type ErrorDetail = string | ValidationIssue[];

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** The FastAPI 422 detail array; empty for every other error. */
    public readonly issues: ValidationIssue[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Query retry policy: a 4xx will fail the same way again, so only retry 5xx and network errors, once. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status < 500) return false;
  return failureCount < 1;
}

const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");
const TOKEN_KEY = "wheel-deal-token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function errorMessage(detail: ErrorDetail | undefined, status: number): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((entry) => entry.msg).join("; ");
  return `Request failed (${status})`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined) headers.set("Content-Type", "application/json");
  const token = getStoredToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (response.status === 401) {
    // AuthProvider listens for this and clears its state; ProtectedRoute then redirects
    // protected pages to /login. Public pages (/register) must stay where they are.
    clearStoredToken();
    window.dispatchEvent(new Event("auth:expired"));
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { detail?: ErrorDetail };
    const issues = Array.isArray(body.detail) ? body.detail : [];
    throw new ApiError(response.status, errorMessage(body.detail, response.status), issues);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

const json = (body: unknown) => JSON.stringify(body);

export const api = {
  register: (input: RegisterInput) =>
    request<User>("/api/auth/register", { method: "POST", body: json(input) }),
  login: (email: string, password: string) =>
    request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: json({ email, password }),
    }),
  me: () => request<User>("/api/auth/me"),
  listVehicles: () => request<Vehicle[]>("/api/vehicles"),
  searchVehicles: (filters: VehicleFilters) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return request<Vehicle[]>(`/api/vehicles/search?${params.toString()}`);
  },
  purchaseVehicle: (id: number, quantity = 1) =>
    request<Vehicle>(`/api/vehicles/${id}/purchase`, {
      method: "POST",
      body: json({ quantity }),
    }),
  checkout: (items: CheckoutItem[]) =>
    request<CheckoutResponse>("/api/cart/checkout", { method: "POST", body: json({ items }) }),
  createVehicle: (vehicle: VehicleInput) =>
    request<Vehicle>("/api/vehicles", { method: "POST", body: json(vehicle) }),
  updateVehicle: (id: number, vehicle: VehicleUpdate) =>
    request<Vehicle>(`/api/vehicles/${id}`, { method: "PUT", body: json(vehicle) }),
  deleteVehicle: (id: number) =>
    request<void>(`/api/vehicles/${id}`, { method: "DELETE" }),
  restockVehicle: (id: number, quantity: number) =>
    request<Vehicle>(`/api/vehicles/${id}/restock`, {
      method: "POST",
      body: json({ quantity }),
    }),
};
