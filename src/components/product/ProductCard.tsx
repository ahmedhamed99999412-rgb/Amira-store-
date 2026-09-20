'use client';

import Image from 'next/image';
import { formatCurrency } from '@/lib/currency';
import { resolveDisplayComparePrice } from '@/lib/product-variants';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { Heart, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { useWishlistStore } from '@/store/wishlist-store';
import { useCartStore } from '@/store/cart-store';

export type ProductCardData = {
  id: string;
  slug: string;
  sku: string;
  price: number;
  comparePrice: number | null;
  displayPrice?: number;
  displayComparePrice?: number | null;
  minVariantRegularPrice?: number | null;
  minVariantSalePrice?: number | null;
  name: string;
  shortDescription: string;
  category: string;
  image: string | null;
  totalStock?: number;
  hasVariants?: boolean;
  hasSizeVariants?: boolean;
  hasColorVariants?: boolean;
  reviewCount: number;
  avgRating: number;
};

export function ProductCard({ product, locale }: { product: ProductCardData; locale: string }) {
  const t = useTranslations('product');
  const tCommon = useTranslations('common');
  const toggleWishlistStore = useWishlistStore((s) => s.toggleItem);
  const wished = useWishlistStore((s) => s.items.some((item) => item.productId === product.id));
  const addItemToCart = useCartStore((s) => s.addItem);
  const router = useRouter();

  // `product.hasVariants` is a denormalized column that can drift out of
  // sync with the product's actual variant rows (e.g. an admin adds sizes
  // to an existing product without re-saving the top-level flag). Every
  // real product also carries one placeholder variant row for stock
  // tracking even when it has no selectable options, so a bare variant
  // count isn't reliable either. Whether a size/color was actually set on
  // at least one variant is the only signal that can't drift — it's
  // recomputed live everywhere the data comes from, so this is the one
  // source of truth for "does this product need a variant picker".
  const needsVariantSelection = Boolean(product.hasSizeVariants || product.hasColorVariants);

  const displayPrice = product.displayPrice !== null && product.displayPrice !== undefined ? product.displayPrice : product.minVariantSalePrice ?? product.minVariantRegularPrice ?? product.price;
  const displayComparePrice = product.displayComparePrice !== undefined
    ? product.displayComparePrice
    : resolveDisplayComparePrice(
        displayPrice,
        product.comparePrice,
        product.minVariantSalePrice,
        product.minVariantRegularPrice
      );

  const discount =
    displayComparePrice !== null && displayComparePrice > displayPrice
      ? Math.round(((displayComparePrice - displayPrice) / displayComparePrice) * 100)
      : 0;

  const stockKnown = typeof product.totalStock === 'number';
  const inStock = !stockKnown || product.totalStock! > 0;
  const lowStock = stockKnown && product.totalStock! > 0 && product.totalStock! < 10;

  async function toggleWishlistHandler(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const added = await toggleWishlistStore({
        productId: product.id,
        slug: product.slug,
        sku: product.sku,
        name: product.name,
        shortDescription: product.shortDescription,
        category: product.category,
        image: product.image,
        price: product.price,
        comparePrice: product.comparePrice,
        displayPrice,
        displayComparePrice,
        totalStock: product.totalStock,
        hasVariants: needsVariantSelection,
        hasSizeVariants: product.hasSizeVariants,
        hasColorVariants: product.hasColorVariants,
        minVariantRegularPrice: product.minVariantRegularPrice,
        minVariantSalePrice: product.minVariantSalePrice,
        reviewCount: product.reviewCount,
        avgRating: product.avgRating,
      });
      toast.success(added ? t('addToWishlist') : t('removedFromWishlist'));
    } catch {
      toast.error(tCommon('error'));
    }
  }

  function addToCartHandler(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock) return;

    if (needsVariantSelection) {
      router.push(`/product/${product.slug}`);
      return;
    }
    addItemToCart({
      productId: product.id,
      variantId: null,
      slug: product.slug,
      name: product.name,
      image: product.image,
      price: displayPrice,
      quantity: 1,
    });
    toast.success(t('addToCart'));
  }

  return (
    <div className="group flex h-full min-w-0 flex-col">
      <div className="relative overflow-hidden bg-muted aspect-[4/5] w-full mb-2 rounded-md shadow-sm hover:shadow-md transition-shadow">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 639px) 50vw, (max-width: 1279px) 25vw, 20vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <span className="text-xs">{product.name.charAt(0)}</span>
            </div>
          )}

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

      <Link href={`/product/${product.slug}`} className="block min-w-0 flex-1">
        <div className="flex h-full flex-col min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate min-h-[14px]">
            {product.category || '\u00A0'}
          </p>
          <h3 className="text-sm font-medium text-brand-charcoal line-clamp-2 min-h-[2.5rem] mt-0.5 group-hover:text-brand-mauve transition-colors">
            {product.name}
          </h3>

          <div className="flex items-center gap-1 min-w-0 mt-1">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`h-3 w-3 ${
                    star <= Math.round(product.avgRating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground/30'
                  }`}
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground">({product.reviewCount})</span>
          </div>

          <div className="flex items-center gap-2 pt-1 flex-wrap min-w-0 mt-auto">
            {product.hasVariants && product.price === 0 ? (
              <span className="text-sm font-medium text-muted-foreground italic truncate">
                {locale === 'ar' ? 'السعر حسب المتغيار' : 'Price on variants'}
              </span>
            ) : (
              <>
                <span className="text-sm font-bold text-brand-charcoal truncate">
                  {formatCurrency(displayPrice, locale)}
                </span>
                {displayComparePrice !== null && displayComparePrice > displayPrice && (
                  <span className="text-xs text-muted-foreground line-through truncate">
                    {formatCurrency(displayComparePrice, locale)}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </Link>

      {inStock ? (
        <button
          onClick={addToCartHandler}
          className="w-full h-10 sm:h-11 mt-2 px-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 rounded-md transition-opacity hover:opacity-90 shrink-0"
          style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}
        >
          <ShoppingBag className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {needsVariantSelection
              ? product.hasSizeVariants && product.hasColorVariants
                ? t('chooseSizeAndColor')
                : product.hasSizeVariants
                ? t('chooseSize')
                : t('chooseColor')
              : t('addToCart')}
          </span>
        </button>
      ) : (
        <div className="w-full h-10 sm:h-11 mt-2 px-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center rounded-md bg-muted text-muted-foreground shrink-0">
          <span className="truncate">{t('outOfStock')}</span>
        </div>
      )}
    </div>
  );
}
