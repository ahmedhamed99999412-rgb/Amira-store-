'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Minus, Plus, ShoppingCart, Heart, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useCartStore } from '@/store/cart-store';
import { useWishlistStore } from '@/store/wishlist-store';

export type ProductDetail = {
  id: string;
  slug: string;
  sku: string;
  price: number;
  comparePrice: number | null;
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
    priceAdjustment: number;
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
  const addItemToCart = useCartStore((s) => s.addItem);
  const toggleWishlist = useWishlistStore((s) => s.toggleItem);
  const isInWishlist = useWishlistStore((s) => s.hasItem);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    product.variants[0]?.id || null
  );
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const wished = isInWishlist(product.id);

  // Determine available sizes and colors
  const sizes = Array.from(new Set(product.variants.filter((v) => v.size).map((v) => v.size!)));
  const colors = Array.from(new Set(product.variants.filter((v) => v.color).map((v) => v.color!)));

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId);
  const finalPrice = selectedVariant
    ? product.price + selectedVariant.priceAdjustment
    : product.price;
  const availableStock = selectedVariant?.stock ?? product.totalStock;
  const inStock = availableStock > 0;

  const discount =
    product.comparePrice && product.comparePrice > finalPrice
      ? Math.round(((product.comparePrice - finalPrice) / product.comparePrice) * 100)
      : 0;

  function formatPrice(amount: number) {
    const formatted = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
    return locale === 'ar' ? `${formatted} ج.م` : `EGP ${formatted}`;
  }

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
      toast.success(t('addToCart'));
      window.dispatchEvent(new CustomEvent('cart-updated'));
    } catch {
      toast.error('Failed to add to cart');
    } finally {
      setAdding(false);
    }
  }

  function toggleWishlistHandler() {
    const added = toggleWishlist({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0]?.url || null,
      price: finalPrice,
    });
    toast.success(added ? t('addToWishlist') : t('removedFromWishlist'));
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
      {/* Image gallery - first on mobile, left on desktop */}
      <div className="space-y-4 order-1 lg:order-1">
        <div className="aspect-[4/3] sm:aspect-[4/5] lg:aspect-square max-h-[350px] sm:max-h-[450px] lg:max-h-[500px] bg-muted rounded-lg overflow-hidden">
          {product.images[selectedImage] ? (
            <img
              src={product.images[selectedImage].url}
              alt={product.images[selectedImage].alt}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              {product.name.charAt(0)}
            </div>
          )}
        </div>
        {product.images.length > 1 && (
          <div className="grid grid-cols-5 gap-2">
            {product.images.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setSelectedImage(idx)}
                className={`aspect-square rounded-md overflow-hidden border-2 transition-colors ${
                  idx === selectedImage ? 'border-brand-charcoal' : 'border-transparent hover:border-border'
                }`}
              >
                <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
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
          {product.reviewCount > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className={`h-4 w-4 ${star <= Math.round(product.avgRating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {product.avgRating.toFixed(1)} · {product.reviewCount} {t('reviewsCount')}
              </span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-brand-charcoal">
              {formatPrice(finalPrice)}
            </span>
            {product.comparePrice && product.comparePrice > finalPrice && (
              <span className="text-base text-muted-foreground line-through">
                {formatPrice(product.comparePrice)}
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
            <span className="text-sm text-red-600 font-medium">{t('outOfStock')}</span>
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
                const variant = product.variants.find(
                  (v) => v.size === size && (!selectedVariant?.color || v.color === selectedVariant.color)
                );
                const isSelected = selectedVariant?.size === size;
                const isAvailable = variant && variant.stock > 0;
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
                const variant = product.variants.find(
                  (v) => v.color === color && (!selectedVariant?.size || v.size === selectedVariant.size)
                );
                const isSelected = selectedVariant?.color === color;
                const isAvailable = variant && variant.stock > 0;
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
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="px-3 h-full hover:bg-muted transition-colors"
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center text-sm font-medium" dir="ltr">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
              className="px-3 h-full hover:bg-muted transition-colors"
              disabled={quantity >= availableStock}
              aria-label="Increase quantity"
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
              <span className="animate-pulse">...</span>
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
            disabled={!inStock}
            className="h-10 w-10 rounded-md border-2 flex items-center justify-center transition-colors hover:bg-muted shrink-0"
            style={{ borderColor: '#1A1A1A' }}
            aria-label={t('addToWishlist')}
          >
            <Heart className={`h-4 w-4 ${wished ? 'fill-brand-mauve text-brand-mauve' : 'text-brand-charcoal'}`} />
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
