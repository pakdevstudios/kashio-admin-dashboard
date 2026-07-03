"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Topbar from "@/components/Topbar";
import StatusBadge from "@/components/StatusBadge";
import { ApiError } from "@/lib/api";
import {
  createBanner,
  deleteBanner,
  listManagedBanners,
  updateBanner,
  updateBannerOrder,
  updateBannerStatus,
  type BannerInput,
} from "@/lib/endpoints";
import type { ApiBanner } from "@/lib/types";

type Filter = "all" | "active" | "inactive";
type SortBy = "displayOrder" | "createdAt" | "title";
type EditingState =
  | { mode: "create"; banner?: undefined }
  | { mode: "edit"; banner: ApiBanner };

const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"];

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

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isImageUrl(value: string) {
  const path = value.trim().split("?")[0].toLowerCase();
  return imageExtensions.some((extension) => path.endsWith(extension));
}

function BannerFormModal({
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
  onSubmit: (input: BannerInput) => void;
}) {
  const [title, setTitle] = useState(state.banner?.title ?? "");
  const [imageUrl, setImageUrl] = useState(state.banner?.imageUrl ?? "");
  const [redirectUrl, setRedirectUrl] = useState(state.banner?.redirectUrl ?? "");
  const [targetType, setTargetType] = useState(state.banner?.targetType ?? "");
  const [targetId, setTargetId] = useState(state.banner?.targetId ?? "");
  const [displayOrder, setDisplayOrder] = useState(
    String(state.banner?.displayOrder ?? 0),
  );
  const [isActive, setIsActive] = useState(state.banner?.isActive ?? true);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      title: title.trim(),
      imageUrl: imageUrl.trim(),
      redirectUrl: redirectUrl.trim() || undefined,
      targetType: targetType.trim() || undefined,
      targetId: targetId.trim() || undefined,
      displayOrder: Number(displayOrder),
      isActive,
    });
  }

  const modalTitle = state.mode === "create" ? "Create Banner" : "Update Banner";

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
              <span className="mb-1 block text-xs font-medium text-slate-500">
                Title <span className="text-red-500">*</span>
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={160}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder="Homepage sale banner"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">
                Display Order <span className="text-red-500">*</span>
              </span>
              <input
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                type="number"
                min="0"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">
              Image URL <span className="text-red-500">*</span>
            </span>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              maxLength={1000}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="https://example.com/banner.webp"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Redirect URL</span>
              <input
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                maxLength={1000}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder="https://kashio.pk/shop"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Target Type</span>
              <input
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                maxLength={80}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder="product, category, shop"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Target ID</span>
              <input
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                maxLength={120}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Active
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

