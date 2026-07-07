"use client";

// Create Order wizard — left stepper, right content pane.
// Step 1: Customer & Address (contact lookup w/ auto-fill)
// Step 2: Products (grid, search, category filter, pagination)
// Step 3: Cart (server draft items, qty edit, checkout)
// Step 4: Order (confirmation)
//
// Backed by the server draft flow: a DRAFT courier per caller keeps the cart,
// so an in-progress order survives refresh and resumes by contact.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Topbar from "@/components/Topbar";
import StatusBadge from "@/components/StatusBadge";
import {
  addDraftItem,
  cancelCourier,
  checkoutDraft,
  createDraftOrder,
  listCategories,
  listManagedProducts,
  lookupCustomerByContact,
  removeDraftItem,
  updateDraftItem,
} from "@/lib/endpoints";
import {
  groupCategories,
  statusLabel,
  type ApiAddress,
  type ApiCategory,
  type ApiCourier,
  type ApiCourierOrderItem,
  type ApiCustomerLookup,
  type ApiProduct,
} from "@/lib/types";

const PAGE_SIZE = 20;

const STEPS = [
  "Customer & Address",
  "Products",
  "Cart",
  "Order",
] as const;

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

type AddressForm = ReturnType<typeof emptyAddress>;

function addressFromApi(apiAddress: ApiAddress): AddressForm {
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

function formatRs(amount: number) {
  return `Rs. ${amount.toLocaleString("en-PK")}`;
}

// ---------------------------------------------------------------------------
// Stepper (left panel)
// ---------------------------------------------------------------------------
function StepperPanel({
  current,
  maxReached,
  locked,
  onSelect,
}: {
  current: number;
  maxReached: number;
  locked: boolean;
  onSelect: (index: number) => void;
}) {
  return (
    <nav className="flex flex-col gap-2 p-4">
      {STEPS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        const clickable = !locked && index < current && index <= maxReached;
        return (
          <button
            key={label}
            type="button"
            disabled={!clickable}
            onClick={() => clickable && onSelect(index)}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
              active
                ? "bg-brand-600 text-white shadow-sm"
                : done
                  ? "text-slate-800 hover:bg-brand-50"
                  : "text-slate-400"
            } ${clickable ? "cursor-pointer" : "cursor-default"}`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                done
                  ? "bg-brand-600 text-white"
                  : active
                    ? "bg-white text-brand-700"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {done ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                index + 1
              )}
            </span>
            {label}
          </button>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — product card
// ---------------------------------------------------------------------------
function QuantityControl({
  label,
  quantity,
  busy,
  outOfStock,
  onIncrease,
  onDecrease,
}: {
  label: string;
  quantity: number;
  busy: boolean;
  outOfStock?: boolean;
  onIncrease: () => void;
  onDecrease: () => void;
}) {
  return (
    <div className="flex items-center overflow-hidden rounded-lg border border-slate-200">
      <button
        type="button"
        disabled={busy}
        onClick={onDecrease}
        aria-label={`Decrease ${label}`}
        className="flex h-8 w-8 items-center justify-center text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:text-brand-600 disabled:cursor-not-allowed disabled:text-slate-300"
      >
        -
      </button>
      <span className="min-w-8 px-2 text-center text-xs font-bold text-slate-900">
        {busy ? "..." : quantity}
      </span>
      <button
        type="button"
        disabled={busy || outOfStock}
        onClick={onIncrease}
        aria-label={`Increase ${label}`}
        className="flex h-8 w-8 items-center justify-center text-sm font-bold text-slate-600 transition hover:bg-slate-50 hover:text-brand-600 disabled:cursor-not-allowed disabled:text-slate-300"
      >
        +
      </button>
    </div>
  );
}

function ProductCard({
  product,
  busy,
  cartItems,
  onAdd,
  onChangeQty,
  onRemove,
}: {
  product: ApiProduct;
  busy: boolean;
  cartItems: ApiCourierOrderItem[];
  onAdd: (variationOptionId?: string) => void;
  onChangeQty: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
}) {
  const options = (product.variationOptions ?? []).filter((o) => o.isActive);
  const defaultOption = options.find((o) => o.isDefault) ?? options[0];
  const [optionsOpen, setOptionsOpen] = useState(false);
  const selectedCartItem = cartItems.find(
    (item) =>
      item.productId === product.id &&
      item.variationOptionId === (defaultOption?.id ?? null),
  );
  const inCartQty = selectedCartItem?.quantity ?? 0;
  const productCartItems = cartItems.filter((item) => item.productId === product.id);
  const productCartQty = productCartItems.reduce((sum, item) => sum + item.quantity, 0);
  const price =
    defaultOption?.salePrice ??
    defaultOption?.price ??
    product.discountedPrice ??
    product.price;
  const hasManyOptions = options.length > 1;
  const outOfStock =
    product.inStock === false ||
    (!hasManyOptions && defaultOption ? defaultOption.stockQuantity <= 0 : false);
  const image = product.coverImage?.url ?? product.images?.[0]?.url ?? null;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-brand-500/50 hover:shadow-sm">
      <div className="flex h-32 items-center justify-center bg-slate-50">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={product.title} className="h-full w-full object-cover" />
        ) : (
          <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900" title={product.title}>
              {product.title}
            </p>
            <p className="text-xs text-slate-400">{product.category?.name}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              outOfStock ? "bg-red-50 text-red-500" : "bg-brand-50 text-brand-700"
            }`}
          >
            {outOfStock ? "Out of stock" : "In stock"}
          </span>
        </div>
        {hasManyOptions && (
          <div className="rounded-lg border border-slate-200 bg-slate-50/70">
            <button
              type="button"
              onClick={() => setOptionsOpen((open) => !open)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700"
            >
              <span>Options</span>
              <span className="text-slate-400">
                {optionsOpen
                  ? "Close"
                  : productCartQty > 0
                    ? `${productCartQty} added`
                    : "Choose"}
              </span>
            </button>
            {optionsOpen && (
              <div className="space-y-2 border-t border-slate-200 p-2">
                {options.map((option) => {
                  const optionCartItem = cartItems.find(
                    (item) =>
                      item.productId === product.id &&
                      item.variationOptionId === (option.id ?? null),
                  );
                  const optionQty = optionCartItem?.quantity ?? 0;
                  const optionOutOfStock =
                    product.inStock === false || option.stockQuantity <= 0;
                  const optionBusy = busy || !option.id;

                  return (
                    <div
                      key={option.id ?? option.name}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-2"
                    >
                      <button
                        type="button"
                        disabled={optionBusy || optionOutOfStock}
                        onClick={() => {
                          if (!optionCartItem) {
                            onAdd(option.id);
                          }
                        }}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-not-allowed"
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            optionCartItem
                              ? "border-brand-600 bg-brand-600 text-white"
                              : "border-slate-300 bg-white text-transparent"
                          }`}
                          aria-hidden="true"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-slate-800">
                            {option.name}
                          </span>
                          <span className="block text-[11px] text-slate-400">
                            {optionOutOfStock ? "Out of stock" : formatRs(option.salePrice ?? option.price)}
                          </span>
                        </span>
                      </button>
                      {optionQty > 0 && optionCartItem ? (
                        <QuantityControl
                          label={`${product.title} ${option.name}`}
                          quantity={optionQty}
                          busy={busy}
                          outOfStock={optionOutOfStock}
                          onDecrease={() =>
                            optionQty <= 1
                              ? onRemove(optionCartItem.id)
                              : onChangeQty(optionCartItem.id, optionQty - 1)
                          }
                          onIncrease={() => onChangeQty(optionCartItem.id, optionQty + 1)}
                        />
                      ) : (
                        <button
                          type="button"
                          disabled={optionBusy || optionOutOfStock}
                          onClick={() => onAdd(option.id)}
                          className="rounded-lg bg-brand-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="text-sm font-bold text-slate-900">
            {hasManyOptions ? `From ${formatRs(price)}` : formatRs(price)}
          </span>
          {hasManyOptions ? (
            <button
              type="button"
              disabled={busy || product.inStock === false}
              onClick={() => setOptionsOpen((open) => !open)}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {productCartQty > 0 ? `${productCartQty} added` : "Choose"}
            </button>
          ) : inCartQty > 0 && selectedCartItem ? (
            <QuantityControl
              label={product.title}
              quantity={inCartQty}
              busy={busy}
              outOfStock={outOfStock}
              onDecrease={() =>
                inCartQty <= 1
                  ? onRemove(selectedCartItem.id)
                  : onChangeQty(selectedCartItem.id, inCartQty - 1)
              }
              onIncrease={() => onChangeQty(selectedCartItem.id, inCartQty + 1)}
            />
          ) : (
            <button
              type="button"
              disabled={busy || outOfStock}
              onClick={() => onAdd(defaultOption?.id)}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {busy ? "Adding..." : "Add"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function CreateOrderWizardPage() {
  const router = useRouter();

  // Wizard position. maxReached lets completed steps stay clickable.
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);

  // --- Step 1 state ---
  const [contact, setContact] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [lookup, setLookup] = useState<ApiCustomerLookup | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [addressId, setAddressId] = useState<string | undefined>();
  const [address, setAddress] = useState<AddressForm>(emptyAddress());
  const [stepError, setStepError] = useState("");
  const [draftBusy, setDraftBusy] = useState(false);

  // --- Draft (server cart) ---
  const [draft, setDraft] = useState<ApiCourier | null>(null);
  const [resumedItems, setResumedItems] = useState(0);

  // --- Step 2 state ---
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [rootId, setRootId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  // --- Step 3 state ---
  const [notes, setNotes] = useState("");
  const [itemBusyId, setItemBusyId] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [discardBusy, setDiscardBusy] = useState(false);

  // --- Step 4 state ---
  const [placedOrder, setPlacedOrder] = useState<ApiCourier | null>(null);

  const cartItems = draft?.orderItems ?? [];
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = draft?.price ?? 0;

  // ---- Step 1: debounced customer lookup --------------------------------
  useEffect(() => {
    const clean = contact.trim();
    setLookup(null);
    setAddress((current) => ({ ...current, phone: current.phone || clean }));
    if (clean.length < 4) return;
    const timer = window.setTimeout(() => {
      setLookupLoading(true);
      lookupCustomerByContact(clean)
        .then((result) => {
          setLookup(result);
          if (result.customer) {
            setCustomerName((name) => name || result.customer!.name);
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
  }, [contact]);

  const hasContact = contact.trim().length >= 4;
  const hasAddress =
    address.fullName.trim() &&
    address.phone.trim() &&
    address.addressLine.trim() &&
    address.city.trim() &&
    address.stateProvince.trim() &&
    address.country.trim() &&
    address.postalCode.trim();
  const canLeaveStep1 = hasContact && customerName.trim() && hasAddress;

  async function handleStep1Next() {
    if (!canLeaveStep1 || draftBusy) return;
    setStepError("");
    setDraftBusy(true);
    try {
      const result = await createDraftOrder({
        contact: contact.trim(),
        name: customerName.trim(),
      });
      setDraft(result);
      setResumedItems(result.orderItems?.length ?? 0);
      setStep(1);
      setMaxReached((m) => Math.max(m, 1));
    } catch {
      setStepError("Could not start the order. Check the backend and try again.");
    } finally {
      setDraftBusy(false);
    }
  }

  // ---- Step 2: categories (once) + paginated products -------------------
  useEffect(() => {
    listCategories({ isActive: true, sortBy: "name", sortOrder: "asc" })
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  // Debounce the search box into the applied query (and reset to page 1).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const res = await listManagedProducts({
        search: search || undefined,
        categoryId: categoryId || undefined,
        isAvailable: true,
        page,
        limit: PAGE_SIZE,
        sortBy: "title",
        sortOrder: "asc",
      });
      setProducts(res.data);
      setTotalPages(Math.max(1, res.meta?.totalPages ?? 1));
    } catch {
      setProducts([]);
      setTotalPages(1);
    } finally {
      setProductsLoading(false);
    }
  }, [search, categoryId, page]);

  useEffect(() => {
    if (step === 1) loadProducts();
  }, [step, loadProducts]);

  async function handleAdd(product: ApiProduct, variationOptionId?: string) {
    if (!draft || !product.id) return;
    setAddingId(product.id);
    setStepError("");
    try {
      const updated = await addDraftItem(draft.id, {
        productId: product.id,
        variationOptionId,
        quantity: 1,
      });
      setDraft(updated);
    } catch {
      setStepError("Could not add the product. Try again.");
    } finally {
      setAddingId(null);
    }
  }

  // ---- Step 3: cart operations -------------------------------------------
  async function handleQty(itemId: string, quantity: number) {
    if (!draft || quantity < 1) return;
    setItemBusyId(itemId);
    try {
      setDraft(await updateDraftItem(draft.id, itemId, quantity));
    } catch {
      setStepError("Could not update the quantity.");
    } finally {
      setItemBusyId(null);
    }
  }

  async function handleRemove(itemId: string) {
    if (!draft) return;
    setItemBusyId(itemId);
    try {
      setDraft(await removeDraftItem(draft.id, itemId));
    } catch {
      setStepError("Could not remove the item.");
    } finally {
      setItemBusyId(null);
    }
  }

  async function handleDiscard() {
    if (!draft || discardBusy) return;
    if (!window.confirm("Discard this draft order? Its items will be lost.")) return;
    setDiscardBusy(true);
    try {
      await cancelCourier(draft.id, "Draft discarded");
      router.push("/dashboard/orders");
    } catch {
      setStepError("Could not discard the draft.");
      setDiscardBusy(false);
    }
  }

  async function handleCheckout() {
    if (!draft || checkoutBusy || cartItems.length === 0) return;
    setCheckoutBusy(true);
    setStepError("");
    try {
      const order = await checkoutDraft(draft.id, {
        address: {
          id: addressId,
          fullName: address.fullName.trim(),
          phone: address.phone.trim(),
          addressLine: address.addressLine.trim(),
          city: address.city.trim(),
          stateProvince: address.stateProvince.trim(),
          country: address.country.trim(),
          postalCode: address.postalCode.trim(),
          deliveryInstructions: address.deliveryInstructions.trim() || undefined,
        },
        notes: notes.trim() || undefined,
      });
      setPlacedOrder(order);
      setDraft(null);
      setStep(3);
      setMaxReached(3);
    } catch {
      setStepError("Could not place the order. Check the address and try again.");
    } finally {
      setCheckoutBusy(false);
    }
  }

  function resetWizard() {
    setStep(0);
    setMaxReached(0);
    setContact("");
    setCustomerName("");
    setLookup(null);
    setAddressId(undefined);
    setAddress(emptyAddress());
    setDraft(null);
    setResumedItems(0);
    setSearchInput("");
    setSearch("");
    setCategoryId("");
    setPage(1);
    setNotes("");
    setPlacedOrder(null);
    setStepError("");
  }

  const { rootCategories, subCategories } = useMemo(() => {
    const { roots, childrenOf } = groupCategories(categories);
    return {
      rootCategories: roots,
      subCategories: rootId ? childrenOf(rootId) : [],
    };
  }, [categories, rootId]);

  const addressSummary = useMemo(
    () =>
      [address.addressLine, address.city, address.stateProvince, address.postalCode, address.country]
        .filter(Boolean)
        .join(", "),
    [address],
  );

  const inputCls =
    "rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <>
      <Topbar title="Create Order" backHref="/dashboard/orders" />
      <div className="px-8 pb-10">
        <div className="flex min-h-[600px] overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {/* Left stepper */}
          <aside className="w-64 shrink-0 border-r border-slate-100 bg-slate-50/40">
            <StepperPanel
              current={step}
              maxReached={maxReached}
              locked={placedOrder !== null}
              onSelect={setStep}
            />
          </aside>

          {/* Right content pane */}
          <section className="flex min-w-0 flex-1 flex-col">
            {/* ============= STEP 1 — Customer & Address ============= */}
            {step === 0 && (
              <div className="flex flex-1 flex-col gap-5 p-8">
                <div>
                  <h2 className="text-xl font-bold text-brand-600">Customer &amp; Address</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Search by phone or email — existing customers auto-fill their saved address.
                  </p>
                </div>

                <div className="max-w-xl">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Contact
                  </label>
                  <input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="Phone or email"
                    className={`mt-1 w-full ${inputCls}`}
                  />
                  <p className="mt-1 min-h-5 text-xs text-slate-500">
                    {lookupLoading
                      ? "Checking customer…"
                      : lookup?.exists
                        ? "✓ Existing customer found — details loaded below."
                        : hasContact
                          ? "No customer found. Fill in the address to create one."
                          : "Enter at least 4 characters to search."}
                  </p>
                </div>

                {hasContact && (
                  <div className="max-w-3xl space-y-4">
                    {lookup?.exists && (
                      <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
                        Existing customer: <b>{lookup.customer?.name}</b>
                        {lookup.address ? " — saved address loaded (editable below)." : " — no saved address yet."}
                      </div>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          setAddress((c) => ({ ...c, fullName: c.fullName || e.target.value }));
                        }}
                        placeholder="Customer name"
                        className={inputCls}
                      />
                    </div>
                    <h3 className="pt-2 text-sm font-bold text-slate-900">Delivery Address</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(
                        [
                          ["fullName", "Full name"],
                          ["phone", "Address phone"],
                          ["addressLine", "Address line"],
                          ["city", "City"],
                          ["stateProvince", "State / Province"],
                          ["postalCode", "Postal code"],
                          ["country", "Country"],
                        ] as const
                      ).map(([key, label]) => (
                        <input
                          key={key}
                          value={address[key]}
                          onChange={(e) => setAddress((c) => ({ ...c, [key]: e.target.value }))}
                          placeholder={label}
                          className={inputCls}
                        />
                      ))}
                    </div>
                    <textarea
                      value={address.deliveryInstructions}
                      onChange={(e) =>
                        setAddress((c) => ({ ...c, deliveryInstructions: e.target.value }))
                      }
                      placeholder="Delivery instructions (optional)"
                      className={`min-h-20 w-full ${inputCls}`}
                    />
                  </div>
                )}

                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-5">
                  <p className="text-sm text-red-500">{stepError}</p>
                  <button
                    type="button"
                    disabled={!canLeaveStep1 || draftBusy}
                    onClick={handleStep1Next}
                    className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {draftBusy ? "Starting…" : "Next: Products →"}
                  </button>
                </div>
              </div>
            )}

            {/* ============= STEP 2 — Products ============= */}
            {step === 1 && (
              <div className="flex flex-1 flex-col">
                <div className="space-y-4 p-8 pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-brand-600">Products</h2>
                      {resumedItems > 0 && (
                        <p className="mt-1 text-xs text-amber-600">
                          Resumed an open draft for this contact with {resumedItems} item
                          {resumedItems === 1 ? "" : "s"} already in the cart.
                        </p>
                      )}
                    </div>
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                      <input
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search products…"
                        className="w-72 rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                      />
                    </div>
                  </div>

                  {/* Category chips: sections (Food/Medicine) + sub-categories */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRootId("");
                          setCategoryId("");
                          setPage(1);
                        }}
                        className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                          rootId === ""
                            ? "bg-brand-600 text-white"
                            : "border border-slate-200 text-slate-600 hover:border-brand-500 hover:text-brand-600"
                        }`}
                      >
                        All
                      </button>
                      {rootCategories.map((root) => (
                        <button
                          key={root.id}
                          type="button"
                          onClick={() => {
                            setRootId(root.id);
                            setCategoryId(root.id); // roll-up: matches all sub-categories
                            setPage(1);
                          }}
                          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                            rootId === root.id
                              ? "bg-brand-600 text-white"
                              : "border border-slate-200 text-slate-600 hover:border-brand-500 hover:text-brand-600"
                          }`}
                        >
                          {root.name}
                        </button>
                      ))}
                    </div>
                    {rootId && subCategories.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryId(rootId);
                            setPage(1);
                          }}
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                            categoryId === rootId
                              ? "bg-brand-100 text-brand-700"
                              : "border border-slate-200 text-slate-500 hover:text-brand-600"
                          }`}
                        >
                          Everything
                        </button>
                        {subCategories.map((sub) => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => {
                              setCategoryId(sub.id);
                              setPage(1);
                            }}
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                              categoryId === sub.id
                                ? "bg-brand-100 text-brand-700"
                                : "border border-slate-200 text-slate-500 hover:text-brand-600"
                            }`}
                          >
                            {sub.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto px-8 pb-4">
                  {productsLoading ? (
                    <p className="py-16 text-center text-sm text-slate-400">Loading products…</p>
                  ) : products.length === 0 ? (
                    <p className="py-16 text-center text-sm text-slate-400">
                      No products found{search ? ` for “${search}”` : ""}.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {products.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          busy={
                            addingId === product.id ||
                            cartItems.some(
                              (item) =>
                                item.productId === product.id && itemBusyId === item.id,
                            )
                          }
                          cartItems={cartItems}
                          onAdd={(variationOptionId) => handleAdd(product, variationOptionId)}
                          onChangeQty={handleQty}
                          onRemove={handleRemove}
                        />
                      ))}
                    </div>
                  )}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 py-5">
                      <button
                        type="button"
                        disabled={page <= 1 || productsLoading}
                        onClick={() => setPage((p) => p - 1)}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                      >
                        ← Prev
                      </button>
                      <span className="text-sm text-slate-500">
                        Page {page} of {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={page >= totalPages || productsLoading}
                        onClick={() => setPage((p) => p + 1)}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </div>

                {/* Sticky cart bar */}
                <div className="flex items-center justify-between border-t border-slate-100 bg-white px-8 py-4">
                  <p className="text-sm text-red-500">{stepError}</p>
                  <button
                    type="button"
                    disabled={cartCount === 0}
                    onClick={() => {
                      setStep(2);
                      setMaxReached((m) => Math.max(m, 2));
                    }}
                    className="flex items-center gap-3 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                    </svg>
                    View Cart ({cartCount}) — {formatRs(cartTotal)}
                  </button>
                </div>
              </div>
            )}

            {/* ============= STEP 3 — Cart ============= */}
            {step === 2 && (
              <div className="flex flex-1 flex-col gap-5 p-8">
                <h2 className="text-xl font-bold text-brand-600">Cart</h2>

                {/* Address summary */}
                <div className="flex items-start justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                  <div className="text-sm">
                    <p className="font-semibold text-slate-900">
                      Deliver to: {address.fullName} · {address.phone}
                    </p>
                    <p className="mt-0.5 text-slate-500">{addressSummary}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-brand-500 hover:text-brand-600"
                  >
                    Edit
                  </button>
                </div>

                {/* Items */}
                {cartItems.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-400">
                    Cart is empty — go back to Products to add items.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium text-slate-400">
                        <tr>
                          <th className="px-4 py-3 font-medium">Product</th>
                          <th className="px-4 py-3 font-medium">Price</th>
                          <th className="px-4 py-3 font-medium">Quantity</th>
                          <th className="px-4 py-3 font-medium">Subtotal</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cartItems.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-900">{item.productName}</p>
                              {item.selectedVariant && (
                                <p className="text-xs text-slate-400">{item.selectedVariant}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{formatRs(item.price)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={itemBusyId === item.id || item.quantity <= 1}
                                  onClick={() => handleQty(item.id, item.quantity - 1)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-brand-500 hover:text-brand-600 disabled:cursor-not-allowed disabled:text-slate-300"
                                >
                                  −
                                </button>
                                <span className="w-8 text-center font-semibold text-slate-900">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  disabled={itemBusyId === item.id}
                                  onClick={() => handleQty(item.id, item.quantity + 1)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-brand-500 hover:text-brand-600 disabled:cursor-not-allowed"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {formatRs(item.price * item.quantity)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                disabled={itemBusyId === item.id}
                                onClick={() => handleRemove(item.id)}
                                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Order notes (optional)"
                  className={`min-h-20 w-full max-w-2xl ${inputCls}`}
                />

                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      disabled={discardBusy}
                      onClick={handleDiscard}
                      className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-50"
                    >
                      {discardBusy ? "Discarding…" : "Discard Draft"}
                    </button>
                    <p className="text-sm text-red-500">{stepError}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-slate-900">
                      Total: {formatRs(cartTotal)}
                    </span>
                    <button
                      type="button"
                      disabled={checkoutBusy || cartItems.length === 0}
                      onClick={handleCheckout}
                      className="rounded-lg bg-brand-600 px-8 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {checkoutBusy ? "Placing order…" : "Place Order"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ============= STEP 4 — Order ============= */}
            {step === 3 && placedOrder && (
              <div className="flex flex-1 flex-col items-center gap-6 p-8">
                <div className="mt-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
                  <svg className="h-8 w-8 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-slate-900">Order Placed</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    The order is in the delivery pipeline and ready to assign to a rider.
                  </p>
                </div>

                <div className="w-full max-w-2xl rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">Order code</p>
                      <p className="text-lg font-bold text-slate-900">{placedOrder.code}</p>
                    </div>
                    <StatusBadge status={statusLabel(placedOrder.status)} />
                  </div>
                  <div className="divide-y divide-slate-100 px-5">
                    {(placedOrder.orderItems ?? []).map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-3 text-sm">
                        <div>
                          <p className="font-medium text-slate-900">{item.productName}</p>
                          {item.selectedVariant && (
                            <p className="text-xs text-slate-400">{item.selectedVariant}</p>
                          )}
                        </div>
                        <p className="text-slate-600">
                          {item.quantity} × {formatRs(item.price)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
                    <p className="text-sm text-slate-500">
                      Deliver to: {placedOrder.dropName} — {placedOrder.dropAddress}
                    </p>
                    <p className="text-lg font-bold text-slate-900">{formatRs(placedOrder.price)}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/orders/${placedOrder.id}`)}
                    className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
                  >
                    View Order Detail
                  </button>
                  <button
                    type="button"
                    onClick={resetWizard}
                    className="rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Create Another Order
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
