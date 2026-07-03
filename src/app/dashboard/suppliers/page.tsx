"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Topbar from "@/components/Topbar";
import StatusBadge from "@/components/StatusBadge";
import { ApiError } from "@/lib/api";
import {
  assignSupplierProducts,
  createSupplier,
  deleteSupplier,
  listManagedProducts,
  listSuppliers,
  updateSupplier,
  updateSupplierStatus,
  type SupplierInput,
} from "@/lib/endpoints";
import type { ApiProduct, ApiSupplier, SupplierStatus } from "@/lib/types";

type Filter = "all" | SupplierStatus;
type SortBy = "createdAt" | "name" | "status";
type EditingState =
  | { mode: "create"; supplier?: undefined }
  | { mode: "edit"; supplier: ApiSupplier };

const supplierStatuses: SupplierStatus[] = [
  "ACTIVE",
  "PENDING",
  "SUSPENDED",
  "INACTIVE",
];

function statusLabel(status: SupplierStatus) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatDate(iso: string) {
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

function selectedProductIds(supplier?: ApiSupplier) {
  return (supplier?.products.map((product) => product.id).filter(Boolean) ??
    []) as string[];
}

function SupplierFormModal({
  state,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  state: EditingState;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (input: SupplierInput) => void;
}) {
  const [name, setName] = useState(state.supplier?.name ?? "");
  const [companyName, setCompanyName] = useState(state.supplier?.companyName ?? "");
  const [contactName, setContactName] = useState(state.supplier?.contactName ?? "");
  const [email, setEmail] = useState(state.supplier?.email ?? "");
  const [phone, setPhone] = useState(state.supplier?.phone ?? "");
  const [address, setAddress] = useState(state.supplier?.address ?? "");
  const [city, setCity] = useState(state.supplier?.city ?? "");
  const [notes, setNotes] = useState(state.supplier?.notes ?? "");
  const [status, setStatus] = useState<SupplierStatus>(
    state.supplier?.status ?? "PENDING",
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      companyName: companyName.trim() || undefined,
      contactName: contactName.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      notes: notes.trim() || undefined,
      status,
    });
  }

  const modalTitle = state.mode === "create" ? "Create Supplier" : "Update Supplier";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={modalTitle}
        className="relative z-10 max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold text-slate-900">{modalTitle}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">
                Supplier Name <span className="text-red-500">*</span>
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder="Kashio Foods"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SupplierStatus)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                {supplierStatuses.map((item) => (
                  <option key={item} value={item}>
                    {statusLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Company</span>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                maxLength={160}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Contact Person</span>
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                maxLength={120}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                maxLength={160}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Phone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={40}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">City</span>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                maxLength={80}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Address</span>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                maxLength={240}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={1000}
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {busy ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SupplierDetailsModal({
  supplier,
  onAssign,
  onClose,
}: {
  supplier: ApiSupplier;
  onAssign: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const rows = [
    ["Company", supplier.companyName],
    ["Contact", supplier.contactName],
    ["Email", supplier.email],
    ["Phone", supplier.phone],
    ["City", supplier.city],
    ["Address", supplier.address],
    ["Created", formatDate(supplier.createdAt)],
    ["Updated", formatDate(supplier.updatedAt)],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Supplier Details"
        className="relative z-10 max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{supplier.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{supplier.slug}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-5">
          <StatusBadge status={statusLabel(supplier.status)} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-200 p-4">
              <div className="text-xs font-medium text-slate-400">{label}</div>
              <div className="mt-1 text-sm font-medium text-slate-800">{value || "-"}</div>
            </div>
          ))}
        </div>

        {supplier.notes && (
          <div className="mt-4 rounded-lg border border-slate-200 p-4">
            <div className="text-xs font-medium text-slate-400">Notes</div>
            <p className="mt-1 text-sm text-slate-600">{supplier.notes}</p>
          </div>
        )}

        <div className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-900">
              Assigned Products ({supplier.products.length})
            </h3>
            <button
              onClick={onAssign}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Manage Products
            </button>
          </div>
          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
            {supplier.products.map((product) => (
              <div
                key={product.id ?? product.slug}
                className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">{product.title}</div>
                  <div className="text-xs text-slate-400">
                    {product.category.name} · Rs. {product.price.toLocaleString("en-PK")}
                  </div>
                </div>
                <StatusBadge status={product.isActive ? "Online" : "Offline"} />
              </div>
            ))}
            {supplier.products.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">
                No products assigned.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AssignProductsModal({
  supplier,
  products,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  supplier: ApiSupplier;
  products: ApiProduct[];
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (productIds: string[]) => void;
}) {
  const [productIds, setProductIds] = useState<string[]>(selectedProductIds(supplier));
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "in" | "out">("all");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const categories = useMemo(
    () =>
      Array.from(
        new Map(
          products.map((product) => [
            product.category.id ?? product.category.slug,
            product.category.name,
          ]),
        ),
      ),
    [products],
  );

  const filteredProducts = products.filter((product) => {
    const term = query.trim().toLowerCase();
    const matchesSearch =
      !term ||
      product.title.toLowerCase().includes(term) ||
      product.category.name.toLowerCase().includes(term) ||
      (product.storeName ?? "").toLowerCase().includes(term) ||
      (product.supplier?.name ?? "").toLowerCase().includes(term);
    const matchesCategory =
      !category ||
      product.category.id === category ||
      product.category.slug === category;
    const matchesStock =
      stockFilter === "all" ||
      (stockFilter === "in" && product.stockQuantity > 0) ||
      (stockFilter === "out" && product.stockQuantity <= 0);
    return matchesSearch && matchesCategory && matchesStock;
  });

  const visibleIds = filteredProducts
    .map((product) => product.id)
    .filter(Boolean) as string[];
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => productIds.includes(id));

  function toggleProduct(productId?: string) {
    if (!productId) return;
    setProductIds((ids) =>
      ids.includes(productId)
        ? ids.filter((id) => id !== productId)
        : [...ids, productId],
    );
  }

  function toggleVisible() {
    setProductIds((ids) =>
      allVisibleSelected
        ? ids.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...ids, ...visibleIds])),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(productIds);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Assign Products"
        className="relative z-10 max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Assign Products</h2>
            <p className="mt-1 text-sm text-slate-500">{supplier.name}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products..."
                className="w-64 rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">All categories</option>
              {categories.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as "all" | "in" | "out")}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option value="all">All stock</option>
              <option value="in">In stock</option>
              <option value="out">Out of stock</option>
            </select>
            <button
              type="button"
              onClick={toggleVisible}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {allVisibleSelected ? "Unselect Visible" : "Select Visible"}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">
              {productIds.length} selected
            </p>
            <button
              type="button"
              onClick={() => setProductIds([])}
              className="text-sm font-semibold text-slate-500 transition hover:text-slate-800"
            >
              Clear selection
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-200">
            {filteredProducts.map((product) => (
              <label
                key={product.id ?? product.slug}
                className="flex cursor-pointer items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-slate-50"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">{product.title}</div>
                  <div className="text-xs text-slate-400">
                    {product.category.name} · {product.storeName || "No store"} · {product.supplier?.name || "No supplier"}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={!!product.id && productIds.includes(product.id)}
                  onChange={() => toggleProduct(product.id)}
                  className="h-4 w-4 rounded border-slate-300"
                />
              </label>
            ))}
            {filteredProducts.length === 0 && (
              <p className="py-12 text-center text-sm text-slate-400">
                No products found.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {busy ? "Saving..." : "Assign Products"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SuppliersManagementPage() {
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [details, setDetails] = useState<ApiSupplier | null>(null);
  const [assigning, setAssigning] = useState<ApiSupplier | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [assignError, setAssignError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      const res = await listManagedProducts({ limit: 100, sortBy: "title", sortOrder: "asc" });
      setProducts(res.data);
    } catch {
      setProducts([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSuppliers(
        await listSuppliers({
          search: query.trim() || undefined,
          status: filter === "all" ? undefined : filter,
          sortBy,
          sortOrder: sortBy === "name" ? "asc" : "desc",
        }),
      );
    } catch {
      setError("Could not load suppliers.");
    } finally {
      setLoading(false);
    }
  }, [filter, query, sortBy]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const counts = useMemo(
    () => ({
      total: suppliers.length,
      active: suppliers.filter((supplier) => supplier.status === "ACTIVE").length,
      pending: suppliers.filter((supplier) => supplier.status === "PENDING").length,
      suspended: suppliers.filter((supplier) => supplier.status === "SUSPENDED").length,
    }),
    [suppliers],
  );

  async function handleSubmit(input: SupplierInput) {
    if (!editing) return;
    if (!input.name) {
      setFormError("Supplier name is required.");
      return;
    }

    setFormBusy(true);
    setFormError("");
    try {
      if (editing.mode === "create") {
        await createSupplier(input);
      } else {
        await updateSupplier(editing.supplier.id, input);
      }
      setEditing(null);
      await Promise.all([load(), loadProducts()]);
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Could not save supplier.",
      );
    } finally {
      setFormBusy(false);
    }
  }

  async function handleStatus(supplier: ApiSupplier, status: SupplierStatus) {
    setBusyId(supplier.id);
    setError("");
    try {
      await updateSupplierStatus(supplier.id, status);
      await load();
    } catch {
      setError("Could not update supplier status.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(supplier: ApiSupplier) {
    const confirmed = window.confirm(
      `Deactivate "${supplier.name}"? Assigned products will stay in the catalog.`,
    );
    if (!confirmed) return;

    setBusyId(supplier.id);
    setError("");
    try {
      await deleteSupplier(supplier.id);
      await load();
    } catch {
      setError("Could not deactivate supplier.");
    } finally {
      setBusyId(null);
    }
  }

  async function clearProducts(supplier: ApiSupplier) {
    const confirmed = window.confirm(`Remove all product assignments from "${supplier.name}"?`);
    if (!confirmed) return;

    setBusyId(supplier.id);
    setError("");
    try {
      await assignSupplierProducts(supplier.id, []);
      await Promise.all([load(), loadProducts()]);
    } catch {
      setError("Could not update product assignments.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleAssignProducts(productIds: string[]) {
    if (!assigning) return;
    setFormBusy(true);
    setAssignError("");
    try {
      const updated = await assignSupplierProducts(assigning.id, productIds);
      setAssigning(null);
      if (details?.id === updated.id) setDetails(updated);
      await Promise.all([load(), loadProducts()]);
    } catch (err) {
      setAssignError(
        err instanceof ApiError ? err.message : "Could not assign products.",
      );
    } finally {
      setFormBusy(false);
    }
  }

  return (
    <>
      <Topbar title="Supplier Management" />
      <div className="px-8 pb-10">
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Suppliers List</h2>
              <p className="mt-1 text-sm text-slate-500">
                {counts.total} total · {counts.active} active · {counts.pending} pending · {counts.suspended} suspended
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search suppliers..."
                  className="w-64 rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>

              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as Filter)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option value="all">All statuses</option>
                {supplierStatuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option value="createdAt">Newest first</option>
                <option value="name">Name A-Z</option>
                <option value="status">Status</option>
              </select>

              <button
                onClick={() => {
                  setFormError("");
                  setEditing({ mode: "create" });
                }}
                className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                New
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-y border-slate-100 bg-slate-50/60 text-xs font-medium text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-medium">No.</th>
                  <th className="px-3 py-3 font-medium">Supplier</th>
                  <th className="px-3 py-3 font-medium">Contact</th>
                  <th className="px-3 py-3 font-medium">Location</th>
                  <th className="px-3 py-3 font-medium">Products</th>
                  <th className="px-3 py-3 font-medium">Created</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((supplier, index) => (
                  <tr key={supplier.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-500">{index + 1}.</td>
                    <td className="px-3 py-4">
                      <div className="font-semibold text-slate-900">{supplier.name}</div>
                      <div className="text-xs text-slate-400">{supplier.companyName || supplier.slug}</div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="text-slate-700">{supplier.contactName || "-"}</div>
                      <div className="text-xs text-slate-400">{supplier.email || supplier.phone || "-"}</div>
                    </td>
                    <td className="px-3 py-4 text-slate-500">{supplier.city || "-"}</td>
                    <td className="px-3 py-4 text-slate-500">{supplier.products.length}</td>
                    <td className="px-3 py-4 text-slate-500">{formatDate(supplier.createdAt)}</td>
                    <td className="px-3 py-4">
                      <StatusBadge status={statusLabel(supplier.status)} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setDetails(supplier)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            setAssignError("");
                            setAssigning(supplier);
                          }}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Assign Products
                        </button>
                        <button
                          onClick={() => {
                            setFormError("");
                            setEditing({ mode: "edit", supplier });
                          }}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <select
                          value={supplier.status}
                          disabled={busyId === supplier.id}
                          onChange={(e) => handleStatus(supplier, e.target.value as SupplierStatus)}
                          className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none transition hover:bg-slate-50 disabled:opacity-60"
                        >
                          {supplierStatuses.map((status) => (
                            <option key={status} value={status}>
                              {statusLabel(status)}
                            </option>
                          ))}
                        </select>
                        <button
                          disabled={busyId === supplier.id || supplier.products.length === 0}
                          onClick={() => clearProducts(supplier)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                        >
                          Clear Products
                        </button>
                        <button
                          disabled={busyId === supplier.id}
                          onClick={() => handleDelete(supplier)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {loading && (
              <p className="py-12 text-center text-sm text-slate-400">
                Loading suppliers...
              </p>
            )}
            {!loading && error && (
              <p className="py-12 text-center text-sm text-red-500">{error}</p>
            )}
            {!loading && !error && suppliers.length === 0 && (
              <p className="py-12 text-center text-sm text-slate-400">
                No suppliers found.
              </p>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <SupplierFormModal
          state={editing}
          busy={formBusy}
          error={formError}
          onClose={() => setEditing(null)}
          onSubmit={handleSubmit}
        />
      )}
      {details && (
        <SupplierDetailsModal
          supplier={details}
          onAssign={() => {
            setAssignError("");
            setAssigning(details);
            setDetails(null);
          }}
          onClose={() => setDetails(null)}
        />
      )}
      {assigning && (
        <AssignProductsModal
          supplier={assigning}
          products={products}
          busy={formBusy}
          error={assignError}
          onClose={() => setAssigning(null)}
          onSubmit={handleAssignProducts}
        />
      )}
    </>
  );
}
