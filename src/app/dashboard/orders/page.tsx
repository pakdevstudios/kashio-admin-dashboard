"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Topbar from "@/components/Topbar";
import StatusBadge from "@/components/StatusBadge";
import AssignRiderModal from "@/components/AssignRiderModal";
import { assignRider, listCouriers } from "@/lib/endpoints";
import {
  courierToDelivery,
  isCompleted,
  type ApiCourier,
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
                onClick={() => router.push("/dashboard/orders/new")}
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
    </>
  );
}
