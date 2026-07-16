"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Topbar from "@/components/Topbar";
import { ApiError } from "@/lib/api";
import {
  createDeliveryZone,
  deleteDeliveryZone,
  DeliveryZoneInput,
  getDeliveryPricing,
  listDeliveryZones,
  updateDeliveryPricing,
  updateDeliveryZone,
} from "@/lib/endpoints";
import type { ApiDeliveryPricing, ApiDeliveryZone } from "@/lib/types";

const zoneStyles = [
  "border-sky-200 bg-sky-50/70",
  "border-orange-200 bg-orange-50/70",
  "border-emerald-200 bg-emerald-50/70",
  "border-fuchsia-200 bg-fuchsia-50/70",
  "border-amber-200 bg-amber-50/70",
  "border-violet-200 bg-violet-50/70",
];

type ZoneEditorState =
  | { mode: "create" }
  | { mode: "edit"; zone: ApiDeliveryZone };

function message(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function ZoneModal({
  state,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  state: ZoneEditorState;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (input: DeliveryZoneInput) => void;
}) {
  const current = state.mode === "edit" ? state.zone : null;
  const [name, setName] = useState(current?.name ?? "");
  const [displayOrder, setDisplayOrder] = useState(
    String(current?.displayOrder ?? 0),
  );
  const [isActive, setIsActive] = useState(current?.isActive ?? true);
  const [areas, setAreas] = useState(
    current?.areas.map((area) => area.name).join("\n") ?? "",
  );

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit({
      name: name.trim(),
      displayOrder: Number(displayOrder),
      isActive,
      areas: areas
        .split("\n")
        .map((area) => area.trim())
        .filter(Boolean),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close zone editor"
        className="absolute inset-0 cursor-default bg-slate-950/45"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={state.mode === "create" ? "Create delivery zone" : "Edit delivery zone"}
        className="relative z-10 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {state.mode === "create" ? "Create delivery zone" : "Edit delivery zone"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Add each locality on a separate line. Blank lines are ignored.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
            aria-label="Close"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <form className="mt-6 space-y-5" onSubmit={submit}>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
          <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
            <label className="block text-xs font-semibold text-slate-600">
              Zone name <span className="text-red-500">*</span>
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                placeholder="e.g. Zone 1"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Display order
              <input
                type="number"
                min={0}
                value={displayOrder}
                onChange={(event) => setDisplayOrder(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
          </div>

          <label className="block text-xs font-semibold text-slate-600">
            Areas / localities
            <textarea
              value={areas}
              onChange={(event) => setAreas(event.target.value)}
              rows={12}
              placeholder={"Gulhar Colony\nGulhar Sharif\nKDA Area"}
              className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 font-mono text-sm font-normal leading-6 text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="h-4 w-4 accent-brand-600"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-800">Active zone</span>
              <span className="block text-xs text-slate-500">Inactive zones cannot be used for new delivery quotes.</span>
            </span>
          </label>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {busy ? "Saving..." : "Save zone"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function PricingPanel({
  pricing,
  zones,
  onSaved,
}: {
  pricing: ApiDeliveryPricing;
  zones: ApiDeliveryZone[];
  onSaved: (pricing: ApiDeliveryPricing) => void;
}) {
  const [sameZoneFee, setSameZoneFee] = useState(String(pricing.sameZoneFee));
  const [crossZoneFee, setCrossZoneFee] = useState(String(pricing.crossZoneFee));
  const [parcel10KgAddOn, setParcel10KgAddOn] = useState(String(pricing.parcel10KgAddOn));
  const [storeAreaId, setStoreAreaId] = useState(pricing.storeAreaId ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function save(event: FormEvent) {
    event.preventDefault();
    const fees = {
      sameZoneFee: Number(sameZoneFee),
      crossZoneFee: Number(crossZoneFee),
      parcel10KgAddOn: Number(parcel10KgAddOn),
    };
    if (Object.values(fees).some((value) => !Number.isInteger(value) || value < 0)) {
      setError("Enter valid whole-rupee amounts.");
      return;
    }
    if (fees.crossZoneFee < fees.sameZoneFee) {
      setError("Cross-zone pricing cannot be lower than same-zone pricing.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await updateDeliveryPricing({
        ...fees,
        storeAreaId: storeAreaId || null,
      });
      onSaved(updated);
      setNotice("Pricing saved.");
    } catch (saveError) {
      setError(message(saveError, "Could not save delivery pricing."));
    } finally {
      setBusy(false);
    }
  }

  const fields = [
    { label: "Same zone", help: "Pickup and drop-off are in one zone", value: sameZoneFee, set: setSameZoneFee },
    { label: "Cross zone", help: "Pickup and drop-off are in different zones", value: crossZoneFee, set: setCrossZoneFee },
    { label: "10 kg parcel add-on", help: "Added on top of the applicable zone fee", value: parcel10KgAddOn, set: setParcel10KgAddOn },
  ];

  return (
    <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Delivery pricing</h2>
          <p className="mt-1 text-sm text-slate-500">Global zone-based fees in PKR.</p>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? "Saving..." : "Save pricing"}
        </button>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {fields.map((field) => (
          <label key={field.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <span className="text-sm font-semibold text-slate-800">{field.label}</span>
            <span className="relative mt-3 block">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Rs.</span>
              <input
                type="number"
                min={0}
                step={1}
                value={field.value}
                onChange={(event) => field.set(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-lg font-bold text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </span>
            <span className="mt-2 block text-xs leading-5 text-slate-500">{field.help}</span>
          </label>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <label className="block">
          <span className="text-sm font-semibold text-slate-800">
            Food store origin area
          </span>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Food delivery is priced same-zone vs cross-zone relative to this
            area. Leave as &ldquo;None&rdquo; to keep food delivery free.
          </p>
          <select
            value={storeAreaId}
            onChange={(event) => setStoreAreaId(event.target.value)}
            className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            <option value="">None — food delivery free</option>
            {zones.map((zone) => (
              <optgroup key={zone.id} label={zone.name}>
                {zone.areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
      {notice && <p className="mt-4 text-sm font-medium text-brand-700">{notice}</p>}
    </form>
  );
}

export default function DeliveryZonesPage() {
  const [zones, setZones] = useState<ApiDeliveryZone[]>([]);
  const [pricing, setPricing] = useState<ApiDeliveryPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<ZoneEditorState | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [zoneList, pricingConfig] = await Promise.all([
        listDeliveryZones(),
        getDeliveryPricing(),
      ]);
      setZones(zoneList);
      setPricing(pricingConfig);
    } catch (loadError) {
      setError(message(loadError, "Could not load delivery zones."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return zones;
    return zones.filter(
      (zone) =>
        zone.name.toLocaleLowerCase().includes(needle) ||
        zone.areas.some((area) => area.name.toLocaleLowerCase().includes(needle)),
    );
  }, [query, zones]);

  const stats = useMemo(
    () => ({
      zones: zones.length,
      active: zones.filter((zone) => zone.isActive).length,
      areas: zones.reduce((total, zone) => total + zone.areas.length, 0),
    }),
    [zones],
  );

  async function saveZone(input: DeliveryZoneInput) {
    if (!input.name) {
      setFormError("Zone name is required.");
      return;
    }
    if (!Number.isInteger(input.displayOrder) || (input.displayOrder ?? 0) < 0) {
      setFormError("Display order must be zero or greater.");
      return;
    }
    if (!editor) return;
    setFormBusy(true);
    setFormError("");
    try {
      if (editor.mode === "create") {
        await createDeliveryZone(input);
      } else {
        await updateDeliveryZone(editor.zone.id, input);
      }
      setEditor(null);
      await load();
    } catch (saveError) {
      setFormError(message(saveError, "Could not save delivery zone."));
    } finally {
      setFormBusy(false);
    }
  }

  async function toggleZone(zone: ApiDeliveryZone) {
    setBusyId(zone.id);
    setError("");
    try {
      const updated = await updateDeliveryZone(zone.id, { isActive: !zone.isActive });
      setZones((current) => current.map((item) => (item.id === zone.id ? updated : item)));
    } catch (toggleError) {
      setError(message(toggleError, "Could not update zone status."));
    } finally {
      setBusyId(null);
    }
  }

  async function removeZone(zone: ApiDeliveryZone) {
    if (!window.confirm(`Delete "${zone.name}" and its ${zone.areas.length} areas? This cannot be undone.`)) return;
    setBusyId(zone.id);
    setError("");
    try {
      await deleteDeliveryZone(zone.id);
      setZones((current) => current.filter((item) => item.id !== zone.id));
    } catch (deleteError) {
      setError(message(deleteError, "Could not delete delivery zone."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Topbar title="Delivery Zone Management" />
      <main className="space-y-6 px-8 pb-10">
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total zones", value: stats.zones },
            { label: "Active zones", value: stats.active },
            { label: "Covered areas", value: stats.areas },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </section>

        {pricing && (
          <PricingPanel pricing={pricing} zones={zones} onSaved={setPricing} />
        )}

        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Zones and covered areas</h2>
              <p className="mt-1 text-sm text-slate-500">Create zones and keep their locality lists up to date.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="m20 20-4-4" />
                </svg>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search zones or areas"
                  className="w-64 rounded-full border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <button
                onClick={() => {
                  setFormError("");
                  setEditor({ mode: "create" });
                }}
                className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                New zone
              </button>
            </div>
          </div>

          {error && <p className="mx-6 mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
          {loading ? (
            <p className="py-16 text-center text-sm text-slate-400">Loading delivery zones...</p>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-semibold text-slate-700">No delivery zones found</p>
              <p className="mt-1 text-sm text-slate-400">Create a zone or change your search.</p>
            </div>
          ) : (
            <div className="grid gap-4 p-6 xl:grid-cols-2">
              {filtered.map((zone, index) => (
                <article key={zone.id} className={`overflow-hidden rounded-xl border ${zoneStyles[index % zoneStyles.length]}`}>
                  <header className="flex items-start justify-between gap-3 border-b border-black/5 px-4 py-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900">{zone.name}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${zone.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                          {zone.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{zone.areas.length} covered areas · Order {zone.displayOrder}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setFormError("");
                          setEditor({ mode: "edit", zone });
                        }}
                        className="rounded-lg bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white"
                      >
                        Edit
                      </button>
                      <button
                        disabled={busyId === zone.id}
                        onClick={() => toggleZone(zone)}
                        className="rounded-lg bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white disabled:opacity-50"
                      >
                        {zone.isActive ? "Disable" : "Enable"}
                      </button>
                      <button
                        disabled={busyId === zone.id}
                        onClick={() => removeZone(zone)}
                        aria-label={`Delete ${zone.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 text-red-500 hover:bg-red-50 disabled:opacity-50"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M19.228 5.79 18.16 19.673A2.25 2.25 0 0 1 15.916 21H8.084a2.25 2.25 0 0 1-2.244-2.327L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397M4.772 5.79c-.342.052-.682.107-1.022.166m1.022-.166a48.11 48.11 0 0 1 3.478-.397m7.5 0V4.477c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </header>
                  <div className="p-4">
                    {zone.areas.length ? (
                      <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto pr-1">
                        {zone.areas.map((area) => (
                          <span key={area.id} className="rounded-full border border-black/5 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700">
                            {area.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-lg border border-dashed border-slate-300 bg-white/50 px-3 py-5 text-center text-xs text-slate-500">No areas added yet.</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {editor && (
        <ZoneModal
          state={editor}
          busy={formBusy}
          error={formError}
          onClose={() => !formBusy && setEditor(null)}
          onSubmit={saveZone}
        />
      )}
    </>
  );
}
