"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Topbar from "@/components/Topbar";
import StatusBadge from "@/components/StatusBadge";
import { listCouriers } from "@/lib/endpoints";
import { courierToDelivery, isCompleted, type ApiCourier } from "@/lib/types";
import type { Delivery } from "@/lib/mock-data";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5">
      <div className="text-sm font-medium text-slate-400">{label}</div>
      <div className="mt-2 text-[28px] font-bold leading-none text-slate-900">
        {value}
      </div>
    </div>
  );
}

function RiderCell({ rider }: { rider: string | null }) {
  if (!rider) {
    return (
      <span
        className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-slate-200 text-slate-300"
        title="No rider assigned"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0v.75H4.5v-.75z" />
        </svg>
      </span>
    );
  }
  const initials = rider
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-semibold text-white ring-2 ring-white"
      title={rider}
    >
      {initials}
    </div>
  );
}

export default function DashboardOverview() {
  const router = useRouter();
  const [couriers, setCouriers] = useState<ApiCourier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setCouriers(await listCouriers());
    } catch {
      setError("Could not load orders. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const activeCount = couriers.filter((c) => !isCompleted(c.status)).length;
    const customerIds = new Set(
      couriers.map((c) => c.customer?.id ?? c.dropContact ?? c.dropName),
    );
    return {
      total: couriers.length,
      active: activeCount,
      customers: customerIds.size,
    };
  }, [couriers]);

  const activeOrders: Delivery[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    return couriers
      .filter((c) => !isCompleted(c.status))
      .filter(
        (c) =>
          !q ||
          c.code.toLowerCase().includes(q) ||
          c.dropName.toLowerCase().includes(q) ||
          c.dropAddress.toLowerCase().includes(q),
      )
      .map(courierToDelivery);
  }, [couriers, search]);

  return (
    <>
      <Topbar title="Dashboard" />
      <div className="space-y-6 px-8 pb-10">
        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <StatCard
            label="Total Orders"
            value={loading ? "—" : stats.total.toLocaleString()}
          />
          <StatCard
            label="Customers"
            value={loading ? "—" : stats.customers.toLocaleString()}
          />
          <StatCard
            label="Active Orders"
            value={loading ? "—" : stats.active.toLocaleString()}
          />
        </div>

        {/* Active orders table */}
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Active Orders</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                {loading ? "—" : stats.active}
              </span>
            </div>
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

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-y border-slate-100 bg-slate-50/60 text-xs font-medium text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-medium">No.</th>
                  <th className="px-3 py-3 font-medium">Order</th>
                  <th className="px-3 py-3 font-medium">Customer</th>
                  <th className="px-3 py-3 font-medium">Price</th>
                  <th className="px-3 py-3 font-medium">Contact</th>
                  <th className="px-3 py-3 font-medium">Location</th>
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Riders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                      Loading orders…
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-red-500">
                      {error}
                    </td>
                  </tr>
                ) : activeOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                      No active orders right now.
                    </td>
                  </tr>
                ) : (
                  activeOrders.map((o, i) => (
                    <tr
                      key={o.id}
                      onClick={() => router.push(`/dashboard/orders/${o.id}`)}
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 text-slate-500">{i + 1}.</td>
                      <td className="px-3 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">{o.code}</span>
                          <span className="text-xs text-slate-400">{o.summary}</span>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-slate-700">{o.customer}</td>
                      <td className="px-3 py-4 font-medium text-slate-900">Rs. {o.price}</td>
                      <td className="px-3 py-4 text-slate-500">{o.contact || "—"}</td>
                      <td className="px-3 py-4 text-slate-500">{o.to}</td>
                      <td className="px-3 py-4 text-slate-500">{o.date}</td>
                      <td className="px-3 py-4">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-3 py-4">
                        <RiderCell rider={o.rider} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
