"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Topbar from "@/components/Topbar";
import StatusBadge from "@/components/StatusBadge";
import { ApiError } from "@/lib/api";
import {
  assignProductsToSupplier,
  createProduct,
  deleteProduct,
  listCategories,
  listManagedProducts,
  listSuppliers,
  updateProduct,
  updateProductAvailability,
  updateProductStock,
  type ProductInput,
} from "@/lib/endpoints";
import type { ApiCategory, ApiProduct, ApiSupplier } from "@/lib/types";

type EditingState =
  | { mode: "create"; product?: undefined }
  | { mode: "edit"; product: ApiProduct };

function formatMoney(value: number) {
  return `Rs. ${value.toLocaleString("en-PK")}`;
}

function formatImages(value: string) {
  return value
    .split("\n")
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url, index) => ({
      url,
      sortOrder: index,
      isPrimary: index === 0,
    }));
}

function ProductFormModal({
  state,
  categories,
  suppliers,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  state: EditingState;
  categories: ApiCategory[];
  suppliers: ApiSupplier[];
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (input: ProductInput) => void;
}) {
  const [title, setTitle] = useState(state.product?.title ?? "");
  const [description, setDescription] = useState(state.product?.description ?? "");
  const [categoryId, setCategoryId] = useState(
    state.product?.category.id ?? categories[0]?.id ?? "",
  );
  const [supplierId, setSupplierId] = useState(state.product?.supplier?.id ?? "");
  const [storeName, setStoreName] = useState(state.product?.storeName ?? "");
  const [price, setPrice] = useState(String(state.product?.price ?? ""));
  const [discountedPrice, setDiscountedPrice] = useState(
    state.product?.discountedPrice !== null && state.product?.discountedPrice !== undefined
      ? String(state.product.discountedPrice)
      : "",
  );
  const [stockQuantity, setStockQuantity] = useState(
    String(state.product?.stockQuantity ?? 0),
  );
  const [isActive, setIsActive] = useState(state.product?.isActive ?? true);
  const [isAvailable, setIsAvailable] = useState(
    state.product?.isAvailable ?? true,
  );
  const [images, setImages] = useState(
    state.product?.images.map((image) => image.url).join("\n") ?? "",
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!categoryId && categories[0]?.id) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      categoryId,
      supplierId: supplierId || null,
      storeName: storeName.trim() || undefined,
      price: Number(price),
      discountedPrice: discountedPrice ? Number(discountedPrice) : undefined,
      stockQuantity: Number(stockQuantity),
      isActive,
      isAvailable,
      images: formatImages(images),
    });
  }

  const modalTitle = state.mode === "create" ? "Create Product" : "Update Product";
  const hasCategories = categories.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={modalTitle}
        className="relative z-10 max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
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
              <span className="mb-1 block text-xs font-medium text-slate-500">Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={160}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Category</span>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={!hasCategories}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                {!hasCategories && <option value="">Create a category first</option>}
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Store</span>
              <input
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                maxLength={160}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Supplier</span>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option value="">No supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Stock</span>
              <input
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                type="number"
                min="0"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Price</span>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                type="number"
                min="0"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Discounted price</span>
              <input
                value={discountedPrice}
                onChange={(e) => setDiscountedPrice(e.target.value)}
                type="number"
                min="0"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={3000}
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Image URLs</span>
            <textarea
              value={images}
              onChange={(e) => setImages(e.target.value)}
              rows={4}
              placeholder="One image URL per line. First image is primary."
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Available
            </label>
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
              disabled={busy || !hasCategories}
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

