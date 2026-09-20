'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

export function ShopFilters({ locale }: { locale: string }) {
  const t = useTranslations('common');
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.set('page', '1');
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname]
  );

  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const onSale = searchParams.get('sale') === 'true';

  return (
    <div className="space-y-6">
      {/* Price range */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-brand-charcoal mb-3">
          {locale === 'ar' ? 'السعر' : 'Price'}
        </h3>
        <div className="space-y-2">
          <input
            type="number"
            placeholder={locale === 'ar' ? 'من' : 'Min'}
            value={minPrice}
            onChange={(e) => updateParam('minPrice', e.target.value)}
            className="w-full h-9 px-3 border border-border rounded text-sm"
            dir="ltr"
          />
          <input
            type="number"
            placeholder={locale === 'ar' ? 'إلى' : 'Max'}
            value={maxPrice}
            onChange={(e) => updateParam('maxPrice', e.target.value)}
            className="w-full h-9 px-3 border border-border rounded text-sm"
            dir="ltr"
          />
        </div>
      </div>

      {/* On sale */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-brand-charcoal mb-3">
          {locale === 'ar' ? 'العروض' : 'Offers'}
        </h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={onSale}
            onChange={(e) => updateParam('sale', e.target.checked ? 'true' : null)}
            className="w-4 h-4 accent-brand-mauve"
          />
          <span className="text-sm">
            {locale === 'ar' ? 'منتجات بتخفيض' : 'On sale only'}
          </span>
        </label>
      </div>

      {/* Clear filters */}
      {(minPrice || maxPrice || onSale) && (
        <button
          onClick={() => router.push(pathname)}
          className="text-xs text-brand-mauve hover:underline"
        >
          {locale === 'ar' ? 'مسح الفلاتر' : 'Clear filters'}
        </button>
      )}
    </div>
  );
}
