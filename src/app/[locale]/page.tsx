import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroCarousel } from '@/components/home/HeroCarousel';
import { CategoryCircles } from '@/components/home/CategoryCircles';
import { PromoBanners } from '@/components/home/PromoBanners';
import { TrendingProducts } from '@/components/home/TrendingProducts';
import { ServiceBar } from '@/components/home/ServiceBar';
import {
  getStoreSettings,
  getMainCategories,
  getHeroBanners,
  getPromoBanners,
  getFeaturedProducts,
} from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function LocaleHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Fetch all data in parallel for better performance
  const [settings, categories, heroBanners, promoBanners, featuredProducts] = await Promise.all([
    getStoreSettings(),
    getMainCategories(locale),
    getHeroBanners(),
    getPromoBanners(),
    getFeaturedProducts(locale, 8),
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

      <main className="flex-1">
        <HeroCarousel banners={heroBanners} locale={locale} />
        <CategoryCircles categories={categories} />
        <PromoBanners banners={promoBanners} locale={locale} />
        <TrendingProducts products={featuredProducts} locale={locale} />
        <ServiceBar />
      </main>

      <Footer storeName={storeName} locale={locale} whatsappNumber={settings.whatsappNumber} instagramUrl={settings.instagramUrl} facebookUrl={settings.facebookUrl} />
    </>
  );
}
