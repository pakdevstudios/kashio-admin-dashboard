"use client";

import { useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import StatusBadge from "@/components/StatusBadge";
import { getCourier } from "@/lib/endpoints";
import { statusLabel, type ApiCourier, type CourierStatus } from "@/lib/types";

const STEPS = [
  { label: "Order Placed", icon: "check" },
  { label: "In Progress", icon: "clock" },
  { label: "Order Picked", icon: "box" },
  { label: "On the Way", icon: "truck" },
  { label: "Received", icon: "home" },
] as const;

// Which stepper node is active, derived from the backend status.
const STAGE: Record<CourierStatus, number> = {
  PENDING: 1,
  ASSIGNED: 1,
  ACCEPTED: 1,
  PICKED_UP: 2,
  ON_THE_WAY: 3,
  DELIVERED: 4,
  CANCELLED: 0,
};

function StepIcon({ name }: { name: string }) {
  const c = "h-5 w-5";
  switch (name) {
    case "check":
      return (
        <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      );
    case "clock":
      return (
        <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "box":
      return (
        <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
        </svg>
      );
    case "truck":
      return (
        <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
        </svg>
      );
    case "home":
      return (
        <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      );
    default:
      return null;
  }
}

function Stepper({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="relative flex items-center pb-9">
      {STEPS.map((step, i) => {
        const completed = i < activeIndex;
        const active = i === activeIndex;
        const circle = completed
          ? "bg-brand-600 text-white"
          : active
            ? "bg-slate-900 text-white"
            : "bg-slate-100 text-slate-400";
        return (
          <div key={step.label} className="contents">
            <div className="relative flex flex-col items-center">
              <div className={`flex h-11 w-11 items-center justify-center rounded-full ${circle}`}>
                <StepIcon name={completed ? "check" : step.icon} />
              </div>
              <span
                className={`absolute top-12 whitespace-nowrap text-sm font-medium ${
                  completed
                    ? "text-brand-600"
                    : active
                      ? "text-slate-900"
                      : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 flex-1 ${
                  i < activeIndex
                    ? "bg-brand-600"
                    : "border-t-2 border-dashed border-slate-300"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}

export default function OrderDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const [courier, setCourier] = useState<ApiCourier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getCourier(params.id)
      .then(setCourier)
      .catch(() => setError("Could not load this delivery."))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <>
        <Topbar title="Orders Details" backHref="/dashboard/orders" />
        <p className="px-8 py-16 text-center text-sm text-slate-400">Loading…</p>
      </>
    );
  }
  if (error || !courier) {
    return (
      <>
        <Topbar title="Orders Details" backHref="/dashboard/orders" />
        <p className="px-8 py-16 text-center text-sm text-red-500">
          {error || "Delivery not found."}
        </p>
      </>
    );
  }

  const customer = courier.customer?.name ?? courier.dropName;
  const activeIndex = STAGE[courier.status];
  const items = courier.orderItems ?? [];
  const isProductOrder = items.length > 0;
  const itemsTotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const placedDate = new Date(courier.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <>
      <Topbar title="Orders Details" backHref="/dashboard/orders" />
      <div className="space-y-5 px-8 pb-10">
        {/* Progress stepper */}
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-7">
          <div className="mb-6 flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-500">
              {courier.code}
            </span>
            <StatusBadge status={statusLabel(courier.status)} />
          </div>
          <Stepper activeIndex={activeIndex} />
        </div>

        {/* Customer + Order summary */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-bold text-slate-900">Customer Details</h2>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-slate-300 to-slate-500 text-sm font-semibold text-white">
                {customer
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <span className="font-semibold text-slate-900">{customer}</span>
            </div>
            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                </svg>
                {courier.dropContact}
              </div>
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                {courier.dropAddress}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-bold text-slate-900">Order Summary</h2>
            <div className="mt-4 space-y-3.5">
              <SummaryRow label="Order" value={courier.code} />
              <SummaryRow label="Placed on" value={placedDate} />
              <SummaryRow
                label="Type"
                value={isProductOrder ? "Product order" : "Parcel delivery"}
              />
              {!isProductOrder && (
                <SummaryRow label="Pick Up From" value={courier.pickupAddress} />
              )}
              <SummaryRow label="Deliver To" value={courier.dropAddress} />
              <SummaryRow
                label="Rider"
                value={
                  courier.rider
                    ? `${courier.rider.user.name}${courier.rider.user.phone ? ` · ${courier.rider.user.phone}` : ""}`
                    : "Not assigned"
                }
              />
              {courier.notes && <SummaryRow label="Notes" value={courier.notes} />}
            </div>
          </div>
        </div>

        {/* Items & Price */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-bold text-slate-900">
            {isProductOrder ? `Items (${items.length})` : "Parcel & Price"}
          </h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-medium text-slate-400">
                {isProductOrder ? (
                  <tr>
                    <th className="px-5 py-3 font-medium">Item</th>
                    <th className="px-5 py-3 font-medium">Price</th>
                    <th className="px-5 py-3 font-medium">Qty</th>
                    <th className="px-5 py-3 text-right font-medium">Subtotal</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-5 py-3 font-medium">Parcel</th>
                    <th className="px-5 py-3 font-medium">Notes</th>
                    <th className="px-5 py-3 text-right font-medium">Total</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isProductOrder ? (
                  items.map((item) => {
                    const itemImage = item.product?.images?.[0]?.url ?? null;
                    return (
                      <tr key={item.id}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                              {itemImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={itemImage}
                                  alt={item.productName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="text-lg">🛍️</span>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">
                                {item.productName}
                              </p>
                              {item.selectedVariant && (
                                <p className="text-xs text-slate-400">
                                  {item.selectedVariant}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          Rs. {item.price.toLocaleString("en-PK")}
                        </td>
                        <td className="px-5 py-4 text-slate-600">{item.quantity}</td>
                        <td className="px-5 py-4 text-right font-medium text-slate-900">
                          Rs. {(item.price * item.quantity).toLocaleString("en-PK")}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-11 items-center justify-center rounded-md bg-gradient-to-br from-amber-100 to-amber-200 text-lg">
                          📦
                        </div>
                        <span className="font-medium text-slate-900">
                          {courier.categories.join(", ") || "Parcel"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {courier.notes || "—"}
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-slate-900">
                      Rs. {courier.price.toLocaleString("en-PK")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-5 py-4">
              <span className="text-sm font-medium text-slate-600">
                {isProductOrder ? "Items Total" : "Parcel Price"}
              </span>
              <span className="text-sm font-bold text-slate-900">
                Rs. {(isProductOrder ? itemsTotal : courier.price).toLocaleString("en-PK")}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-5 py-4">
              <span className="text-sm font-medium text-slate-600">Delivery Fee</span>
              <span className="text-sm font-bold text-slate-900">Rs. 0</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-brand-50 px-5 py-4">
              <span className="text-sm font-medium text-brand-700">Total</span>
              <span className="text-sm font-bold text-brand-700">
                Rs. {courier.price.toLocaleString("en-PK")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
