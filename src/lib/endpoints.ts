// Typed API calls used by the dashboard pages.

import { apiFetch, tokenStore } from "./api";
import type { ApiCourier, ApiRider, AuthResponse } from "./types";

// ---- Auth --------------------------------------------------------------
export async function login(email: string, password: string) {
  const res = await apiFetch<AuthResponse>("/v1/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
  tokenStore.set(res.token, res.refresh_token);
  return res;
}

export async function logout() {
  const refreshToken = tokenStore.refreshToken;
  try {
    if (refreshToken) {
      await apiFetch("/v1/auth/logout", {
        method: "POST",
        body: { refreshToken },
        auth: false,
      });
    }
  } catch {
    // best effort — clear locally regardless
  }
  tokenStore.clear();
}

// ---- Couriers ----------------------------------------------------------
export function listCouriers(params?: { status?: string; search?: string }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.search) qs.set("search", params.search);
  const query = qs.toString();
  return apiFetch<ApiCourier[]>(`/v1/couriers${query ? `?${query}` : ""}`);
}

export function getCourier(id: string) {
  return apiFetch<ApiCourier>(`/v1/couriers/${id}`);
}

export function assignRider(courierId: string, riderId: string) {
  return apiFetch<ApiCourier>(`/v1/couriers/${courierId}/assign`, {
    method: "POST",
    body: { riderId },
  });
}

export function cancelCourier(courierId: string, reason?: string) {
  return apiFetch<ApiCourier>(`/v1/couriers/${courierId}/cancel`, {
    method: "POST",
    body: { reason },
  });
}

// ---- Riders ------------------------------------------------------------
export function listRiders() {
  return apiFetch<ApiRider[]>("/v1/riders");
}

export type CreateRiderInput = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  location?: string;
  vehicle?: string;
};

export function createRider(input: CreateRiderInput) {
  return apiFetch<ApiRider>("/v1/riders", { method: "POST", body: input });
}
