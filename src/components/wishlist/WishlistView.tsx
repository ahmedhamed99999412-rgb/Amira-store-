'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { useWishlistStore } from '@/store/wishlist-store';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { ProductCard, type ProductCardData } from '@/components/product/ProductCard';
import { Heart } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';

function useWishlistPersistHydrated() {
  const [hydrated, setHydrated] = useState(
    () => typeof window !== 'undefined' && useWishlistStore.persist?.hasHydrated() === true
  );

  useEffect(() => {
    const persist = useWishlistStore.persist;
    if (!persist) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHydrated(true);
      return;
    }

    if (persist.hasHydrated()) {
      setHydrated(true);
      return;
    }

    const cleanup = persist.onFinishHydration(() => setHydrated(true));

    // Safety timeout: force hydration after 2s even if persist callback is missed
    const timeout = setTimeout(() => setHydrated(true), 2000);

    return () => {
      cleanup?.();
      clearTimeout(timeout);
    };
  }, []);

  return hydrated;
}

export function WishlistView({ locale }: { locale: string }) {
  const { items } = useWishlistStore();
  const { user } = useAuth();
  const t = useTranslations('wishlist');
  const hydrated = useWishlistPersistHydrated();
  const itemCount = items.length;

  useEffect(() => {
    if (!hydrated) return;
    // Always refresh on the wishlist page so stock, prices, active state, and
    // other product metadata are authoritative after a refresh. The store
    // ignores stale responses that overlap an in-flight local mutation.
    void useWishlistStore.getState().syncFromServer(locale, Boolean(user), true);
  }, [hydrated, locale]);

  if (!hydrated) {
    return (
      <div className="text-center py-20">
        <div className="animate-pulse">
          <Heart className="h-16 w-16 mx-auto text-muted-foreground/30" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <Heart className="h-16 w-16 mx-auto text-muted-foreground/30" />
        <h1 className="font-serif text-2xl font-medium text-brand-charcoal mt-4">{t('empty')}</h1>
        <p className="text-sm text-muted-foreground mt-2">{t('emptyDesc')}</p>
        <Button asChild className="mt-6 bg-brand-charcoal hover:bg-brand-charcoal/90 text-white rounded-none">
          <Link href="/shop">{t('moveToCart')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-3xl font-medium text-brand-charcoal mb-2">{t('title')}</h1>
      <p className="text-sm text-muted-foreground mb-8">
        {itemCount} {locale === 'ar' ? 'منتج' : 'items'}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => {
          const product: ProductCardData = {
            id: item.productId,
            slug: item.slug,
            sku: item.sku || '',
            price: item.price,
            comparePrice: item.comparePrice ?? null,
            displayPrice: item.displayPrice ?? item.price,
            displayComparePrice: item.displayComparePrice,
            minVariantRegularPrice: item.minVariantRegularPrice ?? null,
            minVariantSalePrice: item.minVariantSalePrice ?? null,
            name: item.name,
            shortDescription: item.shortDescription || '',
            category: item.category || '',
            image: item.image,
            totalStock: item.totalStock,
            hasVariants: item.hasVariants,
            hasSizeVariants: item.hasSizeVariants,
            hasColorVariants: item.hasColorVariants,
            reviewCount: item.reviewCount ?? 0,
            avgRating: item.avgRating ?? 0,
          };

          return <ProductCard key={item.productId} product={product} locale={locale} />;
        })}
      </div>
    </div>
  );
}
