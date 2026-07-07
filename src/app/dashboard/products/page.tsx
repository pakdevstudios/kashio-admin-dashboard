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

const ITEM_FORM_TEXT = {
  header: {
    createTitle: "Add New Item",
    editTitle: "Edit Item",
    subtitle: "Add the item details customers will see in the app.",
  },
  photos: {
    title: "Item Photo",
    helper: "Add a clear photo. Customers see this first.",
    upload: "Add photo",
    change: "Change photo",
    remove: "Remove",
    main: "Main photo",
    uploading: "Uploading...",
    failed: "Photo upload failed.",
  },
  basic: {
    title: "Basic Information",
    nameLabel: "Item name *",
    namePlaceholder: "Example: Chicken Burger, Rice, Panadol",
    nameHelper: "Use the name customers know.",
    descriptionLabel: "Item description",
    descriptionPlaceholder: "Example: Fresh chicken burger with fries",
    descriptionHelper: "Tell customers what this item is.",
  },
  type: {
    title: "Item Type",
    helper: "Choose where this item should appear.",
    food: "Food",
    medicine: "Medicine",
    categoryLabel: "Category *",
    categoryPlaceholder: "Select category",
    noCategory: "No category found. Please add a category first.",
  },
  price: {
    title: "Price & Stock",
    regularLabel: "Regular price *",
    regularPlaceholder: "0",
    regularHelper: "Original selling price.",
    discountLabel: "Discount price",
    discountPlaceholder: "Leave empty if no discount",
    discountHelper: "Only add this if the item is on sale.",
    stockLabel: "Available stock",
    stockPlaceholder: "0",
    stockHelper: "How many items are available now?",
    optionsHelper: "Add price and stock for each option below.",
  },
  options: {
    checkbox: "This item has options",
    helper: "Use this for sizes, packs, flavors, or strengths.",
    example: "Small / Medium / Large, 500ml / 1L, 250mg / 500mg",
    add: "Add option",
    optionName: "Option name",
    kindLabel: "What kind of options?",
    regularPrice: "Regular price",
    discountPrice: "Discount price",
    stock: "Stock",
    first: "Show first",
  },
  note: {
    checkbox: "Allow customer note",
    helper: "Customers can add instructions, like allergies or preparation notes.",
    placeholderLabel: "Hint shown to customers",
  },
  availability: {
    title: "Availability",
    active: "Show this item in the app",
    activeHelper: "Turn off if you want to hide this item from customers.",
    available: "Accept orders for this item",
    availableHelper: "Turn off if this item is temporarily unavailable.",
  },
  errors: {
    nameRequired: "Item name is required.",
    categoryRequired: "Please select a category.",
    priceRequired: "Price is required.",
    priceGreaterThanZero: "Price must be greater than 0.",
    discountLessThanPrice: "Discount price must be less than regular price.",
    stockNegative: "Stock cannot be negative.",
    optionNameRequired: "Option name is required.",
    optionRequired: "Please add at least one option.",
    saveFailed: "Could not save item. Please try again.",
  },
  actions: {
    cancel: "Cancel",
    create: "Add item",
    update: "Update item",
    saving: "Saving...",
    close: "Close",
  },
  messages: {
    added: "Item added successfully.",
    updated: "Item updated successfully.",
  },
} as const;

const ITEM_TYPE_CHOICES = [
  { key: "food", label: ITEM_FORM_TEXT.type.food },
  { key: "medicine", label: ITEM_FORM_TEXT.type.medicine },
] as const;

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
    stockQuantity:
      option?.stockQuantity !== undefined ? String(option.stockQuantity) : "",
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

function matchesItemType(category: ApiCategory, key: "food" | "medicine") {
  return (
    category.slug?.toLowerCase() === key ||
    category.name.trim().toLowerCase() === key
  );
}

