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
  rider?: {
    id: string;
    user: { name: string; phone: string | null; email: string };
  } | null;
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
};

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
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

export type ApiProduct = {
  id?: string;
  slug: string;
  title: string;
  description: string | null;
  storeName: string | null;
  price: number;
  discountedPrice: number | null;
  effectivePrice?: number;
  stockQuantity: number;
  isActive?: boolean;
  isAvailable: boolean;
  inStock?: boolean;
  category: {
    id?: string;
    slug: string;
    name: string;
    description?: string | null;
  };
  supplier?: {
    id: string;
    name: string;
    status: SupplierStatus;
  } | null;
  images: ApiProductImage[];
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
