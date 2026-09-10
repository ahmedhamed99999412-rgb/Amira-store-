'use client';

import { useWishlistStore } from '@/store/wishlist-store';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/product/ProductCard';
import { Heart } from 'lucide-react';
import { useSyncExternalStore, useEffect, useReducer, useMemo, useRef } from 'react';

function useHydrated() {
  return useSyncExternalStore(() => () => {}, () => true, () => false);
}

type State = {
  products: any[];
  loading: boolean;
};

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; products: any[] }
  | { type: 'FETCH_ERROR' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true };
    case 'FETCH_SUCCESS':
      return { products: action.products, loading: false };
    case 'FETCH_ERROR':
      return { ...state, loading: false };
    default:
      return state;
  }
}

export function WishlistView({ locale }: { locale: string }) {
  const { items, hydrated } = useWishlistStore();
  const t = useTranslations('wishlist');
  const mounted = useHydrated();
  const [state, dispatch] = useReducer(reducer, { products: [], loading: false });
  const fetchRef = useRef(0);

  const shouldFetch = useMemo(() => mounted && hydrated && items.length > 0, [mounted, hydrated, items]);

  useEffect(() => {
    if (!shouldFetch) {
      return;
    }

    const fetchId = ++fetchRef.current;
    dispatch({ type: 'FETCH_START' });

    Promise.all(
      items.map(item =>
        fetch(`/api/products/${item.slug}`, {
          headers: { 'x-locale': locale }
        })
          .then(res => res.ok ? res.json() : Promise.reject('Failed'))
          .then(data => data.product)
          .catch(() => null)
      )
    ).then(results => {
      if (fetchId !== fetchRef.current) return;
      const valid = results.filter(Boolean);
      dispatch({ type: 'FETCH_SUCCESS', products: valid });
    });

    return () => {
      fetchRef.current += 1;
    };
  }, [shouldFetch, locale, items]);

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

  if (state.loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-pulse">
          <Heart className="h-16 w-16 mx-auto text-muted-foreground/30" />
        </div>
        <p className="text-sm text-muted-foreground mt-4">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-3xl font-medium text-brand-charcoal mb-2">{t('title')}</h1>
      <p className="text-sm text-muted-foreground mb-8">
        {items.length} {locale === 'ar' ? 'منتج' : 'items'}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {state.products.map((product) => (
          <ProductCard
            key={product.id}
            product={{
              id: product.id,
              slug: product.slug,
              sku: product.sku || '',
              price: product.price,
              comparePrice: product.comparePrice,
              name: product.name,
              shortDescription: product.shortDescription || '',
              category: product.category || '',
              image: product.image,
              totalStock: product.totalStock,
              reviewCount: product.reviewCount || 0,
              avgRating: product.avgRating || 0,
            }}
            locale={locale}
          />
        ))}
      </div>
    </div>
  );
}
