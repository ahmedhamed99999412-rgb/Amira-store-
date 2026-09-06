'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Heart, Star, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { useWishlistStore } from '@/store/wishlist-store';
import { useCartStore } from '@/store/cart-store';

export type ProductCardData = {
  id: string;
  slug: string;
  sku: string;
  price: number;
  comparePrice: number | null;
  name: string;
  shortDescription: string;
  category: string;
  image: string | null;
  totalStock: number;
  reviewCount: number;
  avgRating: number;
};

export function ProductCard({ product, locale }: { product: ProductCardData; locale: string }) {
  const t = useTranslations('product');
  const toggleWishlistStore = useWishlistStore((s) => s.toggleItem);
  const wished = useWishlistStore((s) => s.hasItem(product.id));
  const addItemToCart = useCartStore((s) => s.addItem);

  const discount =
    product.comparePrice && product.comparePrice > product.price
      ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
      : 0;

  const inStock = product.totalStock > 0;
  const lowStock = inStock && product.totalStock < 10;

  function toggleWishlistHandler(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const added = toggleWishlistStore({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      price: product.price,
    });
    toast.success(added ? t('addToWishlist') : t('removedFromWishlist'));
  }

  function addToCartHandler(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock) return;
    addItemToCart({
      productId: product.id,
      variantId: null,
      slug: product.slug,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity: 1,
    });
    toast.success(t('addToCart'));
  }

  function formatPrice(amount: number) {
    const formatted = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
    return locale === 'ar' ? `${formatted} ج.م` : `EGP ${formatted}`;
  }

  return (
    <div className="group block">
      {/* Image area */}
      <Link href={`/product/${product.slug}`}>
        <div className="relative overflow-hidden bg-muted h-56 sm:h-auto sm:aspect-[4/5] mb-2 rounded-md shadow-sm hover:shadow-md transition-shadow">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <span className="text-xs">{product.name.charAt(0)}</span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 start-2 flex flex-col gap-1 z-10">
            {discount > 0 && (
              <span className="bg-brand-mauve text-white text-[10px] font-bold px-2 py-1 rounded">
                -{discount}%
              </span>
            )}
            {lowStock && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded">
                {t('lowStock')}
              </span>
            )}
            {!inStock && (
              <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded">
                {t('outOfStock')}
              </span>
            )}
          </div>

          {/* Wishlist button */}
          <button
            onClick={toggleWishlistHandler}
            className="absolute top-2 end-2 p-2 rounded-full bg-white/80 hover:bg-white transition-colors z-10"
            aria-label={t('addToWishlist')}
          >
            <Heart
              className={`h-4 w-4 ${wished ? 'fill-brand-mauve text-brand-mauve' : 'text-brand-charcoal'}`}
            />
          </button>
        </div>
      </Link>

      {/* Add to cart button - ALWAYS visible, consistent sizing */}
      {inStock ? (
        <button
          onClick={addToCartHandler}
          className="w-full h-12 mb-2 px-3 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 rounded-md transition-opacity hover:opacity-90 shrink-0"
          style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}
        >
          <ShoppingBag className="h-4 w-4 shrink-0" />
          <span className="truncate">{t('addToCart')}</span>
        </button>
      ) : (
        <div className="w-full h-12 mb-2 px-3 text-sm font-bold uppercase tracking-wider flex items-center justify-center rounded-md bg-muted text-muted-foreground shrink-0">
          <span className="truncate">{t('outOfStock')}</span>
        </div>
      )}

      {/* Info */}
      <Link href={`/product/${product.slug}`}>
        <div className="space-y-1">
          {product.category && (
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {product.category}
            </p>
          )}
          <h3 className="text-sm font-medium text-brand-charcoal line-clamp-1 group-hover:text-brand-mauve transition-colors">
            {product.name}
          </h3>

          {/* Rating */}
          {product.reviewCount > 0 && (
            <div className="flex items-center gap-1">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-3 w-3 ${
                      star <= Math.round(product.avgRating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground">
                ({product.reviewCount})
              </span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-sm font-bold text-brand-charcoal">
              {formatPrice(product.price)}
            </span>
            {product.comparePrice && product.comparePrice > product.price && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.comparePrice)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