function numberFromInput(value: string) {
  return value.trim() ? Number(value) : NaN;
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
  const firstItemTypeRoot =
    roots.find((root) => matchesItemType(root, "food")) ??
    roots.find((root) => matchesItemType(root, "medicine")) ??
    roots[0];
  const initialVerticalId =
    initialSub?.parentId ?? initialSub?.id ?? firstItemTypeRoot?.id ?? "";

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

  const itemTypeOptions = ITEM_TYPE_CHOICES.map((choice) => ({
    ...choice,
    root: roots.find((root) => matchesItemType(root, choice.key)),
  }));
  const subCategories = verticalId ? childrenOf(verticalId) : [];
  const categoryOptions = subCategories.filter(
    (category) => category.isActive || category.id === categoryId,
  );
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
    const availableChildren = children.filter(
      (child) => child.isActive || child.id === categoryId,
    );
    if (!availableChildren.length) {
      setCategoryId("");
    } else if (!availableChildren.some((c) => c.id === categoryId)) {
      setCategoryId(availableChildren[0].id);
    }
  }, [verticalId, categoryId, childrenOf]);

  useEffect(() => {
    if (!images.some((image) => image.error)) {
      setImageUploadError("");
    }
  }, [images]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formIsValid) return;

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

  const modalTitle =
    state.mode === "create"
      ? ITEM_FORM_TEXT.header.createTitle
      : ITEM_FORM_TEXT.header.editTitle;
  const hasCategories = categoryOptions.length > 0;
  const hasImageUploadErrors = images.some((image) => image.error);
  const simplePriceValue = numberFromInput(simplePrice);
  const simpleSalePriceValue = numberFromInput(simpleSalePrice);
  const simpleStockValue = numberFromInput(simpleStock || "0");
  const filledOptions = options.filter(
    (option) =>
      option.name.trim() ||
      option.price.trim() ||
      option.salePrice.trim() ||
      option.stockQuantity.trim(),
  );

  const nameError = title.trim() ? "" : ITEM_FORM_TEXT.errors.nameRequired;
  const categoryError =
    categoryId && categoryOptions.some((category) => category.id === categoryId)
      ? ""
      : ITEM_FORM_TEXT.errors.categoryRequired;
  const simplePriceError = !simplePrice.trim()
    ? ITEM_FORM_TEXT.errors.priceRequired
    : !Number.isFinite(simplePriceValue) || simplePriceValue <= 0
      ? ITEM_FORM_TEXT.errors.priceGreaterThanZero
      : "";
  const simpleDiscountError =
    simpleSalePrice.trim() &&
    Number.isFinite(simpleSalePriceValue) &&
    Number.isFinite(simplePriceValue) &&
    simpleSalePriceValue >= simplePriceValue
      ? ITEM_FORM_TEXT.errors.discountLessThanPrice
      : "";
  const simpleStockError =
    Number.isFinite(simpleStockValue) && simpleStockValue < 0
      ? ITEM_FORM_TEXT.errors.stockNegative
      : "";

  const optionErrors = options.map((option) => {
    const priceValue = numberFromInput(option.price);
    const salePriceValue = numberFromInput(option.salePrice);
    const stockValue = numberFromInput(option.stockQuantity || "0");
    const rowHasAnyValue =
      option.name.trim() ||
      option.price.trim() ||
      option.salePrice.trim() ||
      option.stockQuantity.trim();

    return {
      name:
        rowHasAnyValue && !option.name.trim()
          ? ITEM_FORM_TEXT.errors.optionNameRequired
          : "",
      price:
        rowHasAnyValue && !option.price.trim()
          ? ITEM_FORM_TEXT.errors.priceRequired
          : rowHasAnyValue && (!Number.isFinite(priceValue) || priceValue <= 0)
            ? ITEM_FORM_TEXT.errors.priceGreaterThanZero
            : "",
      discount:
        option.salePrice.trim() &&
        Number.isFinite(salePriceValue) &&
        Number.isFinite(priceValue) &&
        salePriceValue >= priceValue
          ? ITEM_FORM_TEXT.errors.discountLessThanPrice
          : "",
      stock:
        Number.isFinite(stockValue) && stockValue < 0
          ? ITEM_FORM_TEXT.errors.stockNegative
          : "",
    };
  });

  const hasValidOption =
    filledOptions.length > 0 &&
    optionErrors.every((row) => !row.name && !row.price && !row.discount && !row.stock);
  const formIsValid =
    !nameError &&
    !categoryError &&
    !hasImageUploadErrors &&
    uploadingImageCount === 0 &&
    (hasOptions
      ? hasValidOption
      : !simplePriceError && !simpleDiscountError && !simpleStockError);
  const saveButtonLabel =
    state.mode === "create" ? ITEM_FORM_TEXT.actions.create : ITEM_FORM_TEXT.actions.update;

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

  async function handleImageFile(file?: File | null, replaceId?: string) {
    if (!file) return;
    setImageUploadError("");
    setUploadingImageCount((count) => count + 1);

    const previewUrl = URL.createObjectURL(file);
    const id = replaceId ?? imageId();
    previewUrlsRef.current.add(previewUrl);

    setImages((items) => {
      if (replaceId) {
        return items.map((item) =>
          item.id === replaceId
            ? { ...item, previewUrl, uploading: true, error: "" }
            : item,
        );
      }
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
      const message =
        err instanceof Error ? err.message : ITEM_FORM_TEXT.photos.failed;
      setImages((items) =>
        items.map((item) =>
          item.id === id
            ? { ...item, previewUrl: "", uploading: false, error: message }
            : item,
        ),
      );
      revokePreview(previewUrl);
      setImageUploadError(message);
    } finally {
      setUploadingImageCount((count) => Math.max(0, count - 1));
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
  const numberInputCls = `${inputCls} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`;
  const helperCls = "mt-1 text-xs text-slate-500";
  const errorCls = "mt-1 text-xs font-medium text-red-600";

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
              {ITEM_FORM_TEXT.header.subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={ITEM_FORM_TEXT.actions.close}
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
              <h3 className="text-sm font-semibold text-slate-900">
                {ITEM_FORM_TEXT.photos.title}
              </h3>
              <p className="text-xs text-slate-500">
                {ITEM_FORM_TEXT.photos.helper}
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="cursor-pointer rounded-lg px-2 py-1 text-xs font-semibold text-brand-600 transition hover:bg-brand-50">
                      {ITEM_FORM_TEXT.photos.change}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                        className="hidden"
                        disabled={image.uploading}
                        onChange={(e) => {
                          const file = e.currentTarget.files?.[0];
                          e.currentTarget.value = "";
                          handleImageFile(file, image.id);
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeImage(image.id)}
                      disabled={image.uploading}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                    >
                      {ITEM_FORM_TEXT.photos.remove}
                    </button>
                  </div>
                  {images.length > 1 && (
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <input
                        type="radio"
                        name="product-cover-image"
                        checked={image.isPrimary}
                        disabled={image.uploading || !image.url}
                        onChange={() => selectCoverImage(image.id)}
                        className="h-4 w-4 border-slate-300"
                      />
                      {ITEM_FORM_TEXT.photos.main}
                    </label>
                  )}
                  {image.uploading && (
                    <p className="text-xs font-medium text-slate-500">
                      {ITEM_FORM_TEXT.photos.uploading}
                    </p>
                  )}
                  {image.error && <p className="text-xs text-red-600">{image.error}</p>}
                </div>
              ))}
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">
                <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {ITEM_FORM_TEXT.photos.upload}
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

          {/* ── Basic details ───────────────────────────────────────── */}
          <section className="space-y-4 rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">
              {ITEM_FORM_TEXT.basic.title}
            </h3>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">
                {ITEM_FORM_TEXT.basic.nameLabel}
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={160}
                placeholder={ITEM_FORM_TEXT.basic.namePlaceholder}
                className={inputCls}
              />
              <p className={helperCls}>{ITEM_FORM_TEXT.basic.nameHelper}</p>
              {nameError && <p className={errorCls}>{nameError}</p>}
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">
                {ITEM_FORM_TEXT.basic.descriptionLabel}
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={3000}
                placeholder={ITEM_FORM_TEXT.basic.descriptionPlaceholder}
                className={`${inputCls} resize-none`}
              />
              <p className={helperCls}>{ITEM_FORM_TEXT.basic.descriptionHelper}</p>
            </label>
          </section>

          {/* ── Type and category ───────────────────────────────────── */}
          <section className="space-y-4 rounded-xl border border-slate-200 p-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {ITEM_FORM_TEXT.type.title}
              </h3>
              <p className="text-xs text-slate-500">{ITEM_FORM_TEXT.type.helper}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {itemTypeOptions.map((choice) => {
                const disabled = !choice.root || !choice.root.isActive;
                return (
                  <button
                    key={choice.key}
                    type="button"
                    onClick={() => {
                      if (choice.root) setVerticalId(choice.root.id);
                    }}
                    disabled={disabled}
                    className={`rounded-full px-5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      verticalId === choice.root?.id
                        ? "bg-brand-600 text-white"
                        : "border border-slate-200 text-slate-600 hover:border-brand-500 hover:text-brand-600"
                    }`}
                  >
                    {choice.label}
                  </button>
                );
              })}
            </div>

            {hasCategories ? (
              <label className="block max-w-sm">
                <span className="mb-1 block text-xs font-medium text-slate-500">
                  {ITEM_FORM_TEXT.type.categoryLabel}
                </span>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={inputCls}
                >
                  <option value="" disabled>
                    {ITEM_FORM_TEXT.type.categoryPlaceholder}
                  </option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {categoryError && <p className={errorCls}>{categoryError}</p>}
              </label>
            ) : (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
                {ITEM_FORM_TEXT.type.noCategory}
              </p>
            )}
          </section>

          {/* ── Price and stock ─────────────────────────────────────── */}
          <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <h3 className="text-sm font-semibold text-slate-900">
              {ITEM_FORM_TEXT.price.title}
            </h3>

            {hasOptions ? (
              <p className="text-sm text-slate-500">
                {ITEM_FORM_TEXT.price.optionsHelper}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    {ITEM_FORM_TEXT.price.regularLabel}
                  </span>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                      Rs.
                    </span>
                    <input
                      value={simplePrice}
                      onChange={(e) => setSimplePrice(e.target.value)}
                      type="number"
                      min="0"
                      placeholder={ITEM_FORM_TEXT.price.regularPlaceholder}
                      className={`${numberInputCls} pl-11`}
                    />
                  </div>
                  <p className={helperCls}>{ITEM_FORM_TEXT.price.regularHelper}</p>
                  {simplePriceError && <p className={errorCls}>{simplePriceError}</p>}
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    {ITEM_FORM_TEXT.price.discountLabel}
                  </span>
                  <input
                    value={simpleSalePrice}
                    onChange={(e) => setSimpleSalePrice(e.target.value)}
                    type="number"
                    min="0"
                    placeholder={ITEM_FORM_TEXT.price.discountPlaceholder}
                    className={numberInputCls}
                  />
                  <p className={helperCls}>{ITEM_FORM_TEXT.price.discountHelper}</p>
                  {simpleDiscountError && (
                    <p className={errorCls}>{simpleDiscountError}</p>
                  )}
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    {ITEM_FORM_TEXT.price.stockLabel}
                  </span>
                  <input
                    value={simpleStock}
                    onChange={(e) => setSimpleStock(e.target.value)}
                    type="number"
                    min="0"
                    placeholder={ITEM_FORM_TEXT.price.stockPlaceholder}
                    className={numberInputCls}
                  />
                  <p className={helperCls}>{ITEM_FORM_TEXT.price.stockHelper}</p>
                  {simpleStockError && <p className={errorCls}>{simpleStockError}</p>}
                </label>
              </div>
            )}

          </section>

          {/* ── Options ────────────────────────────────────────────── */}
          <section className="space-y-4 rounded-xl border border-slate-200 p-4">
            <label className="flex items-start gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={hasOptions}
                onChange={(e) => setHasOptions(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <span>
                <span className="block">{ITEM_FORM_TEXT.options.checkbox}</span>
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  {ITEM_FORM_TEXT.options.helper}
                </span>
                <span className="mt-1 block text-xs font-normal text-slate-400">
                  {ITEM_FORM_TEXT.options.example}
                </span>
              </span>
            </label>

            {hasOptions && (
              <div className="space-y-3">
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-slate-500">
                    {ITEM_FORM_TEXT.options.kindLabel}
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
                      className="grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(110px,0.7fr)_minmax(120px,0.7fr)_minmax(90px,0.6fr)_auto_auto]"
                    >
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-slate-500">
                          {ITEM_FORM_TEXT.options.optionName}
                        </span>
                        <input
                          value={option.name}
                          onChange={(e) => updateOption(index, { name: e.target.value })}
                          placeholder={OPTION_KIND_HINTS[optionKind]}
                          className={inputCls}
                        />
                        {optionErrors[index]?.name && (
                          <p className={errorCls}>{optionErrors[index].name}</p>
                        )}
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-slate-500">
                          {ITEM_FORM_TEXT.options.regularPrice}
                        </span>
                        <input
                          value={option.price}
                          onChange={(e) => updateOption(index, { price: e.target.value })}
                          type="number"
                          min="0"
                          placeholder={ITEM_FORM_TEXT.price.regularPlaceholder}
                          className={numberInputCls}
                        />
                        {optionErrors[index]?.price && (
                          <p className={errorCls}>{optionErrors[index].price}</p>
                        )}
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-slate-500">
                          {ITEM_FORM_TEXT.options.discountPrice}
                        </span>
                        <input
                          value={option.salePrice}
                          onChange={(e) => updateOption(index, { salePrice: e.target.value })}
                          type="number"
                          min="0"
                          placeholder={ITEM_FORM_TEXT.price.discountPlaceholder}
                          className={numberInputCls}
                        />
                        {optionErrors[index]?.discount && (
                          <p className={errorCls}>{optionErrors[index].discount}</p>
                        )}
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-slate-500">
                          {ITEM_FORM_TEXT.options.stock}
                        </span>
                        <input
                          value={option.stockQuantity}
                          onChange={(e) =>
                            updateOption(index, { stockQuantity: e.target.value })
                          }
                          type="number"
                          min="0"
                          placeholder={ITEM_FORM_TEXT.price.stockPlaceholder}
                          className={numberInputCls}
                        />
                        {optionErrors[index]?.stock && (
                          <p className={errorCls}>{optionErrors[index].stock}</p>
                        )}
                      </label>
                      <label
                        className="flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-slate-600 lg:pt-7"
                        title="Customers see this option first"
                      >
                        <input
                          type="radio"
                          name="default-option"
                          checked={defaultIndex === index}
                          onChange={() => setDefaultIndex(index)}
                          className="h-4 w-4 border-slate-300"
                        />
                        {ITEM_FORM_TEXT.options.first}
                      </label>
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        disabled={options.length <= 1}
                        className="rounded-lg px-2.5 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50 disabled:opacity-40 lg:mt-6"
                      >
                        {ITEM_FORM_TEXT.photos.remove}
                      </button>
                    </div>
                  ))}
                </div>
                {!hasValidOption && (
                  <p className={errorCls}>{ITEM_FORM_TEXT.errors.optionRequired}</p>
                )}
                <button
                  type="button"
                  onClick={() => setOptions((items) => [...items, optionDraft()])}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-500 hover:text-brand-600"
                >
                  + {ITEM_FORM_TEXT.options.add}
                </button>
              </div>
            )}
          </section>

          {/* ── Customer note ───────────────────────────────────────── */}
          <section className="space-y-3 rounded-xl border border-slate-200 p-4">
            <label className="flex items-start gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={allowSpecialInstructions}
                onChange={(e) => setAllowSpecialInstructions(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <span>
                <span className="block">{ITEM_FORM_TEXT.note.checkbox}</span>
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  {ITEM_FORM_TEXT.note.helper}
                </span>
              </span>
            </label>
            {allowSpecialInstructions && (
              <label className="block max-w-md">
                <span className="mb-1 block text-xs font-medium text-slate-500">
                  {ITEM_FORM_TEXT.note.placeholderLabel}
                </span>
                <input
                  value={specialInstructionsPlaceholder}
                  onChange={(e) => setSpecialInstructionsPlaceholder(e.target.value)}
                  className={inputCls}
                />
              </label>
            )}
          </section>

          {/* ── Availability ───────────────────────────────────────── */}
          <section className="space-y-3 rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">
              {ITEM_FORM_TEXT.availability.title}
            </h3>
            <label className="flex items-start gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <span>
                <span className="block">{ITEM_FORM_TEXT.availability.active}</span>
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  {ITEM_FORM_TEXT.availability.activeHelper}
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <span>
                <span className="block">{ITEM_FORM_TEXT.availability.available}</span>
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  {ITEM_FORM_TEXT.availability.availableHelper}
                </span>
              </span>
            </label>
          </section>

          <div className="sticky bottom-0 z-10 -mx-4 flex justify-end gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:-mx-6 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {ITEM_FORM_TEXT.actions.cancel}
            </button>
            <button
              type="submit"
              disabled={busy || !formIsValid}
              className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? ITEM_FORM_TEXT.actions.saving : saveButtonLabel}
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
  const [successMessage, setSuccessMessage] = useState("");
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
      setFormError(ITEM_FORM_TEXT.errors.nameRequired);
      return;
    }
    if (!input.categoryId) {
      setFormError(ITEM_FORM_TEXT.errors.categoryRequired);
      return;
    }
    const activeOptions = input.variationOptions?.filter((option) => option.isActive) ?? [];
    if (activeOptions.length === 0) {
      setFormError(ITEM_FORM_TEXT.errors.priceRequired);
      return;
    }
    if (activeOptions.some((option) => !option.name || !Number.isFinite(option.price))) {
      setFormError(ITEM_FORM_TEXT.errors.priceRequired);
      return;
    }

    setFormBusy(true);
    setFormError("");
    setSuccessMessage("");
    try {
      const wasCreating = editing.mode === "create";
      if (editing.mode === "create") {
        await createProduct(input);
      } else if (editing.product.id) {
        await updateProduct(editing.product.id, input);
      }
      setEditing(null);
      setSuccessMessage(
        wasCreating ? ITEM_FORM_TEXT.messages.added : ITEM_FORM_TEXT.messages.updated,
      );
      await load();
    } catch (err) {
      void err;
      setFormError(ITEM_FORM_TEXT.errors.saveFailed);
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
        {successMessage && (
          <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {successMessage}
          </p>
        )}
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
                  setSuccessMessage("");
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
                              setSuccessMessage("");
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
