"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Topbar from "@/components/Topbar";
import StatusBadge from "@/components/StatusBadge";
import { ApiError } from "@/lib/api";
import {
  createProduct,
  deleteProduct,
  listCategories,
  listManagedProducts,
  listSuppliers,
  updateProduct,
  updateProductAvailability,
  uploadProductImage,
  type ProductInput,
} from "@/lib/endpoints";
import {
  groupCategories,
  type ApiCategory,
  type ApiProduct,
  type ApiProductVariationOption,
} from "@/lib/types";

type EditingState =
  | { mode: "create"; product?: undefined }
  | { mode: "edit"; product: ApiProduct };

function formatMoney(value: number) {
  return `Rs. ${value.toLocaleString("en-PK")}`;
}

// What the item's options represent, in plain words. Stored as the option
// label the customer apps display (variationConfig.label).
const OPTION_KINDS = ["Size", "Pack size", "Strength"] as const;
type OptionKind = (typeof OPTION_KINDS)[number];

const OPTION_KIND_HINTS: Record<OptionKind, string> = {
  Size: "e.g. Small, Regular, Large",
  "Pack size": "e.g. 500g, 1kg, Pack of 6",
  Strength: "e.g. 250mg, 500mg, Strip of 10",
};

// Smart default for the option kind based on where the item lives.
function suggestOptionKind(
  sub: ApiCategory | undefined,
  vertical: ApiCategory | undefined,
): OptionKind {
  const parentSlug = vertical?.slug ?? sub?.parent?.slug ?? "";
  if (parentSlug === "medicine") return "Strength";
  const slug = sub?.slug ?? "";
  if (["grocery", "meat-fish", "vegetables"].includes(slug)) return "Pack size";
  return "Size";
}

// The auto-created option name for items sold as-is (no visible options).
const SIMPLE_OPTION_NAME = "Standard";

type VariationDraft = {
  id?: string;
  name: string;
  price: string;
  salePrice: string;
  stockQuantity: string;
  minQuantity: string;
  maxQuantity: string;
};

type ImageDraft = {
  id: string;
  url: string;
  previewUrl: string;
  uploading: boolean;
  error: string;
  isPrimary: boolean;
};

function imageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function optionDraft(option?: Partial<ApiProductVariationOption>): VariationDraft {
  return {
    id: option?.id,
    name: option?.name ?? "",
    price: String(option?.price ?? ""),
    salePrice:
      option?.salePrice !== null && option?.salePrice !== undefined
        ? String(option.salePrice)
        : "",
    stockQuantity: String(option?.stockQuantity ?? 0),
    minQuantity: String(option?.minQuantity ?? 1),
    maxQuantity: String(option?.maxQuantity ?? 99),
  };
}

function imageDrafts(product?: ApiProduct): ImageDraft[] {
  if (!product?.images.length) return [];
  return [...product.images]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((image) => ({
      id: image.id ?? imageId(),
      url: image.url,
      previewUrl: "",
      uploading: false,
      error: "",
      isPrimary: image.isPrimary,
    }));
}

// An existing product edits in "simple" mode when it has exactly the one
// auto-created option.
function isSimpleProduct(product?: ApiProduct) {
  const options = product?.variationOptions ?? [];
  return options.length === 1 && options[0].name === SIMPLE_OPTION_NAME;
}

