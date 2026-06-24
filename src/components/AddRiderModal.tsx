"use client";

import { useEffect, useState } from "react";
import { createRider } from "@/lib/endpoints";
import { ApiError } from "@/lib/api";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <label className="absolute -top-2 left-3 z-10 bg-white px-1 text-xs font-medium text-slate-500">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const empty = {
  firstName: "",
  lastName: "",
  countryCode: "+92",
  phone: "",
  email: "",
  password: "",
  city: "",
};

export default function AddRiderModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [form, setForm] = useState({ ...empty });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      setForm({ ...empty });
      setError("");
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const set =
    (key: keyof typeof empty) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const name = `${form.firstName} ${form.lastName}`.trim();
    if (!name || !form.email || !form.password) {
      setError("Name, email and password are required.");
      return;
    }
    setBusy(true);
    try {
      await createRider({
        name,
        email: form.email.trim(),
        password: form.password,
        phone: form.phone ? `${form.countryCode} ${form.phone}` : undefined,
        location: form.city || undefined,
      });
      onCreated?.();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not create rider.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Enter Details To A New Rider"
        className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            Enter Details To A New Rider
          </h2>
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

        {/* Avatar uploader (display only for now) */}
        <div className="mt-6 flex items-center gap-4">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-slate-200" />
            <label className="absolute bottom-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-white text-brand-600 shadow ring-1 ring-slate-200">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
              <input type="file" accept="image/png,image/jpeg" className="hidden" />
            </label>
          </div>
          <p className="text-sm text-slate-500">
            Avatar size must be less than 5MB&nbsp;&nbsp;(png, jpg and jpeg)
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Field label="First Name" required>
              <input className={inputCls} value={form.firstName} onChange={set("firstName")} />
            </Field>
            <Field label="Last Name">
              <input className={inputCls} value={form.lastName} onChange={set("lastName")} />
            </Field>

            <Field label="Contact No">
              <div className="flex items-center rounded-lg border border-slate-300 bg-white transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
                <select
                  value={form.countryCode}
                  onChange={set("countryCode")}
                  className="appearance-none rounded-l-lg bg-transparent py-2.5 pl-3 pr-1 text-sm text-slate-700 outline-none"
                >
                  <option>+92</option>
                  <option>+1</option>
                  <option>+44</option>
                  <option>+91</option>
                </select>
                <span className="h-5 w-px bg-slate-200" />
                <input
                  value={form.phone}
                  onChange={set("phone")}
                  className="flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-900 outline-none"
                  placeholder="00000000000"
                />
              </div>
            </Field>
            <Field label="City">
              <div className="relative">
                <select
                  value={form.city}
                  onChange={set("city")}
                  className={`${inputCls} appearance-none pr-9 ${form.city ? "text-slate-900" : "text-slate-500"}`}
                >
                  <option value="">Select one</option>
                  <option>Kotli</option>
                  <option>Mirpur</option>
                  <option>Muzaffarabad</option>
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </Field>

            <Field label="Email" required>
              <input className={inputCls} type="email" value={form.email} onChange={set("email")} />
            </Field>
            <Field label="Password" required>
              <input className={inputCls} type="password" value={form.password} onChange={set("password")} />
            </Field>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-7 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-slate-900 px-7 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {busy ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