export default function ProductsManagementPage() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkSupplierId, setBulkSupplierId] = useState("");
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    listCategories({ sortBy: "name", sortOrder: "asc" })
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    listSuppliers({ sortBy: "name", sortOrder: "asc" })
      .then(setSuppliers)
      .catch(() => setSuppliers([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listManagedProducts({
        search: query.trim() || undefined,
        categoryId: categoryId || undefined,
        limit: 50,
      });
      setProducts(res.data);
      setSelectedIds((ids) =>
        ids.filter((id) => res.data.some((product) => product.id === id)),
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setProducts([]);
        return;
      }
      setError("Could not load products.");
    } finally {
      setLoading(false);
    }
  }, [categoryId, query]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(
    () => ({
      total: products.length,
      active: products.filter((product) => product.isActive).length,
      unavailable: products.filter((product) => !product.isAvailable).length,
      out: products.filter((product) => product.stockQuantity <= 0).length,
    }),
    [products],
  );

  const visibleProductIds = products
    .map((product) => product.id)
    .filter(Boolean) as string[];
  const allVisibleSelected =
    visibleProductIds.length > 0 &&
    visibleProductIds.every((id) => selectedIds.includes(id));

  function toggleSelected(productId?: string) {
    if (!productId) return;
    setSelectedIds((ids) =>
      ids.includes(productId)
        ? ids.filter((id) => id !== productId)
        : [...ids, productId],
    );
  }

  function toggleAllVisible() {
    setSelectedIds((ids) =>
      allVisibleSelected
        ? ids.filter((id) => !visibleProductIds.includes(id))
        : Array.from(new Set([...ids, ...visibleProductIds])),
    );
  }

  async function handleSubmit(input: ProductInput) {
    if (!editing) return;
    if (!input.title) {
      setFormError("Product title is required.");
      return;
    }
    if (!input.categoryId) {
      setFormError("Create a category before adding products.");
      return;
    }
    if (!Number.isFinite(input.price)) {
      setFormError("Price is required.");
      return;
    }

    setFormBusy(true);
    setFormError("");
    try {
      if (editing.mode === "create") {
        await createProduct(input);
      } else if (editing.product.id) {
        await updateProduct(editing.product.id, input);
      }
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(
        err instanceof ApiError && err.status === 400
          ? "Check the product details and try again."
          : "Could not save product.",
      );
    } finally {
      setFormBusy(false);
    }
  }

  async function handleDelete(product: ApiProduct) {
    if (!product.id) return;
    const confirmed = window.confirm(`Deactivate "${product.title}"?`);
    if (!confirmed) return;
    setBusyId(product.id);
    setError("");
    try {
      await deleteProduct(product.id);
      await load();
    } catch {
      setError("Could not deactivate product.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleAvailability(product: ApiProduct) {
    if (!product.id) return;
    setBusyId(product.id);
    setError("");
    try {
      await updateProductAvailability(product.id, {
        isAvailable: !product.isAvailable,
      });
      await load();
    } catch {
      setError("Could not update availability.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleStock(product: ApiProduct, stockQuantity: number) {
    if (!product.id) return;
    setBusyId(product.id);
    setError("");
    try {
      await updateProductStock(product.id, { stockQuantity });
      await load();
    } catch {
      setError("Could not update stock.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleBulkSupplier() {
    if (selectedIds.length === 0) return;
    setBusyId("bulk-supplier");
    setError("");
    try {
      await assignProductsToSupplier(selectedIds, bulkSupplierId || null);
      setSelectedIds([]);
      setBulkSupplierId("");
      await load();
    } catch {
      setError("Could not assign supplier to selected products.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Topbar title="Product Management" />
      <div className="px-8 pb-10">
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Products List</h2>
              <p className="mt-1 text-sm text-slate-500">
                {counts.total} total · {counts.active} active · {counts.unavailable} unavailable · {counts.out} out of stock
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
                  placeholder="Search products..."
                  className="w-64 rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  setFormError("");
                  setEditing({ mode: "create" });
                }}
                disabled={categories.length === 0}
                className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                title={categories.length === 0 ? "Create a category first" : "New product"}
              >
                New
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {selectedIds.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-3">
                <p className="text-sm font-medium text-slate-700">
                  {selectedIds.length} selected
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={bulkSupplierId}
                    onChange={(e) => setBulkSupplierId(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  >
                    <option value="">No supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleBulkSupplier}
                    disabled={busyId === "bulk-supplier"}
                    className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    {busyId === "bulk-supplier" ? "Assigning..." : "Assign Supplier"}
                  </button>
                  <button
                    onClick={() => setSelectedIds([])}
                    className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="border-y border-slate-100 bg-slate-50/60 text-xs font-medium text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-medium">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </th>
                  <th className="px-6 py-3 font-medium">No.</th>
                  <th className="px-3 py-3 font-medium">Product</th>
                  <th className="px-3 py-3 font-medium">Category</th>
                  <th className="px-3 py-3 font-medium">Supplier</th>
                  <th className="px-3 py-3 font-medium">Price</th>
                  <th className="px-3 py-3 font-medium">Stock</th>
                  <th className="px-3 py-3 font-medium">Visible</th>
                  <th className="px-3 py-3 font-medium">Availability</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product, index) => (
                  <tr key={product.id ?? product.slug} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={!!product.id && selectedIds.includes(product.id)}
                        onChange={() => toggleSelected(product.id)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </td>
                    <td className="px-6 py-4 text-slate-500">{index + 1}.</td>
                    <td className="px-3 py-4">
                      <div className="font-semibold text-slate-900">{product.title}</div>
                      <div className="text-xs text-slate-400">{product.slug}</div>
                    </td>
                    <td className="px-3 py-4 text-slate-500">{product.category.name}</td>
                    <td className="px-3 py-4 text-slate-500">
                      {product.supplier?.name || "-"}
                    </td>
                    <td className="px-3 py-4">
                      <div className="font-semibold text-slate-900">
                        {formatMoney(product.discountedPrice ?? product.price)}
                      </div>
                      {product.discountedPrice !== null && (
                        <div className="text-xs text-slate-400 line-through">
                          {formatMoney(product.price)}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          disabled={busyId === product.id}
                          onClick={() => handleStock(product, Math.max(product.stockQuantity - 1, 0))}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          -
                        </button>
                        <span className="w-10 text-center font-medium text-slate-900">
                          {product.stockQuantity}
                        </span>
                        <button
                          disabled={busyId === product.id}
                          onClick={() => handleStock(product, product.stockQuantity + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <StatusBadge status={product.isActive ? "Online" : "Offline"} />
                    </td>
                    <td className="px-3 py-4">
                      <StatusBadge status={product.isAvailable ? "Online" : "Offline"} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setFormError("");
                            setEditing({ mode: "edit", product });
                          }}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          disabled={busyId === product.id}
                          onClick={() => handleAvailability(product)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                        >
                          {product.isAvailable ? "Mark unavailable" : "Mark available"}
                        </button>
                        <button
                          disabled={busyId === product.id}
                          onClick={() => handleDelete(product)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                        >
                          Deactivate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {loading && (
              <p className="py-12 text-center text-sm text-slate-400">
                Loading products...
              </p>
            )}
            {!loading && error && products.length > 0 && (
              <p className="py-12 text-center text-sm text-red-500">{error}</p>
            )}
            {!loading && !error && products.length === 0 && (
              <p className="py-12 text-center text-sm text-slate-400">
                No products found.
              </p>
            )}
            {!loading && error && products.length === 0 && (
              <p className="py-12 text-center text-sm text-slate-400">
                No products found.
              </p>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <ProductFormModal
          state={editing}
          categories={categories}
          suppliers={suppliers}
          busy={formBusy}
          error={formError}
          onClose={() => setEditing(null)}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}
