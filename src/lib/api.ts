// Core API client for the admin dashboard.
//
// Talks to the NestJS backend (global `/v1` prefix). Stores the admin's access +
// refresh tokens in localStorage, attaches the Bearer token to every call, and
// transparently refreshes once on a 401 (mirrors the mobile app's behaviour).

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

const TOKEN_KEY = "kashio_admin_token";
const REFRESH_KEY = "kashio_admin_refresh";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// ---- token storage (client-side only) ----------------------------------
export const tokenStore = {
  get token() {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  get refreshToken() {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(REFRESH_KEY);
  },
  set(token: string, refreshToken?: string | null) {
    window.localStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) window.localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clear() {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  },
  get isAuthenticated() {
    return !!this.token;
  },
};

type FetchOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean; // attach Bearer token (default true)
  _retry?: boolean; // internal: prevents infinite refresh loops
};

async function rawFetch(path: string, opts: FetchOptions): Promise<Response> {
  const isFormData = typeof FormData !== "undefined" && opts.body instanceof FormData;
  const headers: Record<string, string> = isFormData
    ? {}
    : { "Content-Type": "application/json" };
  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    body = isFormData ? (opts.body as FormData) : JSON.stringify(opts.body);
  }
  if (opts.auth !== false && tokenStore.token) {
    headers.Authorization = `Bearer ${tokenStore.token}`;
  }
  return fetch(`${API_BASE_URL}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body,
  });
}

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  // Collapse concurrent refreshes into one.
  refreshing ??= (async () => {
    const refreshToken = tokenStore.refreshToken;
    if (!refreshToken) return false;
    try {
      const res = await rawFetch("/v1/auth/refresh", {
        method: "POST",
        body: { refreshToken },
        auth: false,
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (!data?.token) return false;
      tokenStore.set(data.token, data.refresh_token);
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/** Typed JSON request. Throws {@link ApiError} on non-2xx (after one refresh try on 401). */
export async function apiFetch<T>(
  path: string,
  opts: FetchOptions = {},
): Promise<T> {
  let res = await rawFetch(path, opts);

  if (res.status === 401 && opts.auth !== false && !opts._retry) {
    const ok = await tryRefresh();
    if (ok) {
      res = await rawFetch(path, { ...opts, _retry: true });
    } else {
      tokenStore.clear();
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new ApiError("Session expired", 401);
    }
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = Array.isArray(data?.message)
      ? data.message.join(", ")
      : data?.message ?? `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return data as T;
}
