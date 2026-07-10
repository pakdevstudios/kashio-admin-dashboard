// Backend response shapes (subset we use) + mappers to the dashboard's UI types.

import type { Delivery, DeliveryStatus, Rider } from "./mock-data";

// ---- Backend shapes ----------------------------------------------------
export type CourierStatus =
  | "PENDING"
  | "ASSIGNED"
  | "ACCEPTED"
  | "PICKED_UP"
  | "ON_THE_WAY"
  | "DELIVERED"
  | "CANCELLED";

export type ApiCourier = {
  id: string;
  code: string;
  status: CourierStatus;
  categories: string[];
  price: number;
  notes?: string | null;
  pickupName: string;
  pickupContact: string;
  pickupAddress: string;
  dropName: string;
  dropContact: string;
  dropAddress: string;
  createdAt: string;
  customer?: { id: string; name: string; phone: string | null } | null;
  orderItems?: ApiCourierOrderItem[];
  rider?: {
    id: string;
    user: { name: string; phone: string | null; email: string };
  } | null;
};

export type ApiAddress = {
  id: string;
  userId?: string;
  fullName: string;
  phone: string;
  addressLine: string;
  city: string;
  stateProvince: string;
  country: string;
  postalCode: string;
  deliveryInstructions: string | null;
  isDefault?: boolean;
};

export type ApiCourierOrderItem = {
  id: string;
  courierId: string;
  productId: string;
  variationOptionId: string | null;
  productName: string;
  selectedVariant: string | null;
  price: number;
  quantity: number;
  /** Cover image shipped with the line for cart/order thumbnails. */
  product?: { images?: { url: string }[] } | null;
};

export type ApiCustomerLookup = {
  exists: boolean;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  } | null;
  address: ApiAddress | null;
};

export type ApiRider = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  location: string | null;
  vehicle: string;
  isAvailable: boolean;
  activeRides: number;
};

export type ApiCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** null = top-level vertical (Food, Medicine). */
  parentId?: string | null;
  parent?: { id: string; name: string; slug: string } | null;
};

/** Groups a flat category list into the two-level tree used by pickers. */
export function groupCategories(categories: ApiCategory[]) {
  const roots = categories.filter((c) => !c.parentId);
  const childrenOf = (rootId: string) =>
    categories.filter((c) => c.parentId === rootId);
  return { roots, childrenOf };
}

export type ApiBanner = {
  id: string;
  title: string;
  imageUrl: string;
  redirectUrl: string | null;
  targetType: string | null;
  targetId: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApiProductImage = {
  id?: string;
  fileAssetId?: string | null;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

export type ProductType = "SIMPLE" | "VARIABLE";
export type VariationSelectionType = "SINGLE" | "MULTIPLE";

export type ApiProductVariationOption = {
  id?: string;
  name: string;
  sku: string | null;
  price: number;
  salePrice: number | null;
  effectivePrice?: number;
  stockQuantity: number;
  inStock?: boolean;
  isActive: boolean;
  isDefault: boolean;
  minQuantity: number;
  maxQuantity: number;
  displayOrder: number;
  imageUrl: string | null;
};

export type ApiFrequentlyBoughtItem = {
  id?: string;
  productId: string;
  relatedProductId?: string;
  slug?: string;
  title?: string;
  productType?: ProductType;
  price?: number;
  discountedPrice?: number | null;
  effectivePrice?: number;
  defaultVariationOptionId?: string | null;
  image?: { url: string; altText: string | null } | null;
  isDefault: boolean;
  isActive: boolean;
  inStock?: boolean;
  minQuantity: number;
  maxQuantity: number;
  displayOrder: number;
  variationOptions?: ApiProductVariationOption[];
  relatedProduct?: ApiProduct;
};

export type ApiProduct = {
  id?: string;
  slug: string;
  title: string;
  description: string | null;
  storeName: string | null;
  productType: ProductType;
  price: number;
  discountedPrice: number | null;
  effectivePrice?: number;
  displayPrice?: number;
  startingPrice?: number;
  priceLabel?: string | null;
  stockQuantity: number;
  isActive?: boolean;
  isAvailable: boolean;
  inStock?: boolean;
  variationConfig?: {
    label: string;
    selectionType: VariationSelectionType;
    required: boolean;
    minSelections: number;
    maxSelections: number;
  };
  variationOptions?: ApiProductVariationOption[];
  frequentlyBoughtTogether?: ApiFrequentlyBoughtItem[];
  specialInstructions?: {
    allowed: boolean;
    placeholder: string | null;
    maxLength: number;
  };
  requiresCustomization?: boolean;
  category: {
    id?: string;
    slug: string;
    name: string;
    description?: string | null;
    parentId?: string | null;
    parent?: { id: string; name: string; slug: string } | null;
  };
  supplier?: {
    id: string;
    name: string;
    status: SupplierStatus;
  } | null;
  images: ApiProductImage[];
  coverImage?: {
    url: string;
    altText: string | null;
    sortOrder: number;
    isCover: boolean;
  } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type SupplierStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING";

export type ApiSupplier = {
  id: string;
  name: string;
  slug: string;
  companyName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  status: SupplierStatus;
  products: ApiProduct[];
  createdAt: string;
  updatedAt: string;
};

export type PaginatedProducts = {
  data: ApiProduct[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type PaginatedBanners = {
  data: ApiBanner[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type AuthResponse = {
  token: string;
  refresh_token: string;
  user: { id: string; name: string; email: string; role: string };
};

// ---- Status mapping ----------------------------------------------------
// Backend has 7 statuses; the dashboard badge understands a smaller set.
const STATUS_LABEL: Record<CourierStatus, string> = {
  PENDING: "Pending",
  ASSIGNED: "Ready To Pick",
  ACCEPTED: "Ready To Pick",
  PICKED_UP: "On The Way",
  ON_THE_WAY: "On The Way",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export function statusLabel(status: CourierStatus): string {
  return STATUS_LABEL[status] ?? status;
}

export function isCompleted(status: CourierStatus): boolean {
  return status === "DELIVERED" || status === "CANCELLED";
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// ---- Mappers: backend -> dashboard UI ----------------------------------
export function courierToDelivery(c: ApiCourier): Delivery {
  const itemCount =
    c.orderItems?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  return {
    id: c.id,
    customer: c.customer?.name ?? c.dropName,
    contact: c.dropContact ?? c.customer?.phone ?? "",
    price: c.price,
    from: c.pickupAddress,
    to: c.dropAddress,
    date: formatDate(c.createdAt),
    status: statusLabel(c.status) as DeliveryStatus,
    rider: c.rider?.user.name ?? null,
    code: c.code,
    summary:
      itemCount > 0
        ? `${itemCount} item${itemCount === 1 ? "" : "s"}`
        : c.categories.join(", ") || "Parcel",
  };
}

export function apiRiderToRider(r: ApiRider): Rider {
  return {
    id: r.id,
    name: r.name,
    location: r.location ?? "—",
    activeRides: r.activeRides,
  };
}
