"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Topbar from "@/components/Topbar";
import StatusBadge from "@/components/StatusBadge";
import { ApiError } from "@/lib/api";
import {
  createCategory,
  deleteCategory,
  listCategories,
  setCategoryStatus,
  updateCategory,
  type CategoryInput,
} from "@/lib/endpoints";
import type { ApiCategory } from "@/lib/types";

type Filter = "all" | "active" | "inactive";
type SortBy = "createdAt" | "name";
type EditingState =
  | { mode: "create"; category?: undefined }
  | { mode: "edit"; category: ApiCategory };

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

function CategoryFormModal({
  state,
  roots,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  state: EditingState;
  roots: ApiCategory[];
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (input: CategoryInput) => void;
}) {
  const [name, setName] = useState(state.category?.name ?? "");
  const [description, setDescription] = useState(
    state.category?.description ?? "",
  );
  const [parentId, setParentId] = useState(state.category?.parentId ?? "");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      parentId: parentId || null,
    });
  }

  const title =
    state.mode === "create" ? "Create Category" : "Update Category";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
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

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="e.g. Fast Food, Tablets"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Belongs to
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">Top level (a main section)</option>
              {roots
                .filter((root) => root.id !== state.category?.id)
                .map((root) => (
                  <option key={root.id} value={root.id}>
                    {root.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={4}
              className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="Optional internal description"
            />
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

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const isActive =
        filter === "all" ? undefined : filter === "active";
      setCategories(
        await listCategories({
          search: query.trim() || undefined,
          isActive,
          sortBy,
          sortOrder: sortBy === "name" ? "asc" : "desc",
        }),
      );
    } catch {
      setError("Could not load categories. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [filter, query, sortBy]);

  // Top-level sections for the "Belongs to" picker (unfiltered).
  const [roots, setRoots] = useState<ApiCategory[]>([]);
  const loadRoots = useCallback(() => {
    listCategories({ rootOnly: true, sortBy: "name", sortOrder: "asc" })
      .then(setRoots)
      .catch(() => setRoots([]));
  }, []);
  useEffect(() => {
    loadRoots();
  }, [loadRoots]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(
    () => ({
      total: categories.length,
      active: categories.filter((category) => category.isActive).length,
      inactive: categories.filter((category) => !category.isActive).length,
    }),
    [categories],
  );

  async function handleSubmit(input: CategoryInput) {
    if (!input.name) {
      setFormError("Category name is required.");
      return;
    }
    if (!editing) return;

    setFormBusy(true);
    setFormError("");
    try {
      if (editing.mode === "create") {
        await createCategory(input);
      } else {
        await updateCategory(editing.category.id, input);
      }
      setEditing(null);
      await load();
      loadRoots();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Could not save category.",
      );
    } finally {
      setFormBusy(false);
    }
  }

  async function handleToggle(category: ApiCategory) {
    setBusyId(category.id);
    setError("");
    try {
      await setCategoryStatus(category.id, !category.isActive);
      await load();
    } catch {
      setError("Could not update category status.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(category: ApiCategory) {
    const confirmed = window.confirm(
      `Delete "${category.name}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    setBusyId(category.id);
    setError("");
    try {
      await deleteCategory(category.id);
      await load();
    } catch {
      setError("Could not delete category.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Topbar title="Category Management" />
      <div className="px-8 pb-10">
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Categories List</h2>
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
                  placeholder="Search categories..."
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
                <option value="createdAt">Newest first</option>
                <option value="name">Name A-Z</option>
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
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-y border-slate-100 bg-slate-50/60 text-xs font-medium text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-medium">No.</th>
                  <th className="px-3 py-3 font-medium">Category</th>
                  <th className="px-3 py-3 font-medium">Belongs to</th>
                  <th className="px-3 py-3 font-medium">Description</th>
                  <th className="px-3 py-3 font-medium">Created</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((category, index) => (
                  <tr key={category.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-500">{index + 1}.</td>
                    <td className="px-3 py-4">
                      <div className="font-semibold text-slate-900">
                        {category.name}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-slate-500">
                      {category.parent ? (
                        category.parent.name
                      ) : (
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                          Top level
                        </span>
                      )}
                    </td>
                    <td className="max-w-sm px-3 py-4 text-slate-500">
                      <span className="line-clamp-2">
                        {category.description || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-slate-500">
                      {formatDate(category.createdAt)}
                    </td>
                    <td className="px-3 py-4">
                      <StatusBadge status={category.isActive ? "Online" : "Offline"} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setFormError("");
                            setEditing({ mode: "edit", category });
                          }}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          disabled={busyId === category.id}
                          onClick={() => handleToggle(category)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                        >
                          {category.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          disabled={busyId === category.id}
                          onClick={() => handleDelete(category)}
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
                Loading categories...
              </p>
            )}
            {!loading && error && (
              <p className="py-12 text-center text-sm text-red-500">{error}</p>
            )}
            {!loading && !error && categories.length === 0 && (
              <p className="py-12 text-center text-sm text-slate-400">
                No categories found.
              </p>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <CategoryFormModal
          state={editing}
          roots={roots}
          busy={formBusy}
          error={formError}
          onClose={() => setEditing(null)}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}
