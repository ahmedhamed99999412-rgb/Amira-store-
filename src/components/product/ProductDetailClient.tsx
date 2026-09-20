'use client';

import { formatCurrency } from '@/lib/currency';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Minus, Plus, ShoppingCart, Heart, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';
import { getLowestVariantCardPricing, normalizeVariantPricing, pickDefaultVariantId } from '@/lib/product-variants';

export type ProductDetail = {
  id: string;
  slug: string;
  sku: string;
  price: number;
  comparePrice: number | null;
  displayPrice: number;
  displayComparePrice: number | null;
  differentPriceBySize: boolean;
  hasVariants: boolean;
  name: string;
  shortDescription: string | null;
  description: string | null;
  images: { id: string; url: string; alt: string; isPrimary: boolean; order: number }[];
  variants: {
    id: string;
    size: string | null;
    color: string | null;
    colorHex: string | null;
    stock: number;
    sku: string | null;
    regularPrice: number | null;
    salePrice: number | null;
    priceAdjustment: number;
    imageUrl?: string | null;
  }[];
  totalStock: number;
  reviewCount: number;
  avgRating: number;
  tags: string[];
};

export function ProductDetailClient({
  product,
  locale,
}: {
  product: ProductDetail;
  locale: string;
}) {
  const t = useTranslations('product');
  const tCommon = useTranslations('common');
  const addItemToCart = useCartStore((s) => s.addItem);
  const toggleWishlist = useWishlistStore((s) => s.toggleItem);
  const isInWishlist = useWishlistStore((s) => s.hasItem);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    // Default to the same variant that determines the "starting at" price
    // already shown on the product card — never a random/first-in-array
    // pick — so the price never changes just from opening the page.
    () => pickDefaultVariantId(product.variants) ?? product.variants[0]?.id ?? null
  );
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [isWishlistPending, setIsWishlistPending] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [thumbErrors, setThumbErrors] = useState<Set<string>>(new Set());
  const [oosMessage, setOosMessage] = useState<string | null>(null);
  const wished = isInWishlist(product.id);

  // Determine available sizes and colors
  const sizes = Array.from(new Set(product.variants.filter((v) => v.size).map((v) => v.size!)));
  const colors = Array.from(new Set(product.variants.filter((v) => v.color).map((v) => v.color!)));

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId);
  const sizePriceVariant = product.differentPriceBySize && selectedVariant?.size
    ? product.variants.find((variant) => variant.size === selectedVariant.size && (variant.regularPrice !== null || variant.salePrice !== null))
    : selectedVariant;
  const regularBasePrice = product.differentPriceBySize && sizePriceVariant?.regularPrice !== null && sizePriceVariant?.regularPrice !== undefined
    ? sizePriceVariant.regularPrice
    : product.comparePrice ?? product.price;
  const priceAdjustment = sizePriceVariant?.priceAdjustment ?? 0;
  const regularPrice = regularBasePrice + priceAdjustment;
  const saleBasePrice = product.differentPriceBySize && sizePriceVariant?.salePrice !== null && sizePriceVariant?.salePrice !== undefined
    ? sizePriceVariant.salePrice
    : product.comparePrice !== null
    ? product.price
    : null;
  const salePrice = saleBasePrice !== null ? saleBasePrice + priceAdjustment : null;
  const finalPrice = salePrice ?? regularPrice;
  const availableStock = selectedVariant?.stock ?? product.totalStock;
  const inStock = availableStock > 0;

  function isOptionAvailable(option: string, type: 'size' | 'color'): boolean {
    return product.variants.some((v) => (type === 'size' ? v.size : v.color) === option && v.stock > 0);
  }

  function getSelectedVariantForOption(option: string, type: 'size' | 'color') {
    const variant = product.variants.find((v) => (type === 'size' ? v.size : v.color) === option && v.stock > 0);
    return variant ?? product.variants.find((v) => (type === 'size' ? v.size : v.color) === option) ?? null;
  }

  // Auto-switch image if selected variant has a mapped image
  const variantImageId = selectedVariant?.imageUrl;
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (variantImageId) {
        const imgIdx = product.images.findIndex((img) => img.url === variantImageId || img.id === variantImageId);
        if (imgIdx >= 0 && imgIdx !== selectedImage) {
          setSelectedImage(imgIdx);
          setImageError(false);
        }
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [selectedVariantId, product.images, variantImageId, selectedImage]);

  // Show OOS combination message when selected variant is out of stock
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (selectedVariant && selectedVariant.stock === 0) {
        const parts: string[] = [];
        if (selectedVariant.size) parts.push(`Size ${selectedVariant.size}`);
        if (selectedVariant.color) parts.push(`Color ${selectedVariant.color}`);
        setOosMessage(parts.length > 0 ? `${parts.join(' / ')} combination is out of stock` : 'This variant is out of stock');
      } else {
        setOosMessage(null);
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [selectedVariantId, selectedVariant]);

  const variantPricing = product.displayPrice !== undefined
    ? { displayPrice: product.displayPrice, displayComparePrice: product.displayComparePrice }
    : getLowestVariantCardPricing(
        typeof product.price === 'number' ? product.price : Number(product.price),
        product.comparePrice != null ? (typeof product.comparePrice === 'number' ? product.comparePrice : Number(product.comparePrice)) : null,
        normalizeVariantPricing(product.variants)
      );

  const discount =
    salePrice !== null && regularPrice > salePrice
      ? Math.round(((regularPrice - salePrice) / regularPrice) * 100)
      : 0;


  function addToCart() {
    if (!inStock) return;
    setAdding(true);
    try {
      addItemToCart({
        productId: product.id,
        variantId: selectedVariantId,
        slug: product.slug,
        name: product.name,
        image: product.images[0]?.url || null,
        price: finalPrice,
        quantity,
        size: selectedVariant?.size || null,
        color: selectedVariant?.color || null,
      });
      const variantLabel = selectedVariant ? [selectedVariant.size, selectedVariant.color].filter(Boolean).join(' / ') : '';
      toast.success(`${variantLabel ? product.name + ' (' + variantLabel + ') — ' : ''}${t('addToCart')}`);
      window.dispatchEvent(new CustomEvent('cart-updated'));
    } catch {
      toast.error(tCommon('error'));
    } finally {
      setAdding(false);
    }
  }

  async function toggleWishlistHandler() {
    if (isWishlistPending) return;
    setIsWishlistPending(true);
    try {
      const added = await toggleWishlist({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: product.images[0]?.url || null,
        price: finalPrice,
        displayPrice: variantPricing.displayPrice,
        displayComparePrice: variantPricing.displayComparePrice,
        variantId: selectedVariantId,
        size: selectedVariant?.size || null,
        color: selectedVariant?.color || null,
      });
      toast.success(added ? t('addToWishlist') : t('removedFromWishlist'));
    } catch {
      toast.error(tCommon('error'));
    } finally {
      setIsWishlistPending(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
      {/* Image gallery - first on mobile, left on desktop */}
      <div className="space-y-4 order-1 lg:order-1">
        <div className="aspect-[4/3] sm:aspect-[4/5] lg:aspect-square max-h-[350px] sm:max-h-[450px] lg:max-h-[500px] bg-muted rounded-lg overflow-hidden">
          {product.images[selectedImage] && !imageError ? (
            <img
              src={product.images[selectedImage].url}
              alt={product.images[selectedImage].alt}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              {product.name.charAt(0)}
            </div>
          )}
        </div>
        {product.images.length > 1 && (
          <div
            className="md:hidden flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory"
            onTouchStart={(e) => {
              const touch = e.touches[0];
              const el = e.currentTarget;
              const handleTouchEnd = (ev: TouchEvent) => {
                const diff = touch.clientX - ev.changedTouches[0].clientX;
                if (Math.abs(diff) > 40) {
                  if (diff > 0 && selectedImage < product.images.length - 1) {
                    setSelectedImage(selectedImage + 1);
                    setImageError(false);
                  } else if (diff < 0 && selectedImage > 0) {
                    setSelectedImage(selectedImage - 1);
                    setImageError(false);
                  }
                }
                el.removeEventListener('touchend', handleTouchEnd);
              };
              el.addEventListener('touchend', handleTouchEnd);
            }}
          >
            {product.images.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setSelectedImage(idx)}
                className={`aspect-square rounded-md overflow-hidden border-2 transition-colors shrink-0 snap-start ${
                  idx === selectedImage ? 'border-brand-charcoal' : 'border-transparent hover:border-border'
                }`}
              >
                <img
                  src={img.url}
                  alt={img.alt}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={() => setThumbErrors((prev) => new Set(prev).add(img.id))}
                />
                {thumbErrors.has(img.id) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted text-xs text-muted-foreground">IMG</div>
                )}
              </button>
            ))}
          </div>
        )}
        {product.images.length > 1 && (
          <div className="hidden md:grid grid-cols-5 gap-2">
            {product.images.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setSelectedImage(idx)}
                className={`aspect-square rounded-md overflow-hidden border-2 transition-colors ${
                  idx === selectedImage ? 'border-brand-charcoal' : 'border-transparent hover:border-border'
                }`}
              >
                <img
                  src={img.url}
                  alt={img.alt}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={() => setThumbErrors((prev) => new Set(prev).add(img.id))}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product info - second on mobile, right on desktop */}
      <div className="space-y-3 order-2 lg:order-2">
        {/* Name + Price (compact) */}
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-brand-charcoal break-words flex-1">
            {product.name}
          </h1>
        </div>

        {/* Rating + Price in one row */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Always rendered, even with zero reviews, so the row never collapses
              to price-only and empty stars accurately reflect no ratings yet. */}
          <div className="flex items-center gap-2">
            <div className="flex items-center" role="img" aria-label={`${product.reviewCount > 0 ? product.avgRating.toFixed(1) : 'No rating'} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map((star) => (
                <svg key={star} className={`h-4 w-4 ${star <= Math.round(product.avgRating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {product.reviewCount > 0
                ? `${product.avgRating.toFixed(1)} · ${product.reviewCount} ${t('reviewsCount')}`
                : `0 ${t('reviewsCount')}`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-brand-charcoal">
              {formatCurrency(finalPrice, locale)}
            </span>
            {salePrice !== null && regularPrice > salePrice && (
              <span className="text-base text-muted-foreground line-through">
                {formatCurrency(regularPrice, locale)}
              </span>
            )}
            {discount > 0 && (
              <span className="bg-brand-mauve text-white text-xs font-bold px-2 py-1 rounded">
                -{discount}%
              </span>
            )}
          </div>
        </div>

        {/* Stock status */}
        <div className="flex items-center gap-2">
          {inStock ? (
            <>
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600 font-medium">
                {availableStock < 10 ? t('lowStock') : t('inStock')}
              </span>
            </>
          ) : (
            <>
              <span className="text-sm text-red-600 font-medium">{t('outOfStock')}</span>
              {oosMessage && (
                <span className="text-xs text-red-500/80 ml-1">({oosMessage})</span>
              )}
            </>
          )}
        </div>

        {/* Variants: Size */}
        {sizes.length > 0 && (
          <div>
            <label className="text-sm font-medium text-brand-charcoal mb-2 block">
              {t('size')}
            </label>
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => {
                const variant = getSelectedVariantForOption(size, 'size');
                const isSelected = selectedVariant?.size === size;
                const isAvailable = isOptionAvailable(size, 'size');
                return (
                  <button
                    key={size}
                    onClick={() => variant && setSelectedVariantId(variant.id)}
                    disabled={!isAvailable}
                    className={`min-w-[48px] h-10 px-3 border rounded text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-brand-charcoal text-white border-brand-charcoal'
                        : isAvailable
                        ? 'border-border hover:border-brand-charcoal'
                        : 'border-border opacity-40 cursor-not-allowed line-through'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Variants: Color */}
        {colors.length > 0 && (
          <div>
            <label className="text-sm font-medium text-brand-charcoal mb-2 block">
              {t('color')}
              {selectedVariant?.color && (
                <span className="text-muted-foreground ms-2">: {selectedVariant.color}</span>
              )}
            </label>
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => {
                const variant = getSelectedVariantForOption(color, 'color');
                const isSelected = selectedVariant?.color === color;
                const isAvailable = isOptionAvailable(color, 'color');
                return (
                  <button
                    key={color}
                    onClick={() => variant && setSelectedVariantId(variant.id)}
                    disabled={!isAvailable}
                    title={color}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      isSelected ? 'border-brand-charcoal ring-2 ring-brand-charcoal/20' : 'border-border'
                    } ${!isAvailable ? 'opacity-40 cursor-not-allowed' : 'hover:border-brand-charcoal'}`}
                    style={variant?.colorHex ? { backgroundColor: variant.colorHex } : {}}
                    aria-label={color}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Quantity + Add to cart */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4">
          {/* Quantity selector */}
          <div className="flex items-center border border-border rounded h-10 shrink-0">
            <button
              onClick={() => setQuantity(Math.max(0, quantity - 1))}
              className="px-3 h-full hover:bg-muted transition-colors"
              disabled={quantity <= 1 || !inStock}
              aria-label={t('decreaseQuantity')}
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              min={0}
              max={Math.min(availableStock, 99)}
              value={quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (Number.isNaN(val)) {
                  setQuantity(0);
                } else {
                  setQuantity(Math.max(0, Math.min(Math.min(availableStock, 99), val)));
                }
              }}
              className="w-12 text-center text-sm font-medium outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              aria-label={t('quantity')}
              disabled={!inStock}
            />
            <button
              onClick={() => setQuantity(Math.min(Math.min(availableStock, 99), quantity + 1))}
              className="px-3 h-full hover:bg-muted transition-colors"
              disabled={quantity >= Math.min(availableStock, 99) || !inStock}
              aria-label={t('increaseQuantity')}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Add to cart - consistent height with quantity selector */}
          <button
            onClick={addToCart}
            disabled={!inStock || adding}
            className="flex-1 h-10 rounded-md text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}
          >
            {adding ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <ShoppingCart className="h-5 w-5" />
                {t('addToCart')}
              </>
            )}
          </button>

          {/* Wishlist */}
          <button
            onClick={toggleWishlistHandler}
            disabled={!inStock || isWishlistPending}
            className="h-10 w-10 rounded-md border-2 flex items-center justify-center transition-colors hover:bg-muted shrink-0"
            style={{ borderColor: '#1A1A1A' }}
            aria-label={t('addToWishlist')}
            aria-busy={isWishlistPending}
          >
            {isWishlistPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Heart className={`h-4 w-4 ${wished ? 'fill-brand-mauve text-brand-mauve' : 'text-brand-charcoal'}`} />
            )}
          </button>
        </div>

        {/* SKU */}
        <div className="pt-4 border-t border-border text-xs text-muted-foreground">
          <span>{t('sku')}: </span>
          <span dir="ltr">{selectedVariant?.sku || product.sku}</span>
        </div>
      </div>
    </div>
  );
}
