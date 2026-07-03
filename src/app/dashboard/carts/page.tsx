"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Topbar from "@/components/Topbar";
import StatusBadge from "@/components/StatusBadge";
import { getManagedCart, listManagedCarts } from "@/lib/endpoints";
import type { ApiManagedCart, PaginatedManagedCarts } from "@/lib/types";

function formatMoney(value: number) {
  return `Rs. ${value.toLocaleString("en-PK")}`;
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

function CartDetailsModal({
  cart,
  onClose,
}: {
  cart: ApiManagedCart;
  onClose: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cart details"
        className="relative z-10 max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Cart Details</h2>
            <p className="mt-1 text-sm text-slate-500">
              {cart.customer.name} · {cart.customer.email}
            </p>
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

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-400">Items</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{cart.summary.itemCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-400">Unique</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{cart.summary.uniqueItems}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-400">Total</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{formatMoney(cart.summary.total)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-400">Updated</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{formatDate(cart.updatedAt)}</p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-y border-slate-100 bg-slate-50/60 text-xs font-medium text-slate-400">
              <tr>
                <th className="px-3 py-3 font-medium">Product</th>
                <th className="px-3 py-3 font-medium">Category</th>
                <th className="px-3 py-3 font-medium">Stock</th>
                <th className="px-3 py-3 font-medium">Quantity</th>
                <th className="px-3 py-3 font-medium">Unit Price</th>
                <th className="px-3 py-3 font-medium">Subtotal</th>
                <th className="px-3 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cart.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-3">
                      {item.product.image ? (
                        <img
                          src={item.product.image.url}
                          alt={item.product.image.altText ?? item.product.title}
                          className="h-12 w-16 rounded-lg border border-slate-100 object-cover"
                        />
                      ) : (
                        <div className="h-12 w-16 rounded-lg bg-slate-100" />
                      )}
                      <div>
                        <div className="font-semibold text-slate-900">{item.product.title}</div>
                        <div className="text-xs text-slate-400">{item.product.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-slate-500">{item.product.category.name}</td>
                  <td className="px-3 py-4 text-slate-500">{item.product.stockQuantity}</td>
                  <td className="px-3 py-4 font-medium text-slate-900">{item.quantity}</td>
                  <td className="px-3 py-4 text-slate-500">{formatMoney(item.unitPrice)}</td>
                  <td className="px-3 py-4 font-semibold text-slate-900">{formatMoney(item.subtotal)}</td>
                  <td className="px-3 py-4">
                    <StatusBadge status={item.isAvailable && !item.exceedsStock ? "Online" : "Offline"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {cart.items.length === 0 && (
            <p className="py-12 text-center text-sm text-slate-400">
              This cart is empty.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CartsPage() {
  const [response, setResponse] = useState<PaginatedManagedCarts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ApiManagedCart | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setResponse(
        await listManagedCarts({
          search: query.trim() || undefined,
          limit: 50,
        }),
      );
    } catch {
      setError("Could not load carts. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const carts = response?.data ?? [];
  const metrics = response?.metrics ?? {
    activeCarts: 0,
    emptyCarts: 0,
    totalCartValue: 0,
    totalItems: 0,
  };

  const unavailableCarts = useMemo(
    () => carts.filter((cart) => cart.summary.unavailableCount > 0).length,
    [carts],
  );

  async function openDetails(cart: ApiManagedCart) {
    setDetailLoadingId(cart.id);
    setError("");
    try {
      setSelected(await getManagedCart(cart.id));
    } catch {
      setError("Could not load cart details.");
    } finally {
      setDetailLoadingId(null);
    }
  }

  return (
    <>
      <Topbar title="Cart Management" />
      <div className="space-y-6 px-8 pb-10">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">Active Carts</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{metrics.activeCarts}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">Cart Value</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatMoney(metrics.totalCartValue)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">Cart Items</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{metrics.totalItems}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">Needs Review</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{unavailableCarts}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Customer Carts</h2>
              <p className="mt-1 text-sm text-slate-500">
                {response?.meta.total ?? 0} total · {metrics.emptyCarts} empty
              </p>
            </div>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search customers..."
                className="w-72 rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="border-y border-slate-100 bg-slate-50/60 text-xs font-medium text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-medium">No.</th>
                  <th className="px-3 py-3 font-medium">Customer</th>
                  <th className="px-3 py-3 font-medium">Items</th>
                  <th className="px-3 py-3 font-medium">Value</th>
                  <th className="px-3 py-3 font-medium">Updated</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {carts.map((cart, index) => (
                  <tr key={cart.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-500">{index + 1}.</td>
                    <td className="px-3 py-4">
                      <div className="font-semibold text-slate-900">{cart.customer.name}</div>
                      <div className="text-xs text-slate-400">{cart.customer.email}</div>
                    </td>
                    <td className="px-3 py-4 text-slate-500">
                      {cart.summary.itemCount} items · {cart.summary.uniqueItems} products
                    </td>
                    <td className="px-3 py-4 font-semibold text-slate-900">
                      {formatMoney(cart.summary.total)}
                    </td>
                    <td className="px-3 py-4 text-slate-500">{formatDate(cart.updatedAt)}</td>
                    <td className="px-3 py-4">
                      <StatusBadge
                        status={
                          cart.summary.unavailableCount > 0
                            ? "Pending"
                            : cart.summary.uniqueItems > 0
                              ? "Active"
                              : "Inactive"
                        }
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          disabled={detailLoadingId === cart.id}
                          onClick={() => openDetails(cart)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                        >
                          {detailLoadingId === cart.id ? "Loading..." : "View"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {loading && (
              <p className="py-12 text-center text-sm text-slate-400">
                Loading carts...
              </p>
            )}
            {!loading && error && (
              <p className="py-12 text-center text-sm text-red-500">{error}</p>
            )}
            {!loading && !error && carts.length === 0 && (
              <p className="py-12 text-center text-sm text-slate-400">
                No carts found.
              </p>
            )}
          </div>
        </div>
      </div>

      {selected && (
        <CartDetailsModal cart={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
