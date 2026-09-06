import { setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SmartSearchClient } from '@/components/ai/SmartSearchClient';
import { getStoreSettings, getMainCategories } from '@/lib/queries';

export default async function SearchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [settings, categories] = await Promise.all([getStoreSettings(), getMainCategories(locale)]);
  const storeName = locale === 'ar' ? settings.storeNameAr : settings.storeNameEn;
  const announcement = locale === 'ar' ? settings.announcementAr : settings.announcementEn;
  return (
    <>
      <Header categories={categories} locale={locale} storeName={storeName} announcement={announcement} />
      <main className="flex-1 bg-white">
        <div className="container mx-auto px-4 py-8">
          <SmartSearchClient locale={locale} />
        </div>
      </main>
      <Footer storeName={storeName} locale={locale} />
    </>
  );
}
