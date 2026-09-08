/**
 * Thin fetch wrapper for the KisanSetu AI backend.
 *
 * Every backend response is `{ success: boolean, data?, message? }`.
 * `request()` unwraps `data` on success and throws on failure so callers
 * can `try/catch` and fall back to the mock services.
 *
 * Nothing here is imported by the UI yet — the api layer is opt-in. See
 * README "Connecting the backend" for the gradual migration plan.
 */

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
  'http://localhost:5000/api';

/** "true" turns the real backend on; anything else keeps the mock services. */
export const USE_BACKEND: boolean =
  String(import.meta.env.VITE_USE_BACKEND ?? 'false').toLowerCase() === 'true';

/** Officer "simulate demand / advance queue / reset" controls. Set to "false" for a real beta/production build. */
export const DEMO_MODE_ENABLED: boolean =
  String(import.meta.env.VITE_ENABLE_DEMO_MODE ?? 'true').toLowerCase() !== 'false';

const TOKEN_KEY = 'kisansetu_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore storage errors (private mode etc.) */
  }
}

/** A well-formed error response from the backend. */
export class ApiError extends Error {
  status: number;
  errors?: unknown;
  constructor(status: number, message: string, errors?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

/** The backend could not be reached at all — callers may fall back to mocks. */
export class ApiUnavailableError extends Error {
  constructor(message = 'Backend is unavailable') {
    super(message);
    this.name = 'ApiUnavailableError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** send the stored JWT (default true) */
  auth?: boolean;
  signal?: AbortSignal;
}

export async function request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal } = opts;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch {
    throw new ApiUnavailableError();
  }

  let payload: { success?: boolean; data?: T; message?: string; errors?: unknown } = {};
  try {
    payload = await res.json();
  } catch {
    /* empty body */
  }

  if (!res.ok || payload.success === false) {
    throw new ApiError(res.status, payload.message ?? `Request failed (${res.status})`, payload.errors);
  }
  return payload.data as T;
}

/** GET /api/health — used to decide whether to use the backend. */
export async function checkHealth(timeoutMs = 2500): Promise<boolean> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    await request('/health', { auth: false, signal: ctrl.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(id);
  }
}
