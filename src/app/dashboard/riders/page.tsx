"use client";

import { useCallback, useEffect, useState } from "react";
import Topbar from "@/components/Topbar";
import AddRiderModal from "@/components/AddRiderModal";
import { listRiders } from "@/lib/endpoints";
import { apiRiderToRider } from "@/lib/types";
import type { Rider } from "@/lib/mock-data";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function RiderCard({ rider }: { rider: Rider }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slate-300 to-slate-500 text-sm font-semibold text-white">
            {initials(rider.name)}
          </div>
          <div>
            <div className="font-bold text-slate-900">{rider.name}</div>
            <div className="text-xs text-slate-500">{rider.location}</div>
          </div>
        </div>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label="Rider options"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 6.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM12 13.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM12 20.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
          </svg>
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl bg-white px-4 py-2.5">
        <span className="text-sm text-slate-500">Total active rides</span>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
          {rider.activeRides}
        </span>
      </div>
    </div>
  );
}

export default function RidersPage() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listRiders();
      setRiders(data.map(apiRiderToRider));
    } catch {
      setError("Could not load riders. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = riders.filter((r) =>
    r.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <Topbar title="Rider Management" />
      <div className="px-8 pb-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Riders List</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search here..."
                  className="w-64 rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <button
                onClick={() => setOpen(true)}
                className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                New
              </button>
            </div>
          </div>

          {/* Cards grid */}
          {loading ? (
            <p className="py-12 text-center text-sm text-slate-400">Loading riders…</p>
          ) : error ? (
            <p className="py-12 text-center text-sm text-red-500">{error}</p>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((rider) => (
                  <RiderCard key={rider.id} rider={rider} />
                ))}
              </div>

              {filtered.length === 0 && (
                <p className="py-12 text-center text-sm text-slate-400">
                  {riders.length === 0
                    ? "No riders yet. Click New to add one."
                    : `No riders match “${query}”.`}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <AddRiderModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => {
          setOpen(false);
          load();
        }}
      />
    </>
  );
}
