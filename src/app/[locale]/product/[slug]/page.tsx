import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductDetailClient } from '@/components/product/ProductDetailClient';
import { ReviewsSection } from '@/components/product/ReviewsSection';
import { Link } from '@/i18n/routing';
import {
  getStoreSettings,
  getMainCategories,
  getProductBySlug,
  getRelatedProducts,
} from '@/lib/queries';

export const revalidate = 1;
import { ChevronLeft } from 'lucide-react';
import { Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

async function RelatedProductsSection({
  productId,
  locale,
  title,
}: {
  productId: string;
  locale: string;
  title: string;
}) {
  const relatedProducts = await getRelatedProducts(productId, locale, 4);
  if (relatedProducts.length === 0) return null;

  return (
    <div className="mt-16">
      <h2 className="font-serif text-2xl font-medium text-brand-charcoal mb-6">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-4">
        {relatedProducts.map((p) => (
          <ProductCard key={p.id} product={p} locale={locale} />
        ))}
      </div>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProductBySlug(slug, locale);
  if (!product) return { title: 'Not Found' };
  return {
    description: product.metaDescription || product.shortDescription || '',
    openGraph: {
      title: product.metaTitle || product.name,
      description: product.metaDescription || product.shortDescription || '',
      images: product.images.map((img) => ({ url: `/api/images/${img.id}`, alt: img.alt })),
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const tCommon = await getTranslations('common');

  const [settings, categories, product] = await Promise.all([
    getStoreSettings(),
    getMainCategories(locale),
    getProductBySlug(slug, locale),
  ]);

  if (!product) {
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
          <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-6" aria-label={tCommon('breadcrumb')}>
            <Link href="/" className="hover:text-brand-mauve">
              {tCommon('breadcrumb.home')}
            </Link>
            {(product.breadcrumb || []).map((crumb, idx) => (
              <span key={idx} className="flex items-center gap-2">
                <ChevronLeft className="h-3 w-3 rtl:rotate-180" />
                {idx === product.breadcrumb.length - 1 ? (
                  <span className="text-brand-charcoal font-medium line-clamp-1">{crumb.name}</span>
                ) : crumb.slug === 'shop' ? (
                  <Link href="/shop" className="hover:text-brand-mauve">{crumb.name}</Link>
                ) : (
                  <Link href={`/category/${crumb.slug}`} className="hover:text-brand-mauve">{crumb.name}</Link>
                )}
              </span>
            ))}
          </nav>

          <ProductDetailClient product={product} locale={locale} />

          <div className="mt-16">
            <Tabs defaultValue="description" className="w-full">
              <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent h-auto p-0">
                <TabsTrigger
                  value="description"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-charcoal data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm font-medium px-6 py-3"
                >
                  {locale === 'ar' ? 'الوصف' : 'Description'}
                </TabsTrigger>
                <TabsTrigger
                  value="reviews"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-charcoal data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm font-medium px-6 py-3"
                >
                  {tCommon('reviews', { count: product.reviewCount })}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="description" className="pt-6">
                {product.description ? (
                  <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
                    {product.description}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {tCommon('noDescription')}
                  </p>
                )}
              </TabsContent>
              <TabsContent value="reviews" className="pt-6">
                <ReviewsSection
                  productId={product.id}
                  reviews={product.reviews}
                  avgRating={product.avgRating}
                  reviewCount={product.reviewCount}
                  locale={locale}
                />
              </TabsContent>
            </Tabs>
          </div>

          <Suspense fallback={null}>
            <RelatedProductsSection productId={product.id} locale={locale} title={tCommon('relatedProducts')} />
          </Suspense>
        </div>
      </main>

      <Footer storeName={storeName} locale={locale} whatsappNumber={settings.whatsappNumber} instagramUrl={settings.instagramUrl} facebookUrl={settings.facebookUrl} />
    </>
  );
}
