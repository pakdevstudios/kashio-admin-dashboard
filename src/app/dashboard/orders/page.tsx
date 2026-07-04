"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Topbar from "@/components/Topbar";
import StatusBadge from "@/components/StatusBadge";
import AssignRiderModal from "@/components/AssignRiderModal";
import {
  assignRider,
  createAdminOrder,
  listCouriers,
  listManagedProducts,
  lookupCustomerByContact,
  type AdminOrderInput,
} from "@/lib/endpoints";
import {
  courierToDelivery,
  isCompleted,
  type ApiAddress,
  type ApiCourier,
  type ApiCustomerLookup,
  type ApiProduct,
} from "@/lib/types";
import type { Delivery } from "@/lib/mock-data";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slate-300 to-slate-500 text-xs font-semibold text-white">
      {initials(name)}
    </div>
  );
}

type OrderItemDraft = {
  productId: string;
  variationOptionId: string;
  price: string;
  quantity: string;
};

const emptyAddress = (contact = "", name = "") => ({
  fullName: name,
  phone: contact,
  addressLine: "",
  city: "",
  stateProvince: "",
  country: "Pakistan",
  postalCode: "",
  deliveryInstructions: "",
});

function effectiveOptionPrice(product: ApiProduct, variationOptionId: string) {
  const option =
    product.variationOptions?.find((item) => item.id === variationOptionId) ??
    product.variationOptions?.find((item) => item.isDefault) ??
    product.variationOptions?.[0];
  return option?.salePrice ?? option?.price ?? product.discountedPrice ?? product.price;
}

