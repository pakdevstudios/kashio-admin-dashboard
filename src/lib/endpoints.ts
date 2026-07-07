// Typed API calls used by the dashboard pages.

import { ApiError, apiFetch, tokenStore } from "./api";
import type {
  ApiCategory,
  ApiBanner,
  ApiCart,
  ApiManagedCart,
  ApiCourier,
  ApiCustomerLookup,
  ApiProduct,
  ApiRider,
  ApiSupplier,
  AuthResponse,
  PaginatedBanners,
  PaginatedManagedCarts,
  PaginatedProducts,
  ProductType,
  SupplierStatus,
  VariationSelectionType,
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

export type AdminOrderInput = {
  customer: {
    id?: string;
    name: string;
    contact: string;
    email?: string;
  };
  address: {
    id?: string;
    fullName: string;
    phone: string;
    addressLine: string;
    city: string;
    stateProvince: string;
    country: string;
    postalCode: string;
    deliveryInstructions?: string;
  };
  items: {
    productId: string;
    variationOptionId?: string;
    price: number;
    quantity: number;
  }[];
  notes?: string;
};

export function lookupCustomerByContact(contact: string) {
  const qs = new URLSearchParams({ contact });
  return apiFetch<ApiCustomerLookup>(`/v1/couriers/customers/lookup?${qs}`);
}

export function createAdminOrder(input: AdminOrderInput) {
  return apiFetch<ApiCourier>("/v1/couriers/admin-orders", {
    method: "POST",
    body: input,
  });
}

// ---- Draft orders (create-order wizard) ---------------------------------
// A draft is a DRAFT-status courier acting as a per-caller cart. Adding /
// updating items recomputes the total server-side; checkout flips it to
// PENDING so it enters the normal delivery pipeline.
export type DraftItemInput = {
  productId: string;
  variationOptionId?: string;
  quantity: number;
  price?: number;
};

export function createDraftOrder(input: { contact: string; name?: string }) {
  return apiFetch<ApiCourier>("/v1/couriers/admin-orders/draft", {
    method: "POST",
    body: input,
  });
}

export function addDraftItem(draftId: string, item: DraftItemInput) {
  return apiFetch<ApiCourier>(`/v1/couriers/${draftId}/items`, {
    method: "POST",
    body: item,
  });
}

export function updateDraftItem(draftId: string, itemId: string, quantity: number) {
  return apiFetch<ApiCourier>(`/v1/couriers/${draftId}/items/${itemId}`, {
    method: "PATCH",
    body: { quantity },
  });
}

export function removeDraftItem(draftId: string, itemId: string) {
  return apiFetch<ApiCourier>(`/v1/couriers/${draftId}/items/${itemId}`, {
    method: "DELETE",
  });
}

export function checkoutDraft(
  draftId: string,
  input: { address: AdminOrderInput["address"]; notes?: string },
) {
  return apiFetch<ApiCourier>(`/v1/couriers/${draftId}/checkout`, {
    method: "POST",
    body: input,
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
  parentId?: string;
  rootOnly?: boolean;
  sortBy?: "name" | "createdAt";
  sortOrder?: "asc" | "desc";
}) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (typeof params?.isActive === "boolean") {
    qs.set("isActive", String(params.isActive));
  }
  if (params?.parentId) qs.set("parentId", params.parentId);
  if (params?.rootOnly) qs.set("rootOnly", "true");
  if (params?.sortBy) qs.set("sortBy", params.sortBy);
  if (params?.sortOrder) qs.set("sortOrder", params.sortOrder);
  const query = qs.toString();
  return apiFetch<ApiCategory[]>(`/v1/categories${query ? `?${query}` : ""}`);
}

export type CategoryInput = {
  name: string;
  description?: string | null;
  parentId?: string | null;
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

// ---- Banners -----------------------------------------------------------
export type BannerQueryParams = {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: "displayOrder" | "createdAt" | "title";
  sortOrder?: "asc" | "desc";
};

function bannerQueryString(params?: BannerQueryParams) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (typeof params?.isActive === "boolean") {
    qs.set("isActive", String(params.isActive));
  }
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.sortBy) qs.set("sortBy", params.sortBy);
  if (params?.sortOrder) qs.set("sortOrder", params.sortOrder);
  const query = qs.toString();
  return query ? `?${query}` : "";
}

