/**
 * Every product has at least one `ProductVariant` row purely for stock
 * tracking (Product itself has no `stock` column) — including "simple"
 * products with no selectable options at all. That row has both `size` and
 * `color` set to null.
 *
 * Because of that, a bare variant *count* (`variants.length > 0`) is never a
 * reliable signal for "this product needs the customer to pick something" —
 * it is true for literally every in-stock product. The only reliable signal
 * is whether at least one variant actually carries a real size or color
 * value. This is used consistently everywhere a "does this product need a
 * variant selection" decision is made — product listings, the cart API, and
 * order creation — so the storefront and the backend can never disagree.
 */
export type VariantCardPricing = {
  regularPrice: number | null;
  salePrice: number | null;
  priceAdjustment?: number;
};

export type ProductCardPricing = {
  displayPrice: number;
  displayComparePrice: number | null;
};

export function getLowestVariantCardPricing(
  productPrice: number,
  productComparePrice: number | null,
  variants: ReadonlyArray<VariantCardPricing>
): ProductCardPricing {
  const pricedVariants = variants.filter(
    (variant) => variant.regularPrice !== null && variant.regularPrice !== undefined ||
      variant.salePrice !== null && variant.salePrice !== undefined
  );

  if (pricedVariants.length === 0) {
    return {
      displayPrice: productPrice,
      displayComparePrice: productComparePrice !== null && productComparePrice > productPrice
        ? productComparePrice
        : null,
    };
  }

  const selected = pricedVariants.reduce((lowest, variant) => {
    const candidateBasePrice = variant.salePrice ?? variant.regularPrice;
    const lowestBasePrice = lowest.salePrice ?? lowest.regularPrice;
    if (candidateBasePrice === null || lowestBasePrice === null) return lowest;
    const candidatePrice = candidateBasePrice + (variant.priceAdjustment ?? 0);
    const lowestPrice = lowestBasePrice + (lowest.priceAdjustment ?? 0);
    if (candidatePrice < lowestPrice) return variant;
    if (candidatePrice > lowestPrice) return lowest;

    const candidateRegularBase = variant.regularPrice ?? variant.salePrice;
    const lowestRegularBase = lowest.regularPrice ?? lowest.salePrice;
    if (candidateRegularBase === null || lowestRegularBase === null) return lowest;
    const candidateRegular = candidateRegularBase + (variant.priceAdjustment ?? 0);
    const lowestRegular = lowestRegularBase + (lowest.priceAdjustment ?? 0);
    if (candidateRegular < lowestRegular) {
      return variant;
    }
    return lowest;
  });

  const adjustment = selected.priceAdjustment ?? 0;
  const selectedSalePrice = selected.salePrice ?? null;
  const selectedRegularPrice = selected.regularPrice ?? null;
  const displayPrice = (selectedSalePrice ?? selectedRegularPrice ?? productPrice) + adjustment;
  const variantComparePrice = selectedRegularPrice !== null
    ? selectedRegularPrice + adjustment
    : null;
  const fallbackComparePrice = productComparePrice !== null && productComparePrice > displayPrice
    ? productComparePrice
    : null;

  return {
    displayPrice,
    displayComparePrice: variantComparePrice !== null && variantComparePrice > displayPrice
      ? variantComparePrice
      : fallbackComparePrice,
  };
}

export function productNeedsVariantSelection(
  variants: ReadonlyArray<{ size?: string | null; color?: string | null }>
): boolean {
  return variants.some((v) => v.size != null || v.color != null);
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof (value as { toNumber?: unknown }).toNumber === 'function') {
    return (value as { toNumber: () => number }).toNumber();
  }
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

export function normalizeVariantPricing(
  variants: ReadonlyArray<{ regularPrice?: unknown; salePrice?: unknown; priceAdjustment?: unknown }>
): VariantCardPricing[] {
  return variants.map((v) => ({
    regularPrice: toNumberOrNull(v.regularPrice),
    salePrice: toNumberOrNull(v.salePrice),
    priceAdjustment: toNumberOrNull(v.priceAdjustment) ?? 0,
  }));
}

export function resolveDisplayComparePrice(
  displayPrice: number,
  comparePrice: number | null | undefined,
  minVariantSalePrice: number | null | undefined,
  minVariantRegularPrice: number | null | undefined
): number | null {
  if (minVariantSalePrice !== null && minVariantSalePrice !== undefined) {
    if (
      minVariantRegularPrice !== null &&
      minVariantRegularPrice !== undefined &&
      minVariantRegularPrice > displayPrice
    ) {
      return minVariantRegularPrice;
    }
  }
  if (comparePrice !== null && comparePrice !== undefined && comparePrice > displayPrice) {
    return comparePrice;
  }
  return null;
}