function CreateOrderModal({
  open,
  busy,
  error,
  onClose,
  onCreated,
}: {
  open: boolean;
  busy: boolean;
  error: string;
  onClose: () => void;
  onCreated: (input: AdminOrderInput) => Promise<void>;
}) {
  const [contact, setContact] = useState("");
  const [lookup, setLookup] = useState<ApiCustomerLookup | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [addressId, setAddressId] = useState<string | undefined>();
  const [address, setAddress] = useState(emptyAddress());
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [items, setItems] = useState<OrderItemDraft[]>([
    { productId: "", variationOptionId: "", price: "", quantity: "1" },
  ]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    setProductsLoading(true);
    listManagedProducts({ limit: 100, sortBy: "title", sortOrder: "asc" })
      .then((res) => setProducts(res.data))
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false));
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const clean = contact.trim();
    setLookup(null);
    setAddress((current) => ({ ...current, phone: clean }));
    if (clean.length < 4) return;
    const timer = window.setTimeout(() => {
      setLookupLoading(true);
      lookupCustomerByContact(clean)
        .then((result) => {
          setLookup(result);
          if (result.customer) {
            setCustomerName(result.customer.name);
            setCustomerEmail(result.customer.email.includes("@customer.kashio.local") ? "" : result.customer.email);
          }
          if (result.address) {
            setAddressId(result.address.id);
            setAddress(addressFromApi(result.address));
          } else {
            setAddressId(undefined);
            setAddress(emptyAddress(clean, result.customer?.name ?? ""));
          }
        })
        .catch(() => setLookup(null))
        .finally(() => setLookupLoading(false));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [contact, open]);

  if (!open) return null;

  function addressFromApi(apiAddress: ApiAddress) {
    return {
      fullName: apiAddress.fullName,
      phone: apiAddress.phone,
      addressLine: apiAddress.addressLine,
      city: apiAddress.city,
      stateProvince: apiAddress.stateProvince,
      country: apiAddress.country,
      postalCode: apiAddress.postalCode,
      deliveryInstructions: apiAddress.deliveryInstructions ?? "",
    };
  }

  function selectedProduct(item: OrderItemDraft) {
    return products.find((product) => product.id === item.productId);
  }

  function itemTotal(item: OrderItemDraft) {
    const quantity = Number(item.quantity || 0);
    return Number(item.price || 0) * quantity;
  }

  const total = items.reduce((sum, item) => sum + itemTotal(item), 0);
  const hasContact = contact.trim().length >= 4;
  const hasCustomer = customerName.trim() && contact.trim();
  const hasAddress =
    address.fullName.trim() &&
    address.phone.trim() &&
    address.addressLine.trim() &&
    address.city.trim() &&
    address.stateProvince.trim() &&
    address.country.trim() &&
    address.postalCode.trim();
  const validItems = items.filter(
    (item) => item.productId && Number(item.quantity) > 0 && Number(item.price) >= 0,
  );
  const canSubmit = hasContact && hasCustomer && hasAddress && validItems.length > 0 && !busy;

  function updateItem(index: number, patch: Partial<OrderItemDraft>) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    await onCreated({
      customer: {
        id: lookup?.customer?.id,
        name: customerName.trim(),
        contact: contact.trim(),
        email: customerEmail.trim() || undefined,
      },
      address: {
        id: addressId,
        ...address,
        fullName: address.fullName.trim(),
        phone: address.phone.trim(),
        addressLine: address.addressLine.trim(),
        city: address.city.trim(),
        stateProvince: address.stateProvince.trim(),
        country: address.country.trim(),
        postalCode: address.postalCode.trim(),
        deliveryInstructions: address.deliveryInstructions.trim() || undefined,
      },
      items: validItems.map((item) => ({
        productId: item.productId,
        variationOptionId: item.variationOptionId || undefined,
        price: Number(item.price || 0),
        quantity: Number(item.quantity),
      })),
      notes: notes.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Create Order</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <section className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Contact
                </label>
                <input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Phone or email"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
                <p className="mt-1 min-h-5 text-xs text-slate-500">
                  {lookupLoading
                    ? "Checking customer..."
                    : lookup?.exists
                      ? "Existing customer loaded."
                      : hasContact
                        ? "No customer found. Enter details to create one."
                        : "Enter at least 4 characters to search."}
                </p>
              </div>

              {hasContact && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        setAddress((current) => ({ ...current, fullName: current.fullName || e.target.value }));
                      }}
                      placeholder="Customer name"
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    />
                    <input
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="Email optional"
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ["fullName", "Full name"],
                      ["phone", "Address phone"],
                      ["addressLine", "Address line"],
                      ["city", "City"],
                      ["stateProvince", "State / Province"],
                      ["postalCode", "Postal code"],
                      ["country", "Country"],
                    ].map(([key, label]) => (
                      <input
                        key={key}
                        value={address[key as keyof typeof address]}
                        onChange={(e) =>
                          setAddress((current) => ({ ...current, [key]: e.target.value }))
                        }
                        placeholder={label}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                      />
                    ))}
                  </div>
                  <textarea
                    value={address.deliveryInstructions}
                    onChange={(e) =>
                      setAddress((current) => ({
                        ...current,
                        deliveryInstructions: e.target.value,
                      }))
                    }
                    placeholder="Delivery instructions optional"
                    className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </>
              )}
            </section>

            {hasCustomer && hasAddress && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Products</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setItems((current) => [
                        ...current,
                        { productId: "", variationOptionId: "", price: "", quantity: "1" },
                      ])
                    }
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-brand-500 hover:text-brand-600"
                  >
                    Add Product
                  </button>
                </div>
                {items.map((item, index) => {
                  const product = selectedProduct(item);
                  return (
                    <div key={index} className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_100px_80px_100px_auto]">
                      <select
                        value={item.productId}
                        onChange={(e) => {
                          const nextProduct = products.find((product) => product.id === e.target.value);
                          const variationOptionId = nextProduct?.variationOptions?.[0]?.id ?? "";
                          updateItem(index, {
                            productId: e.target.value,
                            variationOptionId,
                            price: nextProduct
                              ? String(effectiveOptionPrice(nextProduct, variationOptionId))
                              : "",
                          });
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                      >
                        <option value="">{productsLoading ? "Loading products..." : "Select product"}</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.title}
                          </option>
                        ))}
                      </select>
                      <select
                        value={item.variationOptionId}
                        onChange={(e) => {
                          updateItem(index, {
                            variationOptionId: e.target.value,
                            price: product
                              ? String(effectiveOptionPrice(product, e.target.value))
                              : item.price,
                          });
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                        disabled={!product?.variationOptions?.length}
                      >
                        <option value="">Default</option>
                        {product?.variationOptions?.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name} · Rs. {option.salePrice ?? option.price}
                          </option>
                        ))}
                      </select>
                      <input
                        value={item.price}
                        onChange={(e) => updateItem(index, { price: e.target.value })}
                        type="number"
                        min={0}
                        placeholder="Price"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                      />
                      <input
                        value={item.quantity}
                        onChange={(e) => updateItem(index, { quantity: e.target.value })}
                        type="number"
                        min={1}
                        placeholder="Qty"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                      />
                      <div className="flex items-center text-sm font-semibold text-slate-900">
                        Rs. {itemTotal(item).toLocaleString("en-PK")}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setItems((current) =>
                            current.length === 1
                              ? current
                              : current.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                        className="rounded-lg px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Order notes optional"
                  className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </section>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
          <div>
            <div className="text-sm font-bold text-slate-900">
              Total Rs. {total.toLocaleString("en-PK")}
            </div>
            {error && <div className="text-sm text-red-500">{error}</div>}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {busy ? "Creating..." : "Create Order"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function RiderCell({
  rider,
  onAssign,
}: {
  rider: string | null;
  onAssign: () => void;
}) {
  if (!rider) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAssign();
        }}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-brand-500 hover:text-brand-600"
        title="Assign rider"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
        </svg>
      </button>
    );
  }
  return (
    <div
      className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-semibold text-white ring-2 ring-white"
      title={rider}
    >
      {initials(rider)}
    </div>
  );
}

