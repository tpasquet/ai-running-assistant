const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface AuthResponse {
  token: string;
  user: { id: string; email: string; name: string | null };
}

export interface ApiError {
  message: string;
  statusCode: number;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err: ApiError = {
      message: (body as { message?: string }).message ?? res.statusText,
      statusCode: res.status,
    };
    throw err;
  }
  return res.json() as Promise<T>;
}

export async function register(email: string, password: string, name: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password, name }),
  });
  return handleResponse<AuthResponse>(res);
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<AuthResponse>(res);
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return handleResponse<{ message: string }>(res);
}

export function startGoogleOAuth() {
  window.location.href = `${API_BASE}/auth/google/login`;
}

export function startAppleOAuth() {
  window.location.href = `${API_BASE}/auth/apple/login`;
}

export const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL ?? "http://localhost:3002";
