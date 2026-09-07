import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductCard } from '@/components/product/ProductCard';
import { ShopFilters } from '@/components/product/ShopFilters';
import { SortSelect } from '@/components/product/SortSelect';
import { PaginationWrapper } from '@/components/product/PaginationWrapper';
import {
  getStoreSettings,
  getMainCategories,
  getAllProducts,
} from '@/lib/queries';

export const dynamic = 'force-dynamic';
import { ProductGridSkeleton } from '@/components/ui/skeleton-loader';
import { Suspense } from 'react';

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  // Parse query params
  const page = parseInt((sp.page as string) || '1', 10);
  const q = sp.q as string | undefined;
  const minPrice = sp.minPrice ? parseFloat(sp.minPrice as string) : undefined;
  const maxPrice = sp.maxPrice ? parseFloat(sp.maxPrice as string) : undefined;
  const sort = (sp.sort as string) || 'newest';
  const onSale = sp.sale === 'true';
  const featured = sp.featured === 'true';

  const [settings, categories, result] = await Promise.all([
    getStoreSettings(),
    getMainCategories(locale),
    getAllProducts(locale, { page, pageSize: 12, q, minPrice, maxPrice, sort: sort as any, onSale, featured }),
  ]);

  const storeName = locale === 'ar' ? settings.storeNameAr : settings.storeNameEn;
  const announcement = locale === 'ar' ? settings.announcementAr : settings.announcementEn;

  return (
    <>
      <Header
        categories={categories}
        locale={locale}
        storeName={storeName}
        announcement={announcement}
      />

      <main className="flex-1 bg-white">
        <div className="container mx-auto px-4 py-8">
          {/* Page header */}
          <div className="mb-6">
            <h1 className="font-serif text-3xl font-medium text-brand-charcoal">
              {locale === 'ar' ? 'المتجر' : 'Shop'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {locale === 'ar' ? `${result.total} منتج` : `${result.total} products`}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
            {/* Filters sidebar */}
            <aside className="hidden lg:block">
              <Suspense>
                <ShopFilters locale={locale} />
              </Suspense>
            </aside>

            {/* Products */}
            <div>
              {/* Mobile filters + sort */}
              <div className="flex items-center justify-between mb-4 lg:hidden">
                <details className="flex-1">
                  <summary className="cursor-pointer text-sm font-medium py-2">
                    {locale === 'ar' ? 'فلترة' : 'Filters'}
                  </summary>
                  <div className="mt-2 p-4 border rounded">
                    <Suspense>
                      <ShopFilters locale={locale} />
                    </Suspense>
                  </div>
                </details>
              </div>

              {/* Sort bar (desktop) */}
              <div className="flex items-center justify-end mb-6">
                <Suspense>
                  <SortSelect locale={locale} current={sort} />
                </Suspense>
              </div>

              {/* Products grid */}
              {result.products.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground">
                    {locale === 'ar' ? 'لا توجد منتجات مطابقة' : 'No products found'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {result.products.map((product) => (
                    <ProductCard key={product.id} product={product} locale={locale} />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {result.totalPages > 1 && (
                <div className="mt-10 flex justify-center">
                  <Suspense>
                    <PaginationWrapper
                      currentPage={result.page}
                      totalPages={result.totalPages}
                    />
                  </Suspense>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer storeName={storeName} locale={locale} whatsappNumber={settings.whatsappNumber} instagramUrl={settings.instagramUrl} facebookUrl={settings.facebookUrl} />
    </>
  );
}