function Tab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px flex items-center gap-2 border-b-2 pb-3 pt-1 text-sm font-semibold transition ${
        active
          ? "border-brand-600 text-brand-600"
          : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
          active ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"active" | "completed">("active");
  const [couriers, setCouriers] = useState<ApiCourier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  // Which courier's assign modal is open (null = closed).
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignBusy, setAssignBusy] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setCouriers(await listCouriers());
    } catch {
      setError("Could not load deliveries. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { active, completed } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const match = (c: ApiCourier) =>
      !q ||
      c.code.toLowerCase().includes(q) ||
      c.dropName.toLowerCase().includes(q) ||
      c.dropAddress.toLowerCase().includes(q);
    const filtered = couriers.filter(match);
    return {
      active: filtered.filter((c) => !isCompleted(c.status)).map(courierToDelivery),
      completed: filtered.filter((c) => isCompleted(c.status)).map(courierToDelivery),
    };
  }, [couriers, search]);

  const rows: Delivery[] = tab === "active" ? active : completed;

  async function handleAssign(riderId: string) {
    if (!assigningId) return;
    setAssignBusy(true);
    try {
      await assignRider(assigningId, riderId);
      setAssigningId(null);
      await load();
    } catch {
      // keep the modal open; a toast system would surface this better
      setError("Failed to assign rider.");
    } finally {
      setAssignBusy(false);
    }
  }

  async function handleCreateOrder(input: AdminOrderInput) {
    setCreateBusy(true);
    setCreateError("");
    try {
      await createAdminOrder(input);
      setCreatingOrder(false);
      await load();
    } catch {
      setCreateError("Failed to create order. Check the required fields and try again.");
    } finally {
      setCreateBusy(false);
    }
  }

  return (
    <>
      <Topbar title="Orders Management" />
      <div className="px-8 pb-10">
        <div className="rounded-2xl border border-slate-200 bg-white">
          {/* Card header */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
            <h2 className="text-lg font-bold text-slate-900">
              Delivery Requests List
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  setCreateError("");
                  setCreatingOrder(true);
                }}
                className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Create Order
              </button>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search here..."
                  className="w-72 rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 border-b border-slate-200 px-6">
            <Tab
              label="Active Parcel Deliveries"
              count={active.length}
              active={tab === "active"}
              onClick={() => setTab("active")}
            />
            <Tab
              label="Completed Parcel Deliveries"
              count={completed.length}
              active={tab === "completed"}
              onClick={() => setTab("completed")}
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-medium">No.</th>
                  <th className="px-3 py-3 font-medium">Customer Name</th>
                  <th className="px-3 py-3 font-medium">Contact</th>
                  <th className="px-3 py-3 font-medium">Price</th>
                  <th className="px-3 py-3 font-medium">From Location</th>
                  <th className="px-3 py-3 font-medium">To Location</th>
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Riders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((d, i) => (
                  <tr
                    key={d.id}
                    onClick={() => router.push(`/dashboard/orders/${d.id}`)}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <td className="px-6 py-4 text-slate-500">{i + 1}.</td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={d.customer} />
                        <span className="font-medium text-slate-900">
                          {d.customer}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-slate-500">{d.contact}</td>
                    <td className="px-3 py-4 font-medium text-slate-900">
                      Rs. {d.price}
                    </td>
                    <td className="px-3 py-4 text-slate-500">{d.from}</td>
                    <td className="px-3 py-4 text-slate-500">{d.to}</td>
                    <td className="px-3 py-4 text-slate-500">{d.date}</td>
                    <td className="px-3 py-4">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-3 py-4">
                      <RiderCell
                        rider={d.rider}
                        onAssign={() => setAssigningId(d.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {loading && (
              <p className="py-12 text-center text-sm text-slate-400">
                Loading deliveries…
              </p>
            )}
            {!loading && error && (
              <p className="py-12 text-center text-sm text-red-500">{error}</p>
            )}
            {!loading && !error && rows.length === 0 && (
              <p className="py-12 text-center text-sm text-slate-400">
                No {tab} deliveries.
              </p>
            )}
          </div>
        </div>
      </div>

      <AssignRiderModal
        open={assigningId !== null}
        busy={assignBusy}
        onClose={() => setAssigningId(null)}
        onAssign={handleAssign}
      />
      <CreateOrderModal
        open={creatingOrder}
        busy={createBusy}
        error={createError}
        onClose={() => setCreatingOrder(false)}
        onCreated={handleCreateOrder}
      />
    </>
  );
}