function ProductFormModal({
  state,
  categories,
  kashioSupplierId,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  state: EditingState;
  categories: ApiCategory[];
  kashioSupplierId: string | null;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (input: ProductInput) => void;
}) {
  const { roots, childrenOf } = useMemo(
    () => groupCategories(categories),
    [categories],
  );

  const editingProduct = state.product;
  const initialSub = editingProduct
    ? categories.find((c) => c.id === editingProduct.category.id)
    : undefined;
  const initialVerticalId =
    initialSub?.parentId ?? initialSub?.id ?? roots[0]?.id ?? "";

  const [title, setTitle] = useState(editingProduct?.title ?? "");
  const [description, setDescription] = useState(editingProduct?.description ?? "");
  const [verticalId, setVerticalId] = useState(initialVerticalId);
  const [categoryId, setCategoryId] = useState(editingProduct?.category.id ?? "");
  const [isActive, setIsActive] = useState(editingProduct?.isActive ?? true);
  const [isAvailable, setIsAvailable] = useState(editingProduct?.isAvailable ?? true);
  const [images, setImages] = useState<ImageDraft[]>(imageDrafts(editingProduct));
  const [uploadingImageCount, setUploadingImageCount] = useState(0);
  const [imageUploadError, setImageUploadError] = useState("");
  const previewUrlsRef = useRef<Set<string>>(new Set());
  const [allowSpecialInstructions, setAllowSpecialInstructions] = useState(
    editingProduct?.specialInstructions?.allowed ?? false,
  );
  const [specialInstructionsPlaceholder, setSpecialInstructionsPlaceholder] =
    useState(
      editingProduct?.specialInstructions?.placeholder ??
        "Any allergies or special requests?",
    );

  // Simple item (one hidden option) vs multiple visible options.
  const simpleAtStart = state.mode === "create" || isSimpleProduct(editingProduct);
  const [hasOptions, setHasOptions] = useState(!simpleAtStart);
  const simpleOption = simpleAtStart ? editingProduct?.variationOptions?.[0] : undefined;
  const [simplePrice, setSimplePrice] = useState(
    simpleOption ? String(simpleOption.price) : "",
  );
  const [simpleSalePrice, setSimpleSalePrice] = useState(
    simpleOption?.salePrice != null ? String(simpleOption.salePrice) : "",
  );
  const [simpleStock, setSimpleStock] = useState(
    simpleOption ? String(simpleOption.stockQuantity) : "",
  );
  const [options, setOptions] = useState<VariationDraft[]>(
    !simpleAtStart && editingProduct?.variationOptions?.length
      ? editingProduct.variationOptions.map((o) => optionDraft(o))
      : [optionDraft(), optionDraft()],
  );
  const [defaultIndex, setDefaultIndex] = useState(() => {
    const idx = editingProduct?.variationOptions?.findIndex((o) => o.isDefault) ?? 0;
    return idx >= 0 ? idx : 0;
  });

  const subCategories = verticalId ? childrenOf(verticalId) : [];
  const selectedSub = categories.find((c) => c.id === categoryId);
  const selectedVertical = categories.find((c) => c.id === verticalId);
  const suggestedKind = suggestOptionKind(selectedSub, selectedVertical);
  const [kindTouched, setKindTouched] = useState(state.mode === "edit");
  const [optionKind, setOptionKind] = useState<OptionKind>(() => {
    const label = editingProduct?.variationConfig?.label;
    return (OPTION_KINDS as readonly string[]).includes(label ?? "")
      ? (label as OptionKind)
      : suggestedKind;
  });
  // Follow the suggestion until the admin picks a kind themselves.
  useEffect(() => {
    if (!kindTouched) setOptionKind(suggestedKind);
  }, [suggestedKind, kindTouched]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
      previewUrlsRef.current.clear();
    };
  }, []);

  // Keep the sub-category in sync with the chosen vertical.
  useEffect(() => {
    if (!verticalId) return;
    const children = childrenOf(verticalId);
    if (children.length === 0) {
      setCategoryId(verticalId);
    } else if (!children.some((c) => c.id === categoryId)) {
      setCategoryId(children[0].id);
    }
  }, [verticalId, categoryId, childrenOf]);

  useEffect(() => {
    if (!images.some((image) => image.error)) {
      setImageUploadError("");
    }
  }, [images]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const normalizedOptions = hasOptions
      ? options
          .map((option, index) => ({
            id: option.id,
            name: option.name.trim(),
            price: Number(option.price),
            salePrice: option.salePrice ? Number(option.salePrice) : undefined,
            stockQuantity: Number(option.stockQuantity || 0),
            isActive: true,
            isDefault: index === defaultIndex,
            minQuantity: Number(option.minQuantity),
            maxQuantity: Number(option.maxQuantity),
            displayOrder: index,
          }))
          .filter((option) => option.name || option.price)
      : [
          {
            id: simpleOption?.id,
            name: SIMPLE_OPTION_NAME,
            price: Number(simplePrice),
            salePrice: simpleSalePrice ? Number(simpleSalePrice) : undefined,
            stockQuantity: Number(simpleStock || 0),
            isActive: true,
            isDefault: true,
            minQuantity: 1,
            maxQuantity: 99,
            displayOrder: 0,
          },
        ];
    if (
      hasOptions &&
      normalizedOptions.length &&
      !normalizedOptions.some((option) => option.isDefault)
    ) {
      normalizedOptions[0] = { ...normalizedOptions[0], isDefault: true };
    }

    const normalizedImages = images
      .map((image, index) => ({
        url: image.url.trim(),
        sortOrder: index,
        isPrimary: image.isPrimary,
      }))
      .filter((image) => image.url);
    if (normalizedImages.length && !normalizedImages.some((image) => image.isPrimary)) {
      normalizedImages[0] = { ...normalizedImages[0], isPrimary: true };
    }

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      categoryId,
      supplierId: kashioSupplierId,
      storeName: "Kashio",
      productType: "VARIABLE",
      isActive,
      isAvailable,
      images: normalizedImages,
      variationLabel: hasOptions ? optionKind : "Option",
      isVariationRequired: true,
      minVariationSelections: 1,
      maxVariationSelections: 1,
      allowSpecialInstructions,
      specialInstructionsPlaceholder: allowSpecialInstructions
        ? specialInstructionsPlaceholder.trim() || undefined
        : undefined,
      specialInstructionsMaxLength: 250,
      variationOptions: normalizedOptions,
      frequentlyBoughtItems: [],
    });
  }

  const modalTitle = state.mode === "create" ? "Add Item" : "Edit Item";
  const hasCategories = roots.length > 0;
  const hasImageUploadErrors = images.some((image) => image.error);

  function updateOption(index: number, patch: Partial<VariationDraft>) {
    setOptions((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  function removeOption(index: number) {
    setOptions((items) => items.filter((_, itemIndex) => itemIndex !== index));
    setDefaultIndex((current) =>
      index === current ? 0 : index < current ? current - 1 : current,
    );
  }

  function revokePreview(previewUrl: string) {
    if (!previewUrl || !previewUrlsRef.current.has(previewUrl)) return;
    URL.revokeObjectURL(previewUrl);
    previewUrlsRef.current.delete(previewUrl);
  }

  function removeImage(id: string) {
    setImages((items) => {
      const target = items.find((item) => item.id === id);
      if (target?.previewUrl) {
        revokePreview(target.previewUrl);
      }
      const next = items.filter((item) => item.id !== id);
      if (next.length && target?.isPrimary && !next.some((item) => item.isPrimary)) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return next;
    });
  }

  function selectCoverImage(id: string) {
    setImages((items) =>
      items.map((item) => ({ ...item, isPrimary: item.id === id })),
    );
  }

  async function handleImageFile(file?: File | null) {
    if (!file) return;
    setImageUploadError("");
    setUploadingImageCount((count) => count + 1);

    const previewUrl = URL.createObjectURL(file);
    const id = imageId();
    previewUrlsRef.current.add(previewUrl);

    setImages((items) => {
      const isPrimary = !items.some((image) => image.url || image.previewUrl);
      return [
        ...items,
        { id, url: "", previewUrl, uploading: true, error: "", isPrimary },
      ];
    });

    try {
      const uploaded = await uploadProductImage(file);
      setImages((items) =>
        items.map((item) =>
          item.id === id
            ? { ...item, url: uploaded.url, previewUrl: "", uploading: false, error: "" }
            : item,
        ),
      );
      revokePreview(previewUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Photo upload failed.";
      setImages((items) =>
        items.map((item) =>
          item.id === id ? { ...item, uploading: false, error: message } : item,
        ),
      );
      setImageUploadError(message);
    } finally {
      setUploadingImageCount((count) => Math.max(0, count - 1));
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={modalTitle}
        className="relative z-10 max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{modalTitle}</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              What customers will see in the app.
            </p>
          </div>
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

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          {/* ── Photos ──────────────────────────────────────────────── */}
          <section className="space-y-3 rounded-xl border border-slate-200 p-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Photos</h3>
              <p className="text-xs text-slate-500">
                The main photo is what customers see first.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {images.map((image) => (
                <div key={image.id} className="space-y-2 rounded-lg bg-slate-50 p-2.5">
                  <div className="aspect-square overflow-hidden rounded-lg border border-slate-200 bg-white">
                    {image.previewUrl || image.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image.previewUrl || image.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <input
                        type="radio"
                        name="product-cover-image"
                        checked={image.isPrimary}
                        disabled={image.uploading || !image.url}
                        onChange={() => selectCoverImage(image.id)}
                        className="h-4 w-4 border-slate-300"
                      />
                      Main
                    </label>
                    <button
                      type="button"
                      onClick={() => removeImage(image.id)}
                      disabled={image.uploading}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                  {image.uploading && (
                    <p className="text-xs font-medium text-slate-500">Uploading…</p>
                  )}
                  {image.error && <p className="text-xs text-red-600">{image.error}</p>}
                </div>
              ))}
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">
                <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0];
                    e.currentTarget.value = "";
                    handleImageFile(file);
                  }}
                />
              </label>
            </div>
            {imageUploadError && (
              <p className="text-sm text-red-600">{imageUploadError}</p>
            )}
          </section>

          {/* ── Item details ────────────────────────────────────────── */}
          <section className="space-y-4 rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Item details</h3>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">
                Item name *
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={160}
                placeholder="e.g. Chicken Burger, Basmati Rice, Panadol"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">
                Description (optional)
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={3000}
                placeholder="Tell customers what's in it or what it's for"
                className={`${inputCls} resize-none`}
              />
            </label>
          </section>

          {/* ── Where it belongs ────────────────────────────────────── */}
          <section className="space-y-4 rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Where it belongs</h3>
            {!hasCategories ? (
              <p className="text-sm text-slate-500">
                Create categories first (Categories page).
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {roots
                    .filter((root) => root.isActive)
                    .map((root) => (
                      <button
                        key={root.id}
                        type="button"
                        onClick={() => setVerticalId(root.id)}
                        className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                          verticalId === root.id
                            ? "bg-brand-600 text-white"
                            : "border border-slate-200 text-slate-600 hover:border-brand-500 hover:text-brand-600"
                        }`}
                      >
                        {root.name}
                      </button>
                    ))}
                </div>
                {subCategories.length > 0 && (
                  <label className="block max-w-sm">
                    <span className="mb-1 block text-xs font-medium text-slate-500">
                      Category
                    </span>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className={inputCls}
                    >
                      {subCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            )}
          </section>

          {/* ── Pricing & options ───────────────────────────────────── */}
          <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Pricing</h3>

            {!hasOptions && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    Price (Rs.) *
                  </span>
                  <input
                    value={simplePrice}
                    onChange={(e) => setSimplePrice(e.target.value)}
                    type="number"
                    min="0"
                    placeholder="0"
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    Discounted price (optional)
                  </span>
                  <input
                    value={simpleSalePrice}
                    onChange={(e) => setSimpleSalePrice(e.target.value)}
                    type="number"
                    min="0"
                    placeholder="Leave empty if no discount"
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    How many in stock?
                  </span>
                  <input
                    value={simpleStock}
                    onChange={(e) => setSimpleStock(e.target.value)}
                    type="number"
                    min="0"
                    placeholder="0"
                    className={inputCls}
                  />
                </label>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={hasOptions}
                onChange={(e) => setHasOptions(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              This item comes in different options (sizes, packs, strengths)
            </label>

            {hasOptions && (
              <div className="space-y-3">
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-slate-500">
                    What kind of options?
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {OPTION_KINDS.map((kind) => (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => {
                          setOptionKind(kind);
                          setKindTouched(true);
                        }}
                        className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                          optionKind === kind
                            ? "bg-brand-600 text-white"
                            : "border border-slate-200 bg-white text-slate-600 hover:border-brand-500 hover:text-brand-600"
                        }`}
                      >
                        {kind}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  {options.map((option, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 items-center gap-2 rounded-lg bg-white p-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(90px,0.7fr)_minmax(90px,0.7fr)_minmax(80px,0.6fr)_auto_auto]"
                    >
                      <input
                        value={option.name}
                        onChange={(e) => updateOption(index, { name: e.target.value })}
                        placeholder={OPTION_KIND_HINTS[optionKind]}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                      />
                      <input
                        value={option.price}
                        onChange={(e) => updateOption(index, { price: e.target.value })}
                        type="number"
                        min="0"
                        placeholder="Price Rs."
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                      />
                      <input
                        value={option.salePrice}
                        onChange={(e) => updateOption(index, { salePrice: e.target.value })}
                        type="number"
                        min="0"
                        placeholder="Discounted"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                      />
                      <input
                        value={option.stockQuantity}
                        onChange={(e) =>
                          updateOption(index, { stockQuantity: e.target.value })
                        }
                        type="number"
                        min="0"
                        placeholder="In stock"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                      />
                      <label
                        className="flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-slate-600"
                        title="Customers see this option first"
                      >
                        <input
                          type="radio"
                          name="default-option"
                          checked={defaultIndex === index}
                          onChange={() => setDefaultIndex(index)}
                          className="h-4 w-4 border-slate-300"
                        />
                        Shown first
                      </label>
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        disabled={options.length <= 1}
                        className="rounded-lg px-2.5 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50 disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setOptions((items) => [...items, optionDraft()])}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-500 hover:text-brand-600"
                >
                  + Add another option
                </button>
              </div>
            )}
          </section>

          {/* ── Special requests ────────────────────────────────────── */}
          <section className="space-y-3 rounded-xl border border-slate-200 p-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={allowSpecialInstructions}
                onChange={(e) => setAllowSpecialInstructions(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Let customers add a note with this item (e.g. allergies, preparation)
            </label>
            {allowSpecialInstructions && (
              <label className="block max-w-md">
                <span className="mb-1 block text-xs font-medium text-slate-500">
                  Hint shown to customers
                </span>
                <input
                  value={specialInstructionsPlaceholder}
                  onChange={(e) => setSpecialInstructionsPlaceholder(e.target.value)}
                  className={inputCls}
                />
              </label>
            )}
          </section>

          {/* ── Visibility ──────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Show in the app
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Accepting orders
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !hasCategories || uploadingImageCount > 0 || hasImageUploadErrors}
              className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProductsManagementPage() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [kashioSupplierId, setKashioSupplierId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    listCategories({ sortBy: "name", sortOrder: "asc" })
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  // Single-supplier setup: every item belongs to Kashio.
  useEffect(() => {
    listSuppliers({ sortBy: "name", sortOrder: "asc" })
      .then((all) => {
        const kashio = all.find((s) => s.name.trim().toLowerCase() === "kashio");
        setKashioSupplierId(kashio?.id ?? null);
      })
      .catch(() => setKashioSupplierId(null));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await listManagedProducts({
        search: query.trim() || undefined,
        categoryId: categoryId || undefined,
        limit: 50,
      });
      setProducts(res.data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setProducts([]);
        return;
      }
      setError("Could not load products.");
    } finally {
      setLoading(false);
    }
  }, [categoryId, query]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(
    () => ({
      total: products.length,
      active: products.filter((product) => product.isActive).length,
      unavailable: products.filter((product) => !product.isAvailable).length,
      out: products.filter((product) => product.stockQuantity <= 0).length,
    }),
    [products],
  );

  const { roots, childrenOf } = useMemo(
    () => groupCategories(categories),
    [categories],
  );

  async function handleSubmit(input: ProductInput) {
    if (!editing) return;
    if (!input.title) {
      setFormError("Give the item a name.");
      return;
    }
    if (!input.categoryId) {
      setFormError("Pick where this item belongs.");
      return;
    }
    const activeOptions = input.variationOptions?.filter((option) => option.isActive) ?? [];
    if (activeOptions.length === 0) {
      setFormError("Set a price for this item.");
      return;
    }
    if (activeOptions.some((option) => !option.name || !Number.isFinite(option.price))) {
      setFormError("Every option needs a name and a price.");
      return;
    }

    setFormBusy(true);
    setFormError("");
    try {
      if (editing.mode === "create") {
        await createProduct(input);
      } else if (editing.product.id) {
        await updateProduct(editing.product.id, input);
      }
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(
        err instanceof ApiError && err.status === 400
          ? "Check the item details and try again."
          : "Could not save the item.",
      );
    } finally {
      setFormBusy(false);
    }
  }

  async function handleDelete(product: ApiProduct) {
    if (!product.id) return;
    const confirmed = window.confirm(`Hide "${product.title}" from the app?`);
    if (!confirmed) return;
    setBusyId(product.id);
    setError("");
    try {
      await deleteProduct(product.id);
      await load();
    } catch {
      setError("Could not hide the item.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleAvailability(product: ApiProduct) {
    if (!product.id) return;
    setBusyId(product.id);
    setError("");
    try {
      await updateProductAvailability(product.id, {
        isAvailable: !product.isAvailable,
      });
      await load();
    } catch {
      setError("Could not update availability.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Topbar title="Product Management" />
      <div className="px-8 pb-10">
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Products List</h2>
              <p className="mt-1 text-sm text-slate-500">
                {counts.total} total · {counts.active} visible · {counts.unavailable} not accepting orders · {counts.out} out of stock
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
                  placeholder="Search products..."
                  className="w-64 rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option value="">All categories</option>
                {roots.map((root) => {
                  const children = childrenOf(root.id);
                  return (
                    <optgroup key={root.id} label={root.name}>
                      <option value={root.id}>All {root.name}</option>
                      {children.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
              <button
                onClick={() => {
                  setFormError("");
                  setEditing({ mode: "create" });
                }}
                disabled={categories.length === 0}
                className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                title={categories.length === 0 ? "Create a category first" : "Add item"}
              >
                Add Item
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-y border-slate-100 bg-slate-50/60 text-xs font-medium text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-medium">No.</th>
                  <th className="px-3 py-3 font-medium">Item</th>
                  <th className="px-3 py-3 font-medium">Category</th>
                  <th className="px-3 py-3 font-medium">Options</th>
                  <th className="px-3 py-3 font-medium">Price</th>
                  <th className="px-3 py-3 font-medium">Stock</th>
                  <th className="px-3 py-3 font-medium">Visible</th>
                  <th className="px-3 py-3 font-medium">Orders</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product, index) => {
                  const activeOptionCount =
                    product.variationOptions?.filter((option) => option.isActive)
                      .length ?? 0;
                  const simple =
                    activeOptionCount === 1 &&
                    product.variationOptions?.[0]?.name === SIMPLE_OPTION_NAME;
                  return (
                    <tr key={product.id ?? product.slug} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-slate-500">{index + 1}.</td>
                      <td className="px-3 py-4">
                        <div className="font-semibold text-slate-900">
                          {product.title}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-slate-500">
                        {product.category.parent
                          ? `${product.category.parent.name} · ${product.category.name}`
                          : product.category.name}
                      </td>
                      <td className="px-3 py-4 text-slate-500">
                        {simple
                          ? "—"
                          : `${activeOptionCount} option${activeOptionCount === 1 ? "" : "s"}`}
                      </td>
                      <td className="px-3 py-4">
                        <div className="font-semibold text-slate-900">
                          {product.priceLabel ? `${product.priceLabel} ` : ""}
                          {formatMoney(
                            product.displayPrice ??
                              product.effectivePrice ??
                              product.price,
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="font-medium text-slate-900">
                          {product.stockQuantity}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <StatusBadge status={product.isActive ? "Online" : "Offline"} />
                      </td>
                      <td className="px-3 py-4">
                        <StatusBadge
                          status={product.isAvailable ? "Online" : "Offline"}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setFormError("");
                              setEditing({ mode: "edit", product });
                            }}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            disabled={busyId === product.id}
                            onClick={() => handleAvailability(product)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                          >
                            {product.isAvailable ? "Pause orders" : "Accept orders"}
                          </button>
                          <button
                            disabled={busyId === product.id}
                            onClick={() => handleDelete(product)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                          >
                            Hide
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {loading && (
              <p className="py-12 text-center text-sm text-slate-400">
                Loading products...
              </p>
            )}
            {!loading && error && (
              <p className="py-12 text-center text-sm text-red-500">{error}</p>
            )}
            {!loading && !error && products.length === 0 && (
              <p className="py-12 text-center text-sm text-slate-400">
                No products found.
              </p>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <ProductFormModal
          state={editing}
          categories={categories}
          kashioSupplierId={kashioSupplierId}
          busy={formBusy}
          error={formError}
          onClose={() => setEditing(null)}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}
