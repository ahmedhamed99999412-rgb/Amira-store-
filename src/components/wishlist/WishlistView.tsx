'use client';

import { useWishlistStore } from '@/store/wishlist-store';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/product/ProductCard';
import { Heart } from 'lucide-react';
import { useSyncExternalStore } from 'react';

function useHydrated() {
  return useSyncExternalStore(() => () => {}, () => true, () => false);
}

export function WishlistView({ locale }: { locale: string }) {
  const { items, hydrated } = useWishlistStore();
  const t = useTranslations('wishlist');
  const mounted = useHydrated();

  if (!mounted || !hydrated) {
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
        {items.length} {locale === 'ar' ? 'منتج' : 'items'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
        {items.map((item) => (
          <ProductCard
            key={item.productId}
            product={{
              id: item.productId,
              slug: item.slug,
              sku: '',
              price: item.price,
              comparePrice: null,
              name: item.name,
              shortDescription: '',
              category: '',
              image: item.image,
              totalStock: 1,
              reviewCount: 0,
              avgRating: 0,
            }}
            locale={locale}
          />
        ))}
      </div>
    </div>
  );
}
