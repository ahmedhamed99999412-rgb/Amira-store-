import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductCard } from '@/components/product/ProductCard';
import { SortSelect } from '@/components/product/SortSelect';
import { PaginationWrapper } from '@/components/product/PaginationWrapper';
import { Link } from '@/i18n/routing';
import {
  getStoreSettings,
  getMainCategories,
  getCategoryBySlug,
  getProductsByCategory,
} from '@/lib/queries';

export const dynamic = 'force-dynamic';
import { Suspense } from 'react';
import { ChevronLeft } from 'lucide-react';

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const page = parseInt((sp.page as string) || '1', 10);
  const minPrice = sp.minPrice ? parseFloat(sp.minPrice as string) : undefined;
  const maxPrice = sp.maxPrice ? parseFloat(sp.maxPrice as string) : undefined;
  const sort = (sp.sort as string) || 'newest';
  const onSale = sp.sale === 'true';

  const [settings, categories, category, result] = await Promise.all([
    getStoreSettings(),
    getMainCategories(locale),
    getCategoryBySlug(slug, locale),
    getProductsByCategory(slug, locale, { page, pageSize: 12, minPrice, maxPrice, sort: sort as any, onSale }),
  ]);

  if (!category) {
    notFound();
  }

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
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-4" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-brand-mauve">
              {locale === 'ar' ? 'الرئيسية' : 'Home'}
            </Link>
            {category.breadcrumb.map((crumb, idx) => (
              <span key={idx} className="flex items-center gap-2">
                <ChevronLeft className="h-3 w-3 rtl:rotate-180" />
                {idx === category.breadcrumb.length - 1 ? (
                  <span className="text-brand-charcoal font-medium">{crumb.name}</span>
                ) : (
                  <Link href={`/category/${crumb.slug}`} className="hover:text-brand-mauve">
                    {crumb.name}
                  </Link>
                )}
              </span>
            ))}
          </nav>

          {/* Category header */}
          <div className="mb-8">
            <h1 className="font-serif text-3xl sm:text-4xl font-medium text-brand-charcoal">
              {category.name}
            </h1>
            {category.description && (
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{category.description}</p>
            )}
          </div>

          {/* Subcategories (if any) */}
          {category.children.length > 0 && (
            <div className="mb-10">
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-charcoal mb-4">
                {locale === 'ar' ? 'الفئات الفرعية' : 'Subcategories'}
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {category.children.map((child) => (
                  <Link
                    key={child.id}
                    href={`/category/${child.slug}`}
                    className="group flex flex-col items-center gap-2"
                  >
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-muted ring-2 ring-transparent group-hover:ring-brand-mauve transition-all">
                      {child.image ? (
                        <img
                          src={`/api/images/${child.image.id}`}
                          alt={child.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-brand-cream text-brand-mauve text-xl font-serif">
                          {child.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-center text-brand-charcoal group-hover:text-brand-mauve">
                      {child.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Products section */}
          <div className="border-t border-border pt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-brand-charcoal">
                {locale === 'ar' ? `${result.total} منتج` : `${result.total} products`}
              </h2>
              <Suspense>
                <SortSelect locale={locale} current={sort} />
              </Suspense>
            </div>

            {result.products.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">
                  {locale === 'ar' ? 'لا توجد منتجات في هذه الفئة بعد' : 'No products in this category yet'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {result.products.map((product) => (
                  <ProductCard key={product.id} product={product} locale={locale} />
                ))}
              </div>
            )}

            {result.totalPages > 1 && (
              <div className="mt-10 flex justify-center">
                <Suspense>
                  <PaginationWrapper currentPage={result.page} totalPages={result.totalPages} />
                </Suspense>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer storeName={storeName} locale={locale} whatsappNumber={settings.whatsappNumber} instagramUrl={settings.instagramUrl} facebookUrl={settings.facebookUrl} />
    </>
  );
}
