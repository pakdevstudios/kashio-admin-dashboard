"use client";

import { useEffect, useState } from "react";
import { listRiders } from "@/lib/endpoints";
import type { ApiRider } from "@/lib/types";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function AssignRiderModal({
  open,
  onClose,
  onAssign,
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  onAssign: (riderId: string) => void;
  busy?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [riders, setRiders] = useState<ApiRider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset selection + load riders each time the modal opens; lock bg scroll.
  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setError("");
    document.body.style.overflow = "hidden";
    setLoading(true);
    listRiders()
      .then((data) => setRiders(data))
      .catch(() => setError("Could not load riders."))
      .finally(() => setLoading(false));
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create Appointment"
        className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold text-slate-900">Create Appointment</h2>
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

        <h3 className="mt-4 text-sm font-bold text-slate-900">Available Riders</h3>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
        {loading ? (
          <p className="py-10 text-center text-sm text-slate-400">Loading riders…</p>
        ) : riders.length === 0 && !error ? (
          <p className="py-10 text-center text-sm text-slate-400">
            No riders yet. Add one from Rider Management first.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {riders.map((r) => {
              const isSel = selected === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelected(r.id)}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition ${
                    isSel
                      ? "border-brand-500 bg-brand-50"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-300 to-slate-500 text-xs font-semibold text-white">
                      {initials(r.name)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{r.name}</div>
                      <div className="text-xs text-slate-500">
                        {r.location ?? "—"} · {r.activeRides} active
                      </div>
                    </div>
                  </div>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                      isSel
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSel && (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-7 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            disabled={!selected || busy}
            onClick={() => selected && onAssign(selected)}
            className="rounded-lg bg-slate-900 px-7 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Assigning…" : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}