export function listManagedBanners(params?: BannerQueryParams) {
  return apiFetch<PaginatedBanners>(`/v1/banners/admin${bannerQueryString(params)}`);
}

export type BannerInput = {
  title: string;
  imageUrl: string;
  redirectUrl?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  displayOrder: number;
  isActive?: boolean;
};

export function createBanner(input: BannerInput) {
  return apiFetch<ApiBanner>("/v1/banners", {
    method: "POST",
    body: input,
  });
}

export function updateBanner(id: string, input: Partial<BannerInput>) {
  return apiFetch<ApiBanner>(`/v1/banners/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export function updateBannerStatus(id: string, isActive: boolean) {
  return apiFetch<ApiBanner>(`/v1/banners/${id}/status`, {
    method: "PATCH",
    body: { isActive },
  });
}

export function updateBannerOrder(id: string, displayOrder: number) {
  return apiFetch<ApiBanner>(`/v1/banners/${id}/order`, {
    method: "PATCH",
    body: { displayOrder },
  });
}

export function deleteBanner(id: string) {
  return apiFetch<{ success: boolean }>(`/v1/banners/${id}`, {
    method: "DELETE",
  });
}

// ---- Cart --------------------------------------------------------------
export function getCart() {
  return apiFetch<ApiCart>("/v1/cart");
}

export function addCartItem(input: { productId: string; quantity?: number }) {
  return apiFetch<ApiCart>("/v1/cart/items", {
    method: "POST",
    body: input,
  });
}

export function updateCartItem(itemId: string, quantity: number) {
  return apiFetch<ApiCart>(`/v1/cart/items/${itemId}`, {
    method: "PATCH",
    body: { quantity },
  });
}

export function removeCartItem(itemId: string) {
  return apiFetch<ApiCart>(`/v1/cart/items/${itemId}`, {
    method: "DELETE",
  });
}

export function clearCart() {
  return apiFetch<ApiCart>("/v1/cart", {
    method: "DELETE",
  });
}

export function listManagedCarts(params?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return apiFetch<PaginatedManagedCarts>(
    `/v1/cart/admin${query ? `?${query}` : ""}`,
  );
}

export function getManagedCart(id: string) {
  return apiFetch<ApiManagedCart>(`/v1/cart/admin/${id}`);
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

export type ProductVariationOptionInput = {
  id?: string;
  name: string;
  sku?: string | null;
  price: number;
  salePrice?: number | null;
  stockQuantity?: number;
  isActive?: boolean;
  isDefault?: boolean;
  minQuantity?: number;
  maxQuantity?: number;
  displayOrder?: number;
  imageUrl?: string | null;
};

export type FrequentlyBoughtItemInput = {
  id?: string;
  relatedProductId: string;
  isDefault?: boolean;
  isActive?: boolean;
  minQuantity?: number;
  maxQuantity?: number;
  displayOrder?: number;
};

export type ProductInput = {
  title: string;
  description?: string | null;
  categoryId: string;
  supplierId?: string | null;
  storeName?: string | null;
  productType?: ProductType;
  price?: number;
  discountedPrice?: number | null;
  stockQuantity?: number;
  isActive?: boolean;
  isAvailable?: boolean;
  images?: ProductImageInput[];
  variationLabel?: string;
  variationSelectionType?: VariationSelectionType;
  isVariationRequired?: boolean;
  minVariationSelections?: number;
  maxVariationSelections?: number;
  allowSpecialInstructions?: boolean;
  specialInstructionsPlaceholder?: string | null;
  specialInstructionsMaxLength?: number;
  variationOptions?: ProductVariationOptionInput[];
  frequentlyBoughtItems?: FrequentlyBoughtItemInput[];
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

export async function uploadProductImage(file: File) {
  console.info("[product-image-upload] requesting presigned URL", {
    filename: file.name,
    contentType: file.type,
    size: file.size,
  });
  const presigned = await apiFetch<{
    uploadUrl: string;
    url: string;
    headers?: Record<string, string>;
    region?: string;
    bucket?: string;
    pathStyle?: boolean;
    expiresIn?: number;
  }>("/v1/uploads/images/presign", {
    method: "POST",
    body: {
      filename: file.name,
      contentType: file.type,
      size: file.size,
    },
  });
  console.info("[product-image-upload] received presigned URL", {
    finalUrl: presigned.url,
    uploadHost: new URL(presigned.uploadUrl).host,
    hasHeaders: !!presigned.headers,
    region: presigned.region,
    bucket: presigned.bucket,
    pathStyle: presigned.pathStyle,
    expiresIn: presigned.expiresIn,
  });
  console.info("[product-image-upload] starting S3 upload", {
    finalUrl: presigned.url,
    contentType: file.type,
    explicitHeaders: presigned.headers ?? null,
  });
  const uploadBody = new Blob([file], { type: "" });
  let res: Response;
  try {
    res = await fetch(presigned.uploadUrl, {
      method: "PUT",
      headers: presigned.headers,
      body: uploadBody,
    });
  } catch (err) {
    console.error("[product-image-upload] S3 upload fetch failed", err);
    throw new ApiError(
      "Image upload could not reach S3. Check the bucket CORS policy and generated S3 host.",
      0,
    );
  }
  console.info("[product-image-upload] S3 upload response", {
    status: res.status,
    ok: res.ok,
    finalUrl: presigned.url,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[product-image-upload] S3 upload rejected", {
      status: res.status,
      body: text,
    });
    throw new ApiError(`Image upload failed (${res.status})`, res.status);
  }
  console.info("[product-image-upload] final image URL ready", {
    finalUrl: presigned.url,
  });
  return { url: presigned.url };
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

export function assignProductsToSupplier(
  productIds: string[],
  supplierId?: string | null,
) {
  return apiFetch<{ success: boolean }>("/v1/products/supplier/assign", {
    method: "PATCH",
    body: { productIds, supplierId },
  });
}

// ---- Suppliers ---------------------------------------------------------
export type SupplierInput = {
  name: string;
  companyName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  notes?: string | null;
  status?: SupplierStatus;
  productIds?: string[];
};

export function listSuppliers(params?: {
  search?: string;
  status?: SupplierStatus;
  sortBy?: "name" | "createdAt" | "status";
  sortOrder?: "asc" | "desc";
}) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.status) qs.set("status", params.status);
  if (params?.sortBy) qs.set("sortBy", params.sortBy);
  if (params?.sortOrder) qs.set("sortOrder", params.sortOrder);
  const query = qs.toString();
  return apiFetch<ApiSupplier[]>(`/v1/suppliers${query ? `?${query}` : ""}`);
}

export function getSupplier(id: string) {
  return apiFetch<ApiSupplier>(`/v1/suppliers/${id}`);
}

export function createSupplier(input: SupplierInput) {
  return apiFetch<ApiSupplier>("/v1/suppliers", {
    method: "POST",
    body: input,
  });
}

export function updateSupplier(id: string, input: Partial<SupplierInput>) {
  return apiFetch<ApiSupplier>(`/v1/suppliers/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export function updateSupplierStatus(id: string, status: SupplierStatus) {
  return apiFetch<ApiSupplier>(`/v1/suppliers/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
}

export function assignSupplierProducts(id: string, productIds: string[]) {
  return apiFetch<ApiSupplier>(`/v1/suppliers/${id}/products`, {
    method: "PATCH",
    body: { productIds },
  });
}

export function deleteSupplier(id: string) {
  return apiFetch<ApiSupplier>(`/v1/suppliers/${id}`, {
    method: "DELETE",
  });
}
