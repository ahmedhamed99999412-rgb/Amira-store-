import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import { getStoreSettings, getMainCategories } from '@/lib/queries';

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  const [settings, categories] = await Promise.all([
    getStoreSettings(),
    getMainCategories(locale),
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
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
            <aside>
              <AccountSidebar
                user={{
                  username: user.username,
                  fullName: user.fullName,
                  role: user.role,
                }}
                locale={locale}
              />
            </aside>
            <div>{children}</div>
          </div>
        </div>
      </main>
      <Footer storeName={storeName} locale={locale} />
    </>
  );
}
