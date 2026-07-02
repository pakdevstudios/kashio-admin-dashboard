// Typed API calls used by the dashboard pages.

import { ApiError, apiFetch, tokenStore } from "./api";
import type {
  ApiCategory,
  ApiCourier,
  ApiProduct,
  ApiRider,
  AuthResponse,
  PaginatedProducts,
} from "./types";

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

// ---- Categories --------------------------------------------------------
export function listCategories(params?: {
  search?: string;
  isActive?: boolean;
  sortBy?: "name" | "createdAt";
  sortOrder?: "asc" | "desc";
}) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (typeof params?.isActive === "boolean") {
    qs.set("isActive", String(params.isActive));
  }
  if (params?.sortBy) qs.set("sortBy", params.sortBy);
  if (params?.sortOrder) qs.set("sortOrder", params.sortOrder);
  const query = qs.toString();
  return apiFetch<ApiCategory[]>(`/v1/categories${query ? `?${query}` : ""}`);
}

export type CategoryInput = {
  name: string;
  description?: string | null;
};

export function createCategory(input: CategoryInput) {
  return apiFetch<ApiCategory>("/v1/categories", {
    method: "POST",
    body: input,
  });
}

export function updateCategory(id: string, input: CategoryInput) {
  return apiFetch<ApiCategory>(`/v1/categories/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export function setCategoryStatus(id: string, isActive: boolean) {
  return apiFetch<ApiCategory>(`/v1/categories/${id}/status`, {
    method: "PATCH",
    body: { isActive },
  });
}

export function deleteCategory(id: string) {
  return apiFetch<{ success: boolean }>(`/v1/categories/${id}`, {
    method: "DELETE",
  });
}

// ---- Products ----------------------------------------------------------
export type ProductQueryParams = {
  search?: string;
  categoryId?: string;
  categorySlug?: string;
  storeName?: string;
  minPrice?: number;
  maxPrice?: number;
  isAvailable?: boolean;
  inStock?: boolean;
  page?: number;
  limit?: number;
  sortBy?: "title" | "price" | "createdAt" | "stockQuantity";
  sortOrder?: "asc" | "desc";
};

function productQueryString(params?: ProductQueryParams) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.categoryId) qs.set("categoryId", params.categoryId);
  if (params?.categorySlug) qs.set("categorySlug", params.categorySlug);
  if (params?.storeName) qs.set("storeName", params.storeName);
  if (typeof params?.minPrice === "number") qs.set("minPrice", String(params.minPrice));
  if (typeof params?.maxPrice === "number") qs.set("maxPrice", String(params.maxPrice));
  if (typeof params?.isAvailable === "boolean") qs.set("isAvailable", String(params.isAvailable));
  if (typeof params?.inStock === "boolean") qs.set("inStock", String(params.inStock));
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.sortBy) qs.set("sortBy", params.sortBy);
  if (params?.sortOrder) qs.set("sortOrder", params.sortOrder);
  const query = qs.toString();
  return query ? `?${query}` : "";
}

export function listManagedProducts(params?: ProductQueryParams) {
  const query = productQueryString(params);
  return apiFetch<PaginatedProducts>(`/v1/products/admin${query}`).catch((error) => {
    if (error instanceof ApiError && error.status === 404) {
      return apiFetch<PaginatedProducts>(`/v1/products${query}`, { auth: false });
    }
    throw error;
  });
}

export type ProductImageInput = {
  url: string;
  altText?: string | null;
  sortOrder?: number;
  isPrimary?: boolean;
};

export type ProductInput = {
  title: string;
  description?: string | null;
  categoryId: string;
  storeName?: string | null;
  price: number;
  discountedPrice?: number | null;
  stockQuantity?: number;
  isActive?: boolean;
  isAvailable?: boolean;
  images?: ProductImageInput[];
};

export function createProduct(input: ProductInput) {
  return apiFetch<ApiProduct>("/v1/products", {
    method: "POST",
    body: input,
  });
}

export function updateProduct(id: string, input: Partial<ProductInput>) {
  return apiFetch<ApiProduct>(`/v1/products/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export function deleteProduct(id: string) {
  return apiFetch<ApiProduct>(`/v1/products/${id}`, {
    method: "DELETE",
  });
}

export function addProductImage(productId: string, input: ProductImageInput) {
  return apiFetch<ApiProduct["images"][number]>(`/v1/products/${productId}/images`, {
    method: "POST",
    body: input,
  });
}

export function updateProductImage(
  productId: string,
  imageId: string,
  input: Partial<ProductImageInput>,
) {
  return apiFetch<ApiProduct["images"][number]>(
    `/v1/products/${productId}/images/${imageId}`,
    {
      method: "PATCH",
      body: input,
    },
  );
}

export function deleteProductImage(productId: string, imageId: string) {
  return apiFetch<{ success: boolean }>(`/v1/products/${productId}/images/${imageId}`, {
    method: "DELETE",
  });
}

export function updateProductPricing(
  productId: string,
  input: { price: number; discountedPrice?: number | null },
) {
  return apiFetch<ApiProduct>(`/v1/products/${productId}/pricing`, {
    method: "PATCH",
    body: input,
  });
}

export function updateProductAvailability(
  productId: string,
  input: { isActive?: boolean; isAvailable?: boolean },
) {
  return apiFetch<ApiProduct>(`/v1/products/${productId}/availability`, {
    method: "PATCH",
    body: input,
  });
}

export function updateProductStock(
  productId: string,
  input: { stockQuantity: number },
) {
  return apiFetch<ApiProduct>(`/v1/products/${productId}/stock`, {
    method: "PATCH",
    body: input,
  });
}