export default function BannersPage() {
  const [banners, setBanners] = useState<ApiBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("displayOrder");
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const isActive = filter === "all" ? undefined : filter === "active";
      const res = await listManagedBanners({
        search: query.trim() || undefined,
        isActive,
        limit: 50,
        sortBy,
        sortOrder: sortBy === "createdAt" ? "desc" : "asc",
      });
      setBanners(res.data);
    } catch {
      setError("Could not load banners. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [filter, query, sortBy]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(
    () => ({
      total: banners.length,
      active: banners.filter((banner) => banner.isActive).length,
      inactive: banners.filter((banner) => !banner.isActive).length,
    }),
    [banners],
  );

  async function handleSubmit(input: BannerInput) {
    if (!editing) return;
    if (!input.title) {
      setFormError("Banner title is required.");
      return;
    }
    if (!input.imageUrl) {
      setFormError("Banner image URL is required.");
      return;
    }
    if (!isValidUrl(input.imageUrl)) {
      setFormError("Banner image must be a valid http or https URL.");
      return;
    }
    if (!isImageUrl(input.imageUrl)) {
      setFormError("Banner image must be a jpg, png, webp, gif, or avif URL.");
      return;
    }
    if (input.redirectUrl && !isValidUrl(input.redirectUrl)) {
      setFormError("Redirect URL must be a valid http or https URL.");
      return;
    }
    if (!Number.isInteger(input.displayOrder) || input.displayOrder < 0) {
      setFormError("Display order must be a whole number greater than or equal to 0.");
      return;
    }

    setFormBusy(true);
    setFormError("");
    try {
      if (editing.mode === "create") {
        await createBanner(input);
      } else {
        await updateBanner(editing.banner.id, input);
      }
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Could not save banner.",
      );
    } finally {
      setFormBusy(false);
    }
  }

  async function handleToggle(banner: ApiBanner) {
    setBusyId(banner.id);
    setError("");
    try {
      await updateBannerStatus(banner.id, !banner.isActive);
      await load();
    } catch {
      setError("Could not update banner status.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleOrder(banner: ApiBanner, displayOrder: number) {
    if (displayOrder < 0) return;
    setBusyId(banner.id);
    setError("");
    try {
      await updateBannerOrder(banner.id, displayOrder);
      await load();
    } catch {
      setError("Could not update display order.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(banner: ApiBanner) {
    const confirmed = window.confirm(
      `Delete "${banner.title}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    setBusyId(banner.id);
    setError("");
    try {
      await deleteBanner(banner.id);
      await load();
    } catch {
      setError("Could not delete banner.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Topbar title="Banner Management" />
      <div className="px-8 pb-10">
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Banners List</h2>
              <p className="mt-1 text-sm text-slate-500">
                {counts.total} total · {counts.active} active · {counts.inactive} inactive
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
                  placeholder="Search banners..."
                  className="w-64 rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>

              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as Filter)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option value="all">All statuses</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option value="displayOrder">Display order</option>
                <option value="createdAt">Newest first</option>
                <option value="title">Title A-Z</option>
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
                  <th className="px-3 py-3 font-medium">Banner</th>
                  <th className="px-3 py-3 font-medium">Target</th>
                  <th className="px-3 py-3 font-medium">Display Order</th>
                  <th className="px-3 py-3 font-medium">Updated</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {banners.map((banner, index) => (
                  <tr key={banner.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-500">{index + 1}.</td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={banner.imageUrl}
                          alt={banner.title}
                          className="h-14 w-24 rounded-lg border border-slate-100 object-cover"
                        />
                        <div>
                          <div className="font-semibold text-slate-900">{banner.title}</div>
                          <div className="max-w-xs truncate text-xs text-slate-400">
                            {banner.imageUrl}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-slate-500">
                      <div className="max-w-xs truncate">
                        {banner.redirectUrl || "-"}
                      </div>
                      {(banner.targetType || banner.targetId) && (
                        <div className="mt-1 text-xs text-slate-400">
                          {[banner.targetType, banner.targetId].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          disabled={busyId === banner.id}
                          onClick={() => handleOrder(banner, Math.max(banner.displayOrder - 1, 0))}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          -
                        </button>
                        <span className="w-10 text-center font-medium text-slate-900">
                          {banner.displayOrder}
                        </span>
                        <button
                          disabled={busyId === banner.id}
                          onClick={() => handleOrder(banner, banner.displayOrder + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-slate-500">
                      {formatDate(banner.updatedAt)}
                    </td>
                    <td className="px-3 py-4">
                      <StatusBadge status={banner.isActive ? "Online" : "Offline"} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <a
                          href={banner.redirectUrl || banner.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          View
                        </a>
                        <button
                          onClick={() => {
                            setFormError("");
                            setEditing({ mode: "edit", banner });
                          }}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          disabled={busyId === banner.id}
                          onClick={() => handleToggle(banner)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                        >
                          {banner.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          disabled={busyId === banner.id}
                          onClick={() => handleDelete(banner)}
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
                Loading banners...
              </p>
            )}
            {!loading && error && (
              <p className="py-12 text-center text-sm text-red-500">{error}</p>
            )}
            {!loading && !error && banners.length === 0 && (
              <p className="py-12 text-center text-sm text-slate-400">
                No banners found.
              </p>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <BannerFormModal
          state={editing}
          busy={formBusy}
          error={formError}
          onClose={() => setEditing(null)}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}
